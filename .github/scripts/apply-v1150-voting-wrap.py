from pathlib import Path
import re

index = Path('index.html')
decision = Path('majalis-decision-card.js')
upgrade = Path('majalis-upgrade.js')

x = index.read_text()
d = decision.read_text()
u = upgrade.read_text()

# 1) Ownership totals: distinguish registered totals from rights actually represented by present/remote participants.
pat = re.compile(r"function ownershipTotals\(\)\{.*?\}\nfunction renderOwnershipSummary\(\)\{.*?\}\nfunction attendeeCard", re.S)
rep = """function ownershipTotals(){return attendees.reduce((a,p)=>{p=normalizeParticipant(p);a.ownedUnits+=cleanNumber(p.ownedUnits);a.proxyUnits+=cleanNumber(p.proxyUnits);a.votes+=participantVoteTotal(p);return a},{ownedUnits:0,proxyUnits:0,votes:0})}
function representedOwnershipTotals(){return attendees.map(normalizeParticipant).filter(p=>['inperson','remote'].includes(p.attendance)).reduce((a,p)=>{a.ownedUnits+=cleanNumber(p.ownedUnits);a.proxyUnits+=cleanNumber(p.proxyUnits);a.votes+=participantVoteTotal(p);return a},{ownedUnits:0,proxyUnits:0,votes:0})}
function renderOwnershipSummary(){const box=$('ownershipSummary');if(!box)return;if(!ownershipRegisterEnabled()){box.hidden=true;box.innerHTML='';return}const totals=ownershipTotals(),representedTotals=representedOwnershipTotals(),unitsTotal=capitalUnitsTotal(),votesTotal=capitalVotesTotal(),represented=representedTotals.ownedUnits+representedTotals.proxyUnits,unitOver=unitsTotal>0&&totals.ownedUnits>unitsTotal,voteOver=votesTotal>0&&representedTotals.votes>votesTotal,unitWord=ownershipUnitWord();box.hidden=false;box.innerHTML=`<div class="ownership-summary-card ${unitOver?'bad':''}"><span>إجمالي ${unitWord}</span><strong class="latin-number">${unitsTotal||0}</strong></div><div class="ownership-summary-card"><span>المملوك بالأصالة</span><strong class="latin-number">${totals.ownedUnits}</strong></div><div class="ownership-summary-card"><span>${unitWord} الممثلة في الاجتماع</span><strong class="latin-number">${represented}</strong><small class="latin-number">من إجمالي ${unitsTotal||0} (${percentText(represented,unitsTotal)})</small></div><div class="ownership-summary-card ${voteOver?'bad':''}"><span>حقوق التصويت الممثلة</span><strong class="latin-number">${representedTotals.votes}</strong><small class="latin-number">من إجمالي ${votesTotal||0} (${percentText(representedTotals.votes,votesTotal)})</small></div>`}
function attendeeCard"""
x, n = pat.subn(rep, x, count=1)
assert n == 1, 'ownership block not found'

# 2) Only present/in-person or remote participants can vote; expose represented voting rights as the cap.
old = "function participantVotingWeight(person){const p=normalizeParticipant(person);return ownershipRegisterEnabled()?participantVoteTotal(p):(p.countsQuorum?1:0)}\nfunction votingParticipants(){return attendees.map(normalizeParticipant).filter(person=>participantVotingWeight(person)>0)}"
new = "function participantVotingWeight(person){const p=normalizeParticipant(person);return ownershipRegisterEnabled()?participantVoteTotal(p):(p.countsQuorum?1:0)}\nfunction participantIsPresentForVoting(person){const p=normalizeParticipant(person);return ['inperson','remote'].includes(p.attendance)}\nfunction votingParticipants(){return attendees.map(normalizeParticipant).filter(person=>participantIsPresentForVoting(person)&&participantVotingWeight(person)>0)}\nfunction representedVotingRights(){return votingParticipants().reduce((sum,person)=>sum+participantVotingWeight(person),0)}"
assert old in x, 'voting participant block not found'
x = x.replace(old, new, 1)

