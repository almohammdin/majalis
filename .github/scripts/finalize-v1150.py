from pathlib import Path

up=Path('majalis-upgrade.js')
u=up.read_text(encoding='utf-8')
old='''<input id="${inputId}" type="file" hidden data-attachment-file-input="${esc(id)}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"><label class="btn soft majalis-attach-file-button" for="${inputId}">${item.storagePath?'استبدال الملف':'إرفاق ملف'}</label>'''
new='''<label class="btn soft majalis-attach-file-button"><span>${item.storagePath?'استبدال الملف':'إرفاق ملف'}</span><input id="${inputId}" class="majalis-native-file-input" type="file" data-attachment-file-input="${esc(id)}" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"></label>'''
if old not in u:
    raise SystemExit('attachment markup anchor missing')
u=u.replace(old,new,1)
old_css='.majalis-attach-file-button{min-height:34px;padding:5px 10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;white-space:nowrap}.majalis-attachment-file-meta,.majalis-file-link{white-space:nowrap}'
new_css='.majalis-attach-file-button{position:relative;overflow:hidden;min-height:34px;padding:5px 10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;white-space:nowrap}.majalis-native-file-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:100px}.majalis-attachment-file-meta,.majalis-file-link{white-space:nowrap}'
if old_css not in u:
    raise SystemExit('attachment css anchor missing')
u=u.replace(old_css,new_css,1)
up.write_text(u,encoding='utf-8')

dec=Path('majalis-decision-card.js')
d=dec.read_text(encoding='utf-8')
anchor="styles();ui();selectSync();rawRestore();selectSync();textSync();rule();bind();visibility();renderDocuments();window.MajalisDecisionCard={version:VERSION,render:documentRender,stats:()=>selected()?stats(selected()):null};"
print_patch="""const baseDecisionPrintStylesheet=printStylesheet;printStylesheet=function(){return baseDecisionPrintStylesheet()+`\n.decision-statement{margin:3mm 0 4mm;padding:4mm;border:1px solid #D6DEE7;border-radius:3mm;background:#FBFCFD;break-inside:avoid;page-break-inside:avoid}.decision-number{display:inline-block;margin-bottom:1.5mm;border-radius:99mm;background:#F5E7B9;color:#705412;padding:.8mm 2mm;font-size:7pt;font-weight:700}.decision-statement h3{margin:0 0 2mm!important;font-size:11pt}.decision-text{white-space:pre-line;line-height:1.8}.decision-table{width:100%;table-layout:fixed;font-size:7pt}.decision-table th,.decision-table td{padding:1.2mm}.decision-table th:first-child,.decision-table td:first-child{width:7mm;text-align:center}.decision-table th:nth-child(3),.decision-table td:nth-child(3){width:17mm;text-align:center}.decision-table th:nth-child(n+4):nth-child(-n+6),.decision-table td:nth-child(n+4):nth-child(-n+6){width:13mm;text-align:center}.decision-table th:nth-child(7),.decision-table td:nth-child(7){width:24mm}.decision-table th:nth-child(8),.decision-table td:nth-child(8){width:19mm}.decision-person small{display:block;color:#677386;font-size:6.5pt}.decision-box{width:4.5mm;height:4.5mm;border:.3mm solid #788595;display:inline-grid;place-items:center;font-weight:800}.decision-line{display:block;height:7mm;border-bottom:.25mm solid #AAB4C0}.decision-individual{border:1px solid #CBD3DD;border-radius:3mm;padding:5mm;background:#fff}.decision-person-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2mm 5mm;padding:3mm;border:1px solid #E1E6EC;border-radius:2.5mm;background:#F8F9FB}.decision-person-card span{display:block;color:#677386;font-size:7pt}.decision-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm;margin:4mm 0}.decision-choice{display:flex;align-items:center;justify-content:center;gap:2mm;min-height:11mm;border:1px solid #D8E0E8;border-radius:2.5mm;font-weight:700}.decision-signs{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:6mm;color:#677386;font-size:7pt}.decision-result{margin-top:4mm;padding:3.5mm;border:1px solid #D8E0E8;border-radius:3mm;background:#FAFBFC;break-inside:avoid;page-break-inside:avoid}.decision-result-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}.decision-result-stats>div{border:1px solid #E1E6EC;border-radius:2mm;background:#fff;padding:2mm}.decision-result-stats span{display:block;color:#677386;font-size:6.5pt}.decision-result-stats strong{display:block;color:#0B1A2B;font-size:8.5pt}.decision-result-status{margin-top:2mm;padding:2mm 2.5mm;border-radius:2mm;font-weight:700}.decision-result-status.good{background:#E8F7EF;color:#25704F}.decision-result-status.bad{background:#FDEAEA;color:#9C3333}.decision-result-status.warn{background:#FFF3D6;color:#8A6112}.decision-minutes-summary{margin-top:1.5mm;padding:1.5mm 2mm;border-right:.7mm solid #237A55;background:#F2FAF6;border-radius:1.5mm;color:#245B43;font-size:7.8pt;line-height:1.65}\n`};\n"""
if 'baseDecisionPrintStylesheet' not in d:
    if anchor not in d:
        raise SystemExit('decision init anchor missing')
    d=d.replace(anchor,print_patch+anchor,1)
dec.write_text(d,encoding='utf-8')

# Update browser test to click the real native input and check print CSS.
test=Path('.github/scripts/v1150-ui-test.mjs')
t=test.read_text(encoding='utf-8')
t=t.replace("const label=page.locator('.majalis-attachment-file-slot label.majalis-attach-file-button').first(),inputId=await label.getAttribute('for');assert.ok(inputId);assert.equal(await page.locator(`#${inputId}`).count(),1);assert.equal(await label.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');", "const label=page.locator('.majalis-attachment-file-slot label.majalis-attach-file-button').first(),input=page.locator('.majalis-native-file-input').first();assert.equal(await input.count(),1);assert.equal(await label.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');")
t=t.replace("const chooser=page.waitForEvent('filechooser',{timeout:3000});await label.click();const fc=await chooser;assert.ok(fc);await fc.setFiles([]);", "assert.match(await page.evaluate(()=>printStylesheet()),/\\.decision-statement/);assert.match(await page.evaluate(()=>printStylesheet()),/\\.decision-table/);const chooser=page.waitForEvent('filechooser',{timeout:3000});await input.click({force:true});const fc=await chooser;assert.ok(fc);await fc.setFiles([]);")
test.write_text(t,encoding='utf-8')

assert 'majalis-native-file-input' in u
assert 'baseDecisionPrintStylesheet' in d
print('final v1.15.0 runtime fixes applied')
