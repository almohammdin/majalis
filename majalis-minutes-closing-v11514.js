(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.14';
const STORAGE_KEY='majalis_tool_draft_v1_9_6';
const MODE_LEGACY='legacy';
const MODE_CUSTOM='custom-only';
const app=window.MajalisApp;
if(!app)return;

const clone=v=>JSON.parse(JSON.stringify(v??null));
const normalizeMode=v=>v===MODE_CUSTOM?MODE_CUSTOM:v===MODE_LEGACY?MODE_LEGACY:null;
const closingInput=()=>document.getElementById('closingNote');

function meaningful(payload){
  const f=payload?.fields||{};
  return !!String(f.entityName||'').trim()||!!String(f.meetingTitle||'').trim()||(Array.isArray(payload?.attendees)&&payload.attendees.length>0)||(Array.isArray(payload?.agendaItems)&&payload.agendaItems.length>0);
}
function initialState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){
      const payload=JSON.parse(raw),f=payload?.fields||{},stored=normalizeMode(f.minutesClosingMode);
      return {mode:stored||MODE_LEGACY,hadField:!!stored,isNew:false,originalClosingValue:String(f.closingNote||''),closingEdited:false};
    }
  }catch{}
  // Safe default: unknown/blank state is not treated as custom until a real new meeting is started.
  return {mode:MODE_LEGACY,hadField:false,isNew:false,originalClosingValue:'',closingEdited:false};
}
let state=initialState();

function modeField(){return document.getElementById('minutesClosingMode')}
function removeModeField(){modeField()?.remove()}
function ensureModeField(value){
  let el=modeField();
  if(!el){
    el=document.createElement('input');
    el.type='hidden';el.id='minutesClosingMode';
    (document.querySelector('.main-card')||document.body).appendChild(el);
  }
  el.value=value;
  return el;
}
function syncModeField(){
  if(state.mode===MODE_CUSTOM)ensureModeField(MODE_CUSTOM);
  else if(state.hadField)ensureModeField(MODE_LEGACY);
  else removeModeField();
}
function setFromSnapshot(payload){
  const f=payload?.fields||{},stored=normalizeMode(f.minutesClosingMode);
  state={mode:stored||MODE_LEGACY,hadField:!!stored,isNew:false,originalClosingValue:String(f.closingNote||''),closingEdited:false};
  syncModeField();
}
function setNewMeeting(){
  state={mode:MODE_CUSTOM,hadField:true,isNew:true,originalClosingValue:'',closingEdited:false};
  syncModeField();
}
function effectiveCustom(){return state.mode===MODE_CUSTOM||state.closingEdited}

function writeMode(snapshot){
  if(!snapshot||typeof snapshot!=='object')return snapshot;
  if(!snapshot.fields||typeof snapshot.fields!=='object')snapshot.fields={};
  if(state.mode===MODE_CUSTOM)snapshot.fields.minutesClosingMode=MODE_CUSTOM;
  else if(state.hadField)snapshot.fields.minutesClosingMode=MODE_LEGACY;
  else delete snapshot.fields.minutesClosingMode;
  return snapshot;
}

const baseCapture=app.captureSnapshot?.bind(app);
if(baseCapture&&!app.__minutesClosingCapture11514){
  app.captureSnapshot=()=>writeMode(baseCapture());
  app.__minutesClosingCapture11514=true;
}
const baseApply=app.applySnapshot?.bind(app);
if(baseApply&&!app.__minutesClosingApply11514){
  app.applySnapshot=(payload,options={})=>{
    setFromSnapshot(payload);
    const out=baseApply(payload,options);
    queueApply();
    return out;
  };
  app.__minutesClosingApply11514=true;
}
const baseNew=app.startNewMeetingFromOrganization?.bind(app);
if(baseNew&&!app.__minutesClosingNew11514){
  app.startNewMeetingFromOrganization=settings=>{
    setNewMeeting();
    const out=baseNew(settings);
    syncModeField();
    queueApply();
    return out;
  };
  app.__minutesClosingNew11514=true;
}
window.addEventListener('majalis:assistant-new-meeting',()=>{setNewMeeting();queueApply()});

