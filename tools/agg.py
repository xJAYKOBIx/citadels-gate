import json,sys,glob,statistics as st,collections as C
rows=[json.loads(l) for f in sys.argv[1:] for l in open(f)]
cov={'holts','kyndrili','borvik'}
pr=C.OrderedDict(); cw=C.Counter(); cg=C.Counter(); side=C.Counter(); ts=[]
for r in rows:
    a,b=r['pair'].split(','); w=r['winner']
    d=pr.setdefault(r['pair'],{'a':0,'b':0,'n':0,'t':[], 'none':0})
    d['n']+=1; d['t'].append(r['t']/60)
    if w is None or w<0: d['none']+=1; continue
    wc=r['cmds'][w]; d['a' if wc==a else 'b']+=1; cw[wc]+=1; side[w]+=1; ts.append(r['t']/60)
    for c in r['cmds']: cg[c]+=1
    if r.get('err'): print('ERR',r['err'][:200])
print('pair            A-wins B-wins none  median  min  max  (<6 / >18)')
for k,d in pr.items():
    t=sorted(d['t']); print(f"{k:18} {d['a']:3} {d['b']:6} {d['none']:4}  {st.median(t):5.1f} {t[0]:5.1f} {t[-1]:5.1f}  {sum(x<6 for x in t)}/{sum(x>18 for x in t)}")
print('commander win%:',{k:round(100*cw[k]/cg[k]) for k in cg})
print('cov win% overall:',round(100*sum(cw[k] for k in cov)/max(1,sum(cw.values()))),' team0 wins',side[0],'team1',side[1])
print('all median',round(st.median(ts),1),'in 8-15:',sum(8<=x<=15 for x in ts),'/',len(ts))
