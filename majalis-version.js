(()=>{
'use strict';
const VERSION='1.15.9';
window.MAJALIS_VERSION=VERSION;
window.MAJALIS_VERSION_LABEL=`v${VERSION}`;
const scriptSrc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(scriptSrc?.set&&!window.__majalisVersionCacheRewrite1159){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{...scriptSrc,set(value){let next=String(value||'');if(next.includes('majalis-')&&/[?&]v=1\.15\.(?:7|8)(?:&|$)/.test(next))next=next.replace(/([?&]v=)1\.15\.(?:7|8)(?=&|$)/,'$1'+VERSION);scriptSrc.set.call(this,next)}});
  window.__majalisVersionCacheRewrite1159=true;
}
const stamp=()=>document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=window.MAJALIS_VERSION_LABEL);
const loadFinal=()=>{if(window.MajalisFinalV1159||document.querySelector('script[data-majalis-final="1.15.9"]'))return;const s=document.createElement('script');s.type='module';s.src='./majalis-final-v1159.js?v=1.15.9';s.dataset.majalisFinal='1.15.9';document.body.appendChild(s)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true});else stamp();
window.addEventListener('load',()=>setTimeout(loadFinal,0),{once:true});
window.MajalisVersion={version:VERSION,label:window.MAJALIS_VERSION_LABEL,stamp,loadFinal};
})();
