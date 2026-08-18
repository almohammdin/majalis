(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.17';
if(window.__majalisVotingFixV11517Loaded)return;
const script=document.createElement('script');
script.src=`./majalis-voting-fix-v11517.js?v=${VERSION}`;
script.async=false;
script.onload=()=>{window.__majalisVotingFixV11517Loaded=true};
script.onerror=()=>console.error('Majalis clean voting layer failed to load.');
document.head.appendChild(script);
})();
