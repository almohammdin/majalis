import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
await page.goto('http://127.0.0.1:4173/index.html?test=v1150',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.MajalisDecisionCard&&document.getElementById('enableDecisionCard'));
await page.evaluate(()=>{
 const fire=(id,type='change')=>document.getElementById(id)?.dispatchEvent(new Event(type,{bubbles:true}));
 document.getElementById('entityType').value='llc';fire('entityType');
 document.getElementById('meetingType').value='partners';fire('meetingType');
 const own=document.getElementById('enableOwnershipRegister');own.checked=true;fire('enableOwnershipRegister');
 const basis=document.getElementById('votingRightsBasis');if(basis){const vals=[...basis.options].map(o=>o.value);basis.value=vals.includes('custom')?'custom':vals.find(v=>v!=='none')||vals[0];fire('votingRightsBasis')}
 if(document.getElementById('capitalTotalUnits')){document.getElementById('capitalTotalUnits').value='100';fire('capitalTotalUnits','input')}
 if(document.getElementById('capitalTotalVotes')){document.getElementById('capitalTotalVotes').value='100';fire('capitalTotalVotes','input')}
 attendees=[
  {id:'p1',name:'أحمد',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:30,ownedVotes:30,proxyUnits:0,proxyVotes:0},
  {id:'p2',name:'محمد',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:20,ownedVotes:20,proxyUnits:0,proxyVotes:0},
  {id:'p3',name:'خالد',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:15,ownedVotes:15,proxyUnits:0,proxyVotes:0},
  {id:'p4',name:'سعد',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:15,ownedVotes:15,proxyUnits:0,proxyVotes:0},
  {id:'p5',name:'فهد',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:10,ownedVotes:10,proxyUnits:0,proxyVotes:0},
  {id:'p6',name:'عبدالله',role:'شريك',attendance:'inperson',countsQuorum:true,ownedUnits:10,ownedVotes:10,proxyUnits:0,proxyVotes:0}
 ];
 agendaItems=[normalizeAgendaItem({id:'d1',title:'اعتماد الخطة',decision:'اعتماد الخطة التنفيذية لعام 2027',includeInBallot:true,participantVotes:{p1:'موافق',p2:'موافق',p3:'موافق',p4:'موافق',p5:'موافق',p6:'غير موافق'}})];
 applyParticipantVoteTally(agendaItems[0]);renderAttendees();renderAgenda();renderManagementAgenda();
 const en=document.getElementById('enableDecisionCard');en.checked=true;fire('enableDecisionCard');renderDocuments();
});
await page.waitForTimeout(250);
let st=await page.evaluate(()=>window.MajalisDecisionCard.stats());
assert.equal(st.c.yes,5);assert.equal(st.c.no,1);assert.equal(st.t.votesFor,90);assert.equal(st.den,100);assert.equal(st.calc,true);
assert.match(await page.locator('#docDecisionCard').innerText(),/90%/);
assert.doesNotMatch(await page.locator('#docMinutes').innerText(),/اعتمد القرار بنسبة موافقة 90%/);
await page.click('#confirmDecisionResult');
await page.waitForTimeout(100);
assert.match(await page.locator('#docDecisionCard').innerText(),/اعتمد القرار/);
assert.match(await page.locator('#docMinutes').innerText(),/اعتمد القرار/);
assert.match(await page.locator('#docMinutes').innerText(),/90%/);
await page.selectOption('#decisionCardMode','individual');await page.waitForTimeout(80);
const pages=await page.locator('#docDecisionCard .individual-document-page').count();assert.ok(pages>=6,`individual pages ${pages}`);
await page.evaluate(()=>{meetingAttachments=[{id:'a1',name:'المرفق رقم 1'}];const e=document.getElementById('enableAgendaAttachments');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));renderAgendaAttachments()});
await page.waitForFunction(()=>document.querySelector('.majalis-attachment-file-slot label.majalis-attach-file-button'));
const label=page.locator('.majalis-attachment-file-slot label.majalis-attach-file-button').first();
const inputId=await label.getAttribute('for');assert.ok(inputId);assert.equal(await page.locator(`#${inputId}`).count(),1);
assert.equal(await label.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
assert.equal(await page.locator('.majalis-attachment-file-meta.muted').first().evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
const grid=await page.locator('.majalis-attachment-file-slot').first().evaluate(el=>({start:getComputedStyle(el).gridColumnStart,end:getComputedStyle(el).gridColumnEnd}));assert.equal(grid.start,'1');assert.equal(grid.end,'-1');
const chooser=page.waitForEvent('filechooser',{timeout:3000});await label.click();const fc=await chooser;assert.ok(fc);await fc.setFiles([]);
console.log('V1150_UI_OK',JSON.stringify({yes:st.c.yes,no:st.c.no,votesFor:st.t.votesFor,rightsPercent:90,individualPages:pages,attachmentGrid:grid}));
await browser.close();