# 3) Manual tally cap is represented rights, not total issued rights.
x = x.replace("available=capitalVotesTotal()", "available=ownershipRegisterEnabled()?representedVotingRights():votingParticipants().length")
assert "available=capitalVotesTotal()" not in x, 'old vote cap remains'

# 4) Ownership document summary also uses present/remote represented rights.
old = "const ownershipActive=ownershipRegisterEnabled(),ownershipTotalsData=ownershipTotals(),ownershipUnitsTotal=capitalUnitsTotal(),ownershipVotesTotal=capitalVotesTotal(),ownershipRepresented=ownershipTotalsData.ownedUnits+ownershipTotalsData.proxyUnits;"
new = "const ownershipActive=ownershipRegisterEnabled(),ownershipTotalsData=ownershipTotals(),ownershipRepresentedData=representedOwnershipTotals(),ownershipUnitsTotal=capitalUnitsTotal(),ownershipVotesTotal=capitalVotesTotal(),ownershipRepresented=ownershipRepresentedData.ownedUnits+ownershipRepresentedData.proxyUnits;"
assert old in x, 'ownership document totals anchor not found'
x = x.replace(old, new, 1)
x = x.replace("<span>حقوق التصويت الممثلة</span><strong class=\"latin-number\">${ownershipTotalsData.votes}</strong><small class=\"latin-number\">من إجمالي ${ownershipVotesTotal} (${percentText(ownershipTotalsData.votes,ownershipVotesTotal)})</small>", "<span>حقوق التصويت الممثلة</span><strong class=\"latin-number\">${ownershipRepresentedData.votes}</strong><small class=\"latin-number\">من إجمالي ${ownershipVotesTotal} (${percentText(ownershipRepresentedData.votes,ownershipVotesTotal)})</small>", 1)

# 5) When a voter becomes absent/excused/pending, remove any stored per-participant vote so it cannot silently return later.
old = "else if(e.target.classList.contains('attendance-input')){const row=e.target.closest('[data-attendance-id]'),item=attendees.find(x=>x.id===Number(row.dataset.attendanceId));if(item)item.attendance=e.target.value;syncAttendanceCounts();renderDocuments()}"
new = "else if(e.target.classList.contains('attendance-input')){const row=e.target.closest('[data-attendance-id]'),item=attendees.find(x=>x.id===Number(row.dataset.attendanceId));if(item){item.attendance=e.target.value;if(!['inperson','remote'].includes(item.attendance)){agendaItems.forEach(agenda=>{if(agenda.participantVotes&&Object.prototype.hasOwnProperty.call(agenda.participantVotes,String(item.id)))delete agenda.participantVotes[String(item.id)];if(agenda.voteTallySource==='participants')applyParticipantVoteTally(agenda)})}}syncAttendanceCounts();renderManagementAgenda();renderDocuments()}"
assert old in x, 'attendance change block not found'
x = x.replace(old, new, 1)

# 6) Prevent manual vote counts from being saved above the represented cap.
old = "if(e.target.classList.contains('agenda-result-input')){const card=e.target.closest('[data-management-agenda-id]'),item=agendaItems.find(x=>x.id===Number(card.dataset.managementAgendaId));if(!item)return;item[e.target.dataset.key]=e.target.type==='checkbox'?e.target.checked:(e.target.classList.contains('latin-number')?numericFieldValue(e.target.value):e.target.value);if(['votesFor','votesAgainst','votesAbstain'].includes(e.target.dataset.key)){item.voteTallySource='manual';refreshVoteCountsCard(card,item)}if(e.target.dataset.key==='dueUseBoth')renderManagementAgenda();renderDocuments();updateCompletionIndicators();return}"
new = "if(e.target.classList.contains('agenda-result-input')){const card=e.target.closest('[data-management-agenda-id]'),item=agendaItems.find(x=>x.id===Number(card.dataset.managementAgendaId));if(!item)return;const key=e.target.dataset.key,previous=item[key],nextValue=e.target.type==='checkbox'?e.target.checked:(e.target.classList.contains('latin-number')?numericFieldValue(e.target.value):e.target.value);item[key]=nextValue;if(['votesFor','votesAgainst','votesAbstain'].includes(key)){item.voteTallySource='manual';const available=ownershipRegisterEnabled()?representedVotingRights():votingParticipants().length,total=cleanNumber(item.votesFor)+cleanNumber(item.votesAgainst)+cleanNumber(item.votesAbstain);if(available>=0&&total>available){item[key]=previous;e.target.value=previous||'';refreshVoteCountsCard(card,item);const status=card.querySelector('.vote-count-status');if(status){status.classList.add('bad');status.textContent=`لا يمكن أن تتجاوز الأصوات المدلى بها الحقوق الممثلة في الاجتماع (${available}).`}return}refreshVoteCountsCard(card,item)}if(key==='dueUseBoth')renderManagementAgenda();renderDocuments();updateCompletionIndicators();return}"
assert old in x, 'manual vote input block not found'
x = x.replace(old, new, 1)

