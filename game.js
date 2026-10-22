'use strict';
/* JUNGLE RUN - widescreen run & gun. Logical size 384x216, rendered crisp at device resolution. */
const cv=document.getElementById('c'),X=cv.getContext('2d');
const W=384,H=216,GY=170,WATER=198,LEN=4400,BX=LEN-90,TAU=Math.PI*2;
let SC=1,OV=null;
const hs=n=>{n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n)};
const IS_TOUCH=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||('ontouchstart' in window);
if(IS_TOUCH)document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{passive:true,once:true});
addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- canvas sizing ---------- */
function resize(){
 const r=cv.parentElement.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2.5);
 const w=Math.min(2560,Math.max(160,Math.round(r.width*d)));
 if(cv.width===w)return;
 cv.width=w;cv.height=Math.round(w*9/16);SC=cv.width/W;
 OV=document.createElement('canvas');OV.width=cv.width;OV.height=cv.height;
 const o=OV.getContext('2d');o.scale(SC,SC);
 const v=o.createRadialGradient(W/2,H/2,H*.42,W/2,H/2,W*.62);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');
 o.fillStyle=v;o.fillRect(0,0,W,H);o.fillStyle='rgba(0,0,0,.08)';for(let y=0;y<H;y+=2)o.fillRect(0,y+1,W,1);
}
resize();
if(window.ResizeObserver)new ResizeObserver(resize).observe(cv.parentElement);
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,250));
if(document.fonts&&document.fonts.load)document.fonts.load('10px "Press Start 2P"');

/* ---------- state ---------- */
const K={};let st='title',t=0,lockT=0,paused=false,muted=false,S,hi=0,GPS={},gpPrev=0,fsTried=0;
try{hi=+localStorage.getItem('jr_hi')||0}catch(e){}

/* ---------- audio ---------- */
let AC=null;
function au(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){AC=null}return AC}
function snd(f,d,ty,v,ramp){if(muted||!AC)return;try{const n=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type=ty||'square';o.frequency.setValueAtTime(f,n);if(ramp!==0)o.frequency.exponentialRampToValueAtTime(Math.max(30,f/3),n+d);g.gain.setValueAtTime(v||.04,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+d)}catch(e){}}
function noise(d,v){if(muted||!AC)return;try{const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),c=b.getChannelData(0);for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource(),g=AC.createGain();s.buffer=b;g.gain.value=v||.08;s.connect(g);g.connect(AC.destination);s.start()}catch(e){}}
const BASS=[110,110,165,110,131,131,196,131,98,98,147,98,123,123,185,123],LEAD=[0,0,440,0,0,523,0,392,0,0,494,0,0,392,0,330];

/* ---------- level ---------- */
const G=[[0,700],[752,1450],[1502,2150],[2202,2900],[2952,3500],[3552,LEN]];
const P=[[160,128,96],[330,128,70],[430,90,80],[560,128,90],[800,128,100],[940,90,90],[1100,128,80],[1240,128,70],
[1560,128,100],[1700,90,80],[1850,128,90],[1980,90,90],[2250,128,100],[2380,90,90],[2560,128,80],[2680,90,70],
[3000,128,90],[3120,90,80],[3300,128,100],[3600,128,90],[3720,90,80],[4080,128,90]];
const plats=[...G.map(s=>({x:s[0],y:GY,w:s[1]-s[0],g:1})),...P.map(s=>({x:s[0],y:s[1],w:s[2]}))];
const TUR=[[380,128],[470,90],[640,GY],[860,128],[1000,90],[1180,GY],[1600,128],[1740,90],[1900,GY],[2060,GY],[2270,128],[2440,90],[2600,GY],[2780,GY],[3020,128],[3170,90],[3400,GY],[3640,128],[3780,90]];
const CAPS=[[220,GY-22,'S'],[830,GY-22,'R'],[1300,GY-22,'L'],[1950,GY-22,'S'],[2500,GY-22,'R'],[3200,GY-22,'S'],[3700,GY-22,'L']];
const STARS=Array.from({length:70},(_,i)=>[hs(i)*W,hs(i+50)*110,hs(i+99),hs(i+7)>.8?1.6:1]);

