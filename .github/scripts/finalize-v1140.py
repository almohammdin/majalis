from pathlib import Path

p=Path('index.html')
s=p.read_text()
old="@media(max-width:760px){.site-footer-wrap .footer{padding-inline:12px;padding-bottom:48px}.site-footer-wrap .footer-admin-entry{top:auto;bottom:4px;inset-inline-start:10px;transform:none}.minutes-closing-grid{grid-template-columns:1fr}}"
new="@media(max-width:760px){.site-footer-wrap .footer{padding-inline:92px 10px;min-height:38px;gap:6px 9px}.site-footer-wrap .footer-admin-entry{top:0;inset-inline-start:8px;transform:none;min-height:28px;padding:3px 7px;font-size:9px}.site-footer-wrap .footer-admin-entry .admin-entry-icon{font-size:11px}.minutes-closing-grid{grid-template-columns:1fr}}"
if old not in s: raise SystemExit('mobile footer style anchor missing')
s=s.replace(old,new,1)
p.write_text(s)

p=Path('majalis-upgrade.js')
s=p.read_text()
s=s.replace("const VERSION='1.13.8';","const VERSION='1.14.0';",1)
old="document.querySelectorAll('#docVoting .ballot-card').forEach(card=>{"
new="document.querySelectorAll('#docVoting .ballot-card:not(.blank-ballot-card)').forEach(card=>{"
if old not in s: raise SystemExit('upgrade ballot selector anchor missing')
s=s.replace(old,new,1)
p.write_text(s)
