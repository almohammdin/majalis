from pathlib import Path
import re

path = Path('majalis-upgrade.js')
s = path.read_text()


def replace_once(old, new, label):
    global s
    if old not in s:
        raise SystemExit(f'Missing anchor: {label}')
    s = s.replace(old, new, 1)


def sub_once(pattern, replacement, label):
    global s
    updated, count = re.subn(pattern, lambda _: replacement, s, flags=re.S)
    if count != 1:
        raise SystemExit(f'Expected one match for {label}, got {count}')
    s = updated


replace_once(
    "let currentMeetingId='',currentSignatureMeetingId='',currentSignedMinutes=null,decorateQueued=false,observer=null;",
    "let currentMeetingId='',currentSignatureMeetingId='',currentSignedMinutes=null,signatureSignedMinutes=null,decorateQueued=false,observer=null;",
    'separate signed-minutes state'
)

sub_once(
    r"async function fetchSignedMinutes\(meetingId\)\{.*?\}\n(?=async function uploadSignedMinutes)",
    """async function fetchSignedMinutes(meetingId,scope='current'){if(!meetingId||!auth.currentUser){if(scope==='signature')signatureSignedMinutes=null;else currentSignedMinutes=null;renderAll();return null}try{const ctx=await resolveMeetingContext(meetingId),snap=await getDoc(ctx.ref),value=snap.exists()?(snap.data().signedMinutesDocument||null):null;if(scope==='signature')signatureSignedMinutes=value;else currentSignedMinutes=value;renderAll();return value}catch(err){console.error(err);if(scope==='signature')signatureSignedMinutes=null;else currentSignedMinutes=null;renderAll();return null}}
""",
    'fetchSignedMinutes'
)

sub_once(
    r"async function uploadSignedMinutes\(file,meetingId=''\)\{.*?\}\n(?=async function deleteSignedMinutes)",
    """async function uploadSignedMinutes(file,meetingId=''){const error=validateSignedMinutes(file);if(error){toast(error,'error');return {ok:false,error}};try{let ctx;if(meetingId)ctx=await resolveMeetingContext(meetingId);else ctx=await ensureMeetingContext();const stored=(await getDoc(ctx.ref)).data()?.signedMinutesDocument||null,old=meetingId?(signatureSignedMinutes||stored):(currentSignedMinutes||stored),path=`organizations/${ctx.organizationId}/meetings/${ctx.meetingId}/signed-minutes/${uniqueName(file)}`,target=storageRef(storage,path);await uploadBytes(target,file,{contentType:'application/pdf',customMetadata:{documentType:'signed-minutes',originalName:safeFileName(file.name)}});const meta={id:'signed-minutes',name:'المحضر الموقع',originalName:file.name,mimeType:'application/pdf',size:file.size,uploadedAt:new Date().toISOString(),storagePath:path};try{await setDoc(ctx.ref,{signedMinutesDocument:meta,updatedAt:serverTimestamp()},{merge:true})}catch(saveError){await deleteObject(target).catch(()=>{});throw saveError}if(old?.storagePath&&old.storagePath!==path)await deleteObject(storageRef(storage,old.storagePath)).catch(()=>{});if(meetingId){signatureSignedMinutes=meta;if(String(meetingId)===String(currentMeetingId))currentSignedMinutes=meta}else{currentMeetingId=ctx.meetingId;currentSignedMinutes=meta}toast('تم إرفاق المحضر الموقع.');window.dispatchEvent(new CustomEvent('majalis:signed-minutes-updated',{detail:meta}));renderAll();return {ok:true,document:meta}}catch(err){console.error('Majalis signed minutes upload:',err);toast(err.message||'تعذر رفع المحضر الموقع.','error');return {ok:false,error:err.message||'upload_failed'}}}
""",
    'uploadSignedMinutes'
)

sub_once(
    r"async function deleteSignedMinutes\(meetingId=''\)\{.*?\}\n\n(?=function fileButtons)",
    """async function deleteSignedMinutes(meetingId=''){const signatureScope=!!meetingId&&String(meetingId)===String(currentSignatureMeetingId),meta=signatureScope?signatureSignedMinutes:currentSignedMinutes;if(!meta)return {ok:true};try{const id=String(meetingId||currentMeetingId),ctx=await resolveMeetingContext(id);await setDoc(ctx.ref,{signedMinutesDocument:null,updatedAt:serverTimestamp()},{merge:true});if(meta.storagePath)await deleteObject(storageRef(storage,meta.storagePath)).catch(()=>{});if(signatureScope)signatureSignedMinutes=null;if(String(id)===String(currentMeetingId))currentSignedMinutes=null;toast('تم حذف المحضر الموقع.');renderAll();return {ok:true}}catch(err){console.error(err);toast(err.message||'تعذر حذف المحضر الموقع.','error');return {ok:false,error:err.message}}}

""",
    'deleteSignedMinutes'
)

