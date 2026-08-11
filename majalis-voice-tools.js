const FIELD_IDS=['entityName','entityType','meetingType','meetingNo','meetingYear','meetingTitle','meetingMode','entityRegistrationNo','entityHeaderNote','enableOwnershipRegister','capitalTotalUnits','votingRightsBasis','capitalTotalVotes','capitalClassesNote','inviteCalendar','meetingCalendar','meetingHour','meetingMinute','meetingPeriod','location','invitationIntro','invitationClosing','aobInAgenda','chairName','secretaryName','quorumStatus','minutesStatus','minutesIntro','closingNote'];
const SECTION_IDS=['meeting','participants','agenda','management','documents'];

export const MAJALIS_TOOL_DECLARATIONS=[
  {name:'get_meeting_context',description:'اقرأ الحالة الحالية للاجتماع بما فيها الحقول والمشاركون والبنود والنواقص قبل الإجابة أو الاقتراح.',parametersJsonSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'navigate_to_section',description:'انتقل فعليا إلى قسم في مجالس.',parametersJsonSchema:{type:'object',properties:{section_id:{type:'string',enum:SECTION_IDS},reason:{type:'string'}},required:['section_id','reason'],additionalProperties:false}},
  {name:'focus_field',description:'انتقل إلى حقل أو زر فعلي وميزه للمستخدم.',parametersJsonSchema:{type:'object',properties:{field_id:{type:'string',enum:[...FIELD_IDS,'addAttendee','addAgenda']},message:{type:'string'}},required:['field_id','message'],additionalProperties:false}},
  {name:'set_field_value',description:'طبق قيمة في حقل بعد موافقة المستخدم الصريحة في المحادثة الصوتية. لا تستخدمه لمجرد الاقتراح.',parametersJsonSchema:{type:'object',properties:{field_id:{type:'string',enum:FIELD_IDS},value:{anyOf:[{type:'string'},{type:'number'},{type:'boolean'}]},confirmed:{type:'boolean'}},required:['field_id','value','confirmed'],additionalProperties:false}},
  {name:'add_agenda_item',description:'أضف بندا بعد موافقة المستخدم الصريحة.',parametersJsonSchema:{type:'object',properties:{title:{type:'string'},purpose:{type:'string',enum:['إحاطة','مناقشة','اعتماد','تصويت']},confirmed:{type:'boolean'}},required:['title','purpose','confirmed'],additionalProperties:false}},
  {name:'add_participant',description:'أضف مشاركا بعد موافقة المستخدم الصريحة.',parametersJsonSchema:{type:'object',properties:{name:{type:'string'},role:{type:'string'},counts_quorum:{type:'boolean'},confirmed:{type:'boolean'}},required:['name','role','counts_quorum','confirmed'],additionalProperties:false}},
  {name:'validate_stage',description:'افحص اكتمال مرحلة من داخل محرك مجالس.',parametersJsonSchema:{type:'object',properties:{stage_id:{type:'string',enum:SECTION_IDS}},required:['stage_id'],additionalProperties:false}},
  {name:'explain_requirement',description:'اقرأ واشرح متطلبا من قواعد مجالس الحالية.',parametersJsonSchema:{type:'object',properties:{requirement_id:{type:'string',enum:['notice','quorum','secretary','frequency']}},required:['requirement_id'],additionalProperties:false}}
];

export async function executeMajalisTool(name,args={}){
  const bridge=window.MajalisAssistantBridge;if(!bridge)return {ok:false,error:'majalis-bridge-unavailable'};
  if(name==='get_meeting_context')return {ok:true,context:bridge.getPlatformContext()};
  if(name==='navigate_to_section')return bridge.navigateToSection(args.section_id,args.reason);
  if(name==='focus_field')return bridge.focusField(args.field_id,args.message);
  if(name==='set_field_value'){if(args.confirmed!==true)return {ok:false,error:'explicit-confirmation-required'};return bridge.applyField(args.field_id,args.value,true)}
  if(name==='add_agenda_item'){if(args.confirmed!==true)return {ok:false,error:'explicit-confirmation-required'};return bridge.addAgendaItem(args)}
  if(name==='add_participant'){if(args.confirmed!==true)return {ok:false,error:'explicit-confirmation-required'};return bridge.addParticipant(args)}
  if(name==='validate_stage')return bridge.validateStage(args.stage_id);
  if(name==='explain_requirement')return bridge.explainRequirement(args.requirement_id);
  return {ok:false,error:'unknown-tool'};
}