# 7) More accurate empty copy for the participant vote table.
x = x.replace('لا يوجد مشاركون لديهم حقوق تصويت. أكمل عدد الحصص أو الأسهم وحقوق التصويت في قسم المشاركين.', 'لا يوجد مشاركون حاضرون أو عن بعد لديهم حقوق تصويت. راجع الحضور وحقوق التصويت في قسم المشاركين.', 1)

# 8) Targeted Arabic wrapping: preserve natural Arabic word boundaries; keep short actions on one line.
wrap_style = r'''\n<style id="majalis-v1150-arabic-wrap">\n.main-card .field,.main-card .item,.agenda-prep-field,.management-agenda-title>div,.doc-tab-copy,.document-option-card,.agenda-attachment-row,.majalis-attachment-file-slot,.document .doc-body,.document .doc-table th,.document .doc-table td{min-width:0}\n.main-card p,.main-card .hint,.main-card .info-help span:last-child,.management-agenda-title strong,.agenda-ballot-option span,.document .doc-body,.document .doc-table th,.document .doc-table td,.decision-text{word-break:normal!important;overflow-wrap:break-word!important;hyphens:none}\n.btn,.date-picker-open-btn,.majalis-attach-file-button,.majalis-attachment-file-meta.muted,.vote-state-chip,.required-tag,.optional-tag{word-break:keep-all;white-space:nowrap}\n@media(max-width:680px){.agenda-attachment-row{grid-template-columns:30px minmax(0,1fr) auto}.majalis-attachment-file-slot{padding-inline-start:0!important;padding-inline-end:38px!important}.document .doc-table th,.document .doc-table td{overflow-wrap:break-word!important}}\n</style>\n'''
anchor = '</head>'
assert anchor in x and 'majalis-v1150-arabic-wrap' not in x, 'wrap style anchor issue'
x = x.replace(anchor, wrap_style + anchor, 1)

# 9) Decision card: show represented-rights percentage separately from total issued rights used for LLC threshold.
pat = re.compile(r"function stats\(x\)\{.*?\}\nfunction fingerprint", re.S)
rep = """function stats(x){x=normalizeAgendaItem(x||{});const people=votingParticipants(),t=participantVoteTally(x),c={yes:0,no:0,abs:0,none:0};people.forEach(p=>{const q=normalizeParticipantVoteChoice(x.participantVotes[String(p.id)]);q==='موافق'?c.yes++:q==='غير موافق'?c.no++:q==='ممتنع'?c.abs++:c.none++});const own=ownershipRegisterEnabled()&&ownershipVotingBasis()!=='none',represented=own?people.reduce((sum,p)=>sum+participantVotingWeight(p),0):people.length,totalRights=own?capitalVotesTotal():people.length,den=represented,thresholdDen=totalRights,th=threshold();let calc=null;if(th&&thresholdDen>0&&!(th.source==='llc'&&!own)){const v=(own?t.votesFor:c.yes)*100/thresholdDen;calc=th.op==='moreThan'?v>th.p:v>=th.p}return {people,t,c,own,represented,totalRights,den,thresholdDen,th,calc}}
function fingerprint"""
d, n = pat.subn(rep, d, count=1)
assert n == 1, 'decision stats block not found'

