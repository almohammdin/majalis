'use strict';

const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const OpenAI=require('openai').default;

const OPENAI_API_KEY=defineSecret('OPENAI_API_KEY');
const MODEL='gpt-5.6-terra';
const ALLOWED_ORIGINS=new Set(['https://almohammdin.github.io','http://localhost:5000','http://127.0.0.1:5000','http://localhost:5500','http://127.0.0.1:5500']);
const FIELD_IDS=['entityName','entityType','meetingType','meetingNo','meetingYear','meetingTitle','meetingMode','entityRegistrationNo','entityHeaderNote','enableOwnershipRegister','capitalTotalUnits','votingRightsBasis','capitalTotalVotes','capitalClassesNote','inviteCalendar','meetingCalendar','meetingHour','meetingMinute','meetingPeriod','location','invitationIntro','invitationClosing','aobInAgenda','chairName','secretaryName','quorumStatus','minutesStatus','minutesIntro','closingNote'];
const SECTION_IDS=['meeting','participants','agenda','management','documents'];
const REQUIREMENT_IDS=['notice','quorum','secretary','frequency'];
const rateBuckets=new Map();

function assertOrigin(request){const origin=request.rawRequest?.get?.('origin')||'';if(origin&&!ALLOWED_ORIGINS.has(origin))throw new HttpsError('permission-denied','المصدر غير مسموح.')}
function assertRate(request){const key=String(request.rawRequest?.ip||request.rawRequest?.headers?.['x-forwarded-for']||'unknown').split(',')[0].trim(),now=Date.now(),record=rateBuckets.get(key)||{started:now,count:0};if(now-record.started>60000){record.started=now;record.count=0}record.count+=1;rateBuckets.set(key,record);if(record.count>20)throw new HttpsError('resource-exhausted','تم تجاوز عدد الطلبات المؤقت. حاول بعد قليل.')}
function cleanText(value,max=2000){return String(value??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim().slice(0,max)}
function cleanContext(value){const source=value&&typeof value==='object'?value:{},missing=Array.isArray(source.missing)?source.missing.slice(0,14).map(item=>({field_id:cleanText(item?.field_id,80),label:cleanText(item?.label,120),stage_id:cleanText(item?.stage_id,40)})):[];return {platform:'مجالس',language:'ar-SA',current_stage:cleanText(source.current_stage,40),entity_type:cleanText(source.entity_type,60),meeting_type:cleanText(source.meeting_type,60),entity_name:cleanText(source.entity_name,160),meeting_title:cleanText(source.meeting_title,200),completion:Array.isArray(source.completion)?source.completion.slice(0,5).map(value=>Math.max(0,Math.min(100,Number(value)||0))):[],participant_count:Math.max(0,Number(source.participant_count)||0),agenda_count:Math.max(0,Number(source.agenda_count)||0),missing}}
function cleanHistory(value){if(!Array.isArray(value))return [];return value.slice(-8).map(item=>({role:item?.role==='assistant'?'assistant':'user',text:cleanText(item?.text,1000)})).filter(item=>item.text)}

const tools=[
  {type:'function',name:'navigate_to_section',description:'انتقل إلى قسم مسموح في منصة مجالس.',strict:true,parameters:{type:'object',properties:{section_id:{type:'string',enum:SECTION_IDS},reason:{type:'string'}},required:['section_id','reason'],additionalProperties:false}},
  {type:'function',name:'focus_field',description:'انتقل إلى حقل موجود وميزه بصريا للمستخدم.',strict:true,parameters:{type:'object',properties:{field_id:{type:'string',enum:[...FIELD_IDS,'addAttendee','addAgenda']},message:{type:'string'}},required:['field_id','message'],additionalProperties:false}},
  {type:'function',name:'suggest_field_value',description:'اعرض قيمة مقترحة لحقل. التطبيق يطلب اعتماد المستخدم قبل تنفيذها.',strict:true,parameters:{type:'object',properties:{field_id:{type:'string',enum:FIELD_IDS},proposed_value:{anyOf:[{type:'string'},{type:'boolean'},{type:'number'}]},explanation:{type:'string'},requires_confirmation:{type:'boolean'}},required:['field_id','proposed_value','explanation','requires_confirmation'],additionalProperties:false}},
  {type:'function',name:'set_field_value',description:'اطلب تطبيق قيمة بعد موافقة المستخدم. التطبيق هو صاحب قرار التنفيذ النهائي.',strict:true,parameters:{type:'object',properties:{field_id:{type:'string',enum:FIELD_IDS},value:{anyOf:[{type:'string'},{type:'boolean'},{type:'number'}]},confirmed:{type:'boolean'}},required:['field_id','value','confirmed'],additionalProperties:false}},
  {type:'function',name:'suggest_agenda_item',description:'اعرض بند جدول أعمال مقترحا للمراجعة.',strict:true,parameters:{type:'object',properties:{title:{type:'string'},purpose:{type:'string',enum:['إحاطة','مناقشة','اعتماد','تصويت']},proposed_decision_type:{type:'string'},required_attachments:{type:'array',items:{type:'string'}}},required:['title','purpose','proposed_decision_type','required_attachments'],additionalProperties:false}},
  {type:'function',name:'suggest_participant',description:'اعرض مشاركا مقترحا للمراجعة قبل الإضافة.',strict:true,parameters:{type:'object',properties:{name:{type:'string'},role:{type:'string'},counts_quorum:{type:'boolean'}},required:['name','role','counts_quorum'],additionalProperties:false}},
  {type:'function',name:'validate_stage',description:'اطلب من تطبيق مجالس فحص اكتمال مرحلة وفق قواعده وبياناته.',strict:true,parameters:{type:'object',properties:{stage_id:{type:'string',enum:SECTION_IDS}},required:['stage_id'],additionalProperties:false}},
  {type:'function',name:'explain_requirement',description:'اشرح متطلبا من محرك قواعد مجالس دون اختراع قاعدة جديدة.',strict:true,parameters:{type:'object',properties:{requirement_id:{type:'string',enum:REQUIREMENT_IDS},user_question:{type:'string'}},required:['requirement_id','user_question'],additionalProperties:false}},
  {type:'function',name:'suggest_text',description:'اعرض نصا مقترحا للدعوة أو المحضر للمراجعة قبل اعتماده.',strict:true,parameters:{type:'object',properties:{target:{type:'string',enum:['invitationIntro','invitationClosing','minutesIntro','closingNote']},context:{type:'string'},draft_text:{type:'string'}},required:['target','context','draft_text'],additionalProperties:false}},
  {type:'function',name:'get_meeting_summary',description:'اقرأ الملخص المحدود المتاح لحالة الاجتماع.',strict:true,parameters:{type:'object',properties:{},required:[],additionalProperties:false}}
];

const instructions=`أنت مساعد مجالس، أمين اجتماع رقمي يساعد المستخدم في إعداد الاجتماعات وإدارتها وإصدار وثائقها.

تحدث بالعربية السعودية السهلة والمهنية. اجعل إجابتك مختصرة وعملية. اسأل سؤالا واحدا فقط في كل مرة. اعتمد على حالة الاجتماع والحقول والقواعد التي يرسلها تطبيق مجالس.

افهم هدف المستخدم ثم وجهه إلى الخطوة التالية. استخدم أدوات التطبيق للتنقل والتركيز واقتراح تعبئة الحقول وفحص المراحل. لا تدع أنك نفذت إجراء حتى يعرض التطبيق نتيجة نجاح. اعرض التغييرات المقترحة قبل تطبيقها. أي حذف أو استبدال أو تغيير في حقوق التصويت أو الملكية أو حالة النصاب أو اعتماد المحضر يحتاج تأكيدا صريحا من المستخدم داخل التطبيق.

لا تخترع متطلبات نظامية أو نسب نصاب أو مدد دعوة أو مواد قانونية. هذه المعلومات تؤخذ من محرك قواعد مجالس فقط عبر أداة شرح المتطلب. إذا لم توجد قاعدة، اطلب مراجعة وثيقة الجهة أو المختص. لا تسأل عن معلومة ظاهرة في السياق. لا تكرر ما يظهر أمام المستخدم. إذا طلب المستخدم إجراء واضحا فاختر أقصر مسار مسموح. عند اقتراح نص أو بند أو قيمة، استخدم أداة الاقتراح المناسبة ولا تقل إنه اعتمد.`;

exports.majalisAssistant=onCall({region:'us-central1',secrets:[OPENAI_API_KEY],cors:[...ALLOWED_ORIGINS],timeoutSeconds:30,memory:'256MiB',maxInstances:8},async request=>{
  assertOrigin(request);assertRate(request);
  const message=cleanText(request.data?.message,2000);if(!message)throw new HttpsError('invalid-argument','الرسالة مطلوبة.');
  const context=cleanContext(request.data?.context),history=cleanHistory(request.data?.history),conversationId=cleanText(request.data?.conversation_id,100);
  const input=[...history.map(item=>({role:item.role,content:item.text})),{role:'user',content:`طلب المستخدم: ${message}\n\nحالة الاجتماع الحالية:\n${JSON.stringify(context)}`}];
  try{
    const client=new OpenAI({apiKey:OPENAI_API_KEY.value()});
    const response=await client.responses.create({model:MODEL,instructions,input,tools,tool_choice:'auto',parallel_tool_calls:false,reasoning:{effort:'low'},max_output_tokens:700,metadata:{surface:'majalis',conversation_id:conversationId||'anonymous'}});
    const toolCalls=(response.output||[]).filter(item=>item.type==='function_call').slice(0,3).map(item=>{let args={};try{args=JSON.parse(item.arguments||'{}')}catch{}return {call_id:item.call_id,name:item.name,arguments:args}});
    const reply=cleanText(response.output_text,1600)||(!toolCalls.length?'حدد لي الخطوة التي تريد إنجازها في الاجتماع.':'');
    return {reply,tool_calls:toolCalls,response_id:response.id,model:MODEL};
  }catch(error){console.error('majalisAssistant',error?.status,error?.code,error?.message);if(error?.status===429)throw new HttpsError('resource-exhausted','الخدمة مشغولة الآن. حاول بعد قليل.');throw new HttpsError('internal','تعذر تشغيل المساعد الآن. يمكنك متابعة إعداد الاجتماع.')}
});
