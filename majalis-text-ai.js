import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {getAI,getGenerativeModel,GoogleAIBackend,Schema} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-ai.js';

const APP_NAME='majalis-voice';
const FIREBASE_CONFIG={apiKey:'AIzaSyAAvC9y5jQ_7fAwmkCqBtgFDrBRF5t4uI0',authDomain:'mesraah-a2dfc.firebaseapp.com',projectId:'mesraah-a2dfc',storageBucket:'mesraah-a2dfc.firebasestorage.app',messagingSenderId:'986043593957',appId:'1:986043593957:web:b848313ef8cf83a5f3500c'};
const ACTIONS=['none','navigate','focus','target','external','propose_field','propose_agenda','propose_participant','validate','explain'];
const schema=Schema.object({properties:{reply:Schema.string(),action:Schema.enumString({enum:ACTIONS}),sectionId:Schema.string(),fieldId:Schema.string(),value:Schema.string(),message:Schema.string(),title:Schema.string(),purpose:Schema.string(),name:Schema.string(),role:Schema.string(),countsQuorum:Schema.boolean(),stageId:Schema.string(),requirementId:Schema.string(),targetId:Schema.string(),toolId:Schema.string()},optionalProperties:['sectionId','fieldId','value','message','title','purpose','name','role','countsQuorum','stageId','requirementId','targetId','toolId']});
const app=window.MajalisVoiceFirebaseApp||getApps().find(item=>item.name===APP_NAME)||initializeApp(FIREBASE_CONFIG,APP_NAME);
window.MajalisVoiceFirebaseApp=app;
const RIYADH_TIME_ZONE='Asia/Riyadh';
function getCurrentDateTime(){
  const now=new Date(),gregorian=new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn',{timeZone:RIYADH_TIME_ZONE,weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now),hijri=new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',{timeZone:RIYADH_TIME_ZONE,weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now),time=new Intl.DateTimeFormat('ar-SA-u-nu-latn',{timeZone:RIYADH_TIME_ZONE,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(now);
  return {timeZone:RIYADH_TIME_ZONE,gregorian,hijri,time,isoUtc:now.toISOString(),source:'user-device-clock'};
}
{
  const ai=getAI(app,{backend:new GoogleAIBackend()}),model=getGenerativeModel(ai,{model:'gemini-3.5-flash-lite',generationConfig:{responseMimeType:'application/json',responseSchema:schema,temperature:.12,maxOutputTokens:700}});
  const waitForAppCheck=async()=>{for(let i=0;i<30&&!window.MajalisVoiceGetAppCheckToken;i++)await new Promise(resolve=>setTimeout(resolve,100))};
  const ask=async payload=>{
    const prompt=`أنت مساعد مجالس الذكي داخل منصة مجالس. لست بوت دردشة. افهم حالة الاجتماع ووجّه المستخدم ونفذ معه داخل الواجهة.
تكلم بعربية سعودية سهلة ومهنية. اسأل سؤالا واحدا فقط. لا تسأل عن معلومة موجودة في السياق. لا تخترع قاعدة نظامية.
التاريخ والوقت الحاليان من جهاز المستخدم بتوقيت الرياض (مصدر الحقيقة الوحيد): ${JSON.stringify(getCurrentDateTime())}
إذا سئلت عن اليوم أو التاريخ أو الوقت فاستخدم هذه البيانات فقط، واذكر الميلادي والهجري بتقويم أم القرى عند طلب التاريخ. لا تعتمد على تاريخ النموذج أو الذاكرة ولا تخمن أبدا.
إذا كانت الوظيفة موجودة داخل مجالس فنفذ الوصول إليها بدلا من شرح الطريق للمستخدم. استخدم target للوصول المباشر إلى عنصر دقيق. targetId المسموحة: meeting_data, participants, agenda, invitation_attachments, management, attendance, voting, vote_result, minutes, documents, signed_minutes, signature_tracking, waqqe. استخدم external فقط لفتح خدمة مرتبطة ومسموحة، وحاليا toolId الوحيدة هي waqqe. التنقل وفتح الأقسام والأدوات لا يحتاج تأكيدا. استخدم navigate للقسم العام وfocus لحقل بعينه، وpropose_field لاقتراح قيمة تحتاج موافقة، propose_agenda لبند، propose_participant لمشارك، validate للفحص، explain لشرح قاعدة من محرك مجالس.
لا تقل تم الحفظ قبل أن تنفذ الأداة في التطبيق وترجع ok=true وpersisted=true. أي تعديل يعرض للمستخدم للموافقة أولا.
حالة مجالس: ${JSON.stringify(payload.context||{})}
آخر التفاعل: ${JSON.stringify(payload.history||[])}
طلب المستخدم: ${String(payload.message||'').slice(0,2000)}`;
    await waitForAppCheck();
    const response=await model.generateContent(prompt),raw=JSON.parse(response?.response?.text?.()||'{}'),toolCalls=[];
    if(raw.action==='navigate')toolCalls.push({name:'navigate_to_section',arguments:{section_id:raw.sectionId,reason:raw.message||raw.reply||''}});
    if(raw.action==='focus')toolCalls.push({name:'focus_field',arguments:{field_id:raw.fieldId,message:raw.message||raw.reply||''}});
    if(raw.action==='target')toolCalls.push({name:'navigate_to_target',arguments:{target_id:raw.targetId,message:raw.message||raw.reply||''}});
    if(raw.action==='external')toolCalls.push({name:'open_external_tool',arguments:{tool_id:raw.toolId||'waqqe'}});
    if(raw.action==='propose_field')toolCalls.push({name:'suggest_field_value',arguments:{field_id:raw.fieldId,proposed_value:raw.value,explanation:raw.message||'',requires_confirmation:true}});
    if(raw.action==='propose_agenda')toolCalls.push({name:'suggest_agenda_item',arguments:{title:raw.title,purpose:raw.purpose||'مناقشة',proposed_decision_type:'',required_attachments:[]}});
    if(raw.action==='propose_participant')toolCalls.push({name:'suggest_participant',arguments:{name:raw.name,role:raw.role||'عضو',counts_quorum:raw.countsQuorum!==false}});
    if(raw.action==='validate')toolCalls.push({name:'validate_stage',arguments:{stage_id:raw.stageId}});
    if(raw.action==='explain')toolCalls.push({name:'explain_requirement',arguments:{requirement_id:raw.requirementId}});
    return {reply:String(raw.reply||'').trim(),tool_calls:toolCalls,suggestions:[]};
  };
  window.MajalisAssistantAI={provider:'gemini',model:'gemini-3.5-flash-lite',ask};
}
