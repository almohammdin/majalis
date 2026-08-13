(()=>{
'use strict';
const VERSION='1.15.0';
const BASE_SRC='./majalis-decision-card-base.js?v=1.15.0';
const $P=id=>document.getElementById(id);
const pctP=(value,total)=>Number(total)>0?`${Number((((Number(value)||0)*100)/Number(total)).toFixed(2))}%`:'—';

function loadBase(){
  const script=document.createElement('script');
  script.src=BASE_SRC;
  script.async=false;
  script.onload=applyPatch;
  script.onerror=()=>console.error('Majalis decision card base failed to load.');
  document.head.appendChild(script);
}

function applyPatch(){
  if(window.__majalisVotingWrapPatched)return;
  window.__majalisVotingWrapPatched=true;

  const present=person=>{
    const p=typeof normalizeParticipant==='function'?normalizeParticipant(person):person||{};
    return ['inperson','remote'].includes(String(p?.attendance||p?.status||''));
  };

  window.participantIsPresentForVoting=present;
  window.votingParticipants=function(){
    return attendees.map(normalizeParticipant).filter(person=>present(person)&&participantVotingWeight(person)>0);
  };
  window.representedVotingRights=function(){
    return votingParticipants().reduce((sum,person)=>sum+participantVotingWeight(person),0);
  };
  window.representedOwnershipTotals=function(){
    return attendees.map(normalizeParticipant).filter(present).reduce((a,p)=>{
      a.ownedUnits+=cleanNumber(p.ownedUnits);
      a.proxyUnits+=cleanNumber(p.proxyUnits);
      a.votes+=participantVoteTotal(p);
      return a;
    },{ownedUnits:0,proxyUnits:0,votes:0});
  };

  const originalBuildOwnershipSnapshot=window.buildOwnershipSnapshot;
  if(typeof originalBuildOwnershipSnapshot==='function'){
    window.buildOwnershipSnapshot=function(){
      const snap=originalBuildOwnershipSnapshot();
      if(!snap||!Array.isArray(snap.participants))return snap;
      const attendance=new Map(attendees.map(p=>[String(p?.id??''),String(p?.attendance||p?.status||'')]));
      snap.participants=snap.participants.map(p=>{
        const isPresent=['inperson','remote'].includes(attendance.get(String(p?.id??''))||'');
        return isPresent?p:{...p,representedUnits:0,representedVotes:0};
      });
      return snap;
    };
  }

  window.renderOwnershipSummary=function(){
    const box=$P('ownershipSummary');
    if(!box)return;
    if(!ownershipRegisterEnabled()){
      box.hidden=true;
      box.innerHTML='';
      return;
    }
    const all=ownershipTotals(),represented=representedOwnershipTotals(),unitsTotal=capitalUnitsTotal(),votesTotal=capitalVotesTotal(),representedUnits=represented.ownedUnits+represented.proxyUnits,unitOver=unitsTotal>0&&all.ownedUnits>unitsTotal,voteOver=votesTotal>0&&represented.votes>votesTotal,unitWord=ownershipUnitWord();
    box.hidden=false;
    box.innerHTML=`<div class="ownership-summary-card ${unitOver?'bad':''}"><span>إجمالي ${unitWord}</span><strong class="latin-number">${unitsTotal||0}</strong></div><div class="ownership-summary-card"><span>المملوك بالأصالة</span><strong class="latin-number">${all.ownedUnits}</strong></div><div class="ownership-summary-card"><span>${unitWord} الممثلة في الاجتماع</span><strong class="latin-number">${representedUnits}</strong><small class="latin-number">من إجمالي ${unitsTotal||0} (${percentText(representedUnits,unitsTotal)})</small></div><div class="ownership-summary-card ${voteOver?'bad':''}"><span>حقوق التصويت الممثلة</span><strong class="latin-number">${represented.votes}</strong><small class="latin-number">من إجمالي ${votesTotal||0} (${percentText(represented.votes,votesTotal)})</small></div>`;
  };

  window.refreshVoteCountsCard=function(card,item){
    if(!card||!item)return;
    const total=cleanNumber(item.votesFor)+cleanNumber(item.votesAgainst)+cleanNumber(item.votesAbstain),available=ownershipRegisterEnabled()?representedVotingRights():votingParticipants().length,totalBox=card.querySelector('.vote-count-total'),status=card.querySelector('.vote-count-status'),source=card.querySelector('.vote-entry-source-text');
    if(totalBox)totalBox.textContent=String(total);
    if(source)source.textContent=item.voteTallySource==='participants'?'محسوبة من حصر أصوات المشاركين':'مدخلة أو معدلة مباشرة';
    if(status){
      const over=total>available;
      status.classList.toggle('bad',over);
      status.textContent=over?`إجمالي الأصوات المدلى بها يتجاوز الحقوق الممثلة في الاجتماع (${available}).`:(ownershipRegisterEnabled()?`حقوق التصويت الممثلة في الاجتماع: ${available}.`:`أصحاب حق التصويت الحاضرون أو عن بعد: ${available}.`);
    }
  };

  document.addEventListener('input',event=>{
    const input=event.target.closest?.('.agenda-result-input[data-key="votesFor"],.agenda-result-input[data-key="votesAgainst"],.agenda-result-input[data-key="votesAbstain"]');
    if(!input)return;
    const card=input.closest('[data-management-agenda-id]');
    const item=agendaItems.find(x=>String(x.id)===String(card?.dataset.managementAgendaId));
    if(!item)return;
    const key=input.dataset.key,previous=item[key]??'',candidate=typeof numericFieldValue==='function'?numericFieldValue(input.value):String(input.value||'').replace(/\D/g,''),available=ownershipRegisterEnabled()?representedVotingRights():votingParticipants().length;
    const next={votesFor:item.votesFor||'',votesAgainst:item.votesAgainst||'',votesAbstain:item.votesAbstain||'',[key]:candidate};
    const total=cleanNumber(next.votesFor)+cleanNumber(next.votesAgainst)+cleanNumber(next.votesAbstain);
    if(total<=available)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    input.value=previous;
    const status=card?.querySelector('.vote-count-status');
    if(status){
      status.classList.add('bad');
      status.textContent=`لا يمكن أن تتجاوز الأصوات المدلى بها الحقوق الممثلة في الاجتماع (${available}).`;
    }
  },true);

  document.addEventListener('change',event=>{
    if(!event.target.classList?.contains('attendance-input'))return;
    setTimeout(()=>{
      const row=event.target.closest('[data-attendance-id]'),person=attendees.find(x=>String(x.id)===String(row?.dataset.attendanceId));
      if(!person)return;
      if(!present(person)){
        agendaItems.forEach(item=>{
          if(item.participantVotes&&Object.prototype.hasOwnProperty.call(item.participantVotes,String(person.id)))delete item.participantVotes[String(person.id)];
          if(item.voteTallySource==='participants'&&typeof applyParticipantVoteTally==='function')applyParticipantVoteTally(item);
        });
      }
      renderOwnershipSummary();
      if(typeof renderManagementAgenda==='function')renderManagementAgenda();
      if(typeof renderDocuments==='function')renderDocuments();
      if(typeof scheduleAutoSave==='function')scheduleAutoSave();
    },0);
  });

  injectWrapStyles();

  const baseRenderDocuments=window.renderDocuments;
  if(typeof baseRenderDocuments==='function'){
    window.renderDocuments=function(){
      const result=baseRenderDocuments.apply(this,arguments);
      decorateRepresentedRights();
      return result;
    };
  }

  const baseStats=window.MajalisDecisionCard?.stats?.bind(window.MajalisDecisionCard);
  if(baseStats){
    window.MajalisDecisionCard.stats=()=>{
      const current=baseStats();
      if(!current)return current;
      const represented=representedVotingRights(),total=ownershipRegisterEnabled()?capitalVotesTotal():votingParticipants().length;
      return {...current,representedRights:represented,totalRights:total,approvalOfRepresented:pctP(current.t?.votesFor||0,represented),approvalOfTotal:pctP(current.t?.votesFor||0,total)};
    };
  }

  decorateRepresentedRights();
  if(typeof renderDocuments==='function')renderDocuments();
}

function injectWrapStyles(){
  if($P('majalisVotingWrapStyles'))return;
  const style=document.createElement('style');
  style.id='majalisVotingWrapStyles';
  style.textContent=`
  .main-card .field,.main-card .item,.agenda-prep-field,.management-agenda-title>div,.doc-tab-copy,.document-option-card,.agenda-attachment-row,.majalis-attachment-file-slot,.document .doc-body,.document .doc-table th,.document .doc-table td{min-width:0}
  .main-card p,.main-card .hint,.main-card .info-help span:last-child,.management-agenda-title strong,.agenda-ballot-option span,.document .doc-body,.document .doc-table th,.document .doc-table td,.decision-text,.majalis-file-row small{word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important}
  .btn,.date-picker-open-btn,.majalis-attach-file-button,.majalis-attachment-file-meta.muted,.vote-state-chip,.required-tag,.optional-tag{word-break:keep-all!important;white-space:nowrap!important}
  .majalis-attachment-file-slot{grid-column:1/-1!important;width:100%!important}
  .decision-represented-note{margin:8px 0;padding:8px 10px;border-right:3px solid var(--gold);border-radius:8px;background:#FFF9E9;color:#514823;font-size:9.5px;line-height:1.7}
  @media(max-width:680px){.agenda-attachment-row{grid-template-columns:30px minmax(0,1fr) auto!important}.majalis-attachment-file-slot{padding-inline-start:0!important;padding-inline-end:0!important}.document .doc-table th,.document .doc-table td{overflow-wrap:break-word!important}}
  `;
  document.head.appendChild(style);
}

function decorateRepresentedRights(){
  try{
    renderOwnershipSummary();
    const represented=representedOwnershipTotals(),representedUnits=represented.ownedUnits+represented.proxyUnits,totalUnits=capitalUnitsTotal(),totalVotes=capitalVotesTotal();
    document.querySelectorAll('#docOwnership .ownership-doc-summary>div').forEach(card=>{
      const label=card.querySelector('span')?.textContent||'',strong=card.querySelector('strong'),small=card.querySelector('small');
      if(label.includes('الممثلة في الاجتماع')&&!label.includes('حقوق التصويت')){
        if(strong)strong.textContent=String(representedUnits);
        if(small)small.textContent=`من إجمالي ${totalUnits||0} (${percentText(representedUnits,totalUnits)})`;
      }
      if(label.includes('حقوق التصويت الممثلة')){
        if(strong)strong.textContent=String(represented.votes);
        if(small)small.textContent=`من إجمالي ${totalVotes||0} (${percentText(represented.votes,totalVotes)})`;
      }
    });

    const decision=window.MajalisDecisionCard?.stats?.();
    if(decision&&ownershipRegisterEnabled()){
      const representedRights=representedVotingRights(),yes=Number(decision.t?.votesFor)||0,total=capitalVotesTotal();
      const text=`حقوق التصويت الممثلة في الاجتماع: ${representedRights} من ${total||0}. تمثل الموافقة ${pctP(yes,representedRights)} من الحقوق الممثلة و${pctP(yes,total)} من إجمالي حقوق التصويت.`;
      const tally=$P('decisionTally');
      if(tally){
        let note=tally.querySelector('.decision-represented-note');
        if(!note){note=document.createElement('div');note.className='decision-represented-note';const summary=tally.querySelector('.decision-card-summary');summary?.insertAdjacentElement('afterend',note)}
        if(note)note.textContent=text;
      }
      document.querySelectorAll('#docDecisionCard .decision-result').forEach(result=>{
        let note=result.querySelector('.decision-represented-note');
        if(!note){note=document.createElement('div');note.className='decision-represented-note';const stats=result.querySelector('.decision-result-stats');stats?.insertAdjacentElement('afterend',note)}
        if(note)note.textContent=text;
      });
    }
  }catch(error){console.error('Majalis represented-rights decoration:',error)}
}

loadBase();
})();
