import json, math, numpy as np
from PIL import Image, ImageDraw, ImageFont
import sys
NAME=sys.argv[1] if len(sys.argv)>1 else 'gate'
M=json.load(open(NAME+'_map.json')); W,H=M['w'],M['h']; TW,TH=M['hfW'],M['hfH']
hf=np.frombuffer(open(NAME+'_hf.bin','rb').read(),dtype=np.float32).reshape(TH,TW).copy()
rough=np.frombuffer(open(NAME+'_rough.bin','rb').read(),dtype=np.uint8).reshape(TH,TW)
riverX=lambda y: W/2+(y-H/2)*M['river'].get('tilt',0)+M['river']['amp']*math.sin((y-H/2)/M['river']['period'])
# ---- per-vertex colour (same palette as the plan) ----
ys,xs=np.mgrid[0:TH,0:TW]; xw=xs*10.0; yw=ys*10.0
gx=np.gradient(hf,axis=1)/10; gy=np.gradient(hf,axis=0)/10; sl=np.hypot(gx,gy)
r=np.full(hf.shape,218.0); g=np.full(hf.shape,224.0); b=np.full(hf.shape,230.0)
t=np.clip(hf/260,0,1); r+=28*t; g+=24*t; b+=18*t
rock=np.clip((sl-0.7)/0.6,0,1); rock=np.maximum(rock,rough*0.6)
r+=(128-r)*rock; g+=(124-g)*rock; b+=(126-b)*rock
low=np.clip((10-hf)/14,0,1)*(1-rock); r-=16*low; g-=10*low; b-=2*low
# roads / river / forest paint
road=np.zeros(hf.shape); roadT=np.zeros(hf.shape)
for rd in M['roads']:
    lane=rd['kind']=='lane'
    for (x0,y0),(x1,y1) in zip(rd['pts'][:-1],rd['pts'][1:]):
        n=max(1,int(math.hypot(x1-x0,y1-y0)/6))
        for k in range(n+1):
            x=x0+(x1-x0)*k/n; y=y0+(y1-y0)*k/n; i=int(round(x/10)); j=int(round(y/10)); rr=2 if lane else 1
            for dj in range(-rr,rr+1):
                for di in range(-rr,rr+1):
                    ii,jj=i+di,j+dj
                    if 0<=ii<TW and 0<=jj<TH and di*di+dj*dj<=rr*rr+0.5: (road if lane else roadT)[jj,ii]=1
r[road>0]=212; g[road>0]=196; b[road>0]=170
r[roadT>0]=196; g[roadT>0]=182; b[roadT>0]=160
water=hf<-14; r[water]=90; g[water]=132; b[water]=172
forest=np.zeros(hf.shape,bool)
for f in M['forests']:
    forest|=((xw-f['x'])**2+(yw-f['y'])**2)<f['r']**2
r[forest]=70; g[forest]=104; b[forest]=84
# lighting (sun from the north-west, like the game)
nx=-gx; ny=-gy; nl=np.sqrt(nx*nx+ny*ny+1)
lit=np.clip(0.55+(nx*0.5-ny*0.55+0.7)/nl*0.5,0.35,1.15)
col=np.stack([np.clip(r*lit,0,255),np.clip(g*lit,0,255),np.clip(b*lit,0,255)],-1)