/* ---------- input ---------- */
const pressedAny=()=>K.Enter||K.Space||K.KeyZ||K.KeyX;
const inp=()=>({l:K.ArrowLeft||K.KeyA||K.T_L||GPS.l,r:K.ArrowRight||K.KeyD||K.T_R||GPS.r,u:K.ArrowUp||K.KeyW||K.T_U||GPS.u,d:K.ArrowDown||K.KeyS||K.T_D||GPS.d,j:K.KeyX||K.KeyK||K.Space||K.T_J||GPS.j,f:K.KeyZ||K.KeyJ||K.T_F||GPS.f});
const root=document.documentElement,isFS=()=>document.fullscreenElement||document.webkitFullscreenElement;
function enterFS(){try{const f=root.requestFullscreen||root.webkitRequestFullscreen;if(!f||isFS())return;const p=f.call(root);if(p&&p.then)p.then(()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}catch(e){}}).catch(()=>{})}catch(e){}}
function toggleFS(){try{if(isFS()){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}else enterFS()}catch(e){}}
const fsBtn=document.getElementById('fs'),pzBtn=document.getElementById('pz');
if(fsBtn&&!(root.requestFullscreen||root.webkitRequestFullscreen))fsBtn.style.display='none';
function togglePause(){if(st==='play'){paused=!paused;for(const k in K)K[k]=0}}
function gesture(){au();if(paused){paused=false;return}if(st!=='play')start();if(IS_TOUCH&&!fsTried){fsTried=1;enterFS()}}
addEventListener('keydown',e=>{
 if(/^(Arrow|Space)/.test(e.code))e.preventDefault();
 K[e.code]=1;if(e.repeat)return;au();
 if(e.code==='KeyP'||e.code==='Escape')togglePause();
 else if(e.code==='KeyF')toggleFS();
 else if(e.code==='KeyM')muted=!muted;
 else if(paused&&/Enter|Space/.test(e.code))paused=false;
 else if(st!=='play'&&/Enter|Space|KeyZ|KeyX/.test(e.code))start();
});
addEventListener('keyup',e=>{K[e.code]=0});
addEventListener('blur',()=>{for(const k in K)K[k]=0;if(st==='play')paused=true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&st==='play')paused=true});
cv.addEventListener('pointerdown',e=>{e.preventDefault();gesture()});
if(fsBtn)fsBtn.addEventListener('click',e=>{toggleFS();fsBtn.blur()});
if(pzBtn)pzBtn.addEventListener('click',e=>{togglePause();pzBtn.blur()});
/* touch: action buttons */
document.querySelectorAll('#act button').forEach(b=>{
 const ks=b.dataset.k.split(' '),set=v=>{ks.forEach(k=>K[k]=v);b.classList.toggle('on',!!v)};
 b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}set(1);gesture()});
 ['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,()=>set(0)));
});
/* touch: 8-way d-pad, slide a thumb across it */
(function(){
 const dp=document.getElementById('dpad');if(!dp)return;
 const bs=[...dp.querySelectorAll('button')],DM=[['T_U','T_L'],['T_U'],['T_U','T_R'],['T_L'],[],['T_R'],['T_D','T_L'],['T_D'],['T_D','T_R']],BI=[0,1,2,3,-1,4,5,6,7];
 let act=-1;
 const clear=()=>{['T_L','T_R','T_U','T_D'].forEach(k=>K[k]=0);bs.forEach(b=>b.classList.remove('on'))};
 const set=e=>{const r=dp.getBoundingClientRect();
  const cx=Math.min(2,Math.max(0,Math.floor((e.clientX-r.left)/r.width*3))),cy=Math.min(2,Math.max(0,Math.floor((e.clientY-r.top)/r.height*3))),i=cy*3+cx;
  clear();DM[i].forEach(k=>K[k]=1);if(BI[i]>=0)bs[BI[i]].classList.add('on')};
 dp.addEventListener('pointerdown',e=>{e.preventDefault();act=e.pointerId;try{dp.setPointerCapture(e.pointerId)}catch(_){}set(e);gesture()});
 dp.addEventListener('pointermove',e=>{if(e.pointerId===act)set(e)});
 ['pointerup','pointercancel','lostpointercapture'].forEach(n=>dp.addEventListener(n,e=>{if(e.pointerId===act||n==='lostpointercapture'){act=-1;clear()}}));
})();
/* gamepad */
function pollPad(){
 const o={l:0,r:0,u:0,d:0,j:0,f:0,s:0};
 try{const a=navigator.getGamepads?navigator.getGamepads():[];for(const g of a){if(!g||!g.connected)continue;
  const ax=g.axes[0]||0,ay=g.axes[1]||0,b=i=>g.buttons[i]&&g.buttons[i].pressed;
  o.l|=ax<-.4||b(14);o.r|=ax>.4||b(15);o.u|=ay<-.5||b(12);o.d|=ay>.5||b(13);o.j|=b(0)||b(3);o.f|=b(1)||b(2)||b(5)||b(7);o.s|=b(9)}}catch(e){}
 GPS=o;if(o.s&&!gpPrev){if(st==='play')paused=!paused;else start()}if((o.j||o.f)&&paused)paused=false;gpPrev=o.s;
}

/* ---------- helpers ---------- */
const hit=(a,b)=>a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];
const prect=p=>p.prone?[p.x-13,p.y-9,26,9]:p.air?[p.x-5,p.y-21,10,16]:[p.x-5,p.y-27,10,27];
function land(o,py){o.air=1;o.on=null;for(const pl of plats){if(o.vy>=0&&o.x+3>pl.x&&o.x-3<pl.x+pl.w&&py<=pl.y+1&&o.y>=pl.y&&!(o.drop>0&&!pl.g)){o.y=pl.y;o.vy=0;o.air=0;o.on=pl;break}}}
function boom(x,y,n,big){
 const pal=['#fff6a8','#ffb13d','#ff4d2e','#7a1a10'];
 for(let i=0;i<n&&S.F.length<450;i++){const a=Math.random()*TAU,s=(Math.random()*2.6+.4)*(big?1.4:1),m=24+(Math.random()*26|0);
  S.F.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.6,l:m,m,c:pal[i%4],s:1.4+Math.random()*(big?3.2:2),g:.04})}
 S.R.push({x,y,r:2,l:14,m:14,big});S.shake=Math.max(S.shake,big?7:3);noise(big?.5:.25,big?.12:.07);
}
const newP=()=>({x:50,y:-30,vx:0,vy:0,d:1,air:1,prone:0,inv:120,dead:0,w:'N',cd:0,drop:0,on:null,pj:0,ax:1,ay:0,f:0});
function reset(){S={cam:0,p:newP(),B:[],E:[],EB:[],F:[],R:[],
 C:CAPS.map(a=>({x:a[0],y:a[1],t:a[2]})),
 T:TUR.map(a=>({x:a[0],y:a[1],hp:5,cd:70+(Math.random()*80|0),a:Math.PI,fl:0})),
 bs:{hp:60,cd:100,fl:0,a:Math.PI},score:0,lives:3,sp:90,shake:0,win:0,flash:0,warn:0,bossSeen:0}}
