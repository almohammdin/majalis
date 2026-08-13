from pathlib import Path
import re

index=Path('index.html')
text=index.read_text(encoding='utf-8')
text=text.replace('1.14.0','1.15.0').replace('v1.14.0','v1.15.0')
anchor='<script type="module" src="./majalis-upgrade.js?v=1.15.0"></script>'
if './majalis-decision-card.js?v=1.15.0' not in text:
    if anchor not in text: raise SystemExit('upgrade anchor missing')
    text=text.replace(anchor,'<script src="./majalis-decision-card.js?v=1.15.0"></script>\n'+anchor,1)
index.write_text(text,encoding='utf-8')

up=Path('majalis-upgrade.js')
u=up.read_text(encoding='utf-8').replace("const VERSION='1.14.0';","const VERSION='1.15.0';")
old="function renderAttachmentSlots(){document.querySelectorAll('.agenda-attachment-row').forEach(row=>{const id=row.dataset.attachmentId,item=attachmentById(id);if(!item)return;let slot=row.querySelector('.majalis-attachment-file-slot');if(!slot){slot=document.createElement('div');slot.className='majalis-attachment-file-slot';row.appendChild(slot)}const html=`<input type=\"file\" hidden data-attachment-file-input=\"${esc(id)}\" accept=\".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt\"><button class=\"btn soft majalis-attach-file-button\" type=\"button\" data-pick-attachment-file=\"${esc(id)}\">${item.storagePath?'استبدال الملف':'إرفاق ملف'}</button>${item.storagePath?`<span class=\"majalis-attachment-file-meta\"><strong>${esc(item.originalName||'ملف مرفق')}</strong><small>${bytesLabel(item.size)}${item.uploadedAt?` · ${esc(dateLabel(item.uploadedAt))}`:''}</small></span><button type=\"button\" class=\"majalis-file-link\" data-open-storage=\"${esc(item.storagePath)}\" data-file-name=\"${esc(item.originalName||'')}\">فتح</button><button type=\"button\" class=\"majalis-file-link danger\" data-remove-attachment-file=\"${esc(id)}\">إزالة الملف</button>`:'<span class=\"majalis-attachment-file-meta muted\">رفع الملف اختياري</span>'}`;if(slot.innerHTML!==html)slot.innerHTML=html})}"
new="function renderAttachmentSlots(){document.querySelectorAll('.agenda-attachment-row').forEach(row=>{const id=row.dataset.attachmentId,item=attachmentById(id);if(!item)return;let slot=row.querySelector('.majalis-attachment-file-slot');if(!slot){slot=document.createElement('div');slot.className='majalis-attachment-file-slot';row.appendChild(slot)}const inputId=`majalis-attachment-file-${String(id).replace(/[^A-Za-z0-9_-]/g,'_')}`,html=`<input id=\"${inputId}\" type=\"file\" hidden data-attachment-file-input=\"${esc(id)}\" accept=\".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt\"><label class=\"btn soft majalis-attach-file-button\" for=\"${inputId}\">${item.storagePath?'استبدال الملف':'إرفاق ملف'}</label>${item.storagePath?`<span class=\"majalis-attachment-file-meta\"><strong>${esc(item.originalName||'ملف مرفق')}</strong><small>${bytesLabel(item.size)}${item.uploadedAt?` · ${esc(dateLabel(item.uploadedAt))}`:''}</small></span><button type=\"button\" class=\"majalis-file-link\" data-open-storage=\"${esc(item.storagePath)}\" data-file-name=\"${esc(item.originalName||'')}\">فتح</button><button type=\"button\" class=\"majalis-file-link danger\" data-remove-attachment-file=\"${esc(id)}\">إزالة الملف</button>`:'<span class=\"majalis-attachment-file-meta muted\">رفع الملف اختياري</span>'}`;if(slot.innerHTML!==html)slot.innerHTML=html})}"
if old not in u: raise SystemExit('attachment renderer anchor missing')
u=u.replace(old,new,1)
u=u.replace(".majalis-attachment-file-slot{width:100%;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 38px 0 0}",".majalis-attachment-file-slot{grid-column:1/-1!important;width:100%;min-width:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 38px 0 0}",1)
u=u.replace(".majalis-attach-file-button{min-height:34px;padding:5px 10px}",".majalis-attach-file-button{min-height:34px;padding:5px 10px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;white-space:nowrap}.majalis-attachment-file-meta,.majalis-file-link{white-space:nowrap}",1)
u=u.replace("items.forEach((item,index)=>{const narrative=voteNarrative(item),row=minuteRows[index];if(!row||!narrative)return;", "items.forEach((item,index)=>{if(item?.decisionCardOutcome)return;const narrative=voteNarrative(item),row=minuteRows[index];if(!row||!narrative)return;",1)
up.write_text(u,encoding='utf-8')

assert 'majalis-decision-card.js?v=1.15.0' in text
assert 'grid-column:1/-1!important' in u
assert '<label class="btn soft majalis-attach-file-button"' in u
print('v1.15.0 patch applied')
