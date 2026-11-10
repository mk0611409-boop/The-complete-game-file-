/* =====================================================================
   PARTICLES
===================================================================== */
const FIRE=[0xff4a12,0xff9a2a,0xffdd77],ICE=[0x8fe3ff,0xffffff,0x4aa8ff],NRG=[0xc04bff,0xff3a8a,0xffffff],HITC=[0xffffff,0xffe28a];
const PARTS=[];let PI_=0;
function initParticles(){
  const tex=canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.4,'rgba(255,255,255,.6)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h);});
  for(let i=0;i<500;i++){
    const m=new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false});
    const s=new THREE.Sprite(m);s.visible=false;scene.add(s);
    PARTS.push({s,v:new THREE.Vector3(),life:0,max:1,size:1,g:0,drag:0,alive:false});
  }
}
function emit(x,y,z,n,o){
  for(let i=0;i<n;i++){
    const p=PARTS[PI_=(PI_+1)%PARTS.length],sp=o.sp||3;
    p.life=0;p.max=(o.life||.6)*rnd(.7,1.3);p.size=(o.size||.6)*rnd(.7,1.3);p.g=o.g||0;p.drag=o.drag||0;
    p.s.position.set(x,y,z);
    p.v.set((Math.random()-.5)*2*sp+(o.vx||0),(Math.random()-.5)*2*sp+(o.up||0),(Math.random()-.5)*2*sp+(o.vz||0));
    p.s.material.color.setHex(o.c[(Math.random()*o.c.length)|0]);
    p.s.visible=true;p.alive=true;
  }
}
function updateParts(dt){
  for(const p of PARTS){
    if(!p.alive)continue;
    p.life+=dt;const k=p.life/p.max;
    if(k>=1){p.alive=false;p.s.visible=false;continue;}
    p.v.y-=p.g*dt;p.v.multiplyScalar(Math.max(0,1-p.drag*dt));
    p.s.position.addScaledVector(p.v,dt);
    const s=p.size*(1-k*.5);p.s.scale.set(s,s,1);p.s.material.opacity=1-k*k;
  }
}

/* =====================================================================
   TIMED EFFECTS & PROJECTILES
===================================================================== */
const FX=[],PROJ=[];
function disposeObj(o){scene.remove(o);o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});}
function addFx(o,life,upd){scene.add(o);FX.push({o,life,t:0,upd});}
function updateFx(dt){
  for(let i=FX.length-1;i>=0;i--){
    const e=FX[i];e.t+=dt;const k=Math.min(1,e.t/e.life);
    e.upd&&e.upd(e.o,k);
    if(e.t>=e.life){disposeObj(e.o);FX.splice(i,1);}
  }
}
function ringFx(x,z,r,color,life){
  const g=new THREE.RingGeometry(.85,1,48);g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  m.position.set(x,.12,z);
  addFx(m,life,(o,k)=>{const s=.3+r*(1-Math.pow(1-k,3));o.scale.set(s,1,s);o.material.opacity=1-k;});
}

/* =====================================================================
   FIGHTERS
===================================================================== */
const CD={punch:1.5,s1:5,s2:10,s3:15};
const WIND={punch:.22,s1:.3,s2:.45,s3:.95};
let player=null,enemy=null;

