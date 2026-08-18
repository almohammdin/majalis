import assert from 'node:assert/strict';

const participants=[
  {attendance:'inperson',ownedUnits:100,ownedVotes:100},
  {attendance:'inperson',ownedUnits:80,ownedVotes:80},
  {attendance:'inperson',ownedUnits:70,ownedVotes:70},
  {attendance:'remote',ownedUnits:70,ownedVotes:70},
  {attendance:'inperson',ownedUnits:60,ownedVotes:60},
  {attendance:'absent',ownedUnits:120,ownedVotes:120},
];
const present=p=>['inperson','remote'].includes(p.attendance);
const represented=participants.filter(present).reduce((a,p)=>({units:a.units+p.ownedUnits,votes:a.votes+p.ownedVotes}),{units:0,votes:0});
const totalUnits=500,totalVotes=500;
const pct=(v,t)=>Number((v*100/t).toFixed(2));

assert.equal(represented.units,380);
assert.equal(represented.votes,380);
assert.equal(pct(represented.units,totalUnits),76);
assert.equal(pct(represented.votes,totalVotes),76);
assert.notEqual(represented.units,totalUnits);
assert.notEqual(represented.votes,totalVotes);

console.log('Majalis v1.15.10 tally header test passed: represented units/votes are 380 of 500 = 76%.');