function start(){if(lockT>0)return;au();reset();st='play';paused=false}
function end(k){st=k;lockT=70;if(S.score>hi){hi=S.score;try{localStorage.setItem('jr_hi',hi)}catch(e){}}}
function die(){const p=S.p;if(p.dead)return;p.dead=90;S.lives--;p.w='N';boom(p.x,p.y-12,28,true);snd(140,.5,'sawtooth',.06);S.flash=.5}
function respawn(){const p=S.p;let rx=S.cam+36;const g=G.find(s=>rx<s[1]-14);if(g)rx=Math.max(rx,g[0]+14);Object.assign(p,{x:rx,y:-30,vx:0,vy:0,air:1,inv:160,dead:0,drop:0,prone:0})}

/* ---------- player ---------- */
function upP(){
 const p=S.p,i=inp();
 if(p.dead){if(--p.dead===0){S.lives<=0?end('over'):respawn()}return}
 const ax=(i.r?1:0)-(i.l?1:0),ay=(i.d?1:0)-(i.u?1:0);if(ax)p.d=ax;
 p.prone=!p.air&&!!i.d&&!ax;p.vx=p.prone?0:ax*1.8;
 const jp=i.j&&!p.pj;p.pj=i.j;
 if(jp&&!p.air){if(i.d&&p.on&&!p.on.g){p.drop=14;p.air=1;p.y+=3}else if(!i.d){p.vy=-5.8;p.air=1;snd(520,.14)}}
 if(p.drop>0)p.drop--;
 let gx=ax,gy=ay;if(p.prone){gy=0;gx=p.d}else if(!gx&&!gy)gx=p.d;
 const m=Math.hypot(gx,gy);p.ax=gx/m;p.ay=gy/m;
 if(p.vx)p.f+=.3;
 const py=p.y;p.vy=Math.min(7,p.vy+.27);p.x=Math.max(S.cam+10,Math.min(BX-10,p.x+p.vx));p.y+=p.vy;land(p,py);
 if(p.cd>0)p.cd--;
 if(i.f&&p.cd<=0){
  const sy=p.y-(p.prone?5:p.air?10:20),mx=p.x+p.ax*13,my=sy+p.ay*13;
  const sh=(a,sp,l)=>{const c=Math.cos(a),s=Math.sin(a);S.B.push({x:mx,y:my,vx:(p.ax*c-p.ay*s)*sp,vy:(p.ax*s+p.ay*c)*sp,l:l||120})};
  if(p.w==='S'){[-.4,-.2,0,.2,.4].forEach(a=>sh(a,5));p.cd=15;snd(240,.14,'sawtooth',.045)}
  else if(p.w==='R'){sh(0,7.5,90);p.cd=4;snd(760,.05,'square',.03)}
  else if(S.B.length<6){sh(0,6.5);p.cd=9;snd(620,.07)}
 }
 if(p.y>H+10){die();return}
 if(p.inv>0)p.inv--;else{const r=prect(p);
  if(S.E.some(e=>e.hp>0&&hit(r,[e.x-5,e.y-27,10,27]))||S.EB.some(b=>hit(r,[b.x-2.5,b.y-2.5,5,5])))die()}
 for(const c of S.C)if(c.x>-900&&hit(prect(p),[c.x-10,c.y-8,20,16])){
  if(c.t==='L'){S.lives=Math.min(9,S.lives+1);snd(1000,.4,'triangle',.05)}else{p.w=c.t;snd(900,.25,'triangle',.05)}
  c.x=-999;S.score+=50}
}