function buildFighter(cloth,accent,hair){
  const g=new THREE.Group(),mats=[];
  const std=c=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.75,metalness:.05});mats.push(m);return m;};
  const skin=std(0xf1cfae),cl=std(cloth),hr=std(hair),dk=std(0x16121c);
  const add=(geo,mat,x,y,z,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(par||g).add(m);return m;};
  add(new THREE.CylinderGeometry(.44,.52,1.15,10),cl,0,1.35,0);
  add(new THREE.CylinderGeometry(.2,.19,.9,8),dk,-.2,.45,0);
  add(new THREE.CylinderGeometry(.2,.19,.9,8),dk,.2,.45,0);
  add(new THREE.CylinderGeometry(.54,.54,.14,10),new THREE.MeshBasicMaterial({color:accent}),0,.88,0);
  add(new THREE.SphereGeometry(.3,14,12),skin,0,2.2,0);
  add(new THREE.SphereGeometry(.33,12,10,0,Math.PI*2,0,Math.PI*.55),hr,0,2.26,-.03);
  for(let i=0;i<6;i++){const a=i/6*6.283,c=add(new THREE.ConeGeometry(.1,.4,5),hr,Math.cos(a)*.2,2.5,Math.sin(a)*.2-.05);c.rotation.set(Math.sin(a)*.6,0,-Math.cos(a)*.6);}
  const eyeM=new THREE.MeshBasicMaterial({color:accent});
  add(new THREE.BoxGeometry(.09,.05,.04),eyeM,-.11,2.22,.28);add(new THREE.BoxGeometry(.09,.05,.04),eyeM,.11,2.22,.28);
  const arm=x=>{const p=new THREE.Group();p.position.set(x,1.8,0);add(new THREE.CylinderGeometry(.13,.12,.8,8),cl,0,-.4,0,p);add(new THREE.SphereGeometry(.15,8,8),skin,0,-.88,0,p);g.add(p);return p;};
  const armL=arm(-.6),armR=arm(.6);
  const aura=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.8,18,1,true),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  aura.position.y=1.3;g.add(aura);
  g.rotation.order='YXZ';
  g.userData={armL,armR,mats,aura};
  return g;
}

class Fighter{
  constructor(name,isPlayer,cloth,accent,hair){
    this.name=name;this.isPlayer=isPlayer;this.accent=accent;
    this.model=buildFighter(cloth,accent,hair);scene.add(this.model);
    this.pos=new THREE.Vector3();this.vel=new THREE.Vector3();this.face=new THREE.Vector3(0,0,1);
    this.max=100;this.hp=100;this.cd={punch:0,s1:0,s2:0,s3:0};
    this.cast=null;this.stun=0;this.slow=0;this.flash=0;this.dead=false;this.rec=0;this.lastA=null;this.t=0;this.opp=null;this.ai=null;this.lastW=-1;
    const sh=new THREE.Mesh(new THREE.CircleGeometry(.95,20),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.5,depthWrite:false}));
    sh.rotation.x=-Math.PI/2;sh.position.y=.04;scene.add(sh);this.shadow=sh;
    const bg=new THREE.PlaneGeometry(3.4,34);bg.rotateX(-Math.PI/2);bg.translate(0,0,17);
    this.teleB=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:0xff2e55,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));
    this.teleB.position.y=.08;this.teleB.visible=false;scene.add(this.teleB);
    const ng=new THREE.CircleGeometry(6.2,40);ng.rotateX(-Math.PI/2);
    this.teleN=new THREE.Mesh(ng,new THREE.MeshBasicMaterial({color:0x8fe3ff,transparent:true,opacity:.2,depthWrite:false}));
    this.teleN.position.y=.08;this.teleN.visible=false;scene.add(this.teleN);
  }
}
function newAI(){return {timer:0,think:.6,mode:'chase',dir:1,dodgeT:0,dodgeV:new THREE.Vector3()};}
function resetFighter(f,x,z){
  f.pos.set(x,0,z);f.vel.set(0,0,0);f.hp=f.max;f.cd={punch:0,s1:0,s2:0,s3:0};f.cast=null;f.stun=0;f.slow=0;f.flash=0;f.dead=false;f.rec=0;f.t=0;f.lastW=-1;
  f.model.rotation.x=0;f.teleB.visible=false;f.teleN.visible=false;f.ai=newAI();
}

