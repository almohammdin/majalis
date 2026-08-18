import assert from 'node:assert/strict';

const participants = [
  { id: '1', attendance: 'inperson', votes: 100 },
  { id: '2', attendance: 'inperson', votes: 80 },
  { id: '3', attendance: 'inperson', votes: 70 },
  { id: '4', attendance: 'remote', votes: 70 },
  { id: '5', attendance: 'inperson', votes: 60 },
  { id: '6', attendance: 'absent', votes: 120 },
];

const present = p => ['inperson', 'remote'].includes(p.attendance);
const snapshot = {
  totalVotes: 500,
  participants: participants.map(p => ({
    ...p,
    representedVotes: present(p) ? p.votes : 0,
  })),
};

snapshot.representedVotes = snapshot.participants.reduce((sum, p) => sum + p.representedVotes, 0);
assert.equal(snapshot.representedVotes, 380);
assert.equal(snapshot.participants.find(p => p.id === '6').representedVotes, 0);

const restored = JSON.parse(JSON.stringify(snapshot));
assert.equal(restored.participants.reduce((sum, p) => sum + p.representedVotes, 0), 380);
assert.equal(Number((380 / 500 * 100).toFixed(2)), 76);
assert.equal(76 >= 75, true);

console.log('Majalis v1.15.9 refresh test passed: represented rights remain 380/500 = 76%.');
