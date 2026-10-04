import json, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

import sys
NAME=sys.argv[1] if len(sys.argv)>1 else 'gate'
M=json.load(open(NAME+'_map.json'))
W,H=M['w'],M['h']; TW,TH=M['hfW'],M['hfH']
hf=np.frombuffer(open(NAME+'_hf.bin','rb').read(),dtype=np.float32).reshape(TH,TW)
rough=np.frombuffer(open(NAME+'_rough.bin','rb').read(),dtype=np.uint8).reshape(TH,TW)

def hat(x,y):
    fx=min(max(x/10,0),TW-1.001); fy=min(max(y/10,0),TH-1.001); i=int(fx); j=int(fy); u=fx-i; v=fy-j
    return hf[j,i]*(1-u)*(1-v)+hf[j,i+1]*u*(1-v)+hf[j+1,i]*(1-u)*v+hf[j+1,i+1]*u*v
def riverX(y): return W/2+(y-H/2)*M['river'].get('tilt',0)+M['river']['amp']*math.sin((y-H/2)/M['river']['period'])

# ---------- colour + shade the heightfield ----------
S=1.2  # pixels per world unit... render at 0.8 px/unit then upscale labels
R=0.8
pw,ph=int(W*R),int(H*R)
ys,xs=np.mgrid[0:ph,0:pw]; xw=(xs+.5)/R; yw=(ys+.5)/R
fx=np.clip(xw/10,0,TW-1.001); fy=np.clip(yw/10,0,TH-1.001); i=fx.astype(int); j=fy.astype(int); u=fx-i; v=fy-j
e=hf[j,i]*(1-u)*(1-v)+hf[j,i+1]*u*(1-v)+hf[j+1,i]*(1-u)*v+hf[j+1,i+1]*u*v
rg=rough[j,i]
gx=np.gradient(e,axis=1)*R; gy=np.gradient(e,axis=0)*R   # dh per world unit
sl=np.hypot(gx,gy)
nx=-gx; ny=-gy; nl=np.sqrt(nx*nx+ny*ny+1)
lit=np.clip(0.58+(nx*0.55-ny*0.6+0.6)/nl*0.55,0.3,1.2)
# base colours: snow meadow, rock on steep/rough, water below
r=np.full(e.shape,216.0); g=np.full(e.shape,222.0); b=np.full(e.shape,228.0)
t=np.clip(e/260,0,1); r+=30*t; g+=26*t; b+=20*t
rock=np.clip((sl-0.7)/0.6,0,1); rock=np.maximum(rock,rg*0.6)
r+=(132-r)*rock; g+=(128-g)*rock; b+=(130-b)*rock
low=np.clip((10-e)/14,0,1)*(1-rock); r-=18*low; g-=12*low; b-=4*low
water=e<-14
r[water]=96; g[water]=138; b[water]=176
img=np.stack([np.clip(r*lit,0,255),np.clip(g*lit,0,255),np.clip(b*lit,0,255)],-1).astype(np.uint8)
im=Image.fromarray(img).resize((int(W*S),int(H*S)),Image.BICUBIC)
d=ImageDraw.Draw(im,'RGBA')
P=lambda x,y:(x*S,y*S)

# forests
rng=np.random.default_rng(7)
for f in M['forests']:
    n=int(f['r']*f['r']/150)
    for _ in range(n):
        a=rng.random()*6.283; rr=math.sqrt(rng.random())*f['r']; x=f['x']+math.cos(a)*rr; y=f['y']+math.sin(a)*rr; s=(5+rng.random()*4)*S
        d.ellipse([x*S-s,y*S-s,x*S+s,y*S+s],fill=(52,86,66,230) if rng.random()<.5 else (66,104,80,230))
# river
pts=[P(riverX(y)-M['river']['half'],y) for y in range(-10,H+11,10)]+[P(riverX(y)+M['river']['half'],y) for y in range(H+10,-11,-10)]
d.polygon(pts,fill=(104,146,184,255))
# roads
for rd in M['roads']:
    lane=rd['kind']=='lane'; pts=[P(x,y) for x,y in rd['pts']]
    d.line(pts,fill=(120,96,70,170),width=int((44 if lane else 22)*S),joint='curve')
    col=(226,206,176,255) if rd['name']=='North' else (214,200,186,255) if lane else (196,182,160,255)
    d.line(pts,fill=col,width=int((26 if lane else 12)*S),joint='curve')
    if not lane:
        for k in range(0,len(pts)-1,2): d.line(pts[k:k+2],fill=(110,88,64,255),width=int(3*S))