/* =====================================================================
   COMBAT
===================================================================== */
function tryAct(f,a){
  if(G.state!=='fight'||f.dead||f.cast||f.stun>0||f.cd[a]>0)return false;
  f.cd[a]=CD[a];
  f.cast={a,t:0,dur:WIND[a],dir:f.face.clone(),seen:false};
  return true;
}
function floatText(f,dmg,kind){
  const v=new THREE.Vector3(f.pos.x,2.8,f.pos.z).project(camera);
  const d=document.createElement('div');d.className='dmg';d.textContent=dmg;
  d.style.color={punch:'#fff',fire:'#ff9a3a',ice:'#8fe3ff',s3:'#e08aff'}[kind]||'#fff';
  d.style.left=((v.x*.5+.5)*window.innerWidth)+'px';d.style.top=((-v.y*.5+.5)*window.innerHeight)+'px';
  $('#game').appendChild(d);setTimeout(()=>d.remove(),950);
}
function hit(t,dmg,dir,kb,kind,src){
  if(t.dead||G.state!=='fight')return;
  dmg=Math.round(dmg);t.hp=Math.max(0,t.hp-dmg);t.flash=1;
  t.stun=kind==='punch'?.28:kind==='s3'?.6:.35;t.cast=null;
  t.vel.x+=dir.x*kb;t.vel.z+=dir.z*kb;
  const y=1.4;
  if(kind==='punch')emit(t.pos.x,y,t.pos.z,16,{c:HITC,sp:5,life:.3,size:.55});
  else if(kind==='fire')emit(t.pos.x,y,t.pos.z,34,{c:FIRE,sp:4,up:2,life:.6,size:.9,g:-2});
  else if(kind==='ice')emit(t.pos.x,y,t.pos.z,34,{c:ICE,sp:4,life:.7,size:.7,g:4});
  else emit(t.pos.x,y,t.pos.z,60,{c:NRG,sp:8,life:.8,size:1.1});
  floatText(t,dmg,kind);
  shake(kind==='punch'?.15:.3);
  if(t.hp<=0)endRound(src,'ko');
}
function shake(v){G.shake=Math.max(G.shake,v);}
function screenFlash(){const f=$('#flash');f.style.transition='none';f.style.opacity=.85;requestAnimationFrame(()=>requestAnimationFrame(()=>{f.style.transition='opacity .7s';f.style.opacity=0;}));}
function flatDir(a,b){const d=new THREE.Vector3(b.x-a.x,0,b.z-a.z);if(d.lengthSq()<1e-6)d.set(0,0,1);return d.normalize();}

