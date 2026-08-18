(()=>{
'use strict';
const VERSION='1.15.9';
const descriptor=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(descriptor?.set&&!window.__majalisBaseCacheRewriteV1159){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{...descriptor,set(value){let next=String(value||'');if(next.includes('majalis-decision-card-base.js'))next=next.replace(/([?&]v=)[^&]+/,'$1'+VERSION);descriptor.set.call(this,next)}});
  window.__majalisBaseCacheRewriteV1159=true;
}
const load=(src,onload)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;s.onerror=()=>console.error('Majalis script failed:',src);document.head.appendChild(s)};
load('./majalis-decision-card-v1151.js?v=1.15.9',()=>load('./majalis-decision-result.js?v=1.15.9',()=>load('./majalis-voting-fix-v1153.js?v=1.15.9',()=>load('./majalis-voting-fix-v1157.js?v=1.15.9'))));
})();