d = d.replace("s.people.length,s.den,s.th?", "s.people.length,s.den,s.thresholdDen,s.th?", 1)

pat = re.compile(r"function sentence\(x,s,final=false\)\{.*?\}\nfunction rows", re.S)
rep = """function sentence(x,s,final=false){let a=[];if(s.people.length)a.push(`وافق ${s.c.yes} من أصل ${s.people.length} من أصحاب حق التصويت الحاضرين، بنسبة ${pct(s.c.yes,s.people.length)} من المشاركين الحاضرين`);if(s.own&&s.den)a.push(`وتمثل الأصوات الموافقة ${pct(s.t.votesFor,s.den)} من حقوق التصويت الممثلة`);if(s.own&&s.totalRights)a.push(`وتمثل ${pct(s.t.votesFor,s.totalRights)} من إجمالي حقوق التصويت`);if(s.c.no)a.push(`وعارض ${s.c.no}${s.own?` بما يمثل ${pct(s.t.votesAgainst,s.den)} من الحقوق الممثلة`:''}`);if(s.c.abs)a.push(`وامتنع ${s.c.abs}${s.own?` بما يمثل ${pct(s.t.votesAbstain,s.den)} من الحقوق الممثلة`:''}`);let z=a.join('، ')+(a.length?'.':'');if(final&&valid(x,s)){const ok=x.decisionCardOutcome.status==='approved';z+=` ${ok?'اعتمد القرار':'لم يعتمد القرار'} بنسبة موافقة ${s.own?pct(s.t.votesFor,s.thresholdDen):pct(s.c.yes,s.people.length)}${x.decisionCardOutcome.threshold?`، والنسبة المطلوبة ${x.decisionCardOutcome.threshold}`:''}.`}return z}
function rows"""
d, n = pat.subn(rep, d, count=1)
assert n == 1, 'decision sentence block not found'

d = d.replace("<span>نسبة الموافقة</span><strong>${s.own?pct(s.t.votesFor,s.den):pct(s.c.yes,s.people.length)}</strong>", "<span>${s.own?'من الحقوق الممثلة':'نسبة الموافقة'}</span><strong>${s.own?pct(s.t.votesFor,s.den):pct(s.c.yes,s.people.length)}</strong>", 1)
d = d.replace("<span>${s.own?'نسبتها من إجمالي الحقوق':'نسبة الموافقة'}</span><strong>${s.own?pct(s.t.votesFor,s.den):pct(s.c.yes,s.people.length)}</strong>", "<span>${s.own?'من الحقوق الممثلة':'نسبة الموافقة'}</span><strong>${s.own?pct(s.t.votesFor,s.den):pct(s.c.yes,s.people.length)}</strong>", 1)
d = d.replace("<span>النسبة من الإجمالي</span><strong>${pct(participantVotingWeight(p),s.den)}</strong>", "<span>النسبة من الحقوق الممثلة</span><strong>${pct(participantVotingWeight(p),s.den)}</strong>", 1)
d = d.replace("'لا يوجد مشاركون لديهم حق تصويت.'", "'لا يوجد مشاركون حاضرون أو عن بعد لديهم حق تصويت.'", 1)

# 10) Decorator percentages in majalis-upgrade must also use only present/remote participants.
old = "function representedVotingRights(snap){const parts=snap.ownershipSnapshot?.participants;if(Array.isArray(parts))return parts.reduce((sum,p)=>sum+(Number(p?.representedVotes)||0),0);return 0}"
new = "function representedVotingRights(snap){const parts=snap.ownershipSnapshot?.participants,attendance=new Map((snap.attendees||[]).map(p=>[String(p?.id||''),String(p?.attendance||p?.status||'')]));if(Array.isArray(parts))return parts.reduce((sum,p)=>['inperson','remote'].includes(attendance.get(String(p?.id||'')))?sum+(Number(p?.representedVotes)||0):sum,0);return 0}"
assert old in u, 'upgrade represented rights block not found'
u = u.replace(old, new, 1)

index.write_text(x)
decision.write_text(d)
upgrade.write_text(u)
print('V1150_VOTING_WRAP_PATCHED')