function fire(f){
  const o=f.opp,c=f.cast,a=c.a;
  f.rec=.35;f.lastA=a;
  if(a==='punch'){
    f.vel.addScaledVector(f.face,4);
    emit(f.pos.x+f.face.x*1.4,1.5,f.pos.z+f.face.z*1.4,8,{c:HITC,sp:2,life:.25,size:.5});
    const d=flatDir(f.pos,o.pos),dist=Math.hypot(o.pos.x-f.pos.x,o.pos.z-f.pos.z);
    if(dist<2.6)hit(o,8+((Math.random()*3)|0),d,7,'punch',f);
  }else if(a==='s1'){
    spawnFire(f);
  }else if(a==='s2'){
    const x=f.pos.x,z=f.pos.z;
    ringFx(x,z,6.4,0x8fe3ff,.5);ringFx(x,z,4,0xffffff,.35);
    for(let i=0;i<12;i++){
      const an=Math.random()*6.283,r=rnd(1.5,5.6);
      const g=new THREE.ConeGeometry(.3,1.7,5);g.translate(0,.85,0);
      const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xaee8ff,transparent:true,opacity:.9}));
      m.position.set(x+Math.cos(an)*r,0,z+Math.sin(an)*r);m.rotation.set(rnd(-.2,.2),0,rnd(-.2,.2));
      addFx(m,1,(ob,k)=>{const s=k<.2?k/.2:1;ob.scale.set(1,s*rnd(.9,1.1),1);ob.material.opacity=k>.6?.9*(1-(k-.6)/.4):.9;});
    }
    emit(x,.6,z,70,{c:ICE,sp:9,life:.7,size:.8,g:3});
    shake(.3);
    if(Math.hypot(o.pos.x-x,o.pos.z-z)<6.2){hit(o,18,flatDir(f.pos,o.pos),9,'ice',f);if(!o.dead)o.slow=2.5;}
  }else if(a==='s3'){
    const d=c.dir,L=36;
    const origin=new THREE.Vector3(f.pos.x,1.6,f.pos.z).addScaledVector(d,1);
    const grp=new THREE.Group();
    const mk=(r,col,op)=>new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,16,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    grp.add(mk(1.3,0xb23cff,.7),mk(.6,0xffffff,1));
    grp.position.copy(origin).addScaledVector(d,L/2);
    grp.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);
    addFx(grp,.8,(ob,k)=>{const s=(1-k)*(1+Math.sin(k*40)*.12);ob.scale.set(s,1,s);ob.children[0].material.opacity=.7*(1-k);ob.children[1].material.opacity=1-k;});
    for(let i=0;i<90;i++){const t=Math.random()*L;emit(origin.x+d.x*t,1.6,origin.z+d.z*t,1,{c:NRG,sp:1.2,life:.6,size:1});}
    emit(origin.x,1.6,origin.z,40,{c:NRG,sp:6,life:.5,size:1.2});
    shake(1);screenFlash();
    const rx=o.pos.x-f.pos.x,rz=o.pos.z-f.pos.z,along=rx*d.x+rz*d.z;
    const perp=Math.hypot(rx-d.x*along,rz-d.z*along);
    if(along>0&&along<L&&perp<1.7)hit(o,40,d,14,'s3',f);
  }
  f.cast=null;
}
function spawnFire(f){
  const d=f.face.clone(),m=new THREE.Group();
  m.add(new THREE.Mesh(new THREE.SphereGeometry(.38,12,10),new THREE.MeshBasicMaterial({color:0xffe08a})));
  m.add(new THREE.Mesh(new THREE.SphereGeometry(.7,12,10),new THREE.MeshBasicMaterial({color:0xff5a1a,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false})));
  m.position.set(f.pos.x+d.x*1.2,1.5,f.pos.z+d.z*1.2);scene.add(m);
  PROJ.push({m,d,owner:f,t:0,seen:false});
}
function updateProj(dt){
  for(let i=PROJ.length-1;i>=0;i--){
    const p=PROJ[i],t=p.owner.opp;p.t+=dt;
    p.m.position.addScaledVector(p.d,20*dt);
    const s=1+Math.sin(p.t*30)*.12;p.m.scale.set(s,s,s);
    emit(p.m.position.x,1.5,p.m.position.z,2,{c:FIRE,sp:.8,life:.45,size:.8,g:-2});
    let dead=false;
    if(!t.dead&&Math.hypot(t.pos.x-p.m.position.x,t.pos.z-p.m.position.z)<1){
      emit(p.m.position.x,1.5,p.m.position.z,40,{c:FIRE,sp:6,life:.6,size:1,g:-1});
      hit(t,14,p.d,8,'fire',p.owner);dead=true;
    }
    if(p.t>3||Math.hypot(p.m.position.x,p.m.position.z)>24)dead=true;
    if(dead){disposeObj(p.m);PROJ.splice(i,1);}
  }
}

