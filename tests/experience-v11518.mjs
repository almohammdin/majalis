import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const index=read('index.html');
const version=read('majalis-version.js');
const experience=read('majalis-experience-v11518.js');
const css=read('majalis-experience-v11518.css');
const prototype=read('prototypes/start/index.html');

assert.match(index,/const VERSION='1\.15\.18'/,'bootstrap must publish v1.15.18');
assert.ok(!index.includes('const final9='),'index must not inject final patches directly');
assert.ok(!index.includes('majalis-final-v11510.js'),'index must delegate runtime patch loading');

for(const file of [
  'majalis-final-v1159.js',
  'majalis-final-v11510.js',
  'majalis-minutes-closing-v11515.js',
  'majalis-minutes-signature-v11516.js',
  'majalis-voting-fix-v11517.js',
  'majalis-experience-v11518.js'
])assert.ok(version.includes(file),`runtime sequence missing ${file}`);

assert.ok(version.includes('majalis-experience-v11518.css'),'experience stylesheet must be loaded by version runtime');
assert.ok(experience.includes("'إدارة اجتماع منعقد'"),'assistant must preserve the previously hidden intent');
assert.ok(experience.includes("'إعداد محضر'"),'assistant must preserve the minutes intent');
assert.ok(experience.includes('majalisAssistantGuide'),'guided meeting status panel must exist');
assert.ok(experience.includes('أكمل الخطوة التالية'),'guided next action must exist');
assert.ok(experience.includes('تحدث مع مساعد مجالس'),'voice control must remain self-explanatory');

assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'),'reduced motion handling is required');
assert.ok(css.includes('scale(.97)'),'press feedback is required');
assert.ok(css.includes('majalisDialogIn'),'occasional modal entrance should be animated');
assert.ok(css.includes('min-width:128px!important'),'mobile voice control must keep a readable label');

for(const variant of ['quiet','assistant','dashboard'])assert.ok(prototype.includes(`data-variant="${variant}"`),`prototype missing ${variant} direction`);
assert.ok(prototype.includes('الاتجاه المعتمد للإنتاج'),'prototype must document the promoted direction');

console.log('Majalis v1.15.18 experience/runtime checks passed.');
