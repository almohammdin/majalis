(()=>{
'use strict';
const VERSION='1.15.16';
window.MAJALIS_VERSION=VERSION;
window.MAJALIS_VERSION_LABEL=`v${VERSION}`;
const scriptSrc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(scriptSrc?.set&&!window.__majalisVersionCacheRewrite11516){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{...scriptSrc,set(value){let next=String(value||'');if(next.includes('majalis-')&&/[?&]v=1\.15\.(?:7|8|9|10|11|12|13|14|15)(?:&|$)/.test(next))next=next.replace(/([?&]v=)1\.15\.(?:7|8|9|10|11|12|13|14|15)(?=&|$)/,'$1'+VERSION);scriptSrc.set.call(this,next)}});
  window.__majalisVersionCacheRewrite11516=true;
}
const stamp=()=>document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=window.MAJALIS_VERSION_LABEL);
const addModule=(src,key,onload)=>{if(window[key]||document.querySelector(`script[data-majalis-module="${key}"]`)){onload?.();return}const s=document.createElement('script');s.type='module';s.src=src;s.dataset.majalisModule=key;if(onload)s.addEventListener('load',onload,{once:true});document.body.appendChild(s)};
const loadFinal=()=>addModule(`./majalis-final-v1159.js?v=${VERSION}`,'MajalisFinalV1159',()=>addModule(`./majalis-final-v11510.js?v=${VERSION}`,'MajalisFinalV11510',()=>addModule(`./majalis-minutes-closing-v11515.js?v=${VERSION}`,'MajalisMinutesClosingMode',()=>addModule(`./majalis-minutes-signature-v11516.js?v=${VERSION}`,'MajalisMinutesSignature'))));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true});else stamp();
window.addEventListener('load',()=>setTimeout(loadFinal,0),{once:true});
window.MajalisVersion={version:VERSION,label:window.MAJALIS_VERSION_LABEL,stamp,loadFinal};
})();
