import assert from 'node:assert/strict';
import fs from 'node:fs';

const draft=JSON.parse(fs.readFileSync('majalis-test-draft-v11512.json','utf8'));
assert.equal(draft.version,'v1.15.12');
assert.equal(draft.fields.entityName,'شركة ريادة الدولية للفنادق والمنتجعات السياحية المحدودة');
assert.equal(draft.fields.entityType,'llc');
assert.equal(draft.fields.meetingType,'partners');
assert.equal(draft.fields.capitalTotalUnits,'500');
assert.equal(draft.agendaItems.length,3);
assert.equal(draft.attendees.length,6);

const present=draft.attendees.filter(p=>['inperson','remote'].includes(p.attendance));
const represented=present.reduce((sum,p)=>sum+Number(p.ownedUnits||0)+Number(p.proxyUnits||0),0);
assert.equal(represented,380);
assert.equal(Number((represented/500*100).toFixed(2)),76);

const absent=draft.attendees.find(p=>p.name==='محمد عبدالقادر محمد سيت');
assert.ok(absent);
assert.equal(absent.attendance,'absent');
assert.equal(Number(absent.ownedUnits),120);
const absentSnapshot=draft.ownershipSnapshot.participants.find(p=>p.id===absent.id);
assert.equal(absentSnapshot.representedUnits,0);
assert.equal(absentSnapshot.representedVotes,0);
assert.equal(draft.ownershipSnapshot.representedUnits,380);
assert.equal(draft.ownershipSnapshot.representedVotes,380);

for(const item of draft.agendaItems){
  assert.equal(item.votesFor,'380');
  assert.equal(item.votesAgainst,'0');
  assert.equal(item.votesAbstain,'0');
  assert.equal(item.participantVotes['106'],'لم يصوت');
  assert.equal(item.includeInBallot,true);
}

const restored=JSON.parse(JSON.stringify(draft));
assert.equal(restored.fields.meetingTitle,draft.fields.meetingTitle);
assert.deepEqual(restored.agendaItems.map(x=>x.decision),draft.agendaItems.map(x=>x.decision));
assert.equal(restored.ownershipSnapshot.representedVotes,380);

const bootstrap=fs.readFileSync('index.html','utf8');
assert.ok(bootstrap.includes("const VERSION='1.15.12'"));
assert.ok(bootstrap.includes("const DRAFT_KEY='majalis_tool_draft_v1_9_6'"));
assert.ok(bootstrap.includes("seedMode==='1'||seedMode==='reset'"));
assert.ok(bootstrap.includes('majalis-test-draft-v11512.json'));
assert.ok(bootstrap.includes("url.searchParams.delete('seed_test')"));

console.log('Majalis v1.15.12 seeded draft reload test passed: 380/500 = 76%, 3 decisions preserved.');