def render(cam,target,fovy,size,out,title,sub):
    IW,IH=size
    cx,cy,cz=cam; tx,ty,tz=target
    fwd=np.array([tx-cx,ty-cy,tz-cz],float); fwd/=np.linalg.norm(fwd)
    up0=np.array([0,0,1.0]); right=np.cross(fwd,up0); right/=np.linalg.norm(right); up=np.cross(right,fwd)
    f=1/math.tan(math.radians(fovy)/2); aspect=IW/IH
    P=np.stack([xw,yw,hf],-1).reshape(-1,3)-np.array([cx,cy,cz])
    d=P@fwd; px=(P@right)/np.maximum(d,1e-3)*f/aspect; py=(P@up)/np.maximum(d,1e-3)*f
    sx=(px*0.5+0.5)*IW; sy=(0.5-py*0.5)*IH
    sx=sx.reshape(TH,TW); sy=sy.reshape(TH,TW); dd=d.reshape(TH,TW)
    im=Image.new('RGB',(IW,IH),(26,30,38)); dr=ImageDraw.Draw(im)
    # sky gradient
    for y in range(IH):
        k=y/IH; dr.line([(0,y),(IW,y)],fill=(int(140+50*k),int(160+40*k),int(195+25*k)))
    # quads back to front
    qd=(dd[:-1,:-1]+dd[1:,1:])/2
    order=np.argsort(-qd,axis=None)
    cols=col
    for idx in order:
        j,i=divmod(int(idx),TW-1)
        if qd[j,i]<40: continue
        pts=[(sx[j,i],sy[j,i]),(sx[j,i+1],sy[j,i+1]),(sx[j+1,i+1],sy[j+1,i+1]),(sx[j+1,i],sy[j+1,i])]
        if all(p[0]<-50 for p in pts) or all(p[0]>IW+50 for p in pts) or all(p[1]<-50 for p in pts) or all(p[1]>IH+50 for p in pts): continue
        c=(cols[j,i]+cols[j,i+1]+cols[j+1,i+1]+cols[j+1,i])/4
        fog=min(1,max(0,(qd[j,i]-1400)/3200))*0.55
        c=c*(1-fog)+np.array([168,182,200])*fog
        dr.polygon(pts,fill=tuple(int(v) for v in c))
    # markers: keeps and towers as simple blocks
    def proj(x,y,z):
        p=np.array([x-cx,y-cy,z-cz]); dz=p@fwd
        if dz<40: return None
        return ((p@right)/dz*f/aspect*0.5+0.5)*IW,(0.5-(p@up)/dz*f*0.5)*IH,dz
    def hat(x,y):
        fx=min(max(x/10,0),TW-1.001); fy=min(max(y/10,0),TH-1.001); i=int(fx); j=int(fy); u=fx-i; v=fy-j
        return hf[j,i]*(1-u)*(1-v)+hf[j,i+1]*u*(1-v)+hf[j+1,i]*(1-u)*v+hf[j+1,i+1]*u*v
    objs=[(k['x'],k['y'],90,36,(47,111,214) if ti==0 else (170,46,58)) for ti,k in enumerate(M['keeps'])]+[(t['x'],t['y'],60,16,(47,111,214) if t['team']==0 else (170,46,58)) for t in M['towers']]+[(n['x'],n['y'],30,14,(226,181,74)) for n in M['nests']]
    objs.sort(key=lambda o:-(((o[0]-cx)**2+(o[1]-cy)**2)))
    for x,y,h,rad,c in objs:
        base=hat(x,y); a=proj(x,y,base); b2=proj(x,y,base+h)
        if not a or not b2: continue
        wpx=max(2,rad*IW*f/aspect/a[2]/2)
        y0,y1=sorted([b2[1],a[1]]); dr.rectangle([a[0]-wpx,y0,a[0]+wpx,y1],fill=c,outline=(20,20,24))
        dr.polygon([(a[0]-wpx*1.3,b2[1]),(a[0]+wpx*1.3,b2[1]),(a[0],b2[1]-wpx*1.6)],fill=tuple(int(v*0.8) for v in c))
    try:
        Ft=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',34); Fs=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
    except Exception: Ft=Fs=ImageFont.load_default()
    dr.rectangle([0,0,IW,86],fill=(16,19,25,230)); dr.text((24,14),title,font=Ft,fill=(239,230,210)); dr.text((24,56),sub,font=Fs,fill=(169,162,147))
    im.save(out,optimize=True); print(out,im.size)

# the touch camera views
import math as _m
def at(tx,ty,dist,el): return (tx-_m.cos(_m.radians(el))*dist,ty,_m.sin(_m.radians(el))*dist),(tx,ty,0)
T={'gate':"Wardens' Ford",'sylvan':'Sylvanmere'}[NAME]
c,t=at(1400,1100,4300,60); render(c,t,34,(1800,1012),NAME+'_view_far.png',T+" from your gate · zoomed out","touch camera, fixed facing: the whole field; the enemy stronghold on the far side")
c,t=at(1150,1100,1350,42); render(c,t,34,(1800,1012),NAME+'_view_near.png',T+" from your gate · zoomed in","pinch in and the camera drops lower over the troops")
render((1400,1100+1150,1150),(1400,1100,0),40,(1800,1012),NAME+'_view_side.png',T+" from the south rim","for reference")
