(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.9';
const LABEL=`v${VERSION}`;
const app=window.MajalisApp;
if(!app)return;
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const pct=(v,t)=>t>0?Number((n(v)*100/n(t)).toFixed(2)):0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const present=p=>['inperson','remote'].includes(String(p?.attendance||p?.status||''));
const clone=v=>JSON.parse(JSON.stringify(v??null));
const entityKey=v=>String(v||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0600-\u06FFA-Za-z0-9]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const RIADA='شركة ريادة الدولية للفنادق والمنتجعات السياحية المحدودة';
const countPartners=x=>({1:'شريك واحد',2:'شريكان',3:'ثلاثة شركاء',4:'أربعة شركاء',5:'خمسة شركاء',6:'ستة شركاء',7:'سبعة شركاء',8:'ثمانية شركاء',9:'تسعة شركاء',10:'عشرة شركاء'}[x]||`${x} شريكا`);
const verb=x=>x===1?'يملك':x===2?'يملكان':'يملكون';

function fieldsOf(snap){return snap?.fields||{}}
function isLlcPartners(snap){const f=fieldsOf(snap);return f.entityType==='llc'&&f.meetingType==='partners'}
function isRiada(snap){return isLlcPartners(snap)&&entityKey(fieldsOf(snap).entityName).includes(entityKey(RIADA))}
function basisOf(snap){return fieldsOf(snap).votingRightsBasis||snap?.ownershipSnapshot?.votingBasis||'equalUnits'}
function totalRights(snap){const f=fieldsOf(snap),basis=basisOf(snap);if(basis==='none')return 0;if(basis==='equalUnits')return n(f.capitalTotalUnits||snap?.ownershipSnapshot?.totalUnits);return n(f.capitalTotalVotes||snap?.ownershipSnapshot?.totalVotes)}
function participantWeight(p,snap){const basis=basisOf(snap);if(basis==='none')return 0;const units=n(p?.ownedUnits)+n(p?.proxyUnits);if(basis==='equalUnits')return units;return n(p?.ownedVotes)+n(p?.proxyVotes)}
function votersOf(snap){return (snap?.attendees||[]).filter(p=>present(p)&&participantWeight(p,snap)>0)}
function representedRights(snap){return votersOf(snap).reduce((sum,p)=>sum+participantWeight(p,snap),0)}

function normalizeSnapshot(input){
  const snap=clone(input)||{};
  const attendees=Array.isArray(snap.attendees)?snap.attendees:[],attendance=new Map(attendees.map(p=>[String(p?.id??''),p]));
  const own=snap.ownershipSnapshot;
  if(own&&Array.isArray(own.participants)){
    own.participants=own.participants.map(p=>{
      const a=attendance.get(String(p?.id??''))||p,isPresent=present(a),units=n(p?.ownedUnits)+n(p?.proxyUnits),votes=participantWeight({...p,...a},snap);
      return {...p,representedUnits:isPresent?units:0,representedVotes:isPresent?votes:0};
    });
    own.representedVotes=own.participants.reduce((s,p)=>s+n(p.representedVotes),0);
    own.representedUnits=own.participants.reduce((s,p)=>s+n(p.representedUnits),0);
  }
  return snap;
}

const originalCapture=app.captureSnapshot?.bind(app);
if(originalCapture&&!app.__v1159Capture){
  app.captureSnapshot=()=>normalizeSnapshot(originalCapture());
  app.__v1159Capture=true;
}
const originalApply=app.applySnapshot?.bind(app);
if(originalApply&&!app.__v1159Apply){
  app.applySnapshot=(payload,options={})=>{const out=originalApply(normalizeSnapshot(payload),options);setTimeout(scheduleApply,0);return out};
  app.__v1159Apply=true;
}

function normalizeStoredPayload(value){
  if(!value||typeof value!=='object')return value;
  return normalizeSnapshot(value);
}
if(!Storage.prototype.__majalisV1159){
  const rawSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(/^majalis_tool_draft_/i.test(String(key))){
      try{value=JSON.stringify(normalizeStoredPayload(JSON.parse(String(value))))}catch{}
    }
    return rawSet.call(this,key,value);
  };
  Storage.prototype.__majalisV1159=true;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);if(!/^majalis_tool_draft_/i.test(String(key)))continue;
      const raw=localStorage.getItem(key);if(!raw)continue;
      localStorage.setItem(key,raw);
    }
  }catch{}
}

