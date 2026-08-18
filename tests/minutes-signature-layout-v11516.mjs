import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('majalis-minutes-signature-v11516.js','utf8');
const version=fs.readFileSync('majalis-version.js','utf8');
const index=fs.readFileSync('index.html','utf8');

assert.ok(source.includes("const VERSION=window.MAJALIS_VERSION||'1.15.16'"));
assert.ok(source.includes('grid-template-columns:72px minmax(0,1fr)'));
assert.ok(source.includes('grid-template-columns:18mm minmax(0,1fr)'));
assert.ok(source.includes('.minutes-final-item>span:first-child'));
assert.ok(source.includes('.minutes-final-item>strong'));
assert.ok(source.includes('.minutes-final-signature .sign-pad'));
assert.ok(source.includes('border-bottom:.25mm solid #AAB4C0'));
assert.ok(source.includes('window.printStylesheet=wrapped'));
assert.ok(source.includes('base.apply(this,arguments)+PRINT_CSS'));
assert.ok(version.includes("const VERSION='1.15.16'"));
assert.ok(version.includes('majalis-minutes-signature-v11516.js'));
assert.ok(index.includes("const VERSION='1.15.16'"));

console.log('Majalis v1.15.16 minutes signature layout regression test passed.');
