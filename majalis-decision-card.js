(()=>{
'use strict';
const VERSION='1.15.11';
const descriptor=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(descriptor?.set&&!window.__majalisBaseCacheRewriteV11511){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{...descriptor,set(value){let next=String(value||'');if(next.includes('majalis-decision-card-base.js'))next=next.replace(/([?&]v=)[^&]+/,'$1'+VERSION);descriptor.set.call(this,next)}});
  window.__majalisBaseCacheRewriteV11511=true;
}
const load=(src,onload)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;s.onerror=()=>console.error('Majalis script failed:',src);document.head.appendChild(s)};
const loadPatchedVotingFix=async onload=>{
  const src=`./majalis-voting-fix-v1153.js?v=${VERSION}`;
  try{
    const response=await fetch(src,{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    let code=await response.text();
    const broken="note.textContent=text,close=doc.querySelector('.minutes-default-closing'),body=doc.querySelector('.minutes-doc-body');";
    const fixed="note.textContent=text;const close=doc.querySelector('.minutes-default-closing');const body=doc.querySelector('.minutes-doc-body');";
    if(code.includes(broken))code=code.replace(broken,fixed);
    code=code.replace("const V=window.MAJALIS_VERSION||'1.15.7'","const V=window.MAJALIS_VERSION||'1.15.11'");
    if(!code.includes("const body=doc.querySelector('.minutes-doc-body');"))throw new Error('Majalis v1153 minutes scope patch was not applied.');
    const s=document.createElement('script');
    s.dataset.majalisPatchedVotingFix=VERSION;
    s.textContent=code+`\n//# sourceURL=majalis-voting-fix-v1153.js?v=${VERSION}`;
    document.head.appendChild(s);
  }catch(error){
    console.error('Majalis patched voting fix failed:',error);
  }finally{onload?.()}
};
load(`./majalis-decision-card-v1151.js?v=${VERSION}`,()=>load(`./majalis-decision-result.js?v=${VERSION}`,()=>loadPatchedVotingFix(()=>load(`./majalis-voting-fix-v1157.js?v=${VERSION}`))));
})();
