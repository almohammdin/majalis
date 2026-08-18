import assert from 'node:assert/strict';
import fs from 'node:fs';

const clean=fs.readFileSync('majalis-voting-fix-v11517.js','utf8');
const legacy=fs.readFileSync('majalis-voting-fix-v1153.js','utf8');
const loader=fs.readFileSync('majalis-decision-card.js','utf8');
const version=fs.readFileSync('majalis-version.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(!clean.includes("className='llc-ballot-note'"));
assert.ok(!clean.includes('llc-ballot-note'));
assert.ok(!clean.includes('تُرفق بهذا المحضر بطاقات التصويت'));
assert.ok(!clean.includes('وتُعد البطاقات المرفقة جزءا لا يتجزأ من هذا المحضر'));
assert.ok(!clean.includes("document.createElement('p')"));

assert.ok(!legacy.includes('llc-ballot-note'));
assert.ok(!legacy.includes('تُرفق بهذا المحضر بطاقات التصويت'));
assert.ok(legacy.includes('majalis-voting-fix-v11517.js'));

assert.ok(loader.includes('majalis-voting-fix-v11517.js'));
assert.ok(!loader.includes('loadPatchedVotingFix'));
assert.ok(!loader.includes('MajalisMinutesClosingMode?.isPreviewCustom?.()'));

assert.ok(version.includes("const VERSION='1.15.17'"));
assert.ok(index.includes("const VERSION='1.15.17'"));

console.log('PASS v1.15.17: automatic minutes ballot paragraph generator removed from published voting layer.');