function current(){try{return normalizeSnapshot(app.captureSnapshot())}catch{return null}}
function parseThresholdText(v){const s=String(v||''),m=s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);return m?{p:n(m[1]),op:s.includes('أكثر من')?'moreThan':'atLeast'}:null}
function requiredFor(item,snap){
  if(isRiada(snap))return {p:75,op:'atLeast'};
  const f=fieldsOf(snap),explicit=n(f.decisionThresholdPercent);if(explicit>0)return {p:explicit,op:f.decisionThresholdOperator==='moreThan'?'moreThan':'atLeast'};
  return parseThresholdText(item?.decisionCardOutcome?.threshold)||null;
}
function itemResult(item,snap){
  if(!isLlcPartners(snap)||!item)return null;
  const people=votersOf(snap),total=totalRights(snap),represented=representedRights(snap),votes=item.participantVotes||{};
  let yes=0,no=0,abs=0,yesPeople=0,selected=0;
  people.forEach(p=>{const q=String(votes[String(p.id)]||'لم يصوت'),w=participantWeight(p,snap);if(q==='موافق'){yes+=w;yesPeople++;selected++}else if(q==='غير موافق'){no+=w;selected++}else if(q==='ممتنع'){abs+=w;selected++}});
  if(!selected){yes=n(item.votesFor);no=n(item.votesAgainst);abs=n(item.votesAbstain);if(yes>0&&yes===represented&&no===0&&abs===0)yesPeople=people.length}
  const approval=pct(yes,total),required=requiredFor(item,snap),approved=required?(required.op==='moreThan'?approval>required.p:approval>=required.p):null;
  const minute=yesPeople?`صوّت بالموافقة ${countPartners(yesPeople)} ${verb(yesPeople)} (${yes}) حصة من أصل (${total}) حصة في رأس مال الشركة، تمثل نسبة (${approval}%) من إجمالي رأس المال.`:`بلغت الحصص الموافقة (${yes}) حصة من أصل (${total}) حصة في رأس مال الشركة، تمثل نسبة (${approval}%) من إجمالي رأس المال.`;
  const legal=isRiada(snap)?' وفقًا للمادة الثامنة من عقد التأسيس':'';
  const final=required?`${minute.slice(0,-1)}، ${approved?'واعتمد القرار لتحقق':'ولم يعتمد القرار لعدم تحقق'} النسبة المطلوبة البالغة ${required.p}% ${required.op==='moreThan'?'بما يزيد على':'على الأقل'}${legal}.`:minute;
  return {people,total,represented,yes,no,abs,yesPeople,approval,required,approved,minute,final};
}
function setText(el,value){if(el&&el.textContent!==String(value))el.textContent=String(value)}
function removeAll(sel,root=document){root.querySelectorAll(sel).forEach(el=>el.remove())}
function ensureAfter(parent,selector,className,text){if(!parent)return null;let el=parent.querySelector(selector);if(!el){el=document.createElement('div');el.className=className;parent.appendChild(el)}setText(el,text);return el}
function stamp(){document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>setText(el,LABEL));if(window.MajalisVersion){window.MajalisVersion.version=VERSION;window.MajalisVersion.label=LABEL}if(window.MajalisDecisionCard)window.MajalisDecisionCard.version=VERSION}

