import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.MajalisApp?.showStep,{timeout:15000});

const footer=await page.evaluate(()=>{const b=document.getElementById('adminAccessButton'),f=b?.closest('footer.footer');return {exists:!!b,inFooter:!!f,buttonCount:document.querySelectorAll('#adminAccessButton').length,parent:f?.className||''}});
assert.equal(footer.exists,true);
assert.equal(footer.inFooter,true);
assert.equal(footer.buttonCount,1);

await page.evaluate(()=>{
  window.MajalisApp.showStep(4,false);
  const name=document.getElementById('minutesClosingName');name.value='محمد أحمد';name.dispatchEvent(new Event('input',{bubbles:true}));
  window.MajalisApp.showStep(5,false);
});
await page.waitForTimeout(400);
const minutes=await page.locator('#docMinutes').innerText();
assert.match(minutes,/محمد أحمد/);
assert.match(minutes,/والله الموفق/);
const tally=await page.locator('#docTally').innerText();
assert.match(tally,/والله الموفق/);

await page.evaluate(()=>{
  const snap=window.MajalisApp.captureSnapshot();
  snap.agendaItems=[{id:987654,title:'اعتماد الميزانية',purpose:'تصويت',discussion:'',decision:'اعتماد الميزانية المقترحة',owner:'',vote:'موافق',includeInBallot:true,ballotPreferenceSet:true,votesFor:'3',votesAgainst:'1',votesAbstain:'0',participantVotes:{},voteTallySource:'manual'}];
  snap.fields={...snap.fields,enableVotingCard:true,votingCardMode:'blank'};
  window.MajalisApp.applySnapshot(snap,{step:5});
  const enable=document.getElementById('enableVotingCard');enable.checked=true;enable.dispatchEvent(new Event('change',{bubbles:true}));
  const mode=document.getElementById('votingCardMode');mode.value='blank';mode.dispatchEvent(new Event('change',{bubbles:true}));
  window.MajalisApp.showStep(5,false);
});
await page.waitForTimeout(1200);
const ballot=await page.locator('#docVoting .blank-ballot-card').innerText();
assert.match(ballot,/اعتماد الميزانية/);
assert.match(ballot,/اعتماد الميزانية المقترحة/);
assert.doesNotMatch(ballot,/اسم المصوت/);
assert.doesNotMatch(ballot,/النسبة من إجمالي حقوق التصويت/);
assert.doesNotMatch(ballot,/ملخص نتيجة التصويت/);
assert.doesNotMatch(ballot,/%/);

const voiceSource=await page.evaluate(()=>fetch('./majalis-voice.js?v=1.14.0').then(r=>r.text()));
assert.match(voiceSource,/VOICE_IDLE_TIMEOUT_MS=30000/);
assert.match(voiceSource,/stop\('idle'\)/);
console.log('V1140_UI_ACCEPTANCE_OK');
await browser.close();