/* ---------- world update ---------- */
function update(){
 t++;if(lockT>0)lockT--;pollPad();
 if(st==='title'){S.cam=(Math.sin(t*.0016)*.5+.5)*(LEN-W-300)}
 if(paused&&st==='play')return;
 S.F=S.F.filter(f=>{f.x+=f.vx;f.y+=f.vy;f.vy+=f.g;f.vx*=.985;return--f.l>0});
 S.R=S.R.filter(r=>{r.r+=r.big?3.2:2;return--r.l>0});
 if(S.shake>0)S.shake=Math.max(0,S.shake-.35);if(S.flash>0)S.flash=Math.max(0,S.flash-.03);
 if(st!=='play')return;
 const p=S.p;
 if(t%9===0&&AC&&!muted){const k=(t/9|0)%16;snd(BASS[k],.14,'triangle',.032,0);if(LEAD[k])snd(LEAD[k],.1,'square',.012,0)}
 upP();
 if(!p.dead){const tc=Math.min(p.x-W*.4,LEN-W);if(tc>S.cam)S.cam=tc}
 const bossOn=S.cam>=LEN-W-4,bs=S.bs;
 if(bossOn&&!S.bossSeen){S.bossSeen=1;S.warn=170;snd(200,.8,'sawtooth',.05)}
 if(S.warn>0)S.warn--;
 const fire=(sx,sy,a,sp)=>S.EB.push({x:sx,y:sy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp});
 /* player bullets */
 for(const b of S.B){b.x+=b.vx;b.y+=b.vy;b.l--;const r=[b.x-2,b.y-2,4,4];
  for(const e of S.E)if(e.hp>0&&hit(r,[e.x-6,e.y-28,12,28])){e.hp=0;b.l=0;S.score+=100;boom(e.x,e.y-14,10);snd(200,.15,'sawtooth')}
  for(const u of S.T)if(u.hp>0&&u.x>S.cam&&u.x<S.cam+W&&hit(r,[u.x-10,u.y-19,20,19])){b.l=0;u.fl=3;if(--u.hp<=0){S.score+=300;boom(u.x,u.y-8,18,true);snd(150,.3,'sawtooth')}else snd(320,.05)}
  if(bossOn&&bs.hp>0&&hit(r,[BX,GY-130,60,130])){bs.hp--;bs.fl=3;b.l=0;snd(300,.05);if(bs.hp<=0){S.win=190;S.EB=[];S.E=[];S.score+=5000+S.lives*500;snd(90,1,'sawtooth',.08)}}}
 S.B=S.B.filter(b=>b.l>0&&b.x>S.cam-10&&b.x<S.cam+W+10&&b.y>-10&&b.y<H);
 S.T=S.T.filter(u=>u.hp>0);if(bs.fl>0)bs.fl--;
 for(const u of S.T)if(u.fl>0)u.fl--;
 /* soldiers */
 S.E=S.E.filter(e=>e.hp>0&&e.y<240&&e.x>S.cam-50);
 for(const e of S.E){const py=e.y;e.d=p.x<e.x?-1:1;e.x+=e.d*1.15;e.vy=Math.min(7,e.vy+.27);e.y+=e.vy;land(e,py);
  if(!e.air&&Math.random()<.007){e.vy=-5;e.air=1}e.f+=.28;
  if(--e.cd<=0&&!e.air&&Math.abs(p.x-e.x)<230&&e.x<S.cam+W-10&&!p.dead){e.cd=150+(Math.random()*100|0);fire(e.x+e.d*14,e.y-19,Math.atan2(p.y-14-(e.y-19),p.x-e.x),1.7)}}
 /* turrets */
 for(const u of S.T)if(u.x>S.cam+12&&u.x<S.cam+W-12){u.a=Math.atan2(p.y-14-(u.y-11),p.x-u.x);if(--u.cd<=0){fire(u.x+Math.cos(u.a)*15,u.y-11+Math.sin(u.a)*15,u.a,1.5);u.cd=105+(Math.random()*55|0);snd(380,.08,'square',.02)}}
 /* boss */
 if(bossOn&&bs.hp>0){bs.a=Math.atan2(p.y-14-(GY-70),p.x-BX);
  if(--bs.cd<=0){const hard=bs.hp<30;bs.cd=hard?55:80;
   const n=hard?5:3;for(const c of [[BX-6,GY-104],[BX-6,GY-40]]){const a=Math.atan2(p.y-14-c[1],p.x-c[0]);for(let k=0;k<n;k++)fire(c[0],c[1],a+(k-(n-1)/2)*.22,1.6)}snd(170,.25,'sawtooth',.04)}}
 for(const b of S.EB){b.x+=b.vx;b.y+=b.vy}
 S.EB=S.EB.filter(b=>b.x>S.cam-8&&b.x<S.cam+W+8&&b.y>-8&&b.y<H);
 S.C=S.C.filter(c=>c.x>-900);
 /* spawn soldiers */
 if(--S.sp<=0&&!S.win){S.sp=bossOn?85:70+(Math.random()*70|0);const sx=S.cam+W+14;
  if(S.E.length<4&&G.some(s=>sx>s[0]+8&&sx<s[1]-8))S.E.push({x:sx,y:-20,vx:0,vy:0,hp:1,air:1,f:0,d:-1,cd:90+(Math.random()*120|0),on:null})}
 if(S.win>0){if(S.win%10===0)boom(BX+Math.random()*60,GY-Math.random()*130,12,true);if(--S.win===0){S.flash=1;end('win')}}
}

