(()=>{
'use strict';
const VERSION=window.MAJALIS_VERSION||'1.15.16';

const LIVE_CSS=`
#docMinutes .minutes-final-block{margin-top:16px;break-inside:avoid;page-break-inside:avoid}
#docMinutes .minutes-final-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:9px!important;width:min(100%,430px)!important;margin-left:auto!important;margin-right:0!important;direction:rtl!important;text-align:right!important}
#docMinutes .minutes-final-item{display:grid!important;grid-template-columns:72px minmax(0,1fr)!important;column-gap:12px!important;align-items:start!important;min-width:0!important}
#docMinutes .minutes-final-item>span:first-child{display:block!important;color:var(--muted)!important;font-size:11px!important;font-weight:600!important;white-space:nowrap!important;line-height:1.7!important}
#docMinutes .minutes-final-item>strong{display:block!important;color:var(--ink)!important;font-size:13px!important;font-weight:700!important;line-height:1.7!important;min-width:0!important;word-break:normal!important;overflow-wrap:anywhere!important}
#docMinutes .minutes-final-signature .sign-pad{display:block!important;width:100%!important;min-width:180px!important;height:42px!important;border-bottom:1px solid #AAB4C0!important}
@media(max-width:680px){#docMinutes .minutes-final-grid{width:100%!important}#docMinutes .minutes-final-item{grid-template-columns:64px minmax(0,1fr)!important;column-gap:10px!important}}
`;

const PRINT_CSS=`
.minutes-final-block{margin-top:4mm!important;break-inside:avoid!important;page-break-inside:avoid!important}
.minutes-final-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:2.2mm!important;width:95mm!important;max-width:100%!important;margin-left:auto!important;margin-right:0!important;direction:rtl!important;text-align:right!important}
.minutes-final-item{display:grid!important;grid-template-columns:18mm minmax(0,1fr)!important;column-gap:3mm!important;align-items:start!important;min-width:0!important}
.minutes-final-item>span:first-child{display:block!important;color:#677386!important;font-size:8pt!important;font-weight:600!important;white-space:nowrap!important;line-height:1.5!important}
.minutes-final-item>strong{display:block!important;color:#18202A!important;font-size:9pt!important;font-weight:700!important;line-height:1.5!important;min-width:0!important;word-break:normal!important;overflow-wrap:anywhere!important}
.minutes-final-signature .sign-pad{display:block!important;width:100%!important;min-width:48mm!important;height:9mm!important;border-bottom:.25mm solid #AAB4C0!important}
`;

function ensureLiveStyles(){
  let style=document.getElementById('majalisMinutesSignature11516Styles');
  if(!style){style=document.createElement('style');style.id='majalisMinutesSignature11516Styles';document.head.appendChild(style)}
  if(style.textContent!==LIVE_CSS)style.textContent=LIVE_CSS;
}

function patchPrintStyles(){
  const base=window.printStylesheet;
  if(typeof base!=='function'||base.__minutesSignature11516)return;
  const wrapped=function(){return base.apply(this,arguments)+PRINT_CSS};
  wrapped.__minutesSignature11516=true;
  window.printStylesheet=wrapped;
}

function apply(){ensureLiveStyles();patchPrintStyles()}

const baseRender=window.renderDocuments;
if(typeof baseRender==='function'&&!baseRender.__minutesSignature11516){
  const wrapped=function(){const out=baseRender.apply(this,arguments);apply();return out};
  wrapped.__minutesSignature11516=true;
  window.renderDocuments=wrapped;
}

window.MajalisMinutesSignature={version:VERSION,apply};
apply();
})();