sub_once(
    r"function renderAttachmentSlots\(\)\{.*?\}\n(?=function signedMinutesRow)",
    """function renderAttachmentSlots(){document.querySelectorAll('.agenda-attachment-row').forEach(row=>{const id=row.dataset.attachmentId,item=attachmentById(id);if(!item)return;let slot=row.querySelector('.majalis-attachment-file-slot');if(!slot){slot=document.createElement('div');slot.className='majalis-attachment-file-slot';row.appendChild(slot)}const html=`<input type=\"file\" hidden data-attachment-file-input=\"${esc(id)}\" accept=\".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt\"><button class=\"btn soft majalis-attach-file-button\" type=\"button\" data-pick-attachment-file=\"${esc(id)}\">${item.storagePath?'استبدال الملف':'إرفاق ملف'}</button>${item.storagePath?`<span class=\"majalis-attachment-file-meta\"><strong>${esc(item.originalName||'ملف مرفق')}</strong><small>${bytesLabel(item.size)}${item.uploadedAt?` · ${esc(dateLabel(item.uploadedAt))}`:''}</small></span><button type=\"button\" class=\"majalis-file-link\" data-open-storage=\"${esc(item.storagePath)}\" data-file-name=\"${esc(item.originalName||'')}\">فتح</button><button type=\"button\" class=\"majalis-file-link danger\" data-remove-attachment-file=\"${esc(id)}\">إزالة الملف</button>`:'<span class=\"majalis-attachment-file-meta muted\">رفع الملف اختياري</span>'}`;if(slot.innerHTML!==html)slot.innerHTML=html})}
""",
    'renderAttachmentSlots'
)

sub_once(
    r"function renderDocumentsCards\(\)\{.*?\}\n(?=function ensureSignaturePanel)",
    """function renderDocumentsCards(){ensureDocumentsCards();const list=$('majalisMeetingFilesList');if(!list)return;const attachments=snapshot().meetingAttachments||[],rows=attachments.length?attachments.map(item=>`<div class=\"majalis-file-row\"><div><strong>${esc(item.name||item.originalName||'مرفق')}</strong><small>${item.storagePath?`${esc(item.originalName||'')} · ${bytesLabel(item.size)}`:'اسم مستند ضمن مرفقات الدعوة'}</small></div><div class=\"majalis-file-actions\">${fileButtons(item)}</div></div>`).join(''):'<div class=\"majalis-files-empty\">لا توجد مرفقات دعوة حاليا.</div>',html=rows+signedMinutesRow();if(list.innerHTML!==html)list.innerHTML=html;const indicator=$('majalisSignedIndicator'),indicatorText=`المحضر الموقع: ${currentSignedMinutes?'مرفق':'غير مرفق'}`;if(indicator&&indicator.textContent!==indicatorText)indicator.textContent=indicatorText;const attach=$('majalisAttachSignedFromDocs');if(attach)attach.hidden=!auth.currentUser;const actions=$('majalisSignedActions');if(actions){const actionsHtml=auth.currentUser?(currentSignedMinutes?`<button class=\"btn soft\" type=\"button\" data-pick-signed-minutes>استبدال المحضر الموقع</button><button class=\"btn danger\" type=\"button\" data-delete-signed-minutes>حذف المحضر الموقع</button><input type=\"file\" data-signed-minutes-input hidden accept=\"application/pdf,.pdf\">`:`<button class=\"btn soft\" type=\"button\" data-pick-signed-minutes>إرفاق المحضر الموقع</button><input type=\"file\" data-signed-minutes-input hidden accept=\"application/pdf,.pdf\">`):'';if(actions.innerHTML!==actionsHtml)actions.innerHTML=actionsHtml}ensureSignedSummary()}
""",
    'renderDocumentsCards'
)

sub_once(
    r"function ensureSignaturePanel\(\)\{.*?\}\n(?=function ensureSignedSummary)",
    """function ensureSignaturePanel(){const modal=$('signatureTrackingModal'),list=$('signatureTrackingList');if(!modal||!list)return;let panel=$('majalisSignatureDocumentPanel');if(!panel){panel=document.createElement('section');panel.id='majalisSignatureDocumentPanel';panel.className='majalis-signature-document-panel';list.insertAdjacentElement('afterend',panel)}const meta=signatureSignedMinutes,html=`<div class=\"majalis-resource-head\"><div><strong>المحضر الموقع</strong><span>أرفق النسخة النهائية بعد اكتمال التوقيع</span></div><span class=\"majalis-file-state ${meta?'attached':''}\">${meta?'مرفق':'غير مرفق'}</span></div>${meta?`<div class=\"majalis-signed-meta\"><strong>${esc(meta.originalName||'المحضر الموقع.pdf')}</strong><small>${bytesLabel(meta.size)}${meta.uploadedAt?` · ${esc(dateLabel(meta.uploadedAt))}`:''}</small></div>`:''}<div class=\"button-row\"><button class=\"btn soft\" type=\"button\" data-open-external-tool=\"waqqe\">فتح وقّع</button><button class=\"btn primary\" type=\"button\" data-pick-signed-minutes>${meta?'استبدال النسخة':'إرفاق المحضر الموقع'}</button>${meta?'<button class=\"btn danger\" type=\"button\" data-delete-signed-minutes>حذف</button>':''}<input type=\"file\" data-signed-minutes-input hidden accept=\"application/pdf,.pdf\"></div>`;if(panel.innerHTML!==html)panel.innerHTML=html}
""",
    'ensureSignaturePanel'
)

