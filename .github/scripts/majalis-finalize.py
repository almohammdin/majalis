from pathlib import Path

p=Path('majalis-upgrade.js')
s=p.read_text()

anchor="const tallyItems=items.filter(x=>x.vote&&x.vote!=='لم يجر تصويت'),tallyRows=document.querySelectorAll('#docTally .vote-tally-table tbody tr');"
insert="""const ballotResultItems=items.filter(item=>item.includeInBallot&&voteStats(item,snap).total>0);document.querySelectorAll('#docVoting .ballot-card').forEach(card=>{let box=card.querySelector('.majalis-ballot-results');if(!ballotResultItems.length){box?.remove();return}if(!box){box=document.createElement('section');box.className='majalis-ballot-results';card.appendChild(box)}const html=`<strong>ملخص نتيجة التصويت</strong><small>النسب أدناه للحصر فقط، والنتيجة النظامية النهائية وفق الوثائق المنظمة للجهة.</small>${ballotResultItems.map(item=>`<div class=\"majalis-ballot-result-row\"><span>${esc(item.title||'بند التصويت')}</span><div>${voteSummaryMarkup(item,snap)}</div></div>`).join('')}`;if(box.innerHTML!==html)box.innerHTML=html});const tallyItems=items.filter(x=>x.vote&&x.vote!=='لم يجر تصويت'),tallyRows=document.querySelectorAll('#docTally .vote-tally-table tbody tr');"""
if anchor not in s:
    raise SystemExit('Missing ballot-result anchor')
s=s.replace(anchor,insert,1)

css_anchor=".majalis-tally-pct{display:block;font-size:8px;color:var(--muted);line-height:1.4}"
css_add=".majalis-tally-pct{display:block;font-size:8px;color:var(--muted);line-height:1.4}.majalis-ballot-results{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.majalis-ballot-results>strong{display:block;color:var(--navy);font-size:11px}.majalis-ballot-results>small{display:block;color:var(--muted);font-size:8px;margin-bottom:7px}.majalis-ballot-result-row{padding:7px 0;border-top:1px solid #edf0f3}.majalis-ballot-result-row>span{display:block;font-size:9px;font-weight:700;color:var(--ink);margin-bottom:4px}.majalis-ballot-result-row .majalis-vote-basis{font-size:8px}.majalis-ballot-result-row .majalis-vote-basis>span{font-size:8px}"
if css_anchor not in s:
    raise SystemExit('Missing ballot CSS anchor')
s=s.replace(css_anchor,css_add,1)

for token in ['majalis-ballot-results','ملخص نتيجة التصويت','للحصر فقط']:
    if token not in s:
        raise SystemExit(f'Missing final token {token}')
p.write_text(s)
