(()=>{
'use strict';
const V=window.MAJALIS_VERSION||'1.15.7';
const $=id=>document.getElementById(id);
const num=v=>Number(v)||0;
const pct=(v,t)=>num(t)>0?Number((num(v)*100/num(t)).toFixed(2)):0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const entityKey=v=>String(v||'').normalize('NFKC').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0600-\u06FFA-Za-z0-9]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const RIADA_ENTITY='شركة ريادة الدولية للفنادق والمنتجعات السياحية المحدودة';
const RIADA_DECISIONS=[
'بعد الاطلاع على المادة الثامنة من عقد التأسيس، التي تشترط موافقة شركاء يمثلون 75% على الأقل لتصفية الشركة وتعيين المصفي، وعلى المادة الحادية عشرة المتعلقة بانقضاء الشركة؛ قرر الشركاء الموافقة على حل شركة ريادة الدولية للفنادق والمنتجعات السياحية المحدودة وانقضائها وتصفيتها اختيارياً.',
'بعد الاطلاع على المادة الثامنة من عقد التأسيس؛ قرر الشركاء تعيين الأستاذ جابر شراحيلي مصفياً للشركة لمدة ستة أشهر، بأتعاب قدرها (45,000) خمسة وأربعون ألف ريال، ومنحه الصلاحيات اللازمة لإتمام أعمال التصفية، وتحصيل حقوق الشركة، وسداد التزاماتها، وتمثيلها أمام الجهات المختصة، وإنهاء التراخيص والحسابات، وتوزيع صافي الموجودات على الشركاء، وشطب قيد الشركة بعد انتهاء أعمال التصفية.',
'قرر الشركاء تفويض السيد/ محمد حسن محمد الأمير بمتابعة أعمال المصفي واستلام التقارير المتعلقة بأعمال التصفية.'
];
const isLlcPartners=()=>$('entityType')?.value==='llc'&&$('meetingType')?.value==='partners';
const isRiadaMeeting=()=>isLlcPartners()&&entityKey($('entityName')?.value).includes(entityKey(RIADA_ENTITY));
const present=p=>['inperson','remote'].includes(String(normalizeParticipant(p)?.attendance||''));
const voters=()=>attendees.map(normalizeParticipant).filter(p=>present(p)&&participantVotingWeight(p)>0);
const voteChoice=(item,p)=>normalizeParticipantVoteChoice(item?.participantVotes?.[String(p.id)]);
const countPartners=n=>({1:'شريك واحد',2:'شريكان',3:'ثلاثة شركاء',4:'أربعة شركاء',5:'خمسة شركاء',6:'ستة شركاء',7:'سبعة شركاء',8:'ثمانية شركاء',9:'تسعة شركاء',10:'عشرة شركاء'}[n]||`${n} شريكا`);
const verb=n=>n===1?'يملك':n===2?'يملكان':'يملكون';

function prepareRiadaMeeting(){
  if(!isRiadaMeeting())return false;
  let changed=false;
  if(agendaItems.length>=3){
    const first=String(agendaItems[0]?.decision||'');
    const combined=entityKey(first).includes(entityKey('تعيين الأستاذ جابر شراحيلي'))||entityKey(first).includes(entityKey('محمد حسن محمد الأمير'));
    if(combined){agendaItems[0].decision=RIADA_DECISIONS[0];changed=true}
    if(!String(agendaItems[1]?.decision||'').trim()){agendaItems[1].decision=RIADA_DECISIONS[1];changed=true}
    const third=String(agendaItems[2]?.decision||'').trim();
    if(!third){agendaItems[2].decision=RIADA_DECISIONS[2];changed=true}
    else if(/محمد\s+حسن\s+محمد\s+الامير/u.test(third)){agendaItems[2].decision=third.replace(/محمد\s+حسن\s+محمد\s+الامير/gu,'محمد حسن محمد الأمير');changed=true}
  }
  const mode=$('decisionThresholdMode'),percent=$('decisionThresholdPercent'),operator=$('decisionThresholdOperator');
  if(mode&&mode.value!=='custom'){mode.value='custom';changed=true}
  if(percent&&String(percent.value)!=='75'){percent.value='75';changed=true}
  if(operator&&operator.value!=='atLeast'){operator.value='atLeast';changed=true}
  if(changed&&typeof scheduleAutoSave==='function')scheduleAutoSave();
  return changed;
}

function result(item){
  if(!isLlcPartners()||!item)return null;
  const people=voters(),total=num(capitalVotesTotal()),represented=people.reduce((s,p)=>s+num(participantVotingWeight(p)),0);
  let yes=0,no=0,abs=0,yesPeople=0;
  people.forEach(p=>{const q=voteChoice(item,p),w=num(participantVotingWeight(p));if(q==='موافق'){yes+=w;yesPeople++}else if(q==='غير موافق')no+=w;else if(q==='ممتنع')abs+=w});
  const approval=pct(yes,total),required=isRiadaMeeting()?75:num($('decisionThresholdPercent')?.value||75),approved=approval>=required;
  const legal=isRiadaMeeting()?' وفقًا للمادة الثامنة من عقد التأسيس':'';
  const sentence=`صوّت بالموافقة ${countPartners(yesPeople)} ${verb(yesPeople)} (${yes}) حصة من أصل (${total}) حصة في رأس مال الشركة، تمثل نسبة (${approval}%) من إجمالي رأس المال، ${approved?'واعتمد القرار لتحقق':'ولم يعتمد القرار لعدم تحقق'} النسبة المطلوبة البالغة ${required}% على الأقل${legal}.`;
  return {people,total,represented,yes,no,abs,yesPeople,approval,required,approved,sentence};
}

function rebuildBallots(){
  if(!isLlcPartners()||!$('docVoting')||!$('enableVotingCard')?.checked||$('votingCardMode')?.value==='blank')return;
  const items=agendaItems.map(normalizeAgendaItem).filter(x=>x.includeInBallot),people=voters();
  const pages=people.length?people.map((p,i)=>`<section class="individual-document-page">${commonMeta()}${ballotParticipantCard(p,i,items)}</section>`).join(''):'<div class="document-empty-note">لا توجد بطاقات تصويت للشركاء الغائبين.</div>';
  $('docVoting').innerHTML=commonHeader('بطاقة تصويت','وثيقة التصويت')+`<div class="doc-body">${pages}</div>`+footer();
}

function purgeLegacyPercentages(){
  if(!isLlcPartners())return;
  document.querySelectorAll('.majalis-vote-percentages,.majalis-ballot-results,.vote-narrative,#docTally .majalis-tally-pct,#docDecisions .decision-vote-summary,.decision-represented-note,.decision-basis-note').forEach(el=>el.remove());
}

function reinforceRepresentedRights(){
  if(!isLlcPartners())return;
  const represented=voters().reduce((s,p)=>s+num(participantVotingWeight(p)),0),total=num(capitalVotesTotal()),ratio=pct(represented,total);
  document.querySelectorAll('.ownership-summary-card,#docOwnership .ownership-doc-summary>div').forEach(card=>{const label=card.querySelector('span')?.textContent||'';if(!label.includes('حقوق التصويت الممثلة'))return;const strong=card.querySelector('strong'),small=card.querySelector('small');if(strong)strong.textContent=String(represented);if(small)small.textContent=`من أصل ${total} (${ratio}%)`});
  document.querySelectorAll('.vote-count-status').forEach(el=>{if((el.textContent||'').includes('حقوق التصويت الممثلة'))el.textContent=`حقوق التصويت الممثلة في الاجتماع: ${represented} من أصل ${total}.`});
}

function applyResults(){
  if(!isLlcPartners())return;
  const minuteRows=Array.from(document.querySelectorAll('#docMinutes .minutes-table tbody tr'));
  agendaItems.forEach((item,i)=>{const r=result(item),row=minuteRows[i];if(!r||!row||!(r.yes+r.no+r.abs))return;let n=row.querySelector('.decision-minutes-summary');if(!n){n=document.createElement('div');n.className='decision-minutes-summary';row.cells?.[2]?.appendChild(n)}n.textContent=r.sentence});
  const decisionItems=agendaItems.filter(x=>x.decision||x.owner||x.dueDay||x.dueMonth||x.dueYear),decisionRows=Array.from(document.querySelectorAll('#docDecisions table tbody tr'));
  decisionItems.forEach((item,i)=>{const r=result(item),cell=decisionRows[i]?.cells?.[1];if(!r||!cell||!(r.yes+r.no+r.abs))return;let n=cell.querySelector('.llc-v1157-decision-summary');if(!n){n=document.createElement('div');n.className='llc-v1157-decision-summary';cell.appendChild(n)}n.textContent=r.sentence});
  const tallyItems=agendaItems.filter(x=>x.vote&&x.vote!=='لم يجر تصويت'),tallyRows=Array.from(document.querySelectorAll('#docTally .vote-tally-table tbody tr'));
  tallyItems.forEach((item,i)=>{const r=result(item),cell=tallyRows[i]?.cells?.[6];if(!r||!cell)return;cell.innerHTML=`${r.approved?'اعتمد القرار':'لم يعتمد القرار'}<small style="display:block">${r.approval}% من إجمالي رأس المال (${r.yes} من ${r.total}) — المطلوب ${r.required}% على الأقل</small>`});
  const selectedId=String($('decisionCardAgendaId')?.value||''),current=agendaItems.find(x=>String(x.id)===selectedId),r=result(current),box=$('decisionTally');
  if(r&&box){const summary=box.querySelector('.decision-card-summary');if(summary)summary.innerHTML=`<div><span>الشركاء الموافقون</span><strong>${r.yesPeople}</strong></div><div><span>الحصص الموافقة</span><strong>${r.yes}</strong></div><div><span>إجمالي رأس المال</span><strong>${r.total}</strong></div><div><span>نسبة الموافقة من رأس المال</span><strong>${r.approval}%</strong></div>`;const preview=box.querySelector('.decision-card-preview');if(preview)preview.innerHTML=`${esc(r.sentence)}<br><strong>${r.approved?'اعتمد القرار':'لم يعتمد القرار'}</strong>`;const rule=$('decisionRule');if(rule&&isRiadaMeeting())rule.innerHTML='النسبة المطلوبة لهذا الاجتماع: <strong>75% على الأقل وفقًا للمادة الثامنة من عقد التأسيس</strong>.'}
  if(r){document.querySelectorAll('#docDecisionCard .decision-result').forEach(node=>{const stats=node.querySelector('.decision-result-stats');if(stats)stats.innerHTML=`<div><span>الشركاء الموافقون</span><strong>${r.yesPeople}</strong></div><div><span>الحصص الموافقة</span><strong>${r.yes}</strong></div><div><span>إجمالي رأس المال</span><strong>${r.total}</strong></div><div><span>نسبتها من إجمالي رأس المال</span><strong>${r.approval}%</strong></div>`;const p=node.querySelector('p');if(p)p.textContent=r.sentence;const status=node.querySelector('.decision-result-status');if(status)status.textContent=`${r.approved?'اعتمد القرار':'لم يعتمد القرار'} — النسبة المطلوبة ${r.required}% على الأقل`});const out=$('docDecisionResult');out?.querySelectorAll('.dr-grid>div').forEach(node=>{const label=node.querySelector('span')?.textContent||'',strong=node.querySelector('strong');if(label.includes('الموافقة من الحقوق الممثلة')){node.remove();return}if(label.includes('نسبة الموافقة المعتمدة')&&strong)strong.textContent=`${r.approval}%`;if(label.includes('النسبة المطلوبة')&&strong)strong.textContent=`${r.required}% على الأقل`});const rs=out?.querySelector('.dr-status strong');if(rs)rs.textContent=r.approved?'اعتمد القرار':'لم يعتمد القرار'}
}

function stamp(){const label=window.MAJALIS_VERSION_LABEL||`v${V}`;document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=label);if(window.MajalisDecisionCard)window.MajalisDecisionCard.version=V}
function ensureStyles(){if($('majalisVotingFix1157Styles'))return;const s=document.createElement('style');s.id='majalisVotingFix1157Styles';s.textContent='.llc-v1157-decision-summary{margin-top:7px;padding:7px 9px;border-right:3px solid var(--gold);background:#FFF9E9;border-radius:7px;font-size:10px;line-height:1.75;color:#514823}';document.head.appendChild(s)}
function patchPrint(){const base=window.printStylesheet;if(typeof base!=='function'||base.__v1157)return;const wrapped=function(){return base()+(isLlcPartners()?`\n.majalis-vote-percentages,.majalis-ballot-results,.vote-narrative,#docTally .majalis-tally-pct,#docDecisions .decision-vote-summary,.decision-represented-note,.decision-basis-note{display:none!important}`:'')};wrapped.__v1157=true;window.printStylesheet=wrapped}
function finalize(){ensureStyles();patchPrint();rebuildBallots();purgeLegacyPercentages();reinforceRepresentedRights();applyResults();stamp()}
function prepare(){prepareRiadaMeeting();stamp()}
const base=window.renderDocuments;if(typeof base==='function'&&!base.__v1157){const wrapped=function(){prepare();const r=base.apply(this,arguments);finalize();return r};wrapped.__v1157=true;window.renderDocuments=wrapped}
document.addEventListener('input',e=>{if(e.target.id==='decisionThresholdPercent'||e.target.classList?.contains('agenda-result-input'))setTimeout(()=>{prepare();finalize()},0)},true);
document.addEventListener('change',e=>{if(['entityType','meetingType','decisionThresholdMode','decisionThresholdOperator','decisionThresholdPercent','decisionCardAgendaId'].includes(e.target.id)||e.target.classList?.contains('participant-vote-input')||e.target.classList?.contains('decision-vote')||e.target.classList?.contains('attendance-input'))setTimeout(()=>{prepare();renderDocuments()},0)},true);
window.MajalisVotingFix1157={version:V,result,prepare,finalize};
window.MajalisVotingFixSelfTest=()=>({approvalPercent:pct(380,500),approvedAtLeast75:pct(380,500)>=75,exact75AtLeast:75>=75,exact75MoreThan:75>75});
prepare();
if(typeof renderDocuments==='function')renderDocuments();
})();
