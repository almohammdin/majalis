(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.13';
const STORAGE_KEY='majalis_tool_draft_v1_9_6';
const app=window.MajalisApp;
if(!app)return;

const MODE_LEGACY='legacy';
const MODE_CUSTOM='custom-only';
const normalizeMode=value=>value===MODE_CUSTOM?MODE_CUSTOM:value===MODE_LEGACY?MODE_LEGACY:null;
const clone=value=>JSON.parse(JSON.stringify(value??null));

function meaningfulDraft(payload){
  const fields=payload?.fields||{};
  return !!String(fields.entityName||'').trim() || !!String(fields.meetingTitle||'').trim() || (Array.isArray(payload?.attendees)&&payload.attendees.length>0) || (Array.isArray(payload?.agendaItems)&&payload.agendaItems.length>0);
}
function initialState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return {mode:MODE_CUSTOM,hadField:true,isNew:true};
    const payload=JSON.parse(raw),fields=payload?.fields||{},stored=normalizeMode(fields.minutesClosingMode);
    if(stored)return {mode:stored,hadField:true,isNew:false};
    if(meaningfulDraft(payload))return {mode:MODE_LEGACY,hadField:false,isNew:false};
  }catch{}
  return {mode:MODE_CUSTOM,hadField:true,isNew:true};
}

let state={...initialState(),closingEdited:false,explicitSave:false};
const closingInput=()=>document.getElementById('closingNote');

function setFromSnapshot(payload){
  const fields=payload?.fields||{},stored=normalizeMode(fields.minutesClosingMode);
  state.mode=stored||MODE_LEGACY;
  state.hadField=!!stored;
  state.isNew=false;
  state.closingEdited=false;
  state.explicitSave=false;
}
function setNewMeeting(){
  state.mode=MODE_CUSTOM;
  state.hadField=true;
  state.isNew=true;
  state.closingEdited=false;
  state.explicitSave=false;
}
function writeModeToSnapshot(snapshot){
  const out=snapshot;
  if(!out||typeof out!=='object')return out;
  if(!out.fields||typeof out.fields!=='object')out.fields={};
  if(state.mode===MODE_CUSTOM){
    out.fields.minutesClosingMode=MODE_CUSTOM;
  }else if(state.hadField){
    out.fields.minutesClosingMode=MODE_LEGACY;
  }else{
    delete out.fields.minutesClosingMode;
  }
  return out;
}

const originalCapture=app.captureSnapshot?.bind(app);
if(originalCapture&&!app.__minutesClosingCapture11513){
  app.captureSnapshot=()=>writeModeToSnapshot(originalCapture());
  app.__minutesClosingCapture11513=true;
}

const originalApply=app.applySnapshot?.bind(app);
if(originalApply&&!app.__minutesClosingApply11513){
  app.applySnapshot=(payload,options={})=>{
    setFromSnapshot(payload);
    const out=originalApply(payload,options);
    queueApply();
    return out;
  };
  app.__minutesClosingApply11513=true;
}

const originalNew=app.startNewMeetingFromOrganization?.bind(app);
if(originalNew&&!app.__minutesClosingNew11513){
  app.startNewMeetingFromOrganization=settings=>{
    setNewMeeting();
    const out=originalNew(settings);
    queueApply();
    return out;
  };
  app.__minutesClosingNew11513=true;
}

// Preserve the mode in normal local draft saves only when the current meeting already owns a mode.
// Missing legacy fields remain missing; there is no migration or bulk rewrite.
if(!Storage.prototype.__majalisMinutesClosing11513){
  const rawSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(String(key)===STORAGE_KEY){
      try{
        const payload=JSON.parse(String(value));
        if(payload&&typeof payload==='object'){
          if(!payload.fields||typeof payload.fields!=='object')payload.fields={};
          if(state.mode===MODE_CUSTOM)payload.fields.minutesClosingMode=MODE_CUSTOM;
          else if(state.hadField)payload.fields.minutesClosingMode=MODE_LEGACY;
          else delete payload.fields.minutesClosingMode;
          value=JSON.stringify(payload);
        }
      }catch{}
    }
    return rawSet.call(this,key,value);
  };
  Storage.prototype.__majalisMinutesClosing11513=true;
}

function applyClosingMode(){
  if(state.mode!==MODE_CUSTOM)return;
  const doc=document.getElementById('docMinutes');
  if(!doc)return;
  doc.querySelectorAll('.llc-ballot-note').forEach(node=>node.remove());
  const text=String(closingInput()?.value||'').trim();
  if(text){
    const duplicates=Array.from(doc.querySelectorAll('.free-paragraph')).filter(node=>String(node.textContent||'').trim()===text);
    duplicates.slice(1).forEach(node=>node.remove());
  }
}

let queued=false;
function queueApply(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;applyClosingMode()}));
}

const currentRender=window.renderDocuments;
if(typeof currentRender==='function'&&!currentRender.__minutesClosing11513){
  const wrapped=function(){const out=currentRender.apply(this,arguments);applyClosingMode();return out};
  wrapped.__minutesClosing11513=true;
  window.renderDocuments=wrapped;
}

// Only a trusted user edit of the closing field can arm a legacy meeting for conversion.
document.addEventListener('input',event=>{
  if(event.target?.id!=='closingNote'||!event.isTrusted)return;
  state.closingEdited=true;
},{capture:true});

// Conversion happens only on the explicit cloud meeting save button.
document.addEventListener('click',event=>{
  if(!event.target?.closest?.('#saveAdminMeeting'))return;
  state.explicitSave=true;
  if(state.closingEdited){
    state.mode=MODE_CUSTOM;
    state.hadField=true;
    state.isNew=false;
    applyClosingMode();
  }
},{capture:true});

const observer=new MutationObserver(()=>{if(state.mode===MODE_CUSTOM)queueApply()});
observer.observe(document.body,{childList:true,subtree:true});

window.MajalisMinutesClosingMode={
  version:VERSION,
  getMode:()=>state.mode,
  isClosingEdited:()=>state.closingEdited,
  snapshot:()=>clone(state),
  apply:applyClosingMode
};

applyClosingMode();
})();