/* ---------- drawing: backdrop ---------- */
function skyCol(){const g=X.createLinearGradient(0,0,0,GY);g.addColorStop(0,'#0a0528');g.addColorStop(.3,'#2a0b5c');g.addColorStop(.58,'#8a1f7c');g.addColorStop(.8,'#ff4f78');g.addColorStop(1,'#ffa24a');return g}
function sky(){
 const g=skyCol();X.fillStyle=g;X.fillRect(0,0,W,H);
 for(const s of STARS){if(s[1]>105)continue;X.globalAlpha=(.35+.65*Math.abs(Math.sin(t*.03+s[2]*9)))*(1-s[1]/105);X.fillStyle='#fff';X.fillRect(s[0],s[1],s[3],s[3])}
 X.globalAlpha=1;
 const sx=272,sy=104,r=48;
 const hg=X.createRadialGradient(sx,sy,r*.8,sx,sy,r*2.2);hg.addColorStop(0,'rgba(255,120,120,.35)');hg.addColorStop(1,'rgba(255,120,120,0)');X.fillStyle=hg;X.fillRect(sx-r*2.2,sy-r*2.2,r*4.4,r*4.4);
 X.save();X.beginPath();X.arc(sx,sy,r,0,TAU);X.clip();
 const sg=X.createLinearGradient(0,sy-r,0,sy+r);sg.addColorStop(0,'#fff17a');sg.addColorStop(.5,'#ffb347');sg.addColorStop(1,'#ff3d7f');
 X.fillStyle=sg;X.fillRect(sx-r,sy-r,r*2,r*2);X.fillStyle=g;for(let k=0;k<7;k++)X.fillRect(sx-r,sy+4+k*7,r*2,1+k*.7);
 X.restore();
}
function ridge(par,base,amp,c1,c2,seed){
 const g=X.createLinearGradient(0,base-amp*2,0,GY);g.addColorStop(0,c1);g.addColorStop(1,c2);X.fillStyle=g;X.beginPath();X.moveTo(0,GY+2);
 for(let x=0;x<=W+6;x+=6){const wx=x+CAM*par,y=base-(Math.sin(wx*.012+seed)*.5+.5)*amp-(Math.sin(wx*.031+seed*2)*.5+.5)*amp*.4-Math.abs(Math.sin(wx*.006+seed))*amp*.5;X.lineTo(x,y)}
 X.lineTo(W+6,GY+2);X.closePath();X.fill();
}
function palm(x,y,h,col,i){
 const tx=x+(hs(i+9)-.5)*14,ty=y-h;X.strokeStyle=col;X.lineCap='round';X.lineWidth=3.2;
 X.beginPath();X.moveTo(x,y);X.quadraticCurveTo(x+(hs(i)-.5)*16,y-h*.5,tx,ty);X.stroke();X.lineWidth=2.6;
 for(let k=0;k<7;k++){const a=-Math.PI+k*(Math.PI/6),c=Math.cos(a),s=Math.sin(a),sw=Math.sin(t*.02+i+k)*1.2;
  X.beginPath();X.moveTo(tx,ty);X.quadraticCurveTo(tx+c*11,ty+s*14-3,tx+c*24+sw,ty+s*5+10*Math.abs(c));X.stroke()}
}
function trees(par,sp,col,hmin,hv,seed){
 const off=CAM*par,i0=Math.floor(off/sp)-1;
 for(let i=i0;i<=i0+W/sp+3;i++)palm(i*sp-off+(hs(i+seed)-.5)*sp*.5,GY+2,hmin+hs(i*3+seed)*hv,col,i+seed);
}
function backdrop(){
 sky();ridge(.08,GY-44,52,'#4a1a7d','#25104f',1);ridge(.18,GY-22,40,'#2f1a70','#14123f',4);
 trees(.35,58,'#102a52',62,34,3);trees(.55,74,'#0b3a34',74,36,11);
 const h=X.createLinearGradient(0,GY-34,0,GY);h.addColorStop(0,'rgba(255,110,120,0)');h.addColorStop(1,'rgba(255,110,120,.28)');X.fillStyle=h;X.fillRect(0,GY-34,W,34);
 const cg=X.createLinearGradient(0,GY,0,H);cg.addColorStop(0,'#1c0d33');cg.addColorStop(1,'#05030f');X.fillStyle=cg;X.fillRect(0,GY,W,H-GY);
 const wg=X.createLinearGradient(0,WATER,0,H);wg.addColorStop(0,'#2f6cf0');wg.addColorStop(1,'#0b1a63');X.fillStyle=wg;X.fillRect(0,WATER,W,H-WATER);
 X.strokeStyle='rgba(180,220,255,.45)';X.lineWidth=1;
 for(let r=0;r<3;r++){X.beginPath();for(let x=0;x<=W;x+=4){const y=WATER+3+r*6+Math.sin((x+CAM*.9)*.09+t*.07+r*2)*1.4;x?X.lineTo(x,y):X.moveTo(x,y)}X.stroke()}
}
function world(){
 for(const pl of plats){const sx=pl.x-CAM;if(sx>W||sx+pl.w<0)continue;
  if(pl.g){
   const x0=Math.max(0,sx),x1=Math.min(W,sx+pl.w);
   const dg=X.createLinearGradient(0,GY,0,H);dg.addColorStop(0,'#6a3f1c');dg.addColorStop(1,'#241008');X.fillStyle=dg;X.fillRect(x0,GY,x1-x0,H-GY);
   for(let wx=Math.floor((x0+CAM)/16)*16;wx<x1+CAM;wx+=16){const rx=wx-CAM,hh=hs(wx*.37);X.fillStyle='rgba(0,0,0,'+(.15+hh*.25)+')';X.fillRect(rx,GY+9+hh*22,5+hh*9,3);if(hh>.6){X.fillStyle='rgba(255,200,140,.12)';X.fillRect(rx+2,GY+8+hh*22,4,1)}}
   const gg=X.createLinearGradient(0,GY-1,0,GY+6);gg.addColorStop(0,'#6bff9d');gg.addColorStop(.5,'#2fc468');gg.addColorStop(1,'#14703a');X.fillStyle=gg;X.fillRect(x0,GY-1,x1-x0,7);
   X.fillStyle='#4ee88a';for(let wx=Math.floor((x0+CAM)/5)*5;wx<x1+CAM;wx+=5){const hh=hs(wx*.91);X.fillRect(wx-CAM,GY-3-hh*2.5,1.6,3+hh*2.5)}
   X.fillStyle='rgba(0,0,0,.4)';if(sx>-2&&sx<W)X.fillRect(sx,GY,3,H-GY);if(sx+pl.w>0&&sx+pl.w<W+3)X.fillRect(sx+pl.w-3,GY,3,H-GY);
  }else{
   const x0=Math.max(0,sx),x1=Math.min(W,sx+pl.w);
   const bg=X.createLinearGradient(0,pl.y,0,pl.y+6);bg.addColorStop(0,'#b57a3c');bg.addColorStop(1,'#5a3715');X.fillStyle=bg;X.fillRect(x0,pl.y,x1-x0,6);
   X.fillStyle='rgba(0,0,0,.35)';for(let wx=Math.floor((x0+CAM)/9)*9;wx<x1+CAM;wx+=9)X.fillRect(wx-CAM,pl.y,1,6);
   X.fillStyle='#ffd9a0';X.fillRect(x0,pl.y,x1-x0,1);
   X.fillStyle='#3a2410';X.fillRect(sx+2,pl.y+6,4,5);X.fillRect(sx+pl.w-6,pl.y+6,4,5);
   X.strokeStyle='#2fc468';X.lineWidth=1.3;for(let wx=6;wx<pl.w;wx+=17){const rx=sx+wx;if(rx<-4||rx>W+4)continue;X.beginPath();X.moveTo(rx,pl.y+6);X.quadraticCurveTo(rx+2+Math.sin(t*.03+wx),pl.y+11,rx,pl.y+14+hs(wx)*6);X.stroke()}
  }}
}