/* =====================================================================
   AI
===================================================================== */
function aiCtl(f,dt){
  const o=f.opp,ai=f.ai;
  const fwd=flatDir(f.pos,o.pos),side=new THREE.Vector3(-fwd.z,0,fwd.x);
  const d=Math.hypot(o.pos.x-f.pos.x,o.pos.z-f.pos.z);
  ai.timer-=dt;ai.think-=dt;
  if(o.cast&&o.cast.a==='s3'&&!o.cast.seen){
    o.cast.seen=true;
    if(Math.random()<.65){const dir=o.cast.dir,perp=new THREE.Vector3(-dir.z,0,dir.x);const sg=Math.sign((f.pos.x-o.pos.x)*perp.x+(f.pos.z-o.pos.z)*perp.z)||1;ai.dodgeT=.9;ai.dodgeV.copy(perp).multiplyScalar(sg);}
  }
  for(const p of PROJ){
    if(p.owner!==o||p.seen)continue;
    if(Math.hypot(p.m.position.x-f.pos.x,p.m.position.z-f.pos.z)<10){
      p.seen=true;
      if(Math.random()<.5){const perp=new THREE.Vector3(-p.d.z,0,p.d.x);const sg=Math.sign((f.pos.x-p.m.position.x)*perp.x+(f.pos.z-p.m.position.z)*perp.z)||1;ai.dodgeT=.55;ai.dodgeV.copy(perp).multiplyScalar(sg);}
    }
  }
  let mx=0,mz=0;
  if(ai.dodgeT>0){ai.dodgeT-=dt;mx=ai.dodgeV.x;mz=ai.dodgeV.z;}
  else{
    if(ai.timer<=0){
      const r=Math.random();
      if(d>8)ai.mode=r<.7?'chase':'strafe';
      else if(d>3.2)ai.mode=r<.4?'chase':r<.8?'strafe':'retreat';
      else ai.mode=r<.45?'strafe':r<.75?'retreat':'chase';
      ai.timer=rnd(.5,1.5);ai.dir=Math.random()<.5?-1:1;
    }
    if(ai.mode==='chase'){if(d>2){mx=fwd.x;mz=fwd.z;}}
    else if(ai.mode==='retreat'){mx=-fwd.x;mz=-fwd.z;}
    else{const k=d>5?.4:d<3.5?-.35:0;mx=side.x*ai.dir+fwd.x*k;mz=side.z*ai.dir+fwd.z*k;}
  }
  const rr=Math.hypot(f.pos.x,f.pos.z);
  if(rr>12){mx-=f.pos.x/rr*1.3;mz-=f.pos.z/rr*1.3;}
  if(ai.think<=0&&!f.cast&&f.stun<=0&&G.state==='fight'){
    ai.think=rnd(.18,.4);const r=Math.random(),rdy=k=>f.cd[k]<=0;
    if(rdy('s3')&&d>3&&d<20&&ai.dodgeT<=0&&r<.5)tryAct(f,'s3');
    else if(rdy('s2')&&d<5.6&&r<.7)tryAct(f,'s2');
    else if(rdy('s1')&&d>3.5&&r<.65)tryAct(f,'s1');
    else if(rdy('punch')&&d<2.5&&r<.85)tryAct(f,'punch');
  }
  const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l;}
  return {wx:mx,wz:mz};
}