if(!Storage.prototype.__majalisMinutesClosing11514){
  const rawSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(String(key)===STORAGE_KEY){
      try{
        const payload=JSON.parse(String(value));
        if(payload&&typeof payload==='object')value=JSON.stringify(writeMode(payload));
      }catch{}
    }
    return rawSet.call(this,key,value);
  };
  Storage.prototype.__majalisMinutesClosing11514=true;
}

function applyClosingMode(){
  if(!effectiveCustom())return;
  const doc=document.getElementById('docMinutes');
  if(!doc)return;
  doc.querySelectorAll('.llc-ballot-note').forEach(node=>node.remove());
  const text=String(closingInput()?.value||'').trim();
  if(text){
    const matches=Array.from(doc.querySelectorAll('.free-paragraph')).filter(node=>String(node.textContent||'').trim()===text);
    matches.slice(1).forEach(node=>node.remove());
  }
}
let queued=false;
function queueApply(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;applyClosingMode()}));
}
const baseRender=window.renderDocuments;
if(typeof baseRender==='function'&&!baseRender.__minutesClosing11514){
  const wrapped=function(){const out=baseRender.apply(this,arguments);applyClosingMode();return out};
  wrapped.__minutesClosing11514=true;
  window.renderDocuments=wrapped;
}

function handleClosingEdit(value){
  state.closingEdited=String(value??'')!==state.originalClosingValue;
  // Preview changes immediately, but persistence remains legacy until explicit save.
  setTimeout(()=>{if(typeof window.renderDocuments==='function')window.renderDocuments();else queueApply()},0);
}
document.addEventListener('input',event=>{
  if(event.target?.id!=='closingNote'||!event.isTrusted)return;
  handleClosingEdit(event.target.value);
},{capture:true});

function isExplicitMeetingSave(target){
  const control=target?.closest?.('button,input[type="button"],input[type="submit"],[role="button"]');
  if(!control)return false;
  const id=String(control.id||'').toLowerCase();
  const action=String(control.dataset?.action||'').toLowerCase();
  const text=String(control.textContent||control.value||'').replace(/\s+/g,' ').trim();
  return text.includes('حفظ الاجتماع')||((id.includes('save')||id.includes('حفظ'))&&id.includes('meeting'))||(action.includes('save')&&action.includes('meeting'))||id==='saveadminmeeting';
}
function commitCustomModeIfNeeded(){
  if(!state.closingEdited)return;
  state.mode=MODE_CUSTOM;
  state.hadField=true;
  state.isNew=false;
  state.originalClosingValue=String(closingInput()?.value||'');
  state.closingEdited=false;
  ensureModeField(MODE_CUSTOM); // captured by the core collectFormValues() in the same save.
  applyClosingMode();
}
document.addEventListener('click',event=>{
  if(!isExplicitMeetingSave(event.target))return;
  commitCustomModeIfNeeded();
},{capture:true});
document.addEventListener('submit',event=>{
  const submitter=event.submitter;
  if(submitter&&isExplicitMeetingSave(submitter))commitCustomModeIfNeeded();
},{capture:true});

const observer=new MutationObserver(()=>{if(effectiveCustom())queueApply()});
observer.observe(document.body,{childList:true,subtree:true});
syncModeField();
applyClosingMode();

const testMode=location.pathname.includes('/tests/')||new URLSearchParams(location.search).has('majalis_test');
window.MajalisMinutesClosingMode={
  version:VERSION,
  getMode:()=>state.mode,
  isPreviewCustom:()=>effectiveCustom(),
  snapshot:()=>clone(state),
  apply:applyClosingMode,
  ...(testMode?{_test:{edit:value=>{if(closingInput())closingInput().value=value;handleClosingEdit(value)},save:commitCustomModeIfNeeded,reopen:setFromSnapshot,newMeeting:setNewMeeting}}:{})
};
})();