/* ---------- drawing: actors ---------- */
let CAM=0;
function limb(x0,y0,x1,y1,w,c){X.strokeStyle=c;X.lineWidth=w;X.lineCap='round';X.beginPath();X.moveTo(x0,y0);X.lineTo(x1,y1);X.stroke()}
function shadow(x,y,w){X.fillStyle='rgba(0,0,0,.3)';X.beginPath();X.ellipse(x,y+1,w,2,0,0,TAU);X.fill()}
function drawPlayer(p){
 const x=p.x-CAM,y=p.y,d=p.d,ang=Math.atan2(p.ay,p.ax);
 if(!p.air)shadow(x,y,p.prone?13:7);
 X.save();X.translate(x,y);
 if(p.prone){X.scale(d,1);limb(-14,-4,-3,-4,4.5,'#2b4fd8');limb(-3,-5,6,-5,6,'#ffb98a');
  X.fillStyle='#ffb98a';X.beginPath();X.arc(10,-6,4.2,0,TAU);X.fill();X.fillStyle='#3a1f10';X.beginPath();X.arc(10,-7,4.3,Math.PI,TAU);X.fill();X.fillStyle='#ff2e4d';X.fillRect(5.8,-9.2,8.4,1.8);
  X.fillStyle='#16161f';X.fillRect(9,-6.5,13,3);X.fillStyle='#6b7090';X.fillRect(9,-6.5,13,1);X.restore();return}
 if(p.air){X.translate(0,-10);X.rotate(t*.4*d);
  X.fillStyle='#2b4fd8';X.beginPath();X.arc(0,0,7,0,Math.PI);X.fill();X.fillStyle='#ffb98a';X.beginPath();X.arc(0,0,7,Math.PI,TAU);X.fill();
  X.fillStyle='#3a1f10';X.beginPath();X.arc(-3,-3,3.2,0,TAU);X.fill();X.fillStyle='#ff2e4d';X.fillRect(-5,-6,6,2);X.restore();return}
 const run=p.vx!==0,a=run?Math.sin(p.f)*.9:.16;X.scale(d,1);
 limb(-2,-11,-2+Math.sin(a)*11,-11+Math.cos(a)*11,4.6,'#1f3fb8');limb(2,-11,2+Math.sin(-a)*11,-11+Math.cos(-a)*11,4.6,'#2b4fd8');
 X.fillStyle='#16161f';X.fillRect(-2+Math.sin(a)*11-3,-3+Math.cos(a)*11-8+8,6,3);X.fillRect(2+Math.sin(-a)*11-3,-3+Math.cos(-a)*11-8+8,6,3);
 X.fillStyle='#ffb98a';X.fillRect(-4.5,-23,9,12);X.fillStyle='rgba(0,0,0,.14)';X.fillRect(1.5,-23,3,12);
 X.fillStyle='#2b4fd8';X.fillRect(-4.5,-13,9,4);X.fillStyle='#ffd23f';X.fillRect(-4.5,-13.5,9,1.6);
 X.fillStyle='#ffb98a';X.beginPath();X.arc(0,-27.5,4.3,0,TAU);X.fill();X.fillStyle='#3a1f10';X.beginPath();X.arc(0,-28.4,4.5,Math.PI,TAU);X.fill();
 X.fillStyle='#ff2e4d';X.fillRect(-4.5,-29.2,9,1.9);
 X.strokeStyle='#ff2e4d';X.lineWidth=1.6;X.beginPath();X.moveTo(-4.3,-28.3);X.quadraticCurveTo(-8,-29+Math.sin(t*.3)*2,-12,-27+Math.sin(t*.3+1)*3);X.stroke();
 X.restore();
 X.save();X.translate(x,y-20);X.rotate(ang);
 X.fillStyle='#ffb98a';X.fillRect(0,-1.8,7,3.6);X.fillStyle='#16161f';X.fillRect(5,-2.2,14,3.6);X.fillStyle='#6b7090';X.fillRect(5,-2.2,14,1.1);X.fillStyle='#16161f';X.fillRect(7,1,3,4);X.restore();
}
function drawSoldier(e){
 const x=e.x-CAM,y=e.y;if(!e.air)shadow(x,y,7);
 X.save();X.translate(x,y);X.scale(e.d,1);const a=e.air?.5:Math.sin(e.f)*.9;
 limb(-2,-11,-2+Math.sin(a)*11,-11+Math.cos(a)*11,4.6,'#383d58');limb(2,-11,2+Math.sin(-a)*11,-11+Math.cos(-a)*11,4.6,'#4a4f66');
 X.fillStyle='#5b6075';X.fillRect(-8,-22,4,10);X.fillStyle='#8d93a8';X.fillRect(-4.5,-23,9,12);X.fillStyle='#6c7188';X.fillRect(-4.5,-17,9,2);
 X.fillStyle='#e9b087';X.beginPath();X.arc(0,-27.5,4.2,0,TAU);X.fill();
 X.fillStyle='#d03a2e';X.beginPath();X.arc(0,-28.2,4.9,Math.PI,TAU);X.fill();X.fillRect(-4.9,-28.2,9.8,1.8);
 X.fillStyle='#e9b087';X.fillRect(0,-20.5,6,3);X.fillStyle='#16161f';X.fillRect(2,-21,15,2.8);X.restore();
}
function drawTurret(u){
 const x=u.x-CAM,y=u.y;
 X.fillStyle='#262a40';X.beginPath();X.moveTo(x-12,y);X.lineTo(x-8,y-9);X.lineTo(x+8,y-9);X.lineTo(x+12,y);X.closePath();X.fill();
 X.fillStyle='#454b6e';X.fillRect(x-12,y-2,24,2);
 const g=X.createRadialGradient(x-2,y-14,1,x,y-9,10);g.addColorStop(0,u.fl>0?'#fff':'#d1d6ee');g.addColorStop(1,u.fl>0?'#fff':'#4a5075');
 X.fillStyle=g;X.beginPath();X.arc(x,y-9,9,Math.PI,TAU);X.fill();
 X.save();X.translate(x,y-11);X.rotate(u.a);X.fillStyle='#1b1d2e';X.fillRect(0,-2.2,16,4.4);X.fillStyle='#6b7090';X.fillRect(0,-2.2,16,1.2);X.restore();
 X.fillStyle=t%40<20?'#ff4d2e':'#7a1a10';X.beginPath();X.arc(x,y-11,2.2,0,TAU);X.fill();
}
function drawBoss(){
 const bs=S.bs,x=BX-CAM;if(x>W+20)return;
 if(bs.hp<=0&&!(S.win>0&&S.win%8<5))return;
 const fl=bs.fl>0,g=X.createLinearGradient(x,0,x+60,0);g.addColorStop(0,fl?'#fff':'#41486e');g.addColorStop(.55,fl?'#fff':'#2a2f4d');g.addColorStop(1,fl?'#fff':'#171a2e');
 X.fillStyle=g;X.fillRect(x,GY-130,60,130);X.fillStyle=fl?'#fff':'#4a5075';X.fillRect(x-6,GY-138,72,10);X.fillRect(x-6,GY-8,72,8);
 for(let y=GY-122;y<GY-8;y+=16){X.fillStyle='rgba(255,255,255,.08)';X.fillRect(x,y,60,1.5);X.fillStyle='rgba(0,0,0,.4)';X.fillRect(x,y+1.5,60,1)}
 X.fillStyle='#7d84ad';for(let y=GY-122;y<GY-8;y+=16){X.fillRect(x+4,y+5,2,2);X.fillRect(x+54,y+5,2,2)}
 for(let k=0;k<3;k++){const y=GY-124+k*5;X.fillStyle=t%30<15+k*3?'#ff4d2e':'#5a1710';X.fillRect(x+10,y,40,2.4)}
 /* cannons */
 for(const c of [[BX-6,GY-104],[BX-6,GY-40]]){const cx=c[0]-CAM,a=Math.atan2(S.p.y-14-c[1],S.p.x-c[0]);
  X.fillStyle='#363c5e';X.fillRect(cx-2,c[1]-8,12,16);X.save();X.translate(cx+2,c[1]);X.rotate(bs.hp>0?Math.max(Math.PI*.55,Math.min(Math.PI*1.45,a<0?a+TAU:a)):Math.PI);X.fillStyle='#14162a';X.fillRect(0,-3,20,6);X.fillStyle='#6b7090';X.fillRect(0,-3,20,1.4);X.restore()}
 /* core */
 const cx=BX+18-CAM,cy=GY-72,pr=1+Math.sin(t*.12)*.12;
 const cg=X.createRadialGradient(cx,cy,1,cx,cy,16*pr);cg.addColorStop(0,'#fff');cg.addColorStop(.35,t%24<12?'#ffd23f':'#ff8a2e');cg.addColorStop(1,'rgba(255,40,40,0)');
 X.fillStyle='#14162a';X.beginPath();X.arc(cx,cy,14,0,TAU);X.fill();X.fillStyle=cg;X.beginPath();X.arc(cx,cy,14*pr,0,TAU);X.fill();
}
function drawCap(c){
 const x=c.x-CAM,y=c.y+Math.sin(t*.08+c.x)*2.5;if(x<-20||x>W+20)return;
 const col=c.t==='S'?'#ff4d2e':c.t==='R'?'#2f7bff':'#2fc468';
 const gl=X.createRadialGradient(x,y,2,x,y,18);gl.addColorStop(0,col+'aa');gl.addColorStop(1,col+'00');X.fillStyle=gl;X.fillRect(x-18,y-18,36,36);
 const f=Math.sin(t*.4)*3;X.fillStyle='#e9ecff';X.beginPath();X.moveTo(x-9,y);X.lineTo(x-17,y-5+f);X.lineTo(x-16,y+2);X.closePath();X.fill();X.beginPath();X.moveTo(x+9,y);X.lineTo(x+17,y-5+f);X.lineTo(x+16,y+2);X.closePath();X.fill();
 X.fillStyle='#fff';X.beginPath();X.ellipse(x,y,10,7,0,0,TAU);X.fill();X.fillStyle=col;X.beginPath();X.ellipse(x,y,8.4,5.6,0,0,TAU);X.fill();
 X.font='7px "Press Start 2P",monospace';X.textAlign='center';X.textBaseline='middle';X.fillStyle='#fff';X.fillText(c.t,x+.5,y+.8);
}
function drawBullets(){
 X.lineCap='round';
 for(const b of S.B){const x=b.x-CAM,col=S.p.w==='S'?'#ff8a3d':S.p.w==='R'?'#7fc4ff':'#fff7a0';
  X.strokeStyle=col;X.lineWidth=2.6;X.globalAlpha=.9;X.beginPath();X.moveTo(x-b.vx*1.3,b.y-b.vy*1.3);X.lineTo(x,b.y);X.stroke();
  X.globalAlpha=.25;X.fillStyle=col;X.beginPath();X.arc(x,b.y,4.5,0,TAU);X.fill();X.globalAlpha=1;X.fillStyle='#fff';X.beginPath();X.arc(x,b.y,1.4,0,TAU);X.fill()}
 for(const b of S.EB){const x=b.x-CAM;X.globalAlpha=.3;X.fillStyle='#ff4d8f';X.beginPath();X.arc(x,b.y,6,0,TAU);X.fill();X.globalAlpha=1;X.fillStyle='#ff4d8f';X.beginPath();X.arc(x,b.y,3,0,TAU);X.fill();X.fillStyle='#fff';X.beginPath();X.arc(x,b.y,1.3,0,TAU);X.fill()}
}
function drawFX(){
 X.globalCompositeOperation='lighter';
 for(const f of S.F){X.globalAlpha=Math.min(1,f.l/f.m*1.4);X.fillStyle=f.c;X.beginPath();X.arc(f.x-CAM,f.y,f.s*(.4+f.l/f.m*.6),0,TAU);X.fill()}
 for(const r of S.R){X.globalAlpha=r.l/r.m*.7;X.strokeStyle='#ffd9a0';X.lineWidth=2;X.beginPath();X.arc(r.x-CAM,r.y,r.r,0,TAU);X.stroke()}
 X.globalCompositeOperation='source-over';X.globalAlpha=1;
}

