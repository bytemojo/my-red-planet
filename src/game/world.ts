// @ts-nocheck
// World drawing ported from legacy/Junior_Mars_Commander.html (buildWorld). Same rooms, same look.
// Farm beds, bunks, rover and buildings are rewritten to read the new game state. The rest is verbatim.
import { CROPS } from '../core/constants';
import { createPixelSprites } from './sprites';
import { buildQuarters } from './quarters';
import { buildDayNight } from './daynight';
export const T = 32, W = 44, H = 30;
export const world: any = { ready: false };
export function buildWorld(scene: any, ctx: any) {
const { clamp } = ctx; const S = ctx.S;
 createPixelSprites(scene);
 const rng=(seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(214);
 const grid=v=>Array.from({length:H},()=>Array(W).fill(v));
 const inside=grid(false),blocked=grid(false),kind=grid('ground');
 for(let y=2;y<=18;y++)for(let x=4;x<=29;x++){inside[y][x]=true;kind[y][x]='floor';if(x===4||x===29||y===2||y===18){kind[y][x]='wall';blocked[y][x]=true}}
 const wall=(x,y,k='wall')=>{kind[y][x]=k;blocked[y][x]=true};
 for(let y=3;y<=17;y++){for(const x of[14,17]){if(y>=10&&y<=11)continue;wall(x,y,(x===14&&y>=13)?'glass':'wall')}}
 for(let x=5;x<=13;x++){if(x<8||x>10)wall(x,9);wall(x,12,'glass')}
 for(let x=18;x<=28;x++){if(x<21||x>24)wall(x,9);if(x<21||x>24)wall(x,12)}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x<=1||x>=42||y<=1||y>=28){kind[y][x]='ridge';blocked[y][x]=true}}
 // door in south wall
 for(const x of[15,16]){kind[18][x]='floor';blocked[18][x]=false}
 const block=(x,y,w,h)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)blocked[j][i]=true};
 // objects footprints
 const farmBeds=[[6,3],[9,3],[12,3],[5,7],[12,7]];farmBeds.forEach(([x,y])=>block(x,y,2,2));
 block(19,3,3,2);block(24,3,3,2);block(20,16,6,1);block(15,3,2,1);
 const panelsPos=[];for(const py of[22,26])for(let px=10;px<=26;px+=4){panelsPos.push([px,py]);block(px,py,3,2)}
 block(33,21,3,2);block(31,8,2,2);
 // rocks
 const rocks=[];const avoid=(x,y)=>(x>=3&&x<=31&&y>=1&&y<=20)||(x>=8&&x<=30&&y>=20&&y<=28)||(x>=13&&x<=18&&y>=18&&y<=24)||(x>=30&&x<=37&&y>=19&&y<=24)||(x>=30&&x<=34&&y>=7&&y<=10);
 for(let i=0;i<260&&rocks.length<42;i++){const x=2+Math.floor(rng()*40),y=2+Math.floor(rng()*26);if(avoid(x,y)||blocked[y][x])continue;const wide=rng()<.3&&!blocked[y][x+1]&&!avoid(x+1,y)&&x<41;rocks.push([x,y,wide?2:1,rng()]);block(x,y,wide?2:1,1)}
 world.inside=inside;world.blocked=blocked;

 /* ground */
 const gg=scene.add.graphics().setDepth(0);
 const GR=[0xb4532d,0xa94b2a,0xbb5a33,0x9f4527];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const px=x*T,py=y*T;
  if(inside[y][x]){const cor=(x===15||x===16||y===10||y===11);let c=cor?0x2a4067:0x1c2c4a;
   if(!cor){if(x<=13&&y<=9)c=0x1e3a36;else if(x>=18&&y<=9)c=0x1b3157;else if(x<=13&&y>=12)c=0x2e2a44;else c=0x1d2a52}
   gg.fillStyle(c,1);gg.fillRect(px,py,T,T);gg.lineStyle(1,0x000000,.28);gg.strokeRect(px+.5,py+.5,T-1,T-1);
   gg.fillStyle(0x4a6a9a,.5);[[3,3],[T-4,3],[3,T-4],[T-4,T-4]].forEach(([a,b])=>gg.fillRect(px+a,py+b,2,2));
   if(((x+y)&1)===0){gg.fillStyle(0xffffff,.03);gg.fillRect(px,py,T,T)}
  }else{const v=Math.floor(rng()*4);gg.fillStyle(GR[v],1);gg.fillRect(px,py,T,T);
   if(rng()<.35){gg.fillStyle(0x000000,.12);gg.fillRect(px+rng()*24,py+rng()*24,3,2);gg.fillStyle(0xffc79a,.12);gg.fillRect(px+rng()*24,py+rng()*24,2,2)}
   if(rng()<.08){gg.lineStyle(1,0xffd0a8,.18);gg.lineBetween(px,py+rng()*T,px+T,py+rng()*T)}}}
 // solar pad + lanes
 gg.fillStyle(0x7c3a24,.55);gg.fillRect(9*T,21*T,21*T,7*T);gg.lineStyle(2,0xe2b93b,.35);gg.strokeRect(9*T+1,21*T+1,21*T-2,7*T-2);
 gg.fillStyle(0x6e3220,.5);gg.fillRect(15*T,19*T,2*T,2*T);
 // metal pad outside airlock
 gg.fillStyle(0x34476b,1);gg.fillRect(14*T,19*T,4*T,2*T);gg.lineStyle(1,0x0a1220,.5);for(let i=0;i<4;i++)for(let j=0;j<2;j++)gg.strokeRect((14+i)*T+.5,(19+j)*T+.5,T-1,T-1);
 // airlock hazard stripes
 for(const x of[15,16]){for(let k=0;k<8;k++){gg.fillStyle(k%2?0x15110a:0xe8b923,1);gg.fillRect(x*T+k*4,18*T,4,T)}}
 // craters
 for(let i=0;i<22;i++){const x=(2+rng()*40)*T,y=(2+rng()*26)*T;if(avoid(Math.floor(x/T),Math.floor(y/T)))continue;gg.fillStyle(0x6b2f1c,.35);gg.fillEllipse(x,y,46,22);gg.fillStyle(0xe28a5c,.22);gg.fillEllipse(x-2,y-3,38,16)}
 // corridor guide line
 gg.fillStyle(0xe2b93b,.55);for(let y=3;y<=17;y++)if(y%2===0)gg.fillRect(16*T-1,y*T+8,2,14);for(let x=5;x<=28;x++)if(x%2===0)gg.fillRect(x*T+8,11*T-1,14,2);
 // pipes between life support machines
 gg.lineStyle(4,0x6b7fa6,1);gg.lineBetween(22*T,4*T+10,24*T,4*T+10);gg.lineBetween(23*T,4*T,23*T,5*T+10);gg.lineStyle(2,0x39d9ff,.7);gg.lineBetween(23*T,4*T,23*T,5*T+10);
 // ground shadows
 const shade=(x,y,w,h)=>{gg.fillStyle(0,.28);gg.fillRect(x+3,y+h-4,w,9)};
 farmBeds.forEach(([x,y])=>shade(x*T,y*T,2*T,2*T));shade(19*T,3*T,3*T,2*T);shade(24*T,3*T,3*T,2*T);shade(20*T,16*T,6*T,T);shade(15*T,3*T,2*T,T);panelsPos.forEach(([x,y])=>shade(x*T,y*T,3*T,2*T));shade(33*T,21*T,3*T,2*T);shade(31*T,8*T,2*T,2*T);

 /* walls and ridge (row graphics for depth sorting) */
 const rows=Array.from({length:H},(_,y)=>scene.add.graphics().setDepth((y+1)*T));
 const HG=14;const isW=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&(kind[y][x]==='wall'||kind[y][x]==='glass');
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=kind[y][x];if(k!=='wall'&&k!=='glass'&&k!=='ridge')continue;const g=rows[y],px=x*T,py=y*T;
  if(k==='ridge'){const h=18;g.fillStyle(0x5a2a1b,1);g.fillRect(px,py+T-h,T,h);g.fillStyle(0x8a4228,1);g.fillRect(px,py-h,T,T);g.fillStyle(0xb5603a,.6);g.fillRect(px+4+((x*7)%12),py-h+4+((y*5)%14),8,4);g.fillStyle(0x3a1a10,.5);g.fillRect(px+2,py-h+T-6,T-4,3);continue}
  if(k==='wall'){g.fillStyle(0x2a3a5e,1);g.fillRect(px,py+T-HG,T,HG);g.fillStyle(0x39d9ff,.9);g.fillRect(px+4,py+T-HG+5,T-8,2);g.fillStyle(0x93a8cc,1);g.fillRect(px,py-HG,T,T);g.lineStyle(1,0xe3ecff,.5);if(!isW(x,y-1))g.lineBetween(px,py-HG+.5,px+T,py-HG+.5);g.lineStyle(1,0x31476e,.8);if(!isW(x-1,y))g.lineBetween(px+.5,py-HG,px+.5,py+T-HG);if(!isW(x+1,y))g.lineBetween(px+T-.5,py-HG,px+T-.5,py+T-HG)}
  else{g.fillStyle(0x39d9ff,.28);g.fillRect(px,py+T-HG-8,T,HG+8);g.fillStyle(0xffffff,.35);g.fillRect(px+5,py+T-HG-6,2,HG+4);g.fillRect(px+13,py+T-HG-6,1,HG+4);g.fillStyle(0x6f8fb8,.55);g.fillRect(px,py-HG,T,6);g.fillStyle(0x6f8fb8,.7);g.fillRect(px,py+T-4,T,4)}}
 // rocks
 rocks.forEach(([x,y,w,r])=>{const g=rows[y],px=x*T,py=y*T,pw=w*T;g.fillStyle(0x4a2216,1);g.fillRect(px+2,py+T-14,pw-4,14);g.fillStyle(0x7a3c26,1);g.fillRect(px+3,py-8,pw-6,T-4);g.fillStyle(0xa8573a,1);g.fillRect(px+8,py-8,pw-18,8);g.fillStyle(0xd08460,.5);g.fillRect(px+10,py-6,8+r*6,3)});

 /* object builder */
 const obj=(bottom)=>scene.add.graphics().setDepth(bottom);
 const box=(g,x,y,w,h,hg,top,front)=>{g.fillStyle(front,1);g.fillRect(x,y+h-hg,w,hg);g.fillStyle(top,1);g.fillRect(x,y-hg,w,h);g.lineStyle(1,0xffffff,.22);g.strokeRect(x+.5,y-hg+.5,w-1,h-1)};
 const dyn=[];const label=(txt,x,y,color='#8ceaff',size=11)=>scene.add.text(x,y,txt,{fontFamily:'Rajdhani, sans-serif',fontSize:size+'px',fontStyle:'700',color,stroke:'#000',strokeThickness:3}).setOrigin(.5).setDepth(3).setAlpha(.9).setResolution(2);

 // ---- farm beds: one bed = one plot. Bed 5 (the annex) only appears once built.
 const bedGfx = []; const FCOL = { lettuce: [0x2f8f3f, 0x7be88a], tomato: [0x2a7f3a, 0x62d870], bean: [0x3a8a35, 0xa5d85c], potato: [0x2a6f3a, 0x58c070] };
 farmBeds.forEach(([x,y],bi)=>{const px=x*T,py=y*T,g=obj((y+2)*T);box(g,px,py,2*T,2*T,12,0x3a2416,0x5d6f8f);g.fillStyle(0xff4fd8,.9);g.fillRect(px+4,py+2*T-8,2*T-8,3);bedGfx.push(g);
  const d=obj((y+2)*T+1);bedGfx.push(d);
  const sprouts=Array.from({length:6},(_,i)=>scene.add.image(px+10+(i%3)*22,py+27+Math.floor(i/3)*21,'crop_lettuce_0').setOrigin(.5,1).setDepth((y+2)*T+2).setVisible(false));
  const bub=scene.add.image(px+T,py-6,'icons','bubble_water').setOrigin(.5,1).setDepth(9600).setVisible(false);
  dyn.push(t=>{d.clear();const st=ctx.state();const plot=st.plots[bi];const vis=!!plot;g.setVisible(vis);d.setVisible(vis);if(!vis)return;
   sprouts.forEach(s=>s.setVisible(false));bub.setVisible(false);
   const hg=12;const lit=st.farm==='bright'?1:.5;d.fillStyle(0xff4fd8,(.06+.05*Math.sin(t/500+bi))*lit);d.fillRect(px,py-hg,2*T,2*T);
   if(plot.watered){d.fillStyle(0x4aa3df,.28);d.fillRect(px+3,py-hg+3,2*T-6,2*T-6)}
   if(!plot.crop)return;
   const need=CROPS[plot.crop].sols,gr=Math.min(1,plot.growth/need),ready=plot.growth>=need,stage=Math.min(3,Math.floor(gr*3.01));
   sprouts.forEach((sprout,i)=>sprout.setTexture(`crop_${plot.crop}_${stage}`).setVisible(true).setY(py-hg+39+Math.floor(i/3)*21+Math.sin(t/650+i+bi)*.7));
   if(ready){d.lineStyle(2,0xffb340,.5+.4*Math.sin(t/200));d.strokeRect(px+1,py-hg+1,2*T-2,2*T-2)}
   const bk=ready?'bubble_ready':(!plot.watered&&st.hour<21?'bubble_water':null);if(bk)bub.setFrame(bk).setVisible(true).setY(py-8+Math.sin(t/380+bi)*1.5)})});
 world.bedGfx=bedGfx;
 // life support
 {let g=obj(5*T);box(g,19*T,3*T,3*T,2*T,26,0xaebbd3,0x3d4f75);g.fillStyle(0x1b2a47,1);g.fillCircle(19*T+T+16,3*T-26+T,18);g.fillStyle(0x39d9ff,.6);g.fillCircle(19*T+T+16,3*T-26+T,12);g.fillStyle(0x93a8cc,1);g.fillRect(19*T+8,5*T-20,80,8);
  g=obj(5*T);box(g,24*T,3*T,3*T,2*T,26,0xaebbd3,0x3d4f75);[0,1].forEach(i=>{g.fillStyle(0x2d7ed8,1);g.fillRect(24*T+10+i*44,3*T-26+10,32,44);g.fillStyle(0x8ccaff,.8);g.fillRect(24*T+14+i*44,3*T-26+14,6,36)});
  scene.add.image(20.5*T,5*T-13,'machine_oxygen').setOrigin(.5,1).setDepth(5*T+2);
  scene.add.image(25.5*T,5*T-13,'machine_water').setOrigin(.5,1).setDepth(5*T+2);
  const d=obj(5*T+1);dyn.push(t=>{d.clear();for(let i=0;i<3;i++){const a=((t/900+i/3)%1);d.fillStyle(0xbfeaff,1-a);d.fillCircle(19*T+T+16+Math.sin(t/300+i)*6,3*T-26-a*22,3)}d.fillStyle(Math.sin(t/400)>0?0x4dffb0:0x1a5a45,1);d.fillRect(19*T+6,5*T-12,6,4);d.fillStyle(Math.sin(t/500)>0?0xffb340:0x5a3a10,1);d.fillRect(26*T+14,5*T-12,6,4)});
  label('O₂ MAKER',20.5*T,5.35*T,'#bfe8ff',10);label('WATER MAKER',25.5*T,5.35*T,'#bfe8ff',10)}
 // control module + holo mars
 {const g=obj(4*T);box(g,15*T,3*T,2*T,T,22,0x93a8cc,0x24365a);g.fillStyle(0x39d9ff,.9);g.fillRect(15*T+6,3*T-22+8,2*T-12,10);g.fillStyle(0x0a1a33,1);g.fillRect(15*T+8,3*T-22+10,2*T-16,6);
  const d=obj(4*T+2);dyn.push(t=>{d.clear();const cx=16*T,cy=3*T-46;d.fillStyle(0x39d9ff,.14);d.fillTriangle(cx-10,3*T-22,cx+10,3*T-22,cx,cy+14);d.fillStyle(0xc1502e,.8);d.fillCircle(cx,cy,12);d.lineStyle(1,0x8ceaff,.9);d.strokeCircle(cx,cy,12);const w=Math.abs(Math.cos(t/700))*12;d.strokeEllipse(cx,cy,w*2,24);d.strokeEllipse(cx,cy,24,8)})}
 // comms console
 {const g=obj(17*T);box(g,20*T,16*T,6*T,T,18,0x93a8cc,0x24365a);g.fillStyle(0x0a1a33,1);g.fillRect(20*T+16,16*T-18-22,6*T-32,22);g.fillStyle(0x39d9ff,.25);g.fillRect(20*T+18,16*T-18-20,6*T-36,18);
  const d=obj(17*T+1);dyn.push(t=>{d.clear();d.lineStyle(2,0x8ceaff,1);d.beginPath();for(let i=0;i<=40;i++){const x=20*T+20+i*(6*T-40)/40,y=16*T-18-11+Math.sin(i*.6+t/200)*5*Math.sin(i/6+t/900);i?d.lineTo(x,y):d.moveTo(x,y)}d.strokePath();d.fillStyle(Math.sin(t/300)>0?0x4dffb0:0x14402f,1);d.fillRect(20*T+6,16*T-18+4,5,5)});
  label('COMMS LINK',23*T,14.3*T,'#8ceaff',11)}
 // dish outside
 {const g=obj(10*T);box(g,31*T,8*T,2*T,2*T,6,0x6a7a99,0x3a4a6c);g.fillStyle(0x2a3550,1);g.fillRect(32*T-3,8*T-24,6,22);const d=obj(10*T+1);dyn.push(t=>{d.clear();const a=Math.sin(t/1800)*.5;d.fillStyle(0xe9f0ff,1);d.fillEllipse(32*T+a*18,8*T-30,46-Math.abs(a)*14,34);d.fillStyle(0x93a8cc,1);d.fillEllipse(32*T+a*18+3,8*T-28,30,22);d.fillStyle(0xff5a6e,Math.sin(t/260)>0?1:.2);d.fillCircle(32*T+a*18+10,8*T-44,3);d.lineStyle(1,0x8ceaff,.5);d.lineBetween(32*T,8*T-44,32*T+30,8*T-110)})}

 // ---- crew quarters (quarantined med bay): four small rooms behind the glass, see quarters.ts
 world.crew=buildQuarters(scene);
 // intercom and meal hatch are mounted on the corridor side of the glass wall
 const intercom=obj(13*T+2);intercom.fillStyle(0x172841,1);intercom.fillRoundedRect(8.5*T-9,12*T+2,18,23,3);intercom.lineStyle(1,0x39d9ff,.85);intercom.strokeRoundedRect(8.5*T-9,12*T+2,18,23,3);intercom.fillStyle(0x39d9ff,.9);intercom.fillCircle(8.5*T,12*T+9,3);intercom.fillStyle(0xaebbd3,.8);for(let i=0;i<3;i++)intercom.fillRect(8.5*T-5+i*4,12*T+16,2,4);
 const hatch=obj(13*T+2);hatch.fillStyle(0x24365a,1);hatch.fillRoundedRect(11.5*T-16,12*T,32,26,3);hatch.lineStyle(1,0xffd24a,.9);hatch.strokeRoundedRect(11.5*T-16,12*T,32,26,3);hatch.fillStyle(0x0a1a33,1);hatch.fillRect(11.5*T-12,12*T+4,24,12);hatch.fillStyle(0xffd24a,.9);hatch.fillRect(11.5*T-12,12*T+19,24,3);
 const hatchLight=obj(13*T+3);dyn.push(t=>{hatchLight.clear();const st=ctx.state();if(!st)return;const hungry=!st.flags.quarantine_over&&Object.values(st.crew).some(c=>c.hunger>=50);hatchLight.fillStyle(hungry?0xffb340:0x4dffb0,hungry?.6+.4*Math.sin(t/180):1);hatchLight.fillRect(11.5*T+9,12*T+4,4,4)});
 label('INTERCOM',8.5*T,11.55*T,'#8ceaff',8);label('MEAL HATCH',11.5*T,11.55*T,'#ffd79a',8);
 const bayLabel=label('QUARANTINE · KEEP OUT',6.4*T,12.45*T,'#ff9fb2',9);
 world.setQuarantine=(over)=>{bayLabel.setText(over?'CREW QUARTERS':'QUARANTINE · KEEP OUT').setColor(over?'#9dffb0':'#ff9fb2');hatch.setVisible(!over);hatchLight.setVisible(!over)};
 // solar panels
 const dustGs=[],panelGs=[];panelsPos.forEach(([x,y],i)=>{const px=x*T,py=y*T,g=obj((y+2)*T);panelGs.push(g);g.fillStyle(0x222b44,1);g.fillRect(px+6,py+2*T-6,6,6);g.fillRect(px+3*T-12,py+2*T-6,6,6);box(g,px,py,3*T,2*T,10,0x1f4f96,0x1a2442);
  g.fillStyle(0x9fb4d6,1);g.fillRect(px,py-10,3*T,2);g.fillRect(px,py+2*T-12,3*T,2);g.lineStyle(1,0x7fb4ff,.45);for(let c=1;c<6;c++)g.lineBetween(px+c*16,py-10,px+c*16,py+2*T-10);for(let r=1;r<4;r++)g.lineBetween(px,py-10+r*16,px+3*T,py-10+r*16);
  const dg=obj((y+2)*T+.5);dg.fillStyle(0xd09a68,1);dg.fillRect(px,py-10,3*T,2*T);dg.fillStyle(0xa8703f,1);for(let k=0;k<14;k++)dg.fillRect(px+((k*37+i*11)%88),py-10+((k*23+i*7)%58),9,4);dustGs.push(dg);
  const gl=obj((y+2)*T+1);dyn.push(t=>{gl.clear();const p=((t/2200+i*.13)%1);gl.fillStyle(0xffffff,.28*(1-p)*(S&&S.eff>.9?1:.5));gl.fillRect(px+p*3*T-10,py-10,10,2*T)})});
 world.dust=()=>dustGs.forEach(d=>d.setAlpha(world.stowed?0:clamp((1-S.eff)*1.5,0,.75)));
 const stowLabel=label('PANELS STOWED',19*T,22.5*T,'#ffb340',12).setVisible(false);world.stowed=false;
 world.stow=(on)=>{if(world.stowed===on)return;world.stowed=on;panelGs.forEach(g=>g.setAlpha(on?.3:1));stowLabel.setVisible(on);world.dust()};
 world.clean=()=>{dustGs.forEach((d,i)=>scene.tweens.add({targets:d,alpha:0,duration:1800,delay:i*120}));for(let i=0;i<24;i++){const [px,py]=panelsPos[i%panelsPos.length];const s=scene.add.circle(px*T+Math.random()*3*T,py*T-10+Math.random()*2*T,3,0xffffff,1).setDepth(9000);scene.tweens.add({targets:s,y:s.y-26,alpha:0,duration:1000,delay:i*70,onComplete:()=>s.destroy()})}};
 label('SOLAR FARM',19*T,24.6*T,'#ffd79a',12);

 // ---- rover bay (appears when built), extra buildings, cave mouth
 const roverObjs=[];{const g=obj(23*T);[0,1,2].forEach(i=>{g.fillStyle(0x15110d,1);g.fillCircle(33*T+12+i*34,22*T+T+10,9)});box(g,33*T,21*T,3*T,2*T,16,0xe4ddd0,0x8f877a);g.fillStyle(0x39d9ff,.8);g.fillRect(33*T+10,21*T-16+8,30,10);g.fillStyle(0x1f4f96,1);g.fillRect(33*T+52,21*T-16+6,34,22);roverObjs.push(g,label('ROVER BAY',34.5*T,24*T,'#ffd79a',11))}
 const bld={};
 {const g=obj(14*T);[[32,12],[36,12]].forEach(([x,y])=>{box(g,x*T,y*T,3*T,2*T,10,0x1f4f96,0x1a2442);g.fillStyle(0x9fb4d6,1);g.fillRect(x*T,y*T-10,3*T,2)});bld.solar_2=[g,label('SOLAR ARRAY 2',35*T,14.7*T,'#ffd79a',10)]}
 {const g=obj(18*T);box(g,31*T,16*T,2*T,2*T,18,0xaebbd3,0x3d4f75);g.fillStyle(0x39d9ff,.6);g.fillCircle(32*T,16*T-10,10);bld.recycler=[g,label('WATER RECYCLER',32*T,18.6*T,'#bfe8ff',10)]}
 {const g=obj(18*T);box(g,36*T,16*T,3*T,2*T,22,0x5d6f8f,0x2a3550);g.fillStyle(0x0a1a33,1);g.fillRect(36*T+34,16*T-22+14,28,30);bld.shelter=[g,label('RADIATION SHELTER',37.5*T,18.6*T,'#d9c0ff',10)]}
 const caveObjs=[];{const g=obj(6*T);g.fillStyle(0x3a1a10,1);g.fillEllipse(35*T,5*T+10,3*T,2*T);g.fillStyle(0x07040a,1);g.fillEllipse(35*T,5*T+14,2*T,1.4*T);g.lineStyle(2,0xffb340,.6);g.strokeEllipse(35*T,5*T+10,3*T,2*T);caveObjs.push(g,label('CANDIDATE CAVE',35*T,3.4*T,'#ffd79a',10))}
 world.sync=()=>{const st=ctx.state();if(!st)return;world.setSuit(!!st.suitOn&&!st.outside);world.stow(!!(st.ep&&st.ep.panelsStowed));roverObjs.forEach(o=>o.setVisible(st.buildings.includes('rover_bay')));for(const k of Object.keys(bld))bld[k].forEach(o=>o.setVisible(st.buildings.includes(k)));caveObjs.forEach(o=>o.setVisible(!!st.flags.cave_unlocked));world.setQuarantine(!!st.flags.quarantine_over)};
 // suit rack on the hallway wall, on the way to the airlock
 {const g=obj(17*T+1);g.fillStyle(0x24365a,1);g.fillRect(17*T-10,16*T-30,10,40);g.lineStyle(1,0x39d9ff,.6);g.strokeRect(17*T-10+.5,16*T-30+.5,9,39);const hang=obj(17*T+2);hang.fillStyle(0xeaf4ff,1);hang.fillRoundedRect(17*T-9,16*T-26,8,20,2);hang.fillStyle(0x203b67,1);hang.fillRoundedRect(17*T-8,16*T-27,6,5,2);hang.fillStyle(0x54d8f3,1);hang.fillRect(17*T-7,16*T-26,4,2);label('SUIT RACK',16*T,15.5*T,'#8ceaff',8);world.setSuit=(worn)=>hang.setVisible(!worn)}
 label('INDOOR FARM',9.5*T,5.55*T,'#9dffb0',11);label('CONTROL MODULE',16*T,5.1*T,'#ffd79a',10);label('AIRLOCK',16*T,17.25*T,'#ffd24a',11);
 /* player */
 const sg=scene.make.graphics({x:0,y:0,add:false});sg.fillStyle(0,.35);sg.fillEllipse(10,4,18,7);sg.generateTexture('shadow',20,8);sg.destroy();
 const player=scene.add.sprite(16*T,14.5*T,'player','in_down_stand').setOrigin(.5,1);const shadow=scene.add.image(0,0,'shadow');
 world.night=buildDayNight(scene,W,H);

 world.player=player;world.shadow=shadow;world.scene=scene;world.anim=0;
 const arrow=scene.add.graphics().setDepth(9990);world.arrow=arrow;
 const cam=scene.cameras.main;cam.setBounds(0,0,W*T,H*T);cam.startFollow(player,true,.14,.14);cam.roundPixels=true;
 const fit=()=>{const w=scene.scale.width,h=scene.scale.height;cam.setZoom(clamp(Math.round(Math.min(w,h)/(T*12)*4)/4,1,2.5))};fit();scene.scale.on('resize',fit);
 world.pop=(x,y,txt,color='#fff')=>{const t=scene.add.text(x,y,txt,{fontFamily:'Rajdhani, sans-serif',fontSize:'16px',fontStyle:'700',color,stroke:'#000',strokeThickness:3}).setOrigin(.5).setDepth(9999).setResolution(2);scene.tweens.add({targets:t,y:y-36,alpha:0,duration:1600,ease:'Cubic.easeOut',onComplete:()=>t.destroy()})};
 world.dyn=dyn;world.dust();world.ready=true;world.puff=0;
world.sync();world.ready=true;
}
