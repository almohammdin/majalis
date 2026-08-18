(()=>{
'use strict';
const VERSION='1.15.7';
window.MAJALIS_VERSION=VERSION;
window.MAJALIS_VERSION_LABEL=`v${VERSION}`;
const stamp=()=>document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=window.MAJALIS_VERSION_LABEL);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',stamp,{once:true});else stamp();
window.MajalisVersion={version:VERSION,label:window.MAJALIS_VERSION_LABEL,stamp};
})();