sub_once(
    r"function ensureSignedSummary\(\)\{.*?\}\n\n(?=function representedVotingRights)",
    """function ensureSignedSummary(){const grid=document.querySelector('.review-card .rule-grid');if(!grid)return;let row=$('majalisSignedMinutesSummary');if(!row){row=document.createElement('div');row.id='majalisSignedMinutesSummary';row.className='rule';row.innerHTML='<span>المحضر الموقع</span><strong>غير مرفق</strong>';grid.appendChild(row)}const text=currentSignedMinutes?'مرفق':'غير مرفق',strong=row.querySelector('strong');if(strong&&strong.textContent!==text)strong.textContent=text;row.classList.toggle('good',!!currentSignedMinutes)}

""",
    'ensureSignedSummary'
)

sub_once(
    r"function bind\(\)\{.*?\}\n(?=function renderAll)",
    """function bind(){document.addEventListener('click',event=>{const pick=event.target.closest('[data-pick-attachment-file]');if(pick){document.querySelector(`[data-attachment-file-input=\"${CSS.escape(pick.dataset.pickAttachmentFile)}\"]`)?.click();return}const removeFile=event.target.closest('[data-remove-attachment-file]');if(removeFile){removeAttachmentFile(removeFile.dataset.removeAttachmentFile);return}const open=event.target.closest('[data-open-storage]');if(open){openStoragePath(open.dataset.openStorage,false,open.dataset.fileName);return}const download=event.target.closest('[data-download-storage]');if(download){openStoragePath(download.dataset.downloadStorage,true,download.dataset.fileName);return}const external=event.target.closest('[data-open-external-tool]');if(external){openExternalTool(external.dataset.openExternalTool);return}const pickSigned=event.target.closest('[data-pick-signed-minutes]');if(pickSigned){pickSigned.closest('section,div')?.querySelector('[data-signed-minutes-input]')?.click();return}if(event.target.closest('#majalisAttachSignedFromDocs')){$('majalisSignedMinutesInputDocs')?.click();return}const deleteSigned=event.target.closest('[data-delete-signed-minutes]');if(deleteSigned){const inSignature=!!deleteSigned.closest('#signatureTrackingModal');deleteSignedMinutes(inSignature?currentSignatureMeetingId:currentMeetingId);return}const removeAttachment=event.target.closest('[data-remove-attachment]');if(removeAttachment){const item=attachmentById(removeAttachment.dataset.removeAttachment);if(item?.storagePath)setTimeout(()=>cleanupDeletedAttachment(item),0)}const openMeeting=event.target.closest('[data-open-meeting]');if(openMeeting){currentMeetingId=String(openMeeting.dataset.openMeeting||'');currentSignatureMeetingId='';signatureSignedMinutes=null;setTimeout(()=>fetchSignedMinutes(currentMeetingId,'current'),80)}const signatures=event.target.closest('[data-signatures-meeting]');if(signatures){currentSignatureMeetingId=String(signatures.dataset.signaturesMeeting||'');setTimeout(async()=>{await fetchSignedMinutes(currentSignatureMeetingId,'signature');ensureSignaturePanel()},80)}if(event.target.closest('[data-close-admin-modal=\"signature\"]')){currentSignatureMeetingId='';signatureSignedMinutes=null;setTimeout(renderAll,0)}if(event.target.closest('#newAdminMeeting,#adminNewMeetingFromDashboard,[data-open-org]')){currentMeetingId='';currentSignatureMeetingId='';currentSignedMinutes=null;signatureSignedMinutes=null;setTimeout(renderAll,0)}if(event.target.closest('#printCurrent,#printPackage'))decorateVoting()},true);document.addEventListener('change',event=>{const attachmentInput=event.target.closest('[data-attachment-file-input]');if(attachmentInput){const file=attachmentInput.files?.[0];attachmentInput.value='';if(file)uploadInvitationAttachment(attachmentInput.dataset.attachmentFileInput,file);return}if(event.target.matches('[data-signed-minutes-input],#majalisSignedMinutesInputDocs')){const file=event.target.files?.[0],inSignature=!!event.target.closest('#signatureTrackingModal');event.target.value='';if(file)uploadSignedMinutes(file,inSignature?currentSignatureMeetingId:'')}},true);observer=new MutationObserver(queueDecorate);observer.observe(document.body,{childList:true,subtree:true});onAuthStateChanged(auth,()=>{renderAll();augmentAssistantBridge()});window.addEventListener('majalis:signed-minutes-updated',renderAll)}
""",
    'bind'
)

for token in [
    'signatureSignedMinutes',
    'if(slot.innerHTML!==html)',
    'actions.innerHTML!==actionsHtml',
    "fetchSignedMinutes(currentSignatureMeetingId,'signature')"
]:
    if token not in s:
        raise SystemExit(f'Missing stability token after patch: {token}')

path.write_text(s)
