// @ts-nocheck
// World drawing ported from legacy/Junior_Mars_Commander.html (buildWorld). Same rooms, same look.
// Farm beds, bunks, rover and buildings are rewritten to read the new game state. The rest is verbatim.
import { CROPS } from '../core/constants';
import { createPixelSprites } from './sprites';
import { buildQuarters } from './quarters';
import { buildLifeSupport } from './lifesupport';
import { buildDish } from './dish';
import { buildRover } from './rover';
import { buildCave } from './cave';
import { buildTruck } from './truck';
import { cameraZoom } from './camera';
import { WING_BLOCKS, buildWing } from './wing';
import { STORAGE, STORAGE_BLOCKS, STORAGE_WALL_Y, buildStorage } from './storage';
import { buildDayNight } from './daynight';
import { SOLAR_PANEL_ORIGINS } from './solar-panel-layout';
import { T, W, H, KITCHEN, CRATERS, buildLayout } from './layout';
import { DUST_PUFFS, craterOps, dustPuff, groundTileOps, rockShadowOps, type Op } from './ground';
import { cropStateFor } from './pixelart';
export { T, W, H };
export const world: any = { ready: false };
export function buildWorld(scene: any, ctx: any) {
const { clamp } = ctx; const S = ctx.S;
 createPixelSprites(scene);
 const {rng,inside,blocked,kind,farmBeds,panelsPos,rocks,avoid,terrain}=buildLayout();
 world.inside=inside;world.blocked=blocked;

 /* ground */
 const gg=scene.add.graphics().setDepth(0);
 const GR=[0xb4532d,0xa94b2a,0xbb5a33,0x9f4527];
 const replay=(ops:Op[])=>ops.forEach(o=>{if(o.a<=0)return;if(o.k==='rect'){gg.fillStyle(o.c,o.a);gg.fillRect(o.x,o.y,o.w,o.h)}else if(o.k==='ell'){gg.fillStyle(o.c,o.a);gg.fillEllipse(o.x,o.y,o.w,o.h)}else{gg.lineStyle(o.lw,o.c,o.a);gg.lineBetween(o.x1,o.y1,o.x2,o.y2)}});
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const px=x*T,py=y*T;
  if(inside[y][x]){const cor=(x===15||x===16||y===10||y===11);let c=cor?0x2a4067:0x1c2c4a;
   if(!cor){if(x>=30&&y<=8)c=0x262a40;else if(x>=30&&x<=34&&y>=13)c=0x233a4c;else if(x>=36&&y>=13)c=0x22424a;else if(x<=14&&y<=9)c=0x1e3a36;else if(x>=18&&y<=9)c=0x1b3157;else if(x<=13&&y>=12)c=0x2e2a44;else c=0x1d2a52}
   gg.fillStyle(c,1);gg.fillRect(px,py,T,T);gg.lineStyle(1,0x000000,.28);gg.strokeRect(px+.5,py+.5,T-1,T-1);
   gg.fillStyle(0x4a6a9a,.5);[[3,3],[T-4,3],[3,T-4],[T-4,T-4]].forEach(([a,b])=>gg.fillRect(px+a,py+b,2,2));
   if(((x+y)&1)===0){gg.fillStyle(0xffffff,.03);gg.fillRect(px,py,T,T)}
  }else if(kind[y][x]!=='ridge'){replay(groundTileOps(x,y,terrain[y][x],x>=3&&x<=42&&y>=18&&y<=29))}else{gg.fillStyle(GR[(x+y)&3],1);gg.fillRect(px,py,T,T)}}
 CRATERS.forEach(([cx,cy,r])=>replay(craterOps(cx,cy,r)));
 rocks.forEach(([x,y,w])=>replay(rockShadowOps(x,y,w)));
 // solar pad + lanes
 gg.fillStyle(0x7c3a24,.55);gg.fillRect(9*T,21*T,21*T,7*T);gg.lineStyle(2,0xe2b93b,.35);gg.strokeRect(9*T+1,21*T+1,21*T-2,7*T-2);
 gg.fillStyle(0x6e3220,.5);gg.fillRect(15*T,19*T,2*T,2*T);
 // metal pad outside airlock
 gg.fillStyle(0x34476b,1);gg.fillRect(14*T,19*T,4*T,2*T);gg.lineStyle(1,0x0a1220,.5);for(let i=0;i<4;i++)for(let j=0;j<2;j++)gg.strokeRect((14+i)*T+.5,(19+j)*T+.5,T-1,T-1);
 // airlock hazard stripes
 for(const x of[15,16]){for(let k=0;k<8;k++){gg.fillStyle(k%2?0x15110a:0xe8b923,1);gg.fillRect(x*T+k*4,18*T,4,T)}}
 // corridor guide line
 gg.fillStyle(0xe2b93b,.55);for(let y=3;y<=17;y++)if(y%2===0)gg.fillRect(16*T-1,y*T+8,2,14);for(let x=5;x<=38;x++)if(x%2===0)gg.fillRect(x*T+8,11*T-1,14,2);
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
 const bedGfx = []; const FCOL = { lettuce: [0x2f8f3f, 0x7be88a], tomato: [0x2a7f3a, 0x62d870], bean: [0x3a8a35, 0xa5d85c], potato: [0x2a6f3a, 0x58c070], carrot: [0x2f6f3a, 0x6fcf5f], spinach: [0x1f5a35, 0x3f9a4f], wheat: [0x8bc34a, 0xe6c35a] };
 // Step 5a: raised metal-and-plastic grow bed (no wood). Frame is static art; soil, LED glow, water window and status light are redrawn each frame.
 const drawBedFrame=(g,px,py)=>{
  g.fillStyle(0x56648a,1);g.fillRect(px,py+52,2,12);g.fillRect(px+62,py+52,2,12);g.fillStyle(0x7f8fb0,1);g.fillRect(px+2,py+52,60,1); // front panel edges
  g.fillStyle(0x4a5878,1);g.fillRect(px,py+61,64,3);g.fillStyle(0x56648a,1);g.fillRect(px+17,py+53,1,8);g.fillRect(px+46,py+53,1,8); // shadow strip + seams
  g.fillStyle(0x5a6c92,1);g.fillRect(px+1,py-11,62,1);g.fillRect(px+1,py-11,1,62); // rim highlight
  g.fillStyle(0x1f2a42,1);g.fillRect(px+3,py-9,58,2);g.fillStyle(0x1d6a78,1);g.fillRect(px+4,py-9,56,1); // drip tube along the back rim
  [14,32,50].forEach(ex=>{g.fillStyle(0x7f8fb0,1);g.fillRect(px+ex-1,py-8,3,2);g.fillStyle(0x39d9ff,.8);g.fillRect(px+ex,py-7,1,1)}); // emitters
  g.fillStyle(0x2a1633,1);g.fillRect(px+4,py+48,56,3); // LED strip housing
  for(let i=0;i<14;i++){g.fillStyle(i%2?0xb98cff:0xff4fd8,1);g.fillRect(px+5+i*4,py+49,3,1)}
  [[2,54],[60,54],[2,60],[60,60],[2,-10],[60,-10],[2,46],[60,46]].forEach(([bx,by])=>{g.fillStyle(0xc9d4ea,1);g.fillRect(px+bx,py+by,2,2);g.fillStyle(0x2a3550,1);g.fillRect(px+bx+1,py+by+1,1,1)}); // bolts
  g.fillStyle(0x151c2e,1);g.fillRect(px+19,py+54,26,8);g.lineStyle(1,0x39d9ff,.7);g.strokeRect(px+19.5,py+54.5,25,7); // label plate
  g.fillStyle(0x151c2e,1);g.fillRect(px+4,py+54,12,8);g.fillStyle(0x0a1424,1);g.fillRect(px+5,py+55,10,6);g.fillStyle(0x4a5878,1);[56,58,60].forEach(ty=>g.fillRect(px+14,py+ty,1,1)); // water-level window
  g.fillStyle(0x151c2e,1);g.fillRect(px+49,py+54,10,8); // status light housing
 };
 const mixC=(a,b,k)=>{const r=(a>>16&255)+((b>>16&255)-(a>>16&255))*k,gg=(a>>8&255)+((b>>8&255)-(a>>8&255))*k,bb=(a&255)+((b&255)-(a&255))*k;return(Math.round(r)<<16)|(Math.round(gg)<<8)|Math.round(bb)};
 const hsh=(n,bi)=>{const v=Math.sin(n*127.1+bi*311.7)*43758.5453;return v-Math.floor(v)};
 const drawBedSoil=(d,px,py,bi,wet,rising,t,plot,lit)=>{
  d.fillStyle(mixC(0x7a4128,0x2a1710,wet),1);d.fillRect(px+4,py-7,56,54); // regolith: lighter dry, darker watered
  for(let i=0;i<30;i++){const x=px+6+Math.floor(hsh(i,bi)*50),y=py-5+Math.floor(hsh(i+50,bi)*48),w=1+Math.floor(hsh(i+100,bi)*3),light=hsh(i+150,bi)<.5;
   d.fillStyle(mixC(light?0x9a5a3a:0x5c3020,light?0x3d2418:0x1b0f0a,wet),1);d.fillRect(x,y,w,light?1:2)}
  for(let i=0;i<5;i++){d.fillStyle(mixC(0x8a6a5a,0x4a3a34,wet),1);d.fillRect(px+7+Math.floor(hsh(i+200,bi)*48),py-4+Math.floor(hsh(i+210,bi)*44),3,2)} // pebbles
  if(wet>.5){d.fillStyle(0x6ab8ff,.1*wet);d.fillRect(px+4,py-7,56,2)}
  if(rising)[14,32,50].forEach((ex,k)=>{const a=(t/450+k/3)%1;d.fillStyle(0xbfeaff,1-a);d.fillRect(px+ex,py-6+a*12,1,2)}); // drip while the soil is soaking
  d.fillStyle(0xff4fd8,(.06+.05*Math.sin(t/500+bi))*lit);d.fillRect(px+4,py-7,56,54); // grow-light tint
  for(let i=0;i<14;i++){d.fillStyle(0xffd0f6,(.35+.3*Math.sin(t/400+i*.6))*lit);d.fillRect(px+5+i*4,py+49,3,1)} // LED shimmer
  const h=1+Math.round(wet*4);d.fillStyle(0x39b6ff,1);d.fillRect(px+5,py+61-h,10,h);d.fillStyle(0xbfeaff,1);d.fillRect(px+5,py+61-h,10,1); // water level
  const cx=px+54,cy=py+58;
  if(plot.crop&&plot.watered){d.fillStyle(0x4dff8a,.25);d.fillCircle(cx,cy,4.5);d.fillStyle(0x4dff8a,1);d.fillCircle(cx,cy,2.5)} // green: watered
  else if(plot.crop){const on=Math.sin(t/260)>-.2;d.fillStyle(0xffb340,on?.3:.1);d.fillCircle(cx,cy,4.5);d.fillStyle(0xffb340,on?1:.45);d.fillCircle(cx,cy,2.5)} // amber: thirsty
  else{d.fillStyle(0x2f6a4a,1);d.fillCircle(cx,cy,2.5)} // empty bed: idle
 };
 farmBeds.forEach(([x,y],bi)=>{const px=x*T,py=y*T,g=obj((y+2)*T);box(g,px,py,2*T,2*T,12,0x34425f,0x6b7a99);drawBedFrame(g,px,py);let wet=-1;const bl=label(`BED ${bi+1}`,px+32,py+58,'#8ceaff',6).setDepth((y+2)*T+3).setVisible(false);bedGfx.push(g);
  const d=obj((y+2)*T+1);bedGfx.push(d);
  const sprouts=Array.from({length:6},(_,i)=>scene.add.image(px+10+(i%3)*22,py+27+Math.floor(i/3)*21,'crop_lettuce_0').setOrigin(.5,1).setDepth((y+2)*T+2).setVisible(false));
  const bub=scene.add.image(px+T,py-6,'icons','bubble_water').setOrigin(.5,1).setDepth(9600).setVisible(false);
  dyn.push(t=>{d.clear();const st=ctx.state();const plot=st.plots[bi];const vis=!!plot;g.setVisible(vis);d.setVisible(vis);if(!vis)return;
   sprouts.forEach(s=>s.setVisible(false));bub.setVisible(false);bl.setVisible(vis);
   const hg=12;const lit=st.farm==='bright'?1:.5;const tgt=plot.watered?1:0;if(wet<0)wet=tgt;const rising=tgt===1&&wet<.97;wet+=(tgt-wet)*.1;drawBedSoil(d,px,py,bi,wet,rising,t,plot,lit);
   if(!plot.crop)return;
   const need=CROPS[plot.crop].sols,ready=plot.growth>=need,stage=cropStateFor(plot.growth,need,plot.health);
   sprouts.forEach((sprout,i)=>sprout.setTexture(`crop_${plot.crop}_${stage}`).setAlpha(stage===4?.82+.18*Math.sin(t/420+i):1).setVisible(true).setY(py-hg+35+Math.floor(i/3)*21+Math.sin(t/650+i+bi)*.7));
   if(ready){d.lineStyle(2,0xffb340,.5+.4*Math.sin(t/200));d.strokeRect(px+1,py-hg+1,2*T-2,2*T-2)}
   const bk=ready?'bubble_ready':(!plot.watered&&st.hour<21?'bubble_water':null);if(bk)bub.setFrame(bk).setVisible(true).setY(py-8+Math.sin(t/380+bi)*1.5)})});
 world.bedGfx=bedGfx;
 // life support (Step 26b: bodies, tanks, pipes and animation live in game/lifesupport.ts)
 {world.lifeArt=buildLifeSupport(scene);
  label('O₂ MAKER',20.5*T,5.35*T,'#bfe8ff',10);label('WATER MAKER',25.5*T,5.35*T,'#bfe8ff',10)}
 // control module + holo mars
 {const g=obj(4*T);box(g,15*T,3*T,2*T,T,22,0x93a8cc,0x24365a);g.fillStyle(0x39d9ff,.9);g.fillRect(15*T+6,3*T-22+8,2*T-12,10);g.fillStyle(0x0a1a33,1);g.fillRect(15*T+8,3*T-22+10,2*T-16,6);
  const d=obj(4*T+2);dyn.push(t=>{d.clear();const cx=16*T,cy=3*T-46;d.fillStyle(0x39d9ff,.14);d.fillTriangle(cx-10,3*T-22,cx+10,3*T-22,cx,cy+14);d.fillStyle(0xc1502e,.8);d.fillCircle(cx,cy,12);d.lineStyle(1,0x8ceaff,.9);d.strokeCircle(cx,cy,12);const w=Math.abs(Math.cos(t/700))*12;d.strokeEllipse(cx,cy,w*2,24);d.strokeEllipse(cx,cy,24,8)})}
 // comms console
 {const g=obj(17*T);box(g,20*T,16*T,3*T,T,18,0x93a8cc,0x24365a);g.fillStyle(0x0a1a33,1);g.fillRect(20*T+16,16*T-18-22,3*T-32,22);g.fillStyle(0x39d9ff,.25);g.fillRect(20*T+18,16*T-18-20,3*T-36,18);
  const d=obj(17*T+1);dyn.push(t=>{d.clear();d.lineStyle(2,0x8ceaff,1);d.beginPath();for(let i=0;i<=40;i++){const x=20*T+20+i*(3*T-40)/40,y=16*T-18-11+Math.sin(i*.6+t/200)*5*Math.sin(i/6+t/900);i?d.lineTo(x,y):d.moveTo(x,y)}d.strokePath();d.fillStyle(Math.sin(t/300)>0?0x4dffb0:0x14402f,1);d.fillRect(20*T+6,16*T-18+4,5,5)});
  label('COMMS LINK',21.5*T,14.3*T,'#8ceaff',8).setData('room','comms')}
 // dish outside (Step 26c: art + rotation live in game/dish.ts)
 world.dishArt=buildDish(scene);

 // ---- crew quarters (quarantined med bay): four small rooms behind the glass, see quarters.ts
 world.crew=buildQuarters(scene,(x,y)=>blocked[y]?.[x]??true); // Step 24h: crew obey the same collision grid as the player
 // intercom and meal hatch are mounted on the corridor side of the glass wall
 const intercom=obj(13*T+2);intercom.fillStyle(0x172841,1);intercom.fillRoundedRect(8.5*T-9,12*T+2,18,23,3);intercom.lineStyle(1,0x39d9ff,.85);intercom.strokeRoundedRect(8.5*T-9,12*T+2,18,23,3);intercom.fillStyle(0x39d9ff,.9);intercom.fillCircle(8.5*T,12*T+9,3);intercom.fillStyle(0xaebbd3,.8);for(let i=0;i<3;i++)intercom.fillRect(8.5*T-5+i*4,12*T+16,2,4);
 const hatch=obj(13*T+2);hatch.fillStyle(0x24365a,1);hatch.fillRoundedRect(11.5*T-16,12*T,32,26,3);hatch.lineStyle(1,0xffd24a,.9);hatch.strokeRoundedRect(11.5*T-16,12*T,32,26,3);hatch.fillStyle(0x0a1a33,1);hatch.fillRect(11.5*T-12,12*T+4,24,12);hatch.fillStyle(0xffd24a,.9);hatch.fillRect(11.5*T-12,12*T+19,24,3);
 const hatchLight=obj(13*T+3);dyn.push(t=>{hatchLight.clear();const st=ctx.state();if(!st)return;const hungry=!st.flags.quarantine_over&&Object.values(st.crew).some(c=>c.hunger>=50);hatchLight.fillStyle(hungry?0xffb340:0x4dffb0,hungry?.6+.4*Math.sin(t/180):1);hatchLight.fillRect(11.5*T+9,12*T+4,4,4)});
 label('INTERCOM',8.5*T,11.55*T,'#8ceaff',8);label('MEAL HATCH',11.5*T,11.55*T,'#ffd79a',8);
 const bayLabel=label('QUARANTINE · KEEP OUT',6.4*T,12.45*T,'#ff9fb2',9);
 world.setQuarantine=(over)=>{bayLabel.setText(over?'CREW QUARTERS':'QUARANTINE · KEEP OUT').setColor(over?'#9dffb0':'#ff9fb2');hatch.setVisible(!over);hatchLight.setVisible(!over)};
 // kitchen (Step 2b appliances), now in the SE corner of the indoor farm: x12-13,y7-9, open on the west and south (no walls there). North wall counter (blocked row y7): electric heater + sink on top, two food lockers in front.
 // Wall face: microwave with status lamps, clear snap-lid bins. White table (16,8) (blocked) = tray station. Glass serving window on the south wall. All electric.
 // Depth rules: wall row y draws at (y+1)*T and the player at its feet y. Wall-face art sits just above the wall row (7*T+1),
 // the counter at its own row bottom (8*T), the table at 9*T. All art here is above the ground (depth 0) and below the player when the player is south of it.
 {const K0=KITCHEN.x0*T,KW=2*T,TX=(KITCHEN.x0+1)*T,TY=8*T;
  // floor: tile checker, warm runner from the door to the table, hazard threshold in the doorway, table shadow
  const fl=obj(1);
  for(let j=0;j<6;j++)for(let i=0;i<4;i++){fl.fillStyle((i+j)&1?0x4a6286:0x425a7e,1);fl.fillRect(K0+i*16,7*T+j*16,16,16)}
  fl.fillStyle(0x8a4e3b,.85);fl.fillRect(K0-T+2,8*T+10,2*T-2,14);fl.fillStyle(0xffb340,.7);fl.fillRect(K0-T+2,8*T+10,2*T-2,2);fl.fillRect(K0-T+2,8*T+22,2*T-2,2);
  // open kitchen corner: hazard-dash floor edge on the front (south) and the greenhouse side (west) instead of walls
  for(let k=0;k<8;k++){fl.fillStyle(k%2?0x15110a:0xe8b923,1);fl.fillRect(K0+k*8,10*T-4,8,4)}for(let k=0;k<12;k++){fl.fillStyle(k%2?0x15110a:0xe8b923,1);fl.fillRect(K0,7*T+k*8,4,8)}
  fl.fillStyle(0x000000,.28);fl.fillRect(TX+5,TY+T-7,24,6);
  // wall face above the counter
  const wl=obj(7*T+1);
  wl.fillStyle(0x5a7396,1);wl.fillRect(K0+2,6*T-8,KW-4,38);wl.fillStyle(0xe3ecff,.5);wl.fillRect(K0+2,6*T-8,KW-4,1);
  // microwave: body, door window with lit cavity, turntable plate and a food pouch, side panel with countdown display and two buttons
  wl.fillStyle(0xcfd8e6,1);wl.fillRect(K0+6,6*T-4,30,20);wl.fillStyle(0x8a9bb5,1);wl.fillRect(K0+6,6*T+14,30,2);
  wl.fillStyle(0x071426,1);wl.fillRect(K0+9,6*T-1,17,12);wl.fillStyle(0xffe9b0,.5);wl.fillRect(K0+10,6*T,15,2);
  wl.fillStyle(0xe9d6a8,1);wl.fillRect(K0+15,6*T+3,7,6);wl.fillStyle(0x39d9ff,1);wl.fillRect(K0+17,6*T+5,3,2);
  wl.fillStyle(0xe8f4ff,.9);wl.fillRect(K0+11,6*T+9,13,2);wl.fillStyle(0x8a9bb5,1);wl.fillRect(K0+16,6*T+11,3,1);
  wl.fillStyle(0xa9b8d0,1);wl.fillRect(K0+27,6*T-3,8,17);wl.fillStyle(0x071426,1);wl.fillRect(K0+28,6*T-2,6,5);
  wl.fillStyle(0x8ceaff,1);wl.fillRect(K0+28,6*T-1,1,3);wl.fillRect(K0+29.5,6*T-1,1,1);wl.fillRect(K0+29.5,6*T+1,1,1);wl.fillRect(K0+31,6*T-1,1,3);wl.fillRect(K0+32.5,6*T-1,1,3);
  wl.fillStyle(0xffb340,1);wl.fillRect(K0+29,6*T+5,4,3);wl.fillStyle(0x39d9ff,1);wl.fillRect(K0+29,6*T+9,4,3);
  // shelf with two clear snap-lid ingredient bins (coloured tags)
  wl.fillStyle(0x9fb4d6,1);wl.fillRect(K0+39,6*T+14,22,2);
  [[K0+41,0xffb340],[K0+51,0x4dffb0]].forEach(([x,c])=>{wl.fillStyle(0xd7ecff,.5);wl.fillRect(x,6*T+4,8,10);wl.fillStyle(0xb5c4dc,.8);wl.fillRect(x+1,6*T+9,6,4);wl.fillStyle(0xdfe9f7,1);wl.fillRect(x-1,6*T+3,10,3);wl.fillStyle(c,1);wl.fillRect(x+2,6*T+7,4,2);wl.lineStyle(1,0x8ceaff,.5);wl.strokeRect(x+.5,6*T+4.5,7,9)});
  label('KITCHEN',K0+49,6*T-2,'#ffd79a',6).setDepth(7*T+2).setData('room','kitchen');
  // kitchen east wall (tile 14,7): prohibition sign (crossed circle). Its wall row draws at 8*T, so this art sits at 8*T+1 (it was hidden at 7*T+1)
  const wd=obj(8*T+1);
  wd.fillStyle(0xf3f6fa,1);wd.fillCircle(14*T+16,7*T+8,6);wd.fillStyle(0x23304a,1);wd.fillTriangle(14*T+16,7*T+3.5,14*T+13.5,7*T+9,14*T+18.5,7*T+9);wd.fillCircle(14*T+16,7*T+9.5,2.5);
  wd.lineStyle(2,0xff4d5e,1);wd.strokeCircle(14*T+16,7*T+8,6);wd.beginPath();wd.moveTo(14*T+12,7*T+12);wd.lineTo(14*T+20,7*T+4);wd.strokePath();
  // kitchen status lamps (water drop, power bolt, clock) in a small panel on the wall beside the door
  {const px=14*T,ty=7*T+17.5;
   wd.fillStyle(0x0b1830,1);wd.fillRect(px+3,7*T+15,26,13);wd.lineStyle(1,0x8ceaff,.35);wd.strokeRect(px+3.5,7*T+15.5,25,12);
   wd.fillStyle(0x39d9ff,1);wd.fillTriangle(px+8,ty,px+5.5,ty+4,px+10.5,ty+4);wd.fillCircle(px+8,ty+5,2.5);
   wd.fillStyle(0xffb340,1);wd.fillTriangle(px+17,ty,px+13.5,ty+4.5,px+16.5,ty+4.5);wd.fillTriangle(px+14.5,ty+8,px+18.5,ty+3,px+15.5,ty+3);
   wd.lineStyle(1.5,0x4dffb0,1);wd.strokeCircle(px+24,ty+4.5,3.5);wd.beginPath();wd.moveTo(px+24,ty+4.5);wd.lineTo(px+24,ty+2);wd.moveTo(px+24,ty+4.5);wd.lineTo(px+26,ty+4.5);wd.strokePath()}
  // counter (blocked): bright worktop, two food lockers in the front (vents, handle, colour tag)
  const ct=obj(8*T);box(ct,K0,7*T,KW,T,12,0xc7d3e6,0x34476b);
  [[K0+2,0xffb340],[K0+34,0x4dffb0]].forEach(([x,c])=>{ct.fillStyle(0x4b628a,1);ct.fillRect(x,7*T+21,28,9);ct.fillStyle(0x7d97c2,1);ct.fillRect(x,7*T+21,28,1);ct.fillStyle(0x1e2f4d,1);for(let k=0;k<4;k++)ct.fillRect(x+3+k*3,7*T+23,1,5);ct.fillStyle(0xe3ecff,1);ct.fillRect(x+18,7*T+23,2,6);ct.fillStyle(c,1);ct.fillRect(x+22,7*T+24,4,4)});
  ct.fillStyle(0x233957,1);ct.fillRect(K0+31,7*T+14,2,16);
  // on the worktop: ELECTRIC HEATER (left, in front of the cook marker at tile 15,8), sink with tap (right)
  const ci=obj(8*T+1);
  ci.fillStyle(0x2b405f,1);ci.fillRect(K0+4,7*T-1,24,15);ci.fillStyle(0x101a32,1);ci.fillRect(K0+7,7*T+2,18,9);
  ci.lineStyle(2,0xffb340,.95);ci.strokeCircle(K0+16,7*T+6,4.2);ci.lineStyle(1.5,0xffd27a,.9);ci.strokeCircle(K0+16,7*T+6,2.2);ci.fillStyle(0xfff0c8,.9);ci.fillCircle(K0+16,7*T+6,.9);
  ci.fillStyle(0x6f89b3,1);for(let k=0;k<4;k++)ci.fillRect(K0+7+k*4,7*T+12,3,1);ci.fillStyle(0xffb340,1);ci.fillRect(K0+25,7*T+12,2,2);
  ci.fillStyle(0xaebbd3,1);ci.fillRect(K0+35,7*T+0,24,14);ci.fillStyle(0x5e7697,1);ci.fillRect(K0+38,7*T+3,18,8);ci.fillStyle(0x7fb8e6,.55);ci.fillRect(K0+39,7*T+8,16,2);ci.fillStyle(0x233957,1);ci.fillCircle(K0+52,7*T+7,1.2);
  ci.lineStyle(2,0x8ceaff,.9);ci.beginPath();ci.arc(K0+47,7*T-2,5,Math.PI,Math.PI*2);ci.strokePath();ci.fillStyle(0x39d9ff,.75);ci.fillRect(K0+52,7*T-2,2,5);ci.fillStyle(0x39d9ff,1);ci.fillRect(K0+40,7*T+0,3,2);ci.fillStyle(0xe3ecff,1);ci.fillRect(K0+52,7*T+0,3,2);
  // SERVING TRAY STATION (table at 16,8): white plastic top, pedestal, two stools, a 5-well tray, cyan ready strip
  const tb=obj(9*T);
  tb.fillStyle(0xaebbd3,1);tb.fillRect(TX+1,TY+T-12,6,6);tb.fillRect(TX+T-7,TY+T-12,6,6);tb.fillStyle(0xdfe6f1,1);tb.fillRect(TX+1,TY+T-13,6,2);tb.fillRect(TX+T-7,TY+T-13,6,2);
  tb.fillStyle(0x93a8cc,1);tb.fillRect(TX+13,TY+T-10,6,8);
  box(tb,TX+3,TY+11,26,16,8,0xf3f6fa,0xb7c2d3);
  tb.fillStyle(0xd5deea,1);tb.fillRect(TX+6,TY+4,20,11);tb.lineStyle(1,0x8ca0bf,1);tb.strokeRect(TX+6.5,TY+4.5,19,10);
  [[TX+7.5,TY+5.5],[TX+13.5,TY+5.5],[TX+19.5,TY+5.5],[TX+10.5,TY+10.5],[TX+16.5,TY+10.5]].forEach(([x,y])=>{tb.fillStyle(0x9db0cc,1);tb.fillRect(x,y,5,4);tb.fillStyle(0xeaf3ff,1);tb.fillRect(x,y,5,1)});
  tb.fillStyle(0x39d9ff,1);tb.fillRect(TX+8,TY+22,16,2);tb.fillStyle(0x8a9bb5,1);tb.fillRect(TX+12,TY+25,8,1);
  // floor stencil on the open front edge, readable from the corridor
  label('ELECTRIC · NO FLAME',K0+KW/2,9*T+17,'#8ceaff',6).setDepth(2);
  // the one idle animation: the heater coil glows and pulses
  const kd=obj(8*T+2);dyn.push(t=>{kd.clear();const pulse=.16+.08*Math.sin(t/280);kd.fillStyle(0xffb340,pulse);kd.fillCircle(K0+16,7*T+6,10);kd.fillStyle(0xffb340,pulse*.7);kd.fillCircle(K0+16,7*T+6,5)});
 }
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
 const roverObjs=[];world.roverArt=buildRover(scene);roverObjs.push(label('ROVER BAY',34.5*T,24*T,'#ffd79a',11)); // Step 28c: the parked broken rover is always there (rover.ts); only the ROVER BAY label waits for the building
 const bld={};
 {const g=obj(14*T);[[32,12],[36,12]].forEach(([x,y])=>{box(g,x*T,y*T,3*T,2*T,10,0x1f4f96,0x1a2442);g.fillStyle(0x9fb4d6,1);g.fillRect(x*T,y*T-10,3*T,2)});bld.solar_2=[g,label('SOLAR ARRAY 2',35*T,14.7*T,'#ffd79a',10)]}
 {const g=obj(18*T);box(g,31*T,16*T,2*T,2*T,18,0xaebbd3,0x3d4f75);g.fillStyle(0x39d9ff,.6);g.fillCircle(32*T,16*T-10,10);bld.recycler=[g,label('WATER RECYCLER',32*T,18.6*T,'#bfe8ff',10)]}
 {const g=obj(18*T);box(g,36*T,16*T,3*T,2*T,22,0x5d6f8f,0x2a3550);g.fillStyle(0x0a1a33,1);g.fillRect(36*T+34,16*T-22+14,28,30);bld.shelter=[g,label('RADIATION SHELTER',37.5*T,18.6*T,'#d9c0ff',10)]}
 world.truckArt=buildTruck(scene); // Step 28g: the truck is parked on the truck bay pad (placement + driving come in 28h)
 const caveObjs=[];world.caveArt=buildCave(scene);caveObjs.push(label('CANDIDATE CAVE',39.5*T,23.4*T,'#ffd79a',10)); // Step 28e: the cave art is ALWAYS visible (game/cave.ts); only the label waits for the unlock
 world.sync=()=>{const st=ctx.state();if(!st)return;world.setSuit(!!st.suitOn&&!st.outside);world.stow(!!(st.ep&&st.ep.panelsStowed));roverObjs.forEach(o=>o.setVisible(st.buildings.includes('rover_bay')));for(const k of Object.keys(bld))bld[k].forEach(o=>o.setVisible(st.buildings.includes(k)));caveObjs.forEach(o=>o.setVisible(!!st.flags.cave_unlocked));world.setQuarantine(!!st.flags.quarantine_over)};
 // suit rack on the hallway wall, on the way to the airlock
 {const g=obj(17*T+1);g.fillStyle(0x24365a,1);g.fillRect(17*T-10,16*T-30,10,40);g.lineStyle(1,0x39d9ff,.6);g.strokeRect(17*T-10+.5,16*T-30+.5,9,39);const hang=obj(17*T+2);hang.fillStyle(0xeaf4ff,1);hang.fillRoundedRect(17*T-9,16*T-26,8,20,2);hang.fillStyle(0x203b67,1);hang.fillRoundedRect(17*T-8,16*T-27,6,5,2);hang.fillStyle(0x54d8f3,1);hang.fillRect(17*T-7,16*T-26,4,2);label('SUIT RACK',16*T,15.5*T,'#8ceaff',8);world.setSuit=(worn)=>hang.setVisible(!worn)}
 label('INDOOR FARM',9.5*T,5.55*T,'#9dffb0',8).setData('room','farm');label('CONTROL MODULE',16*T,5.1*T,'#ffd79a',7).setDepth(6*T+2).setData('room','control');label('AIRLOCK',16*T,17.25*T,'#ffd24a',8).setData('room','airlock');
 /* player */
 const sg=scene.make.graphics({x:0,y:0,add:false});sg.fillStyle(0,.35);sg.fillEllipse(10,4,18,7);sg.generateTexture('shadow',20,8);sg.destroy();
 const player=scene.add.sprite(16*T,14.5*T,'player','in_down_stand').setOrigin(.5,1);const shadow=scene.add.image(0,0,'shadow');
 world.night=buildDayNight(scene,W,H);
 world.wing=buildWing(scene,()=>world.player);buildStorage(scene);

 world.player=player;world.shadow=shadow;world.scene=scene;world.anim=0;
 const arrow=scene.add.graphics().setDepth(9990);world.arrow=arrow;
 const cam=scene.cameras.main;cam.setBounds(0,0,W*T,H*T);cam.startFollow(player,true,.14,.14);cam.roundPixels=true;
 const fit=()=>{const w=scene.scale.width,h=scene.scale.height;cam.setZoom(cameraZoom(w,h))};fit();scene.scale.on('resize',fit);
 world.pop=(x,y,txt,color='#fff')=>{const t=scene.add.text(x,y,txt,{fontFamily:'Rajdhani, sans-serif',fontSize:'16px',fontStyle:'700',color,stroke:'#000',strokeThickness:3}).setOrigin(.5).setDepth(9999).setResolution(2);scene.tweens.add({targets:t,y:y-36,alpha:0,duration:1600,ease:'Cubic.easeOut',onComplete:()=>t.destroy()})};
 // Step 28b: very light dust drift over the outdoor ground (hidden over the base; still with reduced motion)
 {const reduceMo=()=>typeof document!=='undefined'&&(document.documentElement.dataset.reduce==='1'||(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches));
  const dg=scene.add.graphics().setDepth(2);let lastDust=-1;
  dyn.push(t=>{const ts=reduceMo()?0:t/1000;const q=Math.floor(ts*4);if(q===lastDust)return;lastDust=q;dg.clear();
   for(let i=0;i<DUST_PUFFS;i++){const d=dustPuff(i,ts,W,H);const hit=[-.5,0,.5].some(k=>{const tx=Math.floor((d.x+k*d.w)/T),ty=Math.floor(d.y/T);return tx>=0&&ty>=0&&tx<W&&ty<H&&inside[ty][tx]});if(hit)continue;
    dg.fillStyle(0xe9a070,d.a);dg.fillEllipse(d.x,d.y,d.w,d.h);dg.fillStyle(0xffd0a8,d.a*.6);dg.fillEllipse(d.x+d.w*.12,d.y-d.h*.1,d.w*.6,d.h*.55)}})}
 world.dyn=dyn;world.dust();world.ready=true;world.puff=0;
world.sync();world.ready=true;
}
