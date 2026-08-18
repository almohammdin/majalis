(()=>{
'use strict';
const load=(src,onload)=>{const s=document.createElement('script');s.src=src;s.async=false;if(onload)s.onload=onload;s.onerror=()=>console.error('Majalis script failed:',src);document.head.appendChild(s)};
load('./majalis-decision-card-v1151.js?v=1.15.7',()=>load('./majalis-decision-result.js?v=1.15.7',()=>load('./majalis-voting-fix-v1153.js?v=1.15.7',()=>load('./majalis-voting-fix-v1157.js?v=1.15.7'))));
})();