/* =====================================================================
   FIGHTER UPDATE
===================================================================== */
function updateFighter(f,ctl,dt){
  f.t+=dt;
  for(const k in f.cd)f.cd[k]=Math.max(0,f.cd[k]-dt);
  f.stun=Math.max(0,f.stun-dt);f.slow=Math.max(0,f.slow-dt);f.flash=Math.max(0,f.flash-dt*4);f.rec=Math.max(0,f.rec-dt);
  const o=f.opp;
  const rel=flatDir(f.pos,o.pos);f.face.copy(rel);
  if(f.cast&&!f.dead){f.cast.t+=dt;if(f.cast.t>=f.cast.dur)fire(f);}
  let m=1;
  if(f.dead||G.state!=='fight'||f.stun>0)m=0;else if(f.cast)m=f.cast.a==='s3'?0:.25;
  const sp=6.2*(f.slow>0?.5:1)*m;
  f.pos.x+=(ctl.wx*sp+f.vel.x)*dt;f.pos.z+=(ctl.wz*sp+f.vel.z)*dt;
  f.vel.multiplyScalar(Math.exp(-6*dt));
  const dd=Math.hypot(o.pos.x-f.pos.x,o.pos.z-f.pos.z);
  if(dd<1.1&&dd>1e-4){const pu=(1.1-dd)*.5;f.pos.x-=rel.x*pu;f.pos.z-=rel.z*pu;}
  const r=Math.hypot(f.pos.x,f.pos.z);if(r>ARENA_R){f.pos.x*=ARENA_R/r;f.pos.z*=ARENA_R/r;}
  const M=f.model,ud=M.userData;
  const faceDir=(f.cast&&f.cast.a==='s3')?f.cast.dir:f.face;
  const moving=Math.hypot(ctl.wx,ctl.wz)>.1&&m>0;
  M.position.set(f.pos.x,(f.dead?.2:Math.sin(f.t*3)*.04+(moving?Math.abs(Math.sin(f.t*11))*.09:0)),f.pos.z);
  M.rotation.y=Math.atan2(faceDir.x,faceDir.z);
  const tilt=f.dead?-1.45:(f.stun>0?-.35:0);
  M.rotation.x+=(tilt-M.rotation.x)*Math.min(1,dt*14);
  const ca=f.cast?f.cast.a:(f.rec>0?f.lastA:null);
  let tr,tl;
  if(ca==='punch'){tr=-1.7;tl=.3;}else if(ca==='s1'){tr=-1.5;tl=-1.5;}else if(ca==='s2'){tr=-2.9;tl=-2.9;}else if(ca==='s3'){tr=-1.57;tl=-1.57;}
  else{tr=Math.sin(f.t*2)*.12+(moving?Math.sin(f.t*11)*.5:0);tl=Math.sin(f.t*2+1.5)*.12-(moving?Math.sin(f.t*11)*.5:0);}
  const kk=Math.min(1,dt*18);
  ud.armR.rotation.x+=(tr-ud.armR.rotation.x)*kk;ud.armL.rotation.x+=(tl-ud.armL.rotation.x)*kk;
  for(const mt of ud.mats){mt.emissive.setHex(0xffffff);mt.emissiveIntensity=f.flash*.9;}
  ud.aura.material.opacity=f.cast&&f.cast.a!=='punch'?.2+.12*Math.sin(f.t*25):(f.slow>0?.12:0);
  ud.aura.material.color.setHex(f.slow>0&&!f.cast?0x8fe3ff:f.accent);
  f.shadow.position.x=f.pos.x;f.shadow.position.z=f.pos.z;
  const c=f.cast;
  f.teleB.visible=!!c&&c.a==='s3';
  if(f.teleB.visible){f.teleB.position.x=f.pos.x;f.teleB.position.z=f.pos.z;f.teleB.rotation.y=Math.atan2(c.dir.x,c.dir.z);f.teleB.material.opacity=.22+.2*Math.sin(f.t*30);}
  f.teleN.visible=!!c&&c.a==='s2';
  if(f.teleN.visible){f.teleN.position.x=f.pos.x;f.teleN.position.z=f.pos.z;f.teleN.material.opacity=.12+.12*Math.sin(f.t*30);}
  if(c&&!f.dead){
    if(c.a==='s3'){for(let i=0;i<3;i++){const a=Math.random()*6.283,rr=2.8;emit(f.pos.x+Math.cos(a)*rr,rnd(.5,2.4),f.pos.z+Math.sin(a)*rr,1,{c:NRG,sp:.2,life:.4,size:.7,vx:-Math.cos(a)*7,vz:-Math.sin(a)*7});}}
    else if(c.a==='s1')emit(f.pos.x+f.face.x*1,1.5,f.pos.z+f.face.z*1,2,{c:FIRE,sp:.8,life:.3,size:.7,g:-2});
    else if(c.a==='s2')emit(f.pos.x,.3,f.pos.z,3,{c:ICE,sp:3,life:.5,size:.6,up:2});
  }
}