/* ---------- drawing: UI ---------- */
function tx(s,x,y,c,sz,al){X.font=sz+'px "Press Start 2P",monospace';X.textAlign=al||'left';X.textBaseline='top';X.fillStyle='rgba(0,0,0,.75)';X.fillText(s,x+1,y+1);X.fillStyle=c;X.fillText(s,x,y)}
function logo(s,x,y,sz){X.font=sz+'px "Press Start 2P",monospace';X.textAlign='center';X.textBaseline='middle';X.lineJoin='round';
 X.fillStyle='#ff2e8a';X.fillText(s,x+2.5,y+2.5);X.lineWidth=5;X.strokeStyle='#1a0a3d';X.strokeText(s,x,y);
 const g=X.createLinearGradient(0,y-sz/2,0,y+sz/2);g.addColorStop(0,'#fff6a8');g.addColorStop(.45,'#ffd23f');g.addColorStop(.5,'#ff8a2e');g.addColorStop(1,'#ff2e4d');X.fillStyle=g;X.fillText(s,x,y)}
function dim(a){X.fillStyle='rgba(8,4,24,'+a+')';X.fillRect(0,0,W,H)}
function hud(){
 const p=S.p;tx('1P '+String(S.score).padStart(6,'0'),10,8,'#ffd23f',8);tx('HI '+String(Math.max(hi,S.score)).padStart(6,'0'),W/2,8,'#f4efe0',8,'center');
 for(let i=0;i<Math.max(0,S.lives);i++){const x=14+i*13;X.fillStyle='#ffb98a';X.beginPath();X.arc(x,26,4.2,0,TAU);X.fill();X.fillStyle='#ff2e4d';X.fillRect(x-4.4,24,8.8,2);X.fillStyle='#2b4fd8';X.fillRect(x-4,29,8,3)}
 const wn=p.w==='S'?'SPREAD':p.w==='R'?'RAPID':'NORMAL',wc=p.w==='S'?'#ff8a3d':p.w==='R'?'#7fc4ff':'#f4efe0';
 tx(wn,W-48,22,wc,7,'right');
 if(S.bossSeen&&S.bs.hp>0){X.fillStyle='rgba(0,0,0,.7)';X.fillRect(W/2-61,32,122,7);X.fillStyle='#ff2e4d';X.fillRect(W/2-59,34,118*S.bs.hp/60,3)}
 if(S.warn>0&&S.warn%30<20)tx('WARNING',W/2,92,'#ff4d2e',16,'center');
}
function overlays(){
 if(st==='title'){dim(.5);const y=62+Math.sin(t*.04)*2;logo('JUNGLE',W/2,y,30);logo('RUN',W/2,y+34,30);
  tx('RUN AND GUN  1987',W/2,122,'#f4efe0',8,'center');
  if(t%60<40)tx(IS_TOUCH?'TAP TO START':'PRESS ENTER',W/2,150,'#ffd23f',10,'center');
  if(hi)tx('HI '+String(hi).padStart(6,'0'),W/2,176,'#7fc4ff',8,'center');
  if(!IS_TOUCH)tx('ARROWS MOVE  X JUMP  Z FIRE',W/2,196,'#b9aee0',7,'center')}
 else{hud()}
 if(paused&&st==='play'){dim(.6);tx('PAUSED',W/2,88,'#ffd23f',16,'center');tx(IS_TOUCH?'TAP TO RESUME':'PRESS P TO RESUME',W/2,118,'#f4efe0',8,'center')}
 if(st==='over'){dim(.7);tx('GAME OVER',W/2,76,'#ff4d2e',20,'center');tx('SCORE '+S.score,W/2,112,'#f4efe0',10,'center');if(lockT<1&&t%60<40)tx(IS_TOUCH?'TAP TO RETRY':'PRESS ENTER',W/2,142,'#ffd23f',9,'center')}
 if(st==='win'){dim(.65);tx('MISSION CLEAR',W/2,72,'#ffd23f',18,'center');tx('SCORE '+S.score,W/2,108,'#f4efe0',10,'center');if(lockT<1&&t%60<40)tx(IS_TOUCH?'TAP TO PLAY AGAIN':'PRESS ENTER',W/2,140,'#ff8ac0',9,'center')}
}
function draw(){
 X.setTransform(SC,0,0,SC,0,0);X.globalAlpha=1;X.globalCompositeOperation='source-over';
 CAM=Math.round(S.cam*SC)/SC;
 X.save();if(S.shake>0)X.translate((Math.random()-.5)*S.shake,(Math.random()-.5)*S.shake);
 backdrop();world();
 if(st!=='title'){
  for(const c of S.C)if(c.x>-900)drawCap(c);
  for(const u of S.T)if(u.x-CAM>-20&&u.x-CAM<W+20)drawTurret(u);
  for(const e of S.E)drawSoldier(e);
  drawBoss();
  const p=S.p;if(!p.dead&&!(p.inv>0&&t%6<3))drawPlayer(p);
  drawBullets();
 }
 drawFX();X.restore();
 if(S.flash>0){X.fillStyle='rgba(255,240,220,'+S.flash*.5+')';X.fillRect(0,0,W,H)}
 overlays();
 if(OV){X.setTransform(1,0,0,1,0,0);X.drawImage(OV,0,0)}
}

/* ---------- boot ---------- */
reset();
let last=0,acc=0;
function loop(ts){
 acc+=Math.min(100,ts-last);last=ts;let n=0;
 while(acc>=16.667&&n<5){update();acc-=16.667;n++}if(n===5)acc=0;
 draw();requestAnimationFrame(loop);
}
requestAnimationFrame(ts=>{last=ts;loop(ts)});
