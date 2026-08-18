(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.10';
const LABEL=`v${VERSION}`;
const app=window.MajalisApp;
if(!app)return;
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const pct=(v,t)=>t>0?Number((n(v)*100/n(t)).toFixed(2)):0;
const present=p=>['inperson','remote'].includes(String(p?.attendance||p?.status||''));
function snapshot(){try{return app.captureSnapshot?.()||null}catch{return null}}
function totals(snap){
  const fields=snap?.fields||{},own=snap?.ownershipSnapshot||{},basis=fields.votingRightsBasis||own.votingBasis||'equalUnits',people=Array.isArray(snap?.attendees)?snap.attendees:[];
  const totalUnits=n(fields.capitalTotalUnits||own.totalUnits);
  const totalVotes=basis==='none'?0:basis==='equalUnits'?totalUnits:n(fields.capitalTotalVotes||own.totalVotes);
  const represented=people.filter(present).reduce((a,p)=>{
    const units=n(p?.ownedUnits)+n(p?.proxyUnits);
    const votes=basis==='none'?0:basis==='equalUnits'?units:n(p?.ownedVotes)+n(p?.proxyVotes);
    a.units+=units;a.votes+=votes;return a;
  },{units:0,votes:0});
  return {totalUnits,totalVotes,representedUnits:represented.units,representedVotes:represented.votes};
}
function setCard(card,value,total){
  if(!card)return;
  const strong=card.querySelector('strong'),small=card.querySelector('small');
  if(strong)strong.textContent=String(value);
  if(small)small.textContent=`من إجمالي ${total} (${pct(value,total)}%)`;
}
function apply(){
  const snap=snapshot();if(!snap)return;
  const f=snap.fields||{};if(f.entityType!=='llc'||f.meetingType!=='partners')return;
  const t=totals(snap);
  document.querySelectorAll('#docTally .ownership-doc-summary>div').forEach(card=>{
    const label=card.querySelector('span')?.textContent||'';
    if(label.includes('حقوق التصويت الممثلة'))setCard(card,t.representedVotes,t.totalVotes);
    else if(label.includes('الممثلة في الاجتماع'))setCard(card,t.representedUnits,t.totalUnits);
  });
  document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=LABEL);
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;apply()}))}
const base=window.renderDocuments;
if(typeof base==='function'&&!base.__v11510){const wrapped=function(){const out=base.apply(this,arguments);apply();return out};wrapped.__v11510=true;window.renderDocuments=wrapped}
const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);
window.MajalisFinalV11510={version:VERSION,totals,apply};
apply();
})();