/* =====================================================================
   GAME STATE / FLOW
===================================================================== */
const G={mode:'offline',state:'idle',running:false,time:99,intro:3,lastN:-1,shake:0,slowT:0,code:''};
const camBase=new THREE.Vector3(),camLook=new THREE.Vector3();
const btn={};
function initWorld(){
  if(worldBuilt)return;worldBuilt=true;
  buildWorld();initParticles();
  player=new Fighter('PLAYER',true,0x2b2f6b,0x8a3dff,0xdfe6ff);
  enemy=new Fighter('ENEMY',false,0x5a0f1f,0xff2e55,0x161616);
  player.opp=enemy;enemy.opp=player;
  for(const a of['punch','s1','s2','s3']){const el=$(`.act[data-a="${a}"]`);btn[a]={el,cd:el.querySelector('.cd'),cdt:el.querySelector('.cdt')};}
}
function banner(t){const b=$('#banner');b.textContent=t;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');}
function resetMatch(){
  for(const p of PROJ)disposeObj(p.m);PROJ.length=0;
  for(const e of FX)disposeObj(e.o);FX.length=0;
  for(const p of PARTS){p.alive=false;p.s.visible=false;}
  resetFighter(player,0,8);resetFighter(enemy,0,-8);
  enemy.cd.s3=6;enemy.cd.s2=3;
  G.state='intro';G.intro=3;G.lastN=-1;G.time=99;G.shake=0;G.slowT=0;
  $('#result').classList.remove('on');$('#timer').classList.remove('low');
  camBase.set(0,5,15);camLook.set(0,1.3,0);
}
function startMatch(mode,o={}){
  initWorld();G.mode=mode;G.code=o.code||'';
  $('#p-name').textContent=(o.me||'PLAYER').toUpperCase();
  $('#e-name').textContent=(o.opp||'CURSE LORD').toUpperCase();
  $('#netinfo').textContent=mode==='online'?'ONLINE · ROOM '+o.code+' · '+(30+(Math.random()*40|0))+'ms':'';
  show('game');resize();resetMatch();G.running=true;
}
function leaveMatch(){
  G.running=false;G.state='idle';$('#result').classList.remove('on');
  if(G.mode==='online'&&sock){sock.emit('leave_room');lobbyHome();show('lobby');}
  else show('menu');
}
function endRound(win,reason){
  if(G.state==='over')return;
  G.state='over';G.slowT=1.3;
  if(win&&win.opp.hp<=0)win.opp.dead=true;
  banner(reason==='time'?'TIME!':'K.O.');
  const txt=!win?'DRAW':win===player?'VICTORY':'DEFEAT';
  setTimeout(()=>{if(G.state!=='over')return;$('#res-title').textContent=txt;$('#res-title').style.color=txt==='VICTORY'?'#ffd54a':txt==='DEFEAT'?'#ff2e55':'#fff';$('#result').classList.add('on');},1800);
}
$('#btn-rematch').onclick=resetMatch;
$('#btn-exit2').onclick=leaveMatch;
$('#exit').onclick=leaveMatch;

/* =====================================================================
   INPUT
===================================================================== */
const keys={},input={jx:0,jy:0};
const KM={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',ArrowLeft:'a',KeyD:'d',ArrowRight:'d'};
const KA={KeyJ:'punch',Space:'punch',KeyK:'s1',KeyL:'s2',KeyU:'s3'};
const flashBtn=a=>{const e=btn[a]&&btn[a].el;if(e){e.classList.add('down');setTimeout(()=>e.classList.remove('down'),90);}};
window.addEventListener('keydown',e=>{
  if(!$('#game').classList.contains('active'))return;
  if(KM[e.code]||KA[e.code])e.preventDefault();
  if(KM[e.code])keys[KM[e.code]]=true;
  if(KA[e.code]&&!e.repeat&&player){tryAct(player,KA[e.code]);flashBtn(KA[e.code]);}
});
window.addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
$$('.act').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('down');if(player)tryAct(player,b.dataset.a);});
  const up=()=>b.classList.remove('down');
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
const jz=$('#joy-zone'),jb=$('#joy-base'),jk=$('#joy-knob');let jid=null,jc={x:0,y:0};const JR=52;
function placeBase(x,y){jb.style.left=x+'px';jb.style.top=y+'px';}
function homeJoy(){const r=jz.getBoundingClientRect();if(r.width)placeBase(Math.min(100,r.width/2),r.height-100);}
function joyMove(e){
  let dx=e.clientX-jc.x,dy=e.clientY-jc.y;const l=Math.hypot(dx,dy);
  if(l>JR){dx*=JR/l;dy*=JR/l;}
  jk.style.transform=`translate(${dx}px,${dy}px)`;
  let jx=dx/JR,jy=dy/JR;if(Math.hypot(jx,jy)<.15){jx=0;jy=0;}
  input.jx=jx;input.jy=jy;
}
function joyEnd(){jid=null;input.jx=input.jy=0;jk.style.transform='';jb.classList.remove('on');
