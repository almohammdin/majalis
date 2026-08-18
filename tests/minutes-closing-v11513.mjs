import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('majalis-minutes-closing-v11513.js','utf8');
const index=fs.readFileSync('index.html','utf8');

// Structural safety: no Firestore/archive writes and no storage migration loop.
assert.ok(!/setDoc\s*\(/.test(source));
assert.ok(!/getDocs\s*\(/.test(source));
assert.ok(!/runTransaction\s*\(/.test(source));
assert.ok(!/for\s*\([^)]*localStorage\.length/.test(source));
assert.ok(source.includes("const MODE_LEGACY='legacy'"));
assert.ok(source.includes("const MODE_CUSTOM='custom-only'"));
assert.ok(source.includes("delete out.fields.minutesClosingMode"));
assert.ok(source.includes("event.target?.id!=='closingNote'||!event.isTrusted"));
assert.ok(source.includes("event.target?.closest?.('#saveAdminMeeting')"));
assert.ok(source.includes("doc.querySelectorAll('.llc-ballot-note').forEach(node=>node.remove())"));
assert.ok(index.includes("const VERSION='1.15.13'"));
assert.ok(index.includes('majalis-minutes-closing-v11513.js'));

const MODE_LEGACY='legacy';
const MODE_CUSTOM='custom-only';
const normalizeMode=value=>value===MODE_CUSTOM?MODE_CUSTOM:value===MODE_LEGACY?MODE_LEGACY:null;
function openSnapshot(fields={}){
  const stored=normalizeMode(fields.minutesClosingMode);
  return {mode:stored||MODE_LEGACY,hadField:!!stored,originalClosingValue:String(fields.closingNote||''),closingEdited:false};
}
function capture(state,fields={}){
  const out={...fields};
  if(state.mode===MODE_CUSTOM)out.minutesClosingMode=MODE_CUSTOM;
  else if(state.hadField)out.minutesClosingMode=MODE_LEGACY;
  else delete out.minutesClosingMode;
  return out;
}
function edit(state,value){return {...state,closingEdited:String(value)!==state.originalClosingValue};}
function explicitSave(state,value){
  if(!state.closingEdited)return state;
  return {...state,mode:MODE_CUSTOM,hadField:true,originalClosingValue:String(value),closingEdited:false};
}

// 1) Old record with no field stays legacy and remains fieldless when merely opened/captured.
let old=openSnapshot({closingNote:'الخاتمة القديمة'});
assert.equal(old.mode,MODE_LEGACY);
assert.equal(old.hadField,false);
assert.equal(Object.hasOwn(capture(old,{closingNote:'الخاتمة القديمة'}),'minutesClosingMode'),false);

// 2) Unrelated save does not convert an old record.
assert.equal(capture(old,{closingNote:'الخاتمة القديمة',meetingTitle:'عنوان معدل'}).minutesClosingMode,undefined);

// 3) Touch/revert does not convert. A real change still does not convert until explicit save.
let edited=edit(old,'خاتمة جديدة');
assert.equal(edited.closingEdited,true);
assert.equal(capture(edited,{closingNote:'خاتمة جديدة'}).minutesClosingMode,undefined);
edited=edit(edited,'الخاتمة القديمة');
assert.equal(edited.closingEdited,false);

// 4) Real edit + explicit save converts to custom-only and persists on reload.
edited=edit(old,'مرفق بهذا المحضر بطاقات التصويت الموقعة من الشركاء، والمالكين مجتمعين (380) حصة تمثل نسبة (76%) من إجمالي رأس مال الشركة.');
const savedState=explicitSave(edited,'مرفق بهذا المحضر بطاقات التصويت الموقعة من الشركاء، والمالكين مجتمعين (380) حصة تمثل نسبة (76%) من إجمالي رأس مال الشركة.');
assert.equal(savedState.mode,MODE_CUSTOM);
const savedFields=capture(savedState,{closingNote:savedState.originalClosingValue});
assert.equal(savedFields.minutesClosingMode,MODE_CUSTOM);
const reopened=openSnapshot(savedFields);
assert.equal(reopened.mode,MODE_CUSTOM);

// 5) New meetings use custom-only from the start.
const fresh={mode:MODE_CUSTOM,hadField:true,originalClosingValue:'',closingEdited:false};
assert.equal(capture(fresh,{closingNote:''}).minutesClosingMode,MODE_CUSTOM);

console.log('Majalis v1.15.13 minutes closing policy test passed.');