function applyOwnership(snap){
  const represented=representedRights(snap),total=totalRights(snap),ratio=pct(represented,total);
  document.querySelectorAll('.ownership-summary-card,#docOwnership .ownership-doc-summary>div').forEach(card=>{
    const label=card.querySelector('span')?.textContent||'';if(!label.includes('حقوق التصويت الممثلة'))return;
    setText(card.querySelector('strong'),represented);setText(card.querySelector('small'),`من أصل ${total} (${ratio}%)`);
  });
  document.querySelectorAll('.vote-count-status').forEach(el=>setText(el,`حقوق التصويت الممثلة في الاجتماع: ${represented} من أصل ${total} (${ratio}%).`));
}
function applyManagement(snap){
  const items=snap.agendaItems||[];
  document.querySelectorAll('[data-management-agenda-id]').forEach(card=>{
    const item=items.find(x=>String(x.id)===String(card.dataset.managementAgendaId)),r=itemResult(item,snap),grid=card.querySelector('.vote-counts-grid');if(!r||!grid)return;
    removeAll('.majalis-vote-percentages,.llc-v1157-management-summary,.llc-v1158-management-summary,.llc-v1156-management-summary',grid);
    ensureAfter(grid,'.majalis-v1159-management-summary','majalis-v1159-management-summary',`الحصص الموافقة: ${r.yes} من ${r.total}، بنسبة ${r.approval}% من إجمالي رأس المال. حقوق التصويت الممثلة: ${r.represented} من أصل ${r.total}.`);
  });
}
function applyMinutes(snap){
  const items=snap.agendaItems||[],rows=Array.from(document.querySelectorAll('#docMinutes .minutes-table tbody tr'));
  items.forEach((item,i)=>{const row=rows[i],r=itemResult(item,snap);if(!row||!r)return;removeAll('.vote-narrative,.decision-minutes-summary',row);if(r.yes+r.no+r.abs){const el=document.createElement('div');el.className='decision-minutes-summary majalis-v1159-minutes-summary';el.textContent=r.minute;row.cells?.[2]?.appendChild(el)}});
}
function applyDecisions(snap){
  const items=(snap.agendaItems||[]).filter(x=>x.decision||x.owner||x.dueDay||x.dueMonth||x.dueYear),rows=Array.from(document.querySelectorAll('#docDecisions table tbody tr'));
  items.forEach((item,i)=>{const cell=rows[i]?.cells?.[1],r=itemResult(item,snap);if(!cell||!r)return;removeAll('.decision-vote-summary,.llc-v1157-decision-summary,.llc-v1158-decision-summary,.llc-v1156-decision-summary,.majalis-v1159-decision-summary',cell);if(r.yes+r.no+r.abs){const el=document.createElement('div');el.className='majalis-v1159-decision-summary';el.textContent=r.minute;cell.appendChild(el)}});
}
function applyBallots(){removeAll('#docVoting .majalis-ballot-results,#docVoting .majalis-vote-percentages')}
function applyTally(snap){
  const items=(snap.agendaItems||[]).filter(x=>x.vote&&x.vote!=='لم يجر تصويت'),rows=Array.from(document.querySelectorAll('#docTally .vote-tally-table tbody tr'));
  items.forEach((item,i)=>{const row=rows[i],r=itemResult(item,snap);if(!row||!r||row.cells.length<7)return;
    row.cells[2].innerHTML=`<strong class="latin-number">${r.yes}</strong><small class="majalis-v1159-pct">${r.approval}% من إجمالي رأس المال</small>`;
    row.cells[3].innerHTML=`<strong class="latin-number">${r.no}</strong>`;
    row.cells[4].innerHTML=`<strong class="latin-number">${r.abs}</strong>`;
    row.cells[5].innerHTML=`<strong class="latin-number">${r.yes+r.no+r.abs}</strong><small class="majalis-v1159-pct">الحقوق الممثلة ${r.represented} من ${r.total}</small>`;
    const req=r.required?`${r.required.p}% ${r.required.op==='moreThan'?'بما يزيد على':'على الأقل'}`:'';
    row.cells[6].innerHTML=`${r.approved===true?'اعتمد القرار':r.approved===false?'لم يعتمد القرار':esc(item.vote||'')}<small class="majalis-v1159-pct">${r.yes} من ${r.total} (${r.approval}%)${req?` — المطلوب ${esc(req)}`:''}${isRiada(snap)?' وفقًا للمادة الثامنة من عقد التأسيس':''}</small>`;
  });
}
function applyDecisionResult(snap){
  const id=String(document.getElementById('decisionCardAgendaId')?.value||''),item=(snap.agendaItems||[]).find(x=>String(x.id)===id),r=itemResult(item,snap);if(!r)return;
  const tally=document.getElementById('decisionTally');if(tally){const summary=tally.querySelector('.decision-card-summary');if(summary)summary.innerHTML=`<div><span>الشركاء الموافقون</span><strong>${r.yesPeople}</strong></div><div><span>الحصص الموافقة</span><strong>${r.yes}</strong></div><div><span>إجمالي رأس المال</span><strong>${r.total}</strong></div><div><span>نسبة الموافقة من رأس المال</span><strong>${r.approval}%</strong></div>`;const preview=tally.querySelector('.decision-card-preview');if(preview)preview.innerHTML=`${esc(r.final)}<br><strong>${r.approved===true?'اعتمد القرار':r.approved===false?'لم يعتمد القرار':'بانتظار الاعتماد'}</strong>`}
  document.querySelectorAll('#docDecisionCard .decision-result').forEach(node=>{const p=node.querySelector('p');if(p)setText(p,r.final);const status=node.querySelector('.decision-result-status');if(status)setText(status,r.approved===true?'اعتمد القرار':r.approved===false?'لم يعتمد القرار':'بانتظار الاعتماد')});
  const out=document.getElementById('docDecisionResult');out?.querySelectorAll('.dr-grid>div').forEach(node=>{const label=node.querySelector('span')?.textContent||'',strong=node.querySelector('strong');if(label.includes('الموافقة من الحقوق الممثلة')){node.remove();return}if(label.includes('نسبة الموافقة المعتمدة')&&strong)setText(strong,`${r.approval}%`);if(label.includes('النسبة المطلوبة')&&strong&&r.required)setText(strong,`${r.required.p}% ${r.required.op==='moreThan'?'بما يزيد على':'على الأقل'}`)});const status=out?.querySelector('.dr-status strong');if(status)setText(status,r.approved===true?'اعتمد القرار':r.approved===false?'لم يعتمد القرار':'بانتظار الاعتماد');
}
function applyAll(){
  const snap=current();if(!snap){stamp();return}stamp();if(!isLlcPartners(snap))return;
  document.body.classList.add('majalis-llc-v1159');
  removeAll('.majalis-vote-percentages,.majalis-ballot-results,.vote-narrative,#docTally .majalis-tally-pct,#docDecisions .decision-vote-summary,.decision-represented-note,.decision-basis-note');
  applyOwnership(snap);applyManagement(snap);applyMinutes(snap);applyDecisions(snap);applyBallots();applyTally(snap);applyDecisionResult(snap);
}
let queued=false;
function scheduleApply(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;applyAll()}))}
const style=document.createElement('style');style.id='majalisFinalV1159Styles';style.textContent=`.majalis-v1159-management-summary,.majalis-v1159-decision-summary,.majalis-v1159-minutes-summary{margin-top:7px;padding:7px 9px;border-right:3px solid var(--gold);background:#FFF9E9;border-radius:7px;font-size:10px;line-height:1.75;color:#514823}.majalis-v1159-pct{display:block;font-size:8px;color:var(--muted);line-height:1.45}body.majalis-llc-v1159 .majalis-vote-percentages,body.majalis-llc-v1159 .majalis-ballot-results,body.majalis-llc-v1159 .vote-narrative,body.majalis-llc-v1159 #docTally .majalis-tally-pct,body.majalis-llc-v1159 #docDecisions .decision-vote-summary,body.majalis-llc-v1159 .decision-represented-note,body.majalis-llc-v1159 .decision-basis-note{display:none!important}`;document.head.appendChild(style);
const baseRender=window.renderDocuments;if(typeof baseRender==='function'&&!baseRender.__v1159){const wrapped=function(){const out=baseRender.apply(this,arguments);applyAll();return out};wrapped.__v1159=true;window.renderDocuments=wrapped}
const observer=new MutationObserver(scheduleApply);observer.observe(document.body,{childList:true,subtree:true,characterData:true});
document.addEventListener('input',scheduleApply,true);document.addEventListener('change',scheduleApply,true);
window.MajalisFinalV1159={version:VERSION,normalizeSnapshot,itemResult,representedRights,apply:applyAll};
applyAll();
})();
