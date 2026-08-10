(function(){
'use strict';

const $=id=>document.getElementById(id);
const HISTORY_STORE='majalis_assistant_conversations_v1';
const ACTIVE_CONVERSATION='majalis_assistant_active_conversation_v1';
const FIREBASE_CONFIG={apiKey:'AIzaSyCHefMzpFRZi6TQHMt7NTkqMAzPFQB3_6U',authDomain:'majalis-admin.firebaseapp.com',projectId:'majalis-admin',storageBucket:'majalis-admin.firebasestorage.app',messagingSenderId:'7816691347',appId:'1:7816691347:web:fdee56d2bc246ae262d766'};
const SECTION_REGISTRY={
  meeting:{step:1,label:'إعدادات الاجتماع'},
  participants:{step:2,label:'المشاركون'},
  agenda:{step:3,label:'جدول الأعمال والدعوة'},
  management:{step:4,label:'إدارة الاجتماع'},
  documents:{step:5,label:'الوثائق'}
};
const FIELD_REGISTRY={
  entityName:{step:1,label:'اسم الجهة'},entityType:{step:1,label:'نوع الجهة'},meetingType:{step:1,label:'نوع الاجتماع'},meetingNo:{step:1,label:'رقم الاجتماع'},meetingYear:{step:1,label:'السنة'},meetingTitle:{step:1,label:'عنوان الاجتماع'},meetingMode:{step:1,label:'صفة الانعقاد'},entityRegistrationNo:{step:1,label:'الرقم الموحد للمنشأة'},entityHeaderNote:{step:1,label:'بيان الترويسة'},
  enableOwnershipRegister:{step:1,label:'تفعيل سجل رأس المال',sensitive:true},capitalTotalUnits:{step:1,label:'إجمالي الأسهم أو الحصص',sensitive:true},votingRightsBasis:{step:1,label:'أساس حقوق التصويت',sensitive:true},capitalTotalVotes:{step:1,label:'إجمالي حقوق التصويت',sensitive:true},capitalClassesNote:{step:1,label:'فئات الأسهم أو ملاحظات الحقوق',sensitive:true},
  inviteCalendar:{step:3,label:'تقويم الدعوة'},meetingCalendar:{step:3,label:'تقويم الاجتماع'},meetingHour:{step:3,label:'ساعة الاجتماع'},meetingMinute:{step:3,label:'دقيقة الاجتماع'},meetingPeriod:{step:3,label:'فترة الاجتماع'},location:{step:3,label:'المكان أو رابط الاتصال'},invitationIntro:{step:3,label:'مقدمة الدعوة'},invitationClosing:{step:3,label:'خاتمة الدعوة'},aobInAgenda:{step:3,label:'ما يستجد من أعمال'},
  chairName:{step:4,label:'رئيس الاجتماع'},secretaryName:{step:4,label:'أمين السر أو المقرر'},quorumStatus:{step:4,label:'حالة النصاب',sensitive:true},minutesStatus:{step:4,label:'حالة المحضر',sensitive:true},minutesIntro:{step:4,label:'مقدمة المحضر'},closingNote:{step:4,label:'ملاحظة ختامية'}
};
const ENTITY_ALIASES={
  jscListed:['مساهمة مدرجة','شركة مدرجة'],jscUnlisted:['مساهمة غير مدرجة','شركة مساهمة مقفلة','شركة مساهمة غير مدرجة'],sas:['مساهمة مبسطة'],llc:['ذات مسؤولية محدودة','مسؤولية محدودة'],association:['جمعية أهلية','جمعية اهليه','جمعية'],universityNew:['جامعة تطبق نظام الجامعات'],universityOld:['نظام مجلس التعليم العالي'],other:['جهة أخرى','جهه اخرى']
};
let chatBusy=false,aiUnavailable=false,currentConversationId='',history=[],speechRecognition=null,voiceReplyEnabled=false;

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function app(){return window.MajalisApp||null}
function snapshot(){try{return app()?.captureSnapshot?.()||{fields:{},attendees:[],agendaItems:[]}}catch{return {fields:{},attendees:[],agendaItems:[]}}}
function meetingFingerprint(){const parts=['entityName','meetingNo','meetingYear','meetingTitle','meetingGDay','meetingGMonth','meetingGYear'].map(id=>String($(id)?.value||'').trim()).filter(Boolean);return parts.length?parts.join('|').slice(0,220):'draft'}
function readStore(){try{const value=JSON.parse(localStorage.getItem(HISTORY_STORE)||'{}');return value&&typeof value==='object'?value:{}}catch{return {}}}
function saveHistory(){if(!currentConversationId)return;const store=readStore();store[currentConversationId]={fingerprint:meetingFingerprint(),updatedAt:Date.now(),messages:history.slice(-20)};const trimmed=Object.fromEntries(Object.entries(store).sort((a,b)=>(b[1]?.updatedAt||0)-(a[1]?.updatedAt||0)).slice(0,12));try{localStorage.setItem(HISTORY_STORE,JSON.stringify(trimmed));sessionStorage.setItem(ACTIVE_CONVERSATION,currentConversationId)}catch{}}
function makeConversation(force=false){if(force||!currentConversationId)currentConversationId=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;history=[];saveHistory()}
function restoreConversation(){const active=sessionStorage.getItem(ACTIVE_CONVERSATION)||'',store=readStore(),record=store[active];if(record&&record.fingerprint===meetingFingerprint()){currentConversationId=active;history=Array.isArray(record.messages)?record.messages:[]}else makeConversation(true)}
function captureConversation(){return {conversation_id:currentConversationId,fingerprint:meetingFingerprint(),messages:history.slice(-20)}}
function renderConversation(){const transcript=$('majalisAssistantTranscript');if(!transcript)return;transcript.innerHTML='';history.forEach(item=>appendMessage(item.role==='assistant'?'assistant':'user',item.text||''))}
function applyConversation(value){if(value&&Array.isArray(value.messages)){currentConversationId=String(value.conversation_id||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`);history=value.messages.slice(-20).map(item=>({role:item?.role==='assistant'?'assistant':'user',text:String(item?.text||'').slice(0,1200)})).filter(item=>item.text)}else makeConversation(true);renderConversation();saveHistory();return true}

function getMeetingSummary(){
  const s=snapshot(),f=s.fields||{},progress=app()?.getProgress?.()||[0,0,0,0,0],missing=[];
  if(!String(f.entityName||'').trim())missing.push({field_id:'entityName',label:'اسم الجهة',stage_id:'meeting'});
  if(!f.entityType)missing.push({field_id:'entityType',label:'نوع الجهة',stage_id:'meeting'});
  if(!f.meetingType)missing.push({field_id:'meetingType',label:'نوع الاجتماع',stage_id:'meeting'});
  if(!String(f.meetingTitle||'').trim())missing.push({field_id:'meetingTitle',label:'عنوان الاجتماع',stage_id:'meeting'});
  if(!(s.attendees||[]).length)missing.push({field_id:'addAttendee',label:'المشاركون',stage_id:'participants'});
  if(!String(f.meetingHour||'').trim())missing.push({field_id:'meetingHour',label:'وقت الاجتماع',stage_id:'agenda'});
  if(!String(f.location||'').trim())missing.push({field_id:'location',label:'مكان الاجتماع أو الرابط',stage_id:'agenda'});
  if(!(s.agendaItems||[]).length)missing.push({field_id:'addAgenda',label:'بنود جدول الأعمال',stage_id:'agenda'});
  if(!String(f.chairName||'').trim())missing.push({field_id:'chairName',label:'رئيس الاجتماع',stage_id:'management'});
  if((f.quorumStatus||'pending')==='pending')missing.push({field_id:'quorumStatus',label:'حالة النصاب',stage_id:'management'});
  return {platform:'مجالس',language:'ar-SA',current_stage:Object.keys(SECTION_REGISTRY).find(key=>SECTION_REGISTRY[key].step===(app()?.getCurrentStep?.()||1))||'meeting',entity_type:f.entityType||'',meeting_type:f.meetingType||'',entity_name:String(f.entityName||'').slice(0,160),meeting_title:String(f.meetingTitle||'').slice(0,200),completion:progress,participant_count:(s.attendees||[]).length,agenda_count:(s.agendaItems||[]).length,missing:missing.slice(0,14)};
}

function navigateToSection(sectionId,reason=''){
  const section=SECTION_REGISTRY[sectionId]||Object.values(SECTION_REGISTRY).find(item=>String(item.step)===String(sectionId));
  if(!section)return {ok:false,error:'section_not_allowed'};
  app()?.showStep?.(section.step,true);$('majalisAssistantDockStatus').textContent=reason||section.label;
  return {ok:true,section:section.label,step:section.step};
}
function fieldElement(fieldId){if(fieldId==='addAttendee')return $('addAttendee');if(fieldId==='addAgenda')return $('addAgenda');return $(fieldId)}
function focusTarget(fieldId){
  if(fieldId==='inviteCalendar')return document.querySelector('[data-open-date-picker="invite"]');
  if(fieldId==='meetingCalendar')return document.querySelector('[data-open-date-picker="meeting"]');
  if(['meetingHour','meetingMinute','meetingPeriod'].includes(fieldId))return document.querySelector('[data-open-time-picker="meeting"]');
  if(fieldId==='chairName')return $('chairParticipantId')||$('chairManualName');
  if(fieldId==='secretaryName')return $('secretaryParticipantId')||$('secretaryManualName');
  return fieldElement(fieldId);
}
function focusField(fieldId,message=''){
  const def=FIELD_REGISTRY[fieldId];if(!def&&!['addAttendee','addAgenda'].includes(fieldId))return {ok:false,error:'field_not_allowed'};
  const step=def?.step||(fieldId==='addAttendee'?2:3);app()?.showStep?.(step,true);
  requestAnimationFrame(()=>{const el=focusTarget(fieldId);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('majalis-assistant-focus');setTimeout(()=>el.classList.remove('majalis-assistant-focus'),1900);el.focus?.({preventScroll:true})});
  if(message)$('majalisAssistantDockStatus').textContent=message;
  return {ok:true,field_id:fieldId,label:def?.label||fieldId};
}
function readField(fieldId){const def=FIELD_REGISTRY[fieldId],el=fieldElement(fieldId);if(!def||!el)return {ok:false,error:'field_not_allowed'};return {ok:true,field_id:fieldId,value:el.type==='checkbox'?el.checked:el.value,label:def.label}}
function applyField(fieldId,value,confirmed=false){
  const def=FIELD_REGISTRY[fieldId],el=fieldElement(fieldId);if(!def||!el)return {ok:false,error:'field_not_allowed'};
  if(def.sensitive&&!confirmed)return {ok:false,error:'explicit_confirmation_required',preview:{field_id:fieldId,label:def.label,value}};
  if(el.type==='checkbox')el.checked=Boolean(value);else el.value=String(value??'');
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));app()?.save?.();focusField(fieldId,`تم تحديث ${def.label}`);
  return {ok:true,field_id:fieldId,label:def.label,value:el.type==='checkbox'?el.checked:el.value};
}
function addAgendaItem(args={}){const title=String(args.title||'').trim().slice(0,220);if(!title)return {ok:false,error:'title_required'};const item=app()?.addAgendaItem?.({title,purpose:String(args.purpose||'مناقشة').slice(0,40)});navigateToSection('agenda','تمت إضافة بند مقترح');return {ok:!!item,item}}
function addParticipant(args={}){const name=String(args.name||'').trim().slice(0,160);if(!name)return {ok:false,error:'name_required'};const participant=app()?.addParticipant?.({name,role:String(args.role||'عضو').slice(0,120),countsQuorum:args.counts_quorum!==false});navigateToSection('participants','تمت إضافة المشارك');return {ok:!!participant,participant}}
function validateStage(stageId){
  const summary=getMeetingSummary(),section=SECTION_REGISTRY[stageId]||Object.values(SECTION_REGISTRY).find(item=>String(item.step)===String(stageId));if(!section)return {ok:false,error:'stage_not_allowed'};
  const missing=summary.missing.filter(item=>SECTION_REGISTRY[item.stage_id]?.step===section.step);return {ok:true,stage_id:stageId,complete:missing.length===0,progress:summary.completion[section.step-1]||0,missing};
}
function explainRequirement(requirementId){const rule=app()?.getActiveRule?.();if(!rule)return {ok:false,error:'rule_not_available'};const map={notice:{title:'مدة وإجراء الدعوة',text:rule.notice,reference:rule.reference},quorum:{title:'النصاب',text:rule.quorum,reference:rule.reference},secretary:{title:'أمين السر أو المقرر',text:rule.secretaryLabel||rule.secretary,reference:rule.reference},frequency:{title:'دورية الاجتماع',text:rule.frequency,reference:rule.reference}};const result=map[requirementId];return result?{ok:true,...result}:{ok:false,error:'requirement_not_allowed'}}

const MajalisAssistantBridge={getMeetingSummary,navigateToSection,focusField,readField,applyField,addAgendaItem,addParticipant,validateStage,explainRequirement,captureConversation,applyConversation,allowedSections:()=>Object.keys(SECTION_REGISTRY),allowedFields:()=>Object.keys(FIELD_REGISTRY)};
window.MajalisAssistantBridge=MajalisAssistantBridge;

function appendMessage(role,text,extraHtml=''){
  const wrap=document.createElement('div');wrap.className=`majalis-assistant-message ${role}`;wrap.innerHTML=`<div class="majalis-assistant-bubble">${escapeHtml(text).replace(/\n/g,'<br>')}${extraHtml}</div>`;$('majalisAssistantTranscript').appendChild(wrap);$('majalisAssistantTranscript').scrollTop=$('majalisAssistantTranscript').scrollHeight;return wrap;
}
function appendThinking(){const wrap=document.createElement('div');wrap.className='majalis-assistant-message assistant thinking';wrap.innerHTML='<div class="majalis-assistant-bubble"><span class="majalis-assistant-thinking"><i></i><i></i><i></i></span></div>';$('majalisAssistantTranscript').appendChild(wrap);$('majalisAssistantTranscript').scrollTop=$('majalisAssistantTranscript').scrollHeight;return wrap}
function showSuggestions(items=[]){const box=$('majalisAssistantSuggestions');box.innerHTML='';items.slice(0,6).forEach((item,index)=>{const config=typeof item==='string'?{label:item,message:item}:item,button=document.createElement('button');button.type='button';button.className=`majalis-assistant-suggestion ${config.primary||index===0?'primary':''}`;button.textContent=config.label;button.addEventListener('click',()=>config.run?config.run():sendMessage(config.message||config.label));box.appendChild(button)})}
function showNotice(text=''){
  const el=$('majalisAssistantNotice');el.hidden=!text;el.innerHTML='';if(!text)return;
  const copy=document.createElement('span');copy.textContent=text;const retry=document.createElement('button');retry.type='button';retry.textContent='إعادة المحاولة';retry.addEventListener('click',()=>{aiUnavailable=false;showNotice('');sendMessage('أعد المحاولة وأكمل من آخر خطوة')});el.append(copy,retry);
}
function renderProposal(title,description,onConfirm){
  const html=`<div class="majalis-assistant-proposal"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p><div class="majalis-assistant-proposal-actions"><button type="button" data-confirm>اعتماد</button><button type="button" data-reject>تجاهل</button></div></div>`;
  const message=appendMessage('assistant','',html);message.querySelector('[data-confirm]').addEventListener('click',()=>{const result=onConfirm();message.querySelector('.majalis-assistant-proposal-actions').innerHTML=`<span>${result?.ok?'تم الاعتماد':'تعذر التنفيذ'}</span>`});message.querySelector('[data-reject]').addEventListener('click',()=>message.querySelector('.majalis-assistant-proposal-actions').innerHTML='<span>تم التجاهل</span>')
}
function setBusy(value){chatBusy=value;$('majalisAssistantSend').disabled=value;$('majalisAssistantInput').disabled=value;const mic=$('majalisAssistantMic');if(mic)mic.disabled=value}
function openPanel(){activateDock();$('majalisAssistantPanel').hidden=false;$('majalisAssistantToggle').setAttribute('aria-expanded','true');document.body.classList.add('majalis-assistant-open');setTimeout(()=>$('majalisAssistantInput').focus(),40)}
function closePanel(){$('majalisAssistantPanel').hidden=true;$('majalisAssistantToggle').setAttribute('aria-expanded','false');document.body.classList.remove('majalis-assistant-open')}
function activateDock(){$('majalisAssistantEntry').hidden=true;$('majalisAssistantDock').hidden=false}
function dismissAssistant(){closePanel();$('majalisAssistantDock').hidden=true;$('majalisAssistantEntry').hidden=true;sessionStorage.setItem('majalis_assistant_skipped','1')}

function initialQuestion(mode='new'){
  openPanel();if(!currentConversationId)restoreConversation();
  if(mode==='learn'){
    appendAssistant('مجالس يرتب عملك في خمس مراحل: بيانات الاجتماع، المشاركون، جدول الأعمال والدعوة، إدارة الاجتماع، ثم الوثائق. سأشرح لك كل مرحلة وأنقلك إليها.');
    showSuggestions([{label:'ابدأ من بيانات الاجتماع',message:'اشرح لي مرحلة بيانات الاجتماع',primary:true},{label:'اشرح المشاركين',message:'اشرح لي قسم المشاركين'},{label:'اشرح الوثائق',message:'اشرح لي قسم الوثائق'}]);return;
  }
  if(mode==='continue'){
    const next=nextMissing();appendAssistant(next?`وجدت أن الخطوة التالية هي ${next.label}. هل نكمل منها؟`:'بيانات الاجتماع مكتملة بدرجة جيدة. أقدر أراجع معك الجاهزية قبل إصدار الوثائق.');
    showSuggestions(next?[{label:`انتقل إلى ${next.label}`,run:()=>{focusField(next.field_id,`الخطوة التالية: ${next.label}`);appendAssistant(`انتقلت إلى ${next.label}. أكمل الحقل ثم أخبرني عندما تنتهي.`)}},{label:'اعرض كل النواقص',message:'اعرض النواقص'}]:[{label:'راجع الجاهزية',message:'راجع جاهزية الاجتماع',primary:true},{label:'افتح الوثائق',run:()=>navigateToSection('documents','الوثائق')}]);return;
  }
  appendAssistant('ما الذي تريد إنجازه اليوم؟');
  showSuggestions(['إعداد اجتماع جديد','إكمال بيانات اجتماع','إعداد دعوة','إدارة اجتماع منعقد','إعداد محضر','أحتاج مساعدتك في الاختيار'].map((label,index)=>({label,message:label,primary:index===0})));
}
function speakReply(text){
  if(!voiceReplyEnabled||!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(String(text||'').replace(/\n+/g,' ').slice(0,900));
  utterance.lang='ar-SA';utterance.rate=.96;utterance.pitch=1;
  const voices=window.speechSynthesis.getVoices(),arabic=voices.find(voice=>/^ar-SA/i.test(voice.lang))||voices.find(voice=>/^ar/i.test(voice.lang));
  if(arabic)utterance.voice=arabic;
  utterance.onend=()=>{const mic=$('majalisAssistantMic');if(mic)mic.classList.remove('speaking')};
  const mic=$('majalisAssistantMic');if(mic)mic.classList.add('speaking');
  window.speechSynthesis.speak(utterance);
}
function appendAssistant(text){appendMessage('assistant',text);history.push({role:'assistant',text:String(text).slice(0,1200)});saveHistory();speakReply(text)}

function stopListening(){if(speechRecognition){try{speechRecognition.stop()}catch{}speechRecognition=null}const mic=$('majalisAssistantMic');if(mic){mic.classList.remove('listening');mic.setAttribute('aria-pressed','false')}}
function startVoiceInput(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition,mic=$('majalisAssistantMic');
  if(!SR){showNotice('الحديث يحتاج متصفحا يدعم الميكروفون. يمكنك الاستمرار بالكتابة.');$('majalisAssistantInput').focus();return}
  if(speechRecognition){stopListening();return}
  openPanel();window.speechSynthesis?.cancel();voiceReplyEnabled=true;
  const recognition=new SR();speechRecognition=recognition;recognition.lang='ar-SA';recognition.interimResults=true;recognition.continuous=false;
  mic.classList.add('listening');mic.setAttribute('aria-pressed','true');showNotice('أسمعك الآن. تحدث، وسأكتب كلامك ثم أرسله.');
  recognition.onresult=event=>{let transcript='';for(let i=event.resultIndex;i<event.results.length;i++)transcript+=event.results[i][0].transcript;$('majalisAssistantInput').value=transcript.trim();if(event.results[event.results.length-1].isFinal&&transcript.trim()){showNotice('');sendMessage(transcript.trim())}};
  recognition.onerror=event=>{if(event.error!=='aborted')showNotice(event.error==='not-allowed'?'اسمح للمتصفح باستخدام الميكروفون ثم حاول مرة أخرى.':'تعذر سماع الصوت. حاول مرة أخرى أو استخدم الكتابة.');stopListening()};
  recognition.onend=()=>{speechRecognition=null;mic.classList.remove('listening');mic.setAttribute('aria-pressed','false')};
  try{recognition.start()}catch{stopListening();showNotice('تعذر تشغيل الميكروفون. حاول مرة أخرى.')}
}
function installVoiceControls(){
  const form=$('majalisAssistantForm');if(!form||$('majalisAssistantMic'))return;
  const mic=document.createElement('button');mic.type='button';mic.id='majalisAssistantMic';mic.className='majalis-assistant-mic';mic.setAttribute('aria-label','تحدث مع مساعد مجالس');mic.setAttribute('aria-pressed','false');mic.title='تحدث مع مساعد مجالس';mic.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"></path></svg>';
  mic.addEventListener('click',startVoiceInput);form.insertBefore(mic,$('majalisAssistantSend'));
  const entryPrimary=document.querySelector('[data-assistant-start="new"]');if(entryPrimary){entryPrimary.innerHTML='<span class="assistant-start-mic" aria-hidden="true">●</span> إعداد اجتماع جديد';entryPrimary.title='يمكنك المتابعة بالكتابة أو الحديث'}
}
function nextMissing(){return getMeetingSummary().missing[0]||null}
function detectEntity(text){const normalized=String(text||'');for(const [id,aliases] of Object.entries(ENTITY_ALIASES))if(aliases.some(alias=>normalized.includes(alias)))return id;return ''}
function detectMeeting(text,entityId){
  const value=String(text||'');
  if(/مجلس إدارة|مجلس الادارة|مجلس اداره/.test(value))return entityId==='association'?'associationBoard':'board';
  if(/جمعية عمومية غير عادية|جمعيه عموميه غير عاديه/.test(value))return entityId==='association'?'associationExtraordinary':'extraordinaryAssembly';
  if(/جمعية عمومية عادية|جمعيه عموميه عاديه/.test(value))return entityId==='association'?'associationOrdinary':'ordinaryAssembly';
  if(/جمعية الشركاء|جمعيه الشركاء/.test(value))return 'partners';
  if(/اجتماع المساهمين/.test(value))return 'shareholders';
  if(/لجنة|لجنه/.test(value))return 'committee';
  return '';
}
function entityOptions(){return app()?.getEntityOptions?.()||[]}
function meetingOptions(entityId){const labels=app()?.getMeetingLabels?.()||{},map=app()?.getMeetingsByEntity?.()||{};return (map[entityId]||[]).map(id=>({id,label:labels[id]||id}))}
function localGuide(text){
  const value=String(text||'').trim(),summary=getMeetingSummary(),f=snapshot().fields||{};
  if(/فهم المنصة|اشرح.*منصة|كيف.*تعمل/.test(value))return {reply:'مجالس يقودك عبر خمس مراحل مترابطة. تبدأ بتعريف الجهة والاجتماع، ثم المشاركين، ثم الدعوة وجدول الأعمال، ثم تسجيل الحضور والمداولات والقرارات، وأخيرا إصدار الوثائق.',suggestions:['ابدأ اجتماع جديد','اشرح قسم المشاركين','اشرح الوثائق']};
  if(/قسم المشاركين|المشاركين/.test(value)&&/اشرح|افتح|انتقل/.test(value))return {reply:'في المشاركين تضيف الاسم والصفة، وتحدد من يدخل في النصاب. وعند تفعيل سجل الملكية تظهر الحصص أو الأسهم وحقوق التصويت دون تغيير القيم المخصصة.',action:()=>navigateToSection('participants','قسم المشاركين'),suggestions:['أضف المشاركين','ما البيانات الناقصة؟']};
  if(/قسم الوثائق|افتح الوثائق|إصدار الوثائق/.test(value))return {reply:'قسم الوثائق يجمع الدعوة وجدول الأعمال والمحضر وسجل القرارات والخيارات الإضافية المتاحة حسب الاجتماع.',action:()=>navigateToSection('documents','الوثائق'),suggestions:['راجع الجاهزية','ما البيانات الناقصة؟']};
  if(/إعداد محضر|محضر/.test(value))return {reply:'سأبدأ بإدارة الاجتماع لأن المحضر يعتمد على الحضور والنصاب والمداولات والقرارات المسجلة هناك.',action:()=>navigateToSection('management','إعداد المحضر'),suggestions:['راجع نواقص إدارة الاجتماع','انتقل إلى رئيس الاجتماع']};
  if(/إدارة اجتماع|اجتماع منعقد|سجل الحضور|تحقق من النصاب/.test(value))return {reply:'انتقلت إلى إدارة الاجتماع. ابدأ بتسجيل حضور المشاركين، ثم حدد حالة النصاب، وبعدها سجل مداولات كل بند وقراره.',action:()=>navigateToSection('management','إدارة الاجتماع'),suggestions:['راجع نواقص إدارة الاجتماع','اشرح النصاب']};
  if(/إعداد دعوة|الدعوة/.test(value)&&!/اشرح/.test(value))return {reply:'سأجهزك لقسم جدول الأعمال والدعوة. أكمل تاريخ الدعوة والاجتماع والوقت والمكان ثم أضف البنود.',action:()=>navigateToSection('agenda','إعداد الدعوة'),suggestions:['انتقل إلى تاريخ الدعوة','راجع نواقص الدعوة']};
  if(/النواقص|ناقص|الجاهزية|اكتمال/.test(value)){const missing=summary.missing.slice(0,6);return {reply:missing.length?`أهم النواقص الآن:\n${missing.map((item,index)=>`${index+1}. ${item.label}`).join('\n')}`:'لم أجد نقصا أساسيا في المراحل الحالية. راجع الوثائق بصريا قبل الإصدار النهائي.',suggestions:missing.length?[{label:`انتقل إلى ${missing[0].label}`,run:()=>focusField(missing[0].field_id,missing[0].label)},'راجع المرحلة الحالية']:['افتح الوثائق']}}
  if(/اشرح.*نصاب|النصاب/.test(value)){const result=explainRequirement('quorum');return {reply:result.ok?`${result.text}\nالمرجع المعروض في مجالس: ${result.reference}`:'حدد نوع الجهة والاجتماع أولا حتى أعرض قاعدة النصاب المرتبطة به.',suggestions:['انتقل إلى نوع الجهة','انتقل إلى نوع الاجتماع']}}
  const entity=detectEntity(value);if(entity){const entityLabel=entityOptions().find(item=>item[0]===entity)?.[1]||'الجهة',meetingId=detectMeeting(value,entity),meetingLabel=meetingOptions(entity).find(item=>item.id===meetingId)?.label;if(f.entityType!==entity){return {reply:meetingId?`فهمت أنك تريد ${meetingLabel} لـ ${entityLabel}. سأعرض الاختيارين للاعتماد بالترتيب.`:`فهمت أن الجهة ${entityLabel}. سأعرضها كتغيير مقترح قبل اعتمادها.`,proposal:{title:'نوع الجهة',description:entityLabel,confirm:()=>{const result=applyField('entityType',entity,true);if(result.ok&&meetingId)setTimeout(()=>renderProposal('نوع الاجتماع',meetingLabel,()=>applyField('meetingType',meetingId,true)),100);return result}}}}if(meetingId&&f.meetingType!==meetingId)return {reply:`فهمت أنك تريد ${meetingLabel}.`,proposal:{title:'نوع الاجتماع',description:meetingLabel,confirm:()=>applyField('meetingType',meetingId,true)}};const options=meetingOptions(entity);return {reply:`نوع الجهة محدد: ${entityLabel}. ما نوع الاجتماع؟`,suggestions:options.map(item=>({label:item.label,run:()=>{renderProposal('نوع الاجتماع',item.label,()=>applyField('meetingType',item.id,true));showSuggestions([])}}))}}
  if(/اجتماع جديد|إعداد اجتماع/.test(value)){if(!f.entityType)return {reply:'ما نوع الجهة؟',suggestions:entityOptions().map(([id,label])=>({label,run:()=>{renderProposal('نوع الجهة',label,()=>applyField('entityType',id,true));appendAssistant(`اختر نوع الاجتماع المناسب لـ ${label}.`);showSuggestions(meetingOptions(id).map(item=>({label:item.label,run:()=>renderProposal('نوع الاجتماع',item.label,()=>applyField('meetingType',item.id,true))})))}}))};return {reply:'نوع الجهة محدد. ما نوع الاجتماع الذي تريد إعداده؟',suggestions:meetingOptions(f.entityType).map(item=>({label:item.label,run:()=>renderProposal('نوع الاجتماع',item.label,()=>applyField('meetingType',item.id,true))}))}}
  if(/إكمال بيانات اجتماع|إكمال الاجتماع|كمل/.test(value)){const missing=nextMissing();return missing?{reply:`الخطوة التالية هي ${missing.label}.`,action:()=>focusField(missing.field_id,missing.label),suggestions:['تم، ما التالي؟','اعرض كل النواقص']}:{reply:'البيانات الأساسية مكتملة. نراجع إدارة الاجتماع والوثائق الآن.',suggestions:['راجع الجاهزية','افتح الوثائق']}}
  if(/أحتاج مساعدتك|ساعدني.*اختيار|ما نوع الاجتماع/.test(value))return {reply:'ابدأ بوصف الجهة وما الذي تريد أن يعتمد أو يناقش. مثال: جمعية أهلية تريد اجتماع مجلس إدارة الأسبوع القادم.',suggestions:['عندي جمعية أهلية','عندي شركة ذات مسؤولية محدودة','عندي شركة مساهمة غير مدرجة']};
  return {reply:'أقدر أن أنقلك إلى القسم المناسب، أعرض النواقص، أشرح المتطلبات الموجودة في مجالس، أو أساعدك في إعداد اجتماع جديد.',suggestions:['إعداد اجتماع جديد','اعرض النواقص','أريد فهم المنصة']};
}

async function loadAiClient(){
  if(window.MajalisAssistantAI)return window.MajalisAssistantAI;
  const [{initializeApp,getApps},{getFunctions,httpsCallable}]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js')]);
  const firebaseApp=getApps().find(item=>item.name==='majalis-assistant')||initializeApp(FIREBASE_CONFIG,'majalis-assistant'),functions=getFunctions(firebaseApp,'us-central1'),call=httpsCallable(functions,'majalisAssistant',{timeout:12000});
  window.MajalisAssistantAI={ask:async payload=>(await call(payload)).data};return window.MajalisAssistantAI;
}
async function askAi(text){if(aiUnavailable)throw new Error('ai-unavailable');const client=await loadAiClient();return client.ask({message:String(text).slice(0,2000),context:getMeetingSummary(),history:history.slice(-8).map(item=>({role:item.role,text:item.text.slice(0,1000)})),conversation_id:currentConversationId})}
async function executeToolCall(call){
  const name=call?.name,args=call?.arguments||{};
  if(name==='navigate_to_section')return navigateToSection(args.section_id,args.reason);
  if(name==='focus_field')return focusField(args.field_id,args.message);
  if(name==='get_meeting_summary')return getMeetingSummary();
  if(name==='validate_stage')return validateStage(args.stage_id);
  if(name==='explain_requirement'){const result=explainRequirement(args.requirement_id);if(result.ok)appendAssistant(`${result.title}: ${result.text}\nالمرجع: ${result.reference}`);return result}
  if(name==='suggest_field_value'||name==='set_field_value'){
    const def=FIELD_REGISTRY[args.field_id];if(!def)return {ok:false,error:'field_not_allowed'};
    renderProposal(def.label,`${args.proposed_value??args.value??''}${args.explanation?` — ${args.explanation}`:''}`,()=>applyField(args.field_id,args.proposed_value??args.value,true));return {ok:true,status:'awaiting_user_confirmation'};
  }
  if(name==='suggest_agenda_item'){renderProposal('بند مقترح لجدول الأعمال',`${args.title}${args.purpose?` — ${args.purpose}`:''}`,()=>addAgendaItem(args));return {ok:true,status:'awaiting_user_confirmation'}}
  if(name==='suggest_participant'){renderProposal('مشارك مقترح',`${args.name} — ${args.role||'عضو'}`,()=>addParticipant(args));return {ok:true,status:'awaiting_user_confirmation'}}
  if(name==='suggest_text'){const target=FIELD_REGISTRY[args.target];if(!target)return {ok:false,error:'target_not_allowed'};renderProposal(`نص مقترح لـ ${target.label}`,String(args.draft_text||''),()=>applyField(args.target,args.draft_text,true));return {ok:true,status:'awaiting_user_confirmation'}}
  return {ok:false,error:'tool_not_allowed'};
}
async function sendMessage(text){
  const value=String(text??$('majalisAssistantInput').value).trim();if(!value||chatBusy)return;openPanel();$('majalisAssistantInput').value='';showSuggestions([]);appendMessage('user',value);history.push({role:'user',text:value.slice(0,1200)});saveHistory();setBusy(true);const thinking=appendThinking();
  try{
    let result;try{result=await askAi(value)}catch(error){aiUnavailable=true;showNotice('تعذر تشغيل المساعد الذكي الآن. يمكنك متابعة إعداد الاجتماع، وسأبقي الإرشادات الأساسية متاحة.');result=localGuide(value)}
    thinking.remove();if(result?.action)result.action();if(result?.proposal)renderProposal(result.proposal.title,result.proposal.description,result.proposal.confirm);if(result?.reply)appendAssistant(result.reply);for(const call of result?.tool_calls||[])await executeToolCall(call);showSuggestions(result?.suggestions||smartSuggestions());
  }catch(error){thinking.remove();console.error('Majalis assistant:',error);appendAssistant('تعذر إكمال هذه الخطوة. يمكنك متابعة العمل في مجالس، ولم تتغير بيانات الاجتماع.');showSuggestions(smartSuggestions())}finally{setBusy(false);$('majalisAssistantInput').focus()}
}
function smartSuggestions(){const summary=getMeetingSummary(),next=summary.missing[0];if(next)return [{label:`أكمل ${next.label}`,run:()=>focusField(next.field_id,next.label),primary:true},{label:'اعرض النواقص',message:'اعرض النواقص'}];return [{label:'راجع الجاهزية',message:'راجع الجاهزية',primary:true},{label:'افتح الوثائق',run:()=>navigateToSection('documents','الوثائق')}];}

function bind(){
  installVoiceControls();
  document.querySelectorAll('[data-assistant-start]').forEach(button=>button.addEventListener('click',()=>{const mode=button.dataset.assistantStart;if(mode==='new')voiceReplyEnabled=true;initialQuestion(mode);if(mode==='new')startVoiceInput()}));
  $('majalisAssistantSkip').addEventListener('click',dismissAssistant);$('majalisAssistantToggle').addEventListener('click',()=>$('majalisAssistantPanel').hidden?openPanel():closePanel());$('majalisAssistantPanelClose').addEventListener('click',closePanel);$('majalisAssistantDockClose').addEventListener('click',dismissAssistant);
  $('majalisAssistantNewChat').addEventListener('click',()=>{if(!confirm('بدء محادثة جديدة؟ ستبقى بيانات الاجتماع كما هي.'))return;makeConversation(true);$('majalisAssistantTranscript').innerHTML='';showNotice('');initialQuestion('new')});
  $('majalisAssistantForm').addEventListener('submit',event=>{event.preventDefault();sendMessage()});$('majalisAssistantInput').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage()}});$('majalisAssistantInput').addEventListener('input',event=>{event.target.style.height='auto';event.target.style.height=`${Math.min(115,event.target.scrollHeight)}px`});
  window.addEventListener('online',()=>{aiUnavailable=false;showNotice('')});
  window.addEventListener('majalis:assistant-conversation',event=>applyConversation(event.detail));
  window.addEventListener('majalis:assistant-new-meeting',()=>{makeConversation(true);renderConversation();showNotice('')});
}
function init(){if(!app())return setTimeout(init,50);restoreConversation();bind();if(sessionStorage.getItem('majalis_assistant_skipped')==='1')$('majalisAssistantEntry').hidden=true}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