# fords (plank bridges on the rims) and the Gate
for y0,y1,kind in M['river']['crossings']:
    xc=riverX((y0+y1)/2); hw=M['river']['half']+14
    if kind=='bridge' and abs((y0+y1)/2-H/2)<5:
        d.rectangle([P(xc-80,y0+16),P(xc+80,y1-16)],fill=(150,154,160,255),outline=(70,74,80,255),width=int(2*S))
        for k in range(-3,4): d.rectangle([P(xc+k*40-6,y0+12),P(xc+k*40+6,y0+26)],fill=(96,100,106,255)); d.rectangle([P(xc+k*40-6,y1-26),P(xc+k*40+6,y1-12)],fill=(96,100,106,255))
    else:
        d.rectangle([P(xc-hw,y0+10),P(xc+hw,y1-10)],fill=(122,90,66,255))
# keeps, towers, zone
for k in M['keeps']:
    d.ellipse([P(k['x']-M['zoneR'],k['y']-M['zoneR']),P(k['x']+M['zoneR'],k['y']+M['zoneR'])],outline=(80,140,240,120),width=int(2*S))
for ti,k in enumerate(M['keeps']):
    col=(47,111,214,255) if ti==0 else (170,46,58,255)
    d.ellipse([P(k['x']-58,k['y']-58),P(k['x']+58,k['y']+58)],fill=(201,204,208,255),outline=col,width=int(5*S))
    d.rectangle([P(k['x']-26,k['y']-26),P(k['x']+26,k['y']+26)],fill=col)
for t in M['towers']:
    col=(47,111,214,255) if t['team']==0 else (170,46,58,255)
    d.ellipse([P(t['x']-22,t['y']-22),P(t['x']+22,t['y']+22)],fill=(200,206,212,255),outline=col,width=int(4*S))
# nests, caches
for n in M['nests']:
    d.ellipse([P(n['x']-n['r'],n['y']-n['r']),P(n['x']+n['r'],n['y']+n['r'])],outline=(226,181,74,230),width=int(3*S))
    d.ellipse([P(n['x']-8,n['y']-8),P(n['x']+8,n['y']+8)],fill=(226,181,74,255))
for c in M['caches']:
    d.ellipse([P(c['x']-16,c['y']-16),P(c['x']+16,c['y']+16)],outline=(255,215,106,255),width=int(3*S))

# labels
try:
    F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',int(26*S))
    Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',int(18*S))
    Ft=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',int(32*S))
except Exception:
    F=Fs=Ft=ImageFont.load_default()
def label(x,y,txt,font=F,fill=(28,24,20,255),anchor='mm'):
    for dx,dy in [(-2,0),(2,0),(0,-2),(0,2),(-1,-1),(1,1),(-1,1),(1,-1)]: d.text((x*S+dx,y*S+dy),txt,font=font,fill=(245,242,235,235),anchor=anchor)
    d.text((x*S,y*S),txt,font=font,fill=fill,anchor=anchor)
exec(open('labels_'+NAME+'.py').read())
# legend
lx,ly=W-760,H-200
d.rectangle([P(lx,ly),P(lx+740,ly+180)],fill=(250,247,240,215),outline=(90,80,70,255),width=int(2*S))
items=[((47,111,214),'your keep & towers'),((170,46,58),'their keep & towers'),((226,181,74),'overlook nest (caster range + height, exposed)'),((255,215,106),'relic cache spot'),((80,140,240),'deploy circle')]
for k,(c,txt) in enumerate(items):
    yy=ly+28+k*30; d.ellipse([P(lx+22,yy-9),P(lx+40,yy+9)],fill=c+(255,)); label(lx+56,yy,txt,Fs,(40,36,30,255),'lm')
im=im.convert('RGB'); im.save(NAME+'_plan.png',optimize=True)
print('plan',im.size)
