(()=>{
'use strict';
const VERSION='1.15.18';
window.MAJALIS_VERSION=VERSION;
window.MAJALIS_VERSION_LABEL=`v${VERSION}`;

const versionPattern=/([?&]v=)1\.15\.(?:7|8|9|10|11|12|13|14|15|16|17)(?=&|$)/;
const scriptSrc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,'src');
if(scriptSrc?.set&&!window.__majalisVersionCacheRewrite11518){
  Object.defineProperty(HTMLScriptElement.prototype,'src',{...scriptSrc,set(value){
    let next=String(value||'');
    if(next.includes('majalis-')&&versionPattern.test(next))next=next.replace(versionPattern,'$1'+VERSION);
    scriptSrc.set.call(this,next);
  }});
  window.__majalisVersionCacheRewrite11518=true;
}

const stamp=()=>document.querySelectorAll('[data-majalis-version],.site-footer-wrap .version,.doc-footer-version').forEach(el=>el.textContent=window.MAJALIS_VERSION_LABEL);
const ensureExperienceStyle=()=>{
  if(document.querySelector('link[data-majalis-experience="v11518"]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=`./majalis-experience-v11518.css?v=${VERSION}`;
  link.dataset.majalisExperience='v11518';
  document.head.appendChild(link);
};
const addModule=(src,key,onDone)=>{
  if(window[key]||document.querySelector(`script[data-majalis-module="${key}"]`)){onDone?.();return}
  const script=document.createElement('script');
  script.type='module';
  script.src=src;
  script.dataset.majalisModule=key;
  script.addEventListener('load',()=>onDone?.(),{once:true});
  script.addEventListener('error',()=>{console.warn(`Majalis runtime module failed: ${src}`);onDone?.()},{once:true});
  document.body.appendChild(script);
};
const modules=[
  [`./majalis-final-v1159.js?v=${VERSION}`,'MajalisFinalV1159'],
  [`./majalis-final-v11510.js?v=${VERSION}`,'MajalisFinalV11510'],
  [`./majalis-minutes-closing-v11515.js?v=${VERSION}`,'MajalisMinutesClosingMode'],
  [`./majalis-minutes-signature-v11516.js?v=${VERSION}`,'MajalisMinutesSignature'],
  [`./majalis-voting-fix-v11517.js?v=${VERSION}`,'MajalisVotingDecision'],
  [`./majalis-experience-v11518.js?v=${VERSION}`,'MajalisExperienceV11518']
];
let runtimeStarted=false;
const loadRuntime=()=>{
  if(runtimeStarted)return;
  runtimeStarted=true;
  const next=index=>{
    if(index>=modules.length){stamp();return}
    const [src,key]=modules[index];
    addModule(src,key,()=>next(index+1));
  };
  next(0);
};
const prepare=()=>{stamp();ensureExperienceStyle()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
window.addEventListener('load',()=>setTimeout(loadRuntime,0),{once:true});
window.MajalisVersion={version:VERSION,label:window.MAJALIS_VERSION_LABEL,stamp,loadRuntime,loadFinal:loadRuntime,modules:modules.map(([src,key])=>({src,key}))};
})();
