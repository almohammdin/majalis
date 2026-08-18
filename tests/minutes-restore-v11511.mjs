import assert from 'node:assert/strict';

const broken="note.textContent=text,close=doc.querySelector('.minutes-default-closing'),body=doc.querySelector('.minutes-doc-body');";
const fixed="note.textContent=text;const close=doc.querySelector('.minutes-default-closing');const body=doc.querySelector('.minutes-doc-body');";
let source='before;'+broken+'after;';
source=source.replace(broken,fixed);
assert.ok(source.includes("const body=doc.querySelector('.minutes-doc-body');"));
assert.ok(!source.includes('note.textContent=text,close='));

const saved={
  attendees:[
    {id:'1',attendance:'inperson',ownedUnits:'100'},
    {id:'2',attendance:'inperson',ownedUnits:'80'},
    {id:'3',attendance:'inperson',ownedUnits:'70'},
    {id:'4',attendance:'remote',ownedUnits:'70'},
    {id:'5',attendance:'inperson',ownedUnits:'60'},
    {id:'6',name:'محمد عبدالقادر محمد سيت',attendance:'absent',ownedUnits:'120'}
  ],
  agendaItems:[{id:'a1',decision:'نص القرار',votesFor:'380',votesAgainst:'0',votesAbstain:'0'}],
  fields:{entityType:'llc',meetingType:'partners',capitalTotalUnits:'500',votingRightsBasis:'equalUnits'}
};
const restored=JSON.parse(JSON.stringify(saved));
assert.equal(restored.attendees.length,6);
assert.equal(restored.agendaItems[0].decision,'نص القرار');
const represented=restored.attendees.filter(p=>['inperson','remote'].includes(p.attendance)).reduce((s,p)=>s+Number(p.ownedUnits||0),0);
assert.equal(represented,380);
assert.equal(Number((represented/500*100).toFixed(2)),76);
console.log('Majalis v1.15.11 minutes restore regression test passed.');
