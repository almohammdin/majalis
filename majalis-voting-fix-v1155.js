(()=>{
'use strict';
const V='1.15.5';
const $=id=>document.getElementById(id);
const num=v=>Number(v)||0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const pct=(v,t)=>num(t)>0?Number((num(v)*100/num(t)).toFixed(2)):0;
const llc=()=>$('entityType')?.value==='llc'&&$('meetingType')?.value==='partners'&&typeof ownershipRegisterEnabled==='function'&&ownershipRegisterEnabled()&&typeof ownershipVotingBasis==='function'&&ownershipVotingBasis()!=='none';
const present=p=>['inperson','remote'].includes(String((typeof normalizeParticipant==='function'?normalizeParticipant(p):p)?.attendance||''));
const participants=()=>typeof votingParticipants==='function'?votingParticipants():(attendees.map(normalizeParticipant).filter(p=>present(p)&&participantVotingWeight(p)>0));
const choice=(item,p)=>typeof normalizeParticipantVoteChoice==='function'?normalizeParticipantVoteChoice(item?.participantVotes?.[String(p.id)]):String(item?.participantVotes?.[String(p.id)]||'لم يصوت');
const selected=()=>{const id=String($('decisionCardAgendaId')?.value||'');return agendaItems.find(x=>String(x.id)===id)||null};
function parseThreshold(value){const s=String(value||''),m=s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);return m?{p:num(m[1]),op:s.includes('أكثر من')?'moreThan':'atLeast'}:null}
function thresholdLabel(t){return !t?'':t.op==='moreThan'?`أكثر من ${t.p}%`:`${t.p}% على الأقل`}
function threshold(item){
  const mode=$('decisionThresholdMode')?.value||'auto';
  if(mode==='none')return null;
  const explicit=num($('decisionThresholdPercent')?.value);
  const op=$('decisionThresholdOperator')?.value==='moreThan'?'moreThan':'atLeast';
  if(explicit>0)return {p:explicit,op,source:'explicit'};
  const own=parseThreshold(item?.decisionCardOutcome?.threshold);
  if(own&&!(own.p===50&&own.op==='moreThan'))return {...own,source:'stored'};
  const shared=agendaItems.map(a=>parseThreshold(a?.decisionCardOutcome?.threshold)).find(t=>t&&!(t.p===50&&t.op==='moreThan'));
  if(shared)return {...shared,source:'stored'};
  if(mode==='custom')return null;
  return llc()?{p:50,op:'moreThan',source:'general'}:own;
}
const count=n=>({1:'شريك واحد',2:'شريكان',3:'ثلاثة شركاء',4:'أربعة شركاء',5:'خمسة شركاء',6:'ستة شركاء',7:'سبعة شركاء',8:'ثمانية شركاء',9:'تسعة شركاء',10:'عشرة شركاء'}[n]||`${n} شريكا`);
const verb=n=>n===1?'يملك':n===2?'يملكان':'يملكون';
function calc(item){
  if(!llc()||!item)return null;
  const people=participants(),total=num(typeof capitalVotesTotal==='function'?capitalVotesTotal():0),represented=num(typeof representedVotingRights==='function'?representedVotingRights():0);
  const c={yes:0,no:0,abs:0,none:0},r={yes:0,no:0,abs:0,none:0};
  people.forEach(p=>{const q=choice(item,p),w=num(participantVotingWeight(p)),k=q==='موافق'?'yes':q==='غير موافق'?'no':q==='ممتنع'?'abs':'none';c[k]++;r[k]+=w});
  const per=pct(r.yes,total),th=threshold(item),ok=th&&total>0?(th.op==='moreThan'?per>th.p:per>=th.p):null;
  const need=th?(th.op==='moreThan'?`أكثر من (${th.p}%)`:`(${th.p}%) على الأقل`):'';
  let sentence='';
  if(total>0){
    sentence=c.yes?`صوّت بالموافقة ${count(c.yes)} ${verb(c.yes)} (${r.yes}) حصة من أصل (${total}) حصة في رأس مال الشركة، تمثل نسبة (${per}%) من إجمالي رأس المال`:`لم يصوّت أي شريك بالموافقة، وتمثل الحصص الموافقة (0) حصة من أصل (${total}) حصة في رأس مال الشركة، بنسبة (0%) من إجمالي رأس المال`;
    sentence+=th?(ok?`، واعتمد القرار لتحقق النسبة المطلوبة البالغة ${need}.`:`، ولم يعتمد القرار لعدم تحقق النسبة المطلوبة البالغة ${need}.`):'.';
  }
  return {people,total,represented,c,r,per,th,ok,selected:c.yes+c.no+c.abs,sentence};
}
function norm(value){return String(value||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0600-\u06FFA-Za-z0-9]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase()}
function stripPrefix(value){return String(value||'').replace(/^\s*(?:[-•*]|[0-9٠-٩]+\s*[.\-):]|(?:أولا|أولاً|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً)\s*[:\-])\s*/u,'')}
function cleanDecision(items,index){
  const original=String(items[index]?.decision||'').trim();
  if(!original)return '';
  const later=items.slice(index+1),patterns=later.flatMap(x=>[x?.title,x?.decision]).map(norm).filter(x=>x.length>=8);
  if(!patterns.length)return original;
  let text=original;
  later.map(x=>String(x?.decision||'').trim()).filter(x=>x.length>=12).sort((a,b)=>b.length-a.length).forEach(raw=>{while(raw&&text.includes(raw))text=text.replace(raw,' ')});
  text=text.replace(/([.!؟؛])\s+/g,'$1\n').replace(/\s+(?=(?:[0-9٠-٩]+)\s*[.\-):]\s*)/gu,'\n').replace(/\s+(?=(?:أولا|أولاً|ثانيا|ثانياً|ثالثا|ثالثاً|رابعا|رابعاً)\s*[:\-])/gu,'\n');
  const kept=text.split(/\n+/).map(s=>s.trim()).filter(Boolean).filter(part=>{const n=norm(stripPrefix(part));if(!n)return false;return !patterns.some(p=>n.length>=8&&(n.includes(p)||p.includes(n)))});
  const out=kept.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  return out||original;
}
function replaceLeadingText(cell,text){if(!cell)return;Array.from(cell.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>n.remove());if(text)cell.insertBefore(document.createTextNode(text),cell.firstChild)}
function cleanDecisionDisplays(){
  if(!llc())return;
  const all=agendaItems.map(x=>typeof normalizeAgendaItem==='function'?normalizeAgendaItem(x):x),clean=all.map((x,i)=>cleanDecision(all,i));
  const minuteRows=Array.from(document.querySelectorAll('#docMinutes .minutes-table tbody tr'));
  all.forEach((x,i)=>replaceLeadingText(minuteRows[i]?.cells?.[2],clean[i]));
  const decisionRefs=all.map((x,i)=>({x,i})).filter(({x})=>x.decision||x.owner||x.dueDay||x.dueMonth||x.dueYear),decisionRows=Array.from(document.querySelectorAll('#docDecisions table tbody tr'));
  decisionRefs.forEach(({i},j)=>replaceLeadingText(decisionRows[j]?.cells?.[1],clean[i]));
  const tallyRefs=all.map((x,i)=>({x,i})).filter(({x})=>x.vote&&x.vote!=='لم يجر تصويت'),tallyRows=Array.from(document.querySelectorAll('#docTally .vote-tally-table tbody tr'));
  tallyRefs.forEach(({i},j)=>{const div=tallyRows[j]?.cells?.[1]?.querySelector('div');if(div)div.textContent=clean[i]});
  const ballotItems=all.map((x,i)=>({x,i})).filter(({x})=>x.includeInBallot);
  document.querySelectorAll('#docVoting .ballot-card:not(.blank-ballot-card)').forEach(card=>{
    const rows=Array.from(card.querySelectorAll('.ballot-table tbody tr'));
    ballotItems.forEach(({i},j)=>{const box=rows[j]?.querySelector('.ballot-decision');if(!box)return;const strong=box.querySelector('strong');Array.from(box.childNodes).filter(n=>n!==strong).forEach(n=>n.remove());if(clean[i])box.appendChild(document.createTextNode(` ${clean[i]}`))});
  });
  const cur=selected(),idx=cur?all.findIndex(x=>String(x.id)===String(cur.id)):-1;
  if(idx>=0){document.querySelectorAll('#docDecisionCard .decision-text').forEach(el=>el.textContent=clean[idx]);const p=$('docDecisionResult')?.querySelector('.dr-statement p');if(p)p.textContent=clean[idx]}
}
function ensureStyles(){
  if($('majalisVotingFix1155Styles'))return;
  const s=document.createElement('style');s.id='majalisVotingFix1155Styles';s.textContent=`
body.majalis-llc-partners-v1155 .majalis-vote-percentages,
body.majalis-llc-partners-v1155 .majalis-ballot-results,
body.majalis-llc-partners-v1155 .vote-narrative,
body.majalis-llc-partners-v1155 #docTally .majalis-tally-pct,
body.majalis-llc-partners-v1155 #docDecisions .decision-vote-summary,
body.majalis-llc-partners-v1155 .decision-represented-note,
body.majalis-llc-partners-v1155 .decision-basis-note{display:none!important}
.llc-v1155-management-summary,.llc-v1155-decision-summary{margin-top:7px;padding:7px 9px;border-right:3px solid var(--gold);background:#FFF9E9;border-radius:7px;font-size:10px;line-height:1.75;color:#514823}
`;
  document.head.appendChild(s);
}
function stamp(){document.querySelectorAll('.site-footer-wrap .version,.doc-footer-version').forEach(e=>e.textContent=`v${V}`);if(window.MajalisDecisionCard)window.MajalisDecisionCard.version=V}
function applySummaries(){
  const active=llc();document.body.classList.toggle('majalis-llc-partners-v1155',active);stamp();if(!active)return;
  const items=agendaItems;
  document.querySelectorAll('[data-management-agenda-id]').forEach(card=>{const item=items.find(x=>String(x.id)===String(card.dataset.managementAgendaId)),d=calc(item),grid=card.querySelector('.vote-counts-grid');if(!d||!grid)return;let n=grid.querySelector('.llc-v1155-management-summary');if(!n){n=document.createElement('div');n.className='llc-v1155-management-summary';grid.appendChild(n)}n.textContent=`الحصص الموافقة: ${d.r.yes} من ${d.total}، بنسبة ${d.per}% من إجمالي رأس المال${d.th?`، والنسبة المطلوبة ${thresholdLabel(d.th)}`:''}.`});
  const minuteRows=Array.from(document.querySelectorAll('#docMinutes .minutes-table tbody tr'));
  items.forEach((item,i)=>{const d=calc(item),row=minuteRows[i];if(!d||!row||!d.selected)return;let n=row.querySelector('.decision-minutes-summary');if(!n){n=document.createElement('div');n.className='decision-minutes-summary';row.cells?.[2]?.appendChild(n)}n.textContent=d.sentence});
  const decisionRefs=items.map((x,i)=>({x,i})).filter(({x})=>x.decision||x.owner||x.dueDay||x.dueMonth||x.dueYear),decisionRows=Array.from(document.querySelectorAll('#docDecisions table tbody tr'));
  decisionRefs.forEach(({x},j)=>{const d=calc(x),cell=decisionRows[j]?.cells?.[1];if(!d||!cell||!d.selected)return;let n=cell.querySelector('.llc-v1155-decision-summary');if(!n){n=document.createElement('div');n.className='llc-v1155-decision-summary';cell.appendChild(n)}n.textContent=d.sentence});
  const tallyRefs=items.filter(x=>x.vote&&x.vote!=='لم يجر تصويت'),tallyRows=Array.from(document.querySelectorAll('#docTally .vote-tally-table tbody tr'));
  tallyRefs.forEach((item,i)=>{const d=calc(item),cell=tallyRows[i]?.cells?.[6];if(!d||!cell)return;cell.innerHTML=`${esc(d.ok===true?'اعتمد القرار':d.ok===false?'لم يعتمد القرار':item.vote||'')}<small style="display:block">${d.per}% من إجمالي رأس المال (${d.r.yes} من ${d.total})${d.th?` — المطلوب ${esc(thresholdLabel(d.th))}`:''}</small>`});
  const cur=selected(),d=calc(cur),box=$('decisionTally');
  if(d&&box){const sum=box.querySelector('.decision-card-summary');if(sum)sum.innerHTML=`<div><span>الشركاء الموافقون</span><strong>${d.c.yes}</strong></div><div><span>الحصص الموافقة</span><strong>${d.r.yes}</strong></div><div><span>إجمالي رأس المال</span><strong>${d.total}</strong></div><div><span>نسبة الموافقة من رأس المال</span><strong>${d.per}%</strong></div>`;const prev=box.querySelector('.decision-card-preview');if(prev)prev.innerHTML=`${esc(d.sentence)}<br><strong>${d.ok===true?'اعتمد القرار':d.ok===false?'لم يعتمد القرار':'بانتظار تحديد نسبة الاعتماد'}</strong>`;if(d.th&&num($('decisionThresholdPercent')?.value)>0){const rule=$('decisionRule');if(rule)rule.innerHTML=`النسبة المطلوبة لهذا القرار: <strong>${esc(thresholdLabel(d.th))}</strong>.`}}
  if(d){document.querySelectorAll('#docDecisionCard .decision-result').forEach(r=>{const stats=r.querySelector('.decision-result-stats');if(stats)stats.innerHTML=`<div><span>الشركاء الموافقون</span><strong>${d.c.yes}</strong></div><div><span>الحصص الموافقة</span><strong>${d.r.yes}</strong></div><div><span>إجمالي رأس المال</span><strong>${d.total}</strong></div><div><span>نسبتها من إجمالي رأس المال</span><strong>${d.per}%</strong></div>`;const p=r.querySelector('p');if(p)p.textContent=d.sentence;const st=r.querySelector('.decision-result-status');if(st)st.textContent=`${d.ok===true?'اعتمد القرار':d.ok===false?'لم يعتمد القرار':'النتيجة بانتظار الاعتماد'}${d.th?` — النسبة المطلوبة ${thresholdLabel(d.th)}`:''}`});const out=$('docDecisionResult');out?.querySelectorAll('.dr-grid>div').forEach(e=>{const label=e.querySelector('span')?.textContent||'',strong=e.querySelector('strong');if(label.includes('الموافقة من الحقوق الممثلة')){e.remove();return}if(label.includes('نسبة الموافقة المعتمدة')&&strong)strong.textContent=`${d.per}%`;if(label.includes('النسبة المطلوبة')&&strong&&d.th)strong.textContent=thresholdLabel(d.th)});const rs=out?.querySelector('.dr-status strong');if(rs)rs.textContent=d.ok===true?'اعتمد القرار':d.ok===false?'لم يعتمد القرار':'بانتظار الاعتماد';out?.querySelectorAll('.dr-approval').forEach(e=>e.remove())}
}
function apply(){ensureStyles();cleanDecisionDisplays();applySummaries();stamp()}
const base=window.renderDocuments;if(typeof base==='function'&&!base.__v1155){const wrapped=function(){const r=base.apply(this,arguments);apply();return r};wrapped.__v1155=true;window.renderDocuments=wrapped}
document.addEventListener('input',e=>{if(['decisionThresholdPercent'].includes(e.target.id)||e.target.classList?.contains('agenda-result-input'))setTimeout(apply,0)},true);
document.addEventListener('change',e=>{if(['entityType','meetingType','enableOwnershipRegister','votingRightsBasis','decisionThresholdMode','decisionThresholdOperator','decisionThresholdPercent','decisionCardAgendaId'].includes(e.target.id)||e.target.classList?.contains('participant-vote-input')||e.target.classList?.contains('decision-vote')||e.target.classList?.contains('attendance-input'))setTimeout(apply,0)},true);
window.MajalisVotingFix1155={version:V,calculate:calc,cleanDecision,apply};
window.MajalisVotingFixSelfTest=()=>({approvalPercent:pct(380,500),approvedAtLeast75:pct(380,500)>=75,exact75AtLeast:75>=75,exact75MoreThan:75>75});
apply();
})();
