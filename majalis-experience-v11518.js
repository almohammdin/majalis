(()=>{
'use strict';

const VERSION=window.MAJALIS_VERSION||'1.15.18';
const $=id=>document.getElementById(id);
const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
const INTENTS=[
  'إعداد اجتماع جديد',
  'إكمال بيانات اجتماع',
  'إعداد دعوة',
  'إدارة اجتماع منعقد',
  'إعداد محضر',
  'أحتاج مساعدتك في الاختيار'
];
const STAGES={meeting:'إعدادات الاجتماع',participants:'المشاركون',agenda:'جدول الأعمال والدعوة',management:'إدارة الاجتماع',documents:'الوثائق'};
let intentExpanded=false;
let guideTimer=0;

function esc(value=''){
  return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function bridge(){return window.MajalisAssistantBridge||null}
function meetingSummary(){try{return bridge()?.getMeetingSummary?.()||null}catch{return null}}
function hasMeetingData(summary){
  if(!summary)return false;
  return Boolean(summary.entity_name||summary.meeting_title||summary.participant_count||summary.agenda_count||(summary.completion||[]).some(v=>Number(v)>0));
}
function overallCompletion(summary){
  const values=(summary?.completion||[]).slice(0,5).map(v=>Math.max(0,Math.min(100,Number(v)||0)));
  if(!values.length)return 0;
  return Math.round(values.reduce((sum,value)=>sum+value,0)/values.length);
}
function sendAssistantMessage(message){
  const input=$('majalisAssistantInput'),form=$('majalisAssistantForm'),send=$('majalisAssistantSend');
  if(!input)return;
  input.value=message;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  if(typeof form?.requestSubmit==='function')form.requestSubmit();
  else send?.click();
}
function ensureGuide(){
  const card=$('majalisAssistantEntry')?.querySelector('.majalis-assistant-entry-card');
  if(!card)return null;
  let panel=$('majalisAssistantGuide');
  if(panel)return panel;
  panel=document.createElement('section');
  panel.id='majalisAssistantGuide';
  panel.className='majalis-assistant-guide';
  panel.setAttribute('aria-label','حالة الاجتماع والخطوة التالية');
  panel.setAttribute('aria-live','polite');
  const heading=card.querySelector('.majalis-assistant-entry-heading');
  heading?.insertAdjacentElement('afterend',panel);
  if(!panel.parentNode)card.prepend(panel);
  return panel;
}
function renderGuide(){
  const panel=ensureGuide(),summary=meetingSummary();
  if(!panel||!summary)return;
  const current=overallCompletion(summary),next=summary.missing?.[0]||null,dataExists=hasMeetingData(summary);
  const title=summary.entity_name|| (dataExists?'الاجتماع الحالي':'اجتماع جديد');
  const subtitle=summary.meeting_title||STAGES[summary.current_stage]||'ابدأ من بيانات الجهة والاجتماع';
  const chips=(summary.missing||[]).slice(0,3).map(item=>`<span class="majalis-guide-chip">${esc(item.label)}</span>`).join('');
  const statusChips=chips||'<span class="majalis-guide-chip good">البيانات الأساسية جاهزة للمراجعة</span>';
  panel.style.setProperty('--majalis-progress',`${current}%`);
  panel.innerHTML=`
    <div class="majalis-guide-top">
      <div>
        <span class="majalis-guide-kicker">${dataExists?'حالة الاجتماع':'ابدأ هنا'}</span>
        <strong class="majalis-guide-title">${esc(title)}</strong>
        <span class="majalis-guide-subtitle">${esc(subtitle)}</span>
      </div>
      <div class="majalis-guide-score" aria-label="نسبة اكتمال الاجتماع">${current}%</div>
    </div>
    <div class="majalis-guide-track" aria-hidden="true"><i></i></div>
    <div class="majalis-guide-next">
      <div><span>الخطوة التالية</span><strong>${esc(next?.label||'مراجعة الجاهزية والوثائق')}</strong></div>
      <button type="button" data-majalis-next>${next?'أكمل الخطوة التالية':'راجع الوثائق'}</button>
    </div>
    <div class="majalis-guide-missing">${statusChips}</div>`;
  panel.querySelector('[data-majalis-next]')?.addEventListener('click',()=>{
    if(next)bridge()?.focusField?.(next.field_id,`الخطوة التالية: ${next.label}`);
    else bridge()?.navigateToSection?.('documents','مراجعة الوثائق');
  });
}
function scheduleGuide(){
  clearTimeout(guideTimer);
  guideTimer=setTimeout(renderGuide,70);
}
function makeIntentButton(label,index){
  const button=document.createElement('button');
  button.type='button';
  button.className=`majalis-assistant-suggestion ${index===0?'primary':''}`;
  button.dataset.majalisIntent='1';
  button.textContent=label;
  button.addEventListener('click',()=>sendAssistantMessage(label));
  return button;
}
function renderIntentMenu(){
  const answer=$('majalisAssistantAnswer'),box=$('majalisAssistantSuggestions');
  if(!answer||!box||answer.textContent.trim()!=='ما الذي تريد إنجازه اليوم؟')return;
  const expected=intentExpanded?6:4;
  if(box.querySelectorAll('[data-majalis-intent]').length===expected)return;
  box.innerHTML='';
  const visible=intentExpanded?INTENTS:INTENTS.slice(0,3);
  visible.forEach((label,index)=>box.appendChild(makeIntentButton(label,index)));
  if(!intentExpanded){
    const more=document.createElement('button');
    more.type='button';
    more.className='majalis-assistant-suggestion majalis-assistant-more';
    more.dataset.majalisIntent='1';
    more.textContent='خيارات أخرى';
    more.addEventListener('click',()=>{intentExpanded=true;renderIntentMenu()});
    box.appendChild(more);
  }
}
function refreshVoiceLabels(){
  document.querySelectorAll('.majalis-assistant-voice-copy strong').forEach(el=>el.textContent='تحدث مع مساعد مجالس');
  document.querySelectorAll('.majalis-assistant-voice-copy small').forEach(el=>el.textContent='محادثة صوتية بالذكاء الاصطناعي');
  [$('majalisAssistantMic'),$('majalisAssistantDockMic')].forEach(el=>{
    if(!el)return;
    el.setAttribute('aria-label','تحدث مع مساعد مجالس بالذكاء الاصطناعي');
    el.setAttribute('aria-pressed',el.classList.contains('is-listening')?'true':'false');
  });
}
function enhanceAccessibility(){
  $('majalisAssistantAnswer')?.setAttribute('aria-live','polite');
  $('majalisAssistantAnswer')?.setAttribute('role','status');
  $('majalisAssistantToggle')?.setAttribute('aria-controls','majalisAssistantEntry');
  $('majalisAssistantInput')?.setAttribute('aria-label','اكتب طلبك لمساعد مجالس');
  refreshVoiceLabels();
}
function shortenAssistantFocus(target){
  if(!(target instanceof Element)||!target.classList.contains('majalis-assistant-focus')||target.dataset.majalisFocusTimer==='1')return;
  target.dataset.majalisFocusTimer='1';
  setTimeout(()=>{
    target.classList.remove('majalis-assistant-focus');
    delete target.dataset.majalisFocusTimer;
  },reduceMotion?140:720);
}
function bindObservers(){
  const answer=$('majalisAssistantAnswer'),suggestions=$('majalisAssistantSuggestions'),entry=$('majalisAssistantEntry');
  if(answer)new MutationObserver(()=>{
    if(answer.textContent.trim()!=='ما الذي تريد إنجازه اليوم؟')intentExpanded=false;
    renderIntentMenu();scheduleGuide();
  }).observe(answer,{childList:true,subtree:true,characterData:true});
  if(suggestions)new MutationObserver(()=>renderIntentMenu()).observe(suggestions,{childList:true});
  if(entry)new MutationObserver(()=>{if(!entry.hidden){renderGuide();refreshVoiceLabels()}}).observe(entry,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(mutations=>mutations.forEach(m=>shortenAssistantFocus(m.target))).observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
}
function bindEvents(){
  document.addEventListener('input',event=>{if(event.target?.matches?.('input,select,textarea'))scheduleGuide()},true);
  document.addEventListener('change',scheduleGuide,true);
  window.addEventListener('majalis:assistant-conversation',scheduleGuide);
  window.addEventListener('majalis:assistant-new-meeting',()=>{intentExpanded=false;scheduleGuide()});
  window.addEventListener('majalis:voice-state',event=>{
    const listening=event.detail?.state==='listening';
    [$('majalisAssistantMic'),$('majalisAssistantDockMic')].forEach(el=>el?.setAttribute('aria-pressed',listening?'true':'false'));
  });
}
function init(){
  if(!document.body||!bridge())return setTimeout(init,60);
  ensureGuide();
  renderGuide();
  enhanceAccessibility();
  renderIntentMenu();
  bindObservers();
  bindEvents();
  window.MajalisExperienceV11518={version:VERSION,renderGuide,renderIntentMenu,overallCompletion};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
