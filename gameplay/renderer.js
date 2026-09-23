/* Artwork prepared for this event; the original atlas remains in gameplay/art. */
(() => {
  'use strict';
  const CUTS={santa:[3,321,314,127],duck:[321,345,318,104],buoy:[10,459,80,166],sailboat:[92,450,132,178],gull:[199,475,105,120],ferry:[266,505,181,118],flower:[435,503,102,119],gold:[537,503,103,119]};
  /* One articulated paddle, cut from the existing illustration. The two arm
     textures share its grip points; the complete baked-in standing sprite is
     never composited underneath the animated rig. */
  class SinglePaddleRig {
    constructor(sprite) {
      this.width=sprite.width; this.height=sprite.height;
      this.top=[199,35]; this.bottom=[212,73];
      this.nearShoulder=[157,49]; this.farShoulder=[166,65];
      this.gripSpan=Math.hypot(this.bottom[0]-this.top[0],this.bottom[1]-this.top[1]);
      const near=[[155,42],[168,44],[182,39],[190,34],[192,29],[198,27],[203,28],[207,31],[208,38],[204,42],[199,45],[192,50],[182,57],[170,62],[153,61]];
      const far=[[163,59],[176,61],[193,66],[204,69],[210,67],[215,69],[218,73],[218,77],[214,80],[207,77],[199,77],[183,76],[166,72],[160,68]];
      const paddle=[[195,38],[205,36],[219,76],[231,88],[243,109],[242,123],[220,124],[209,113],[208,84],[204,66]];
      const blade=[[212,78],[218,81],[225,92],[237,109],[238,117],[232,122],[224,121],[218,115],[214,101]];
      this.near=this.mask(sprite,[near]);
      this.far=this.mask(sprite,[far]);
      this.base=this.surface(); const b=this.base.getContext('2d'); b.drawImage(sprite,0,0);
      b.globalCompositeOperation='destination-out';
      for(const shape of [near,far,paddle]) { this.path(b,shape); b.fill(); b.lineWidth=1.2; b.stroke(); }
      this.path(b,[[169,44],[211,25],[221,66],[244,94],[205,94],[195,77],[163,76],[166,61]]);b.fill();
      b.globalCompositeOperation='source-over';
      // Restore the hull where the original blade occluded it, using adjacent
      // painted hull pixels. Outside the hull the erased paddle remains clear.
      const original=sprite.getContext('2d').getImageData(0,0,this.width,this.height);
      const repaired=b.getImageData(0,0,this.width,this.height);
      const sample=(x,y,ch)=>{const lo=Math.max(0,Math.min(this.height-1,Math.floor(y))),hi=Math.min(this.height-1,lo+1),f=y-Math.floor(y);return original.data[(lo*this.width+x)*4+ch]*(1-f)+original.data[(hi*this.width+x)*4+ch]*f;};
      for(let y=89;y<124;y++) for(let x=205;x<244;x++) {
        const k=(y*this.width+x)*4,t=(x-203)/42;
        const top=92-1.5*t,bottom=112.5-t,f=(y-top)/(bottom-top);
        const leftY=92+f*20.5,rightY=90.5+f*21;
        for(let ch=0;ch<4;ch++)repaired.data[k+ch]=Math.round(sample(203,leftY,ch)*(1-t)+sample(245,rightY,ch)*t);
      }
      b.putImageData(repaired,0,0);
      this.paddle=this.surface();const p=this.paddle.getContext('2d');
      p.lineCap='round';p.strokeStyle='#74562E';p.lineWidth=4.6;
      p.beginPath();p.moveTo(...this.top);p.lineTo(216,84);p.stroke();
      p.strokeStyle='#D3AE69';p.lineWidth=2.6;p.stroke();
      p.drawImage(this.mask(sprite,[blade]),0,0);
      this.lastPose=null;
    }
    surface(){const c=document.createElement('canvas');c.width=this.width;c.height=this.height;return c;}
    path(c,points){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();}
    mask(source,shapes){const c=this.surface(),x=c.getContext('2d');for(const s of shapes){this.path(x,s);x.fill();x.lineWidth=1;x.stroke();}x.globalCompositeOperation='source-in';x.drawImage(source,0,0);return c;}
    // Map both endpoints exactly, while preserving the arm's painted thickness.
    transform(srcA,srcB,dstA,dstB){
      const sx=srcB[0]-srcA[0],sy=srcB[1]-srcA[1],sl=Math.hypot(sx,sy);
      const dx=dstB[0]-dstA[0],dy=dstB[1]-dstA[1],dl=Math.hypot(dx,dy);
      const ux=sx/sl,uy=sy/sl,vx=dx/dl,vy=dy/dl,r=dl/sl;
      const a=r*vx*ux+vy*uy,b=r*vy*ux-vx*uy,c=r*vx*uy-vy*ux,d=r*vy*uy+vx*ux;
      return [a,b,c,d,dstA[0]-a*srcA[0]-c*srcA[1],dstA[1]-b*srcA[0]-d*srcA[1]];
    }
    pose(time,grounded=true,reduced=false){
      const phase=((time*5.4)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
      let angle,top,immersed=false;
      if(!grounded){angle=.86;top=[201,32];}
      else if(reduced){angle=1.24;top=[199,35];}
      else {
        angle=1.29-.23*Math.cos(phase);
        const lift=phase>Math.PI?12*Math.sin(phase-Math.PI):0;
        top=[201+5*Math.cos(phase),120-lift-88*Math.sin(angle)];
        immersed=phase<Math.PI;
      }
      const unit=[Math.cos(angle),Math.sin(angle)];
      const bottom=[top[0]+unit[0]*this.gripSpan,top[1]+unit[1]*this.gripSpan];
      const tip=[top[0]+unit[0]*88,top[1]+unit[1]*88];
      return {top,bottom,tip,immersed,phase,
        paddle:this.transform(this.top,this.bottom,top,bottom),
        near:this.transform(this.nearShoulder,this.top,this.nearShoulder,top),
        far:this.transform(this.farShoulder,this.bottom,this.farShoulder,bottom)};
    }
    layer(ctx,image,matrix){ctx.save();ctx.transform(...matrix);ctx.drawImage(image,0,0);ctx.restore();}
    draw(ctx,time,grounded,reduced){
      const p=this.pose(time,grounded,reduced);
      ctx.drawImage(this.base,0,0);
      // Exactly one paddle; both textured hands are composited over its shaft.
      this.layer(ctx,this.paddle,p.paddle);
      this.layer(ctx,this.far,p.far);
      this.layer(ctx,this.near,p.near);
      this.lastPose=p;return p;
    }
  }
  class Renderer{
    constructor(canvas,engine,reduced){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.eng=engine;this.reduced=reduced;this.ready=false;this.sprites={};this.splashes=[];this.lastTime=0;this.result=null;this.atlas=new Image();this.atlas.onload=()=>{try{for(const [key,cut]of Object.entries(CUTS))this.sprites[key]=this.cut(cut);this.ready=true;this.draw();}catch(error){console.warn('Harbour art preparation failed',error.name);}};this.atlas.onerror=()=>{console.warn('Harbour artwork unavailable');};this.atlas.src='/gameplay/art/atlas.webp';}
    cut(rect){const c=document.createElement('canvas');c.width=rect[2];c.height=rect[3];const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(this.atlas,...rect,0,0,c.width,c.height);const image=x.getImageData(0,0,c.width,c.height),data=image.data,n=c.width*c.height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;const add=i=>{if(i<0||i>=n||seen[i])return;const j=i*4,m=Math.min(data[j],data[j+1],data[j+2]),M=Math.max(data[j],data[j+1],data[j+2]);if(m>243||(m>224&&M-m<17)){seen[i]=1;queue[tail++]=i;}};for(let a=0;a<c.width;a++){add(a);add(n-c.width+a);}for(let y=0;y<c.height;y++){add(y*c.width);add((y+1)*c.width-1);}while(head<tail){const i=queue[head++];data[i*4+3]=0;if(i%c.width)add(i-1);if(i%c.width<c.width-1)add(i+1);add(i-c.width);add(i+c.width);}x.putImageData(image,0,0);return c;}
    palette(){const t=this.eng.time,phase=(t%64)/16,i=Math.floor(phase),f=(1-Math.cos((phase-i)*Math.PI))/2;const p=[['#C3E8F6','#EEF8F6','#36A3B9'],['#F3B38B','#FFE0B3','#4897A8'],['#142C49','#365475','#174D69'],['#BDCFE4','#F4E7E5','#5A9DB3']];const a=p[i],b=p[(i+1)%4];return{top:this.mix(a[0],b[0],f),horizon:this.mix(a[1],b[1],f),water:this.mix(a[2],b[2],f),night:this.reduced?0:Math.max(0,Math.sin(Math.PI*phase/2-Math.PI/2)),label:this.reduced?'Day':['Day → sunset','Sunset → night','Night → dawn','Dawn → day'][i]};}
    mix(a,b,t){const rgb=s=>s.match(/\w\w/g).map(x=>parseInt(x,16)),x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
    burst(kind,x,y){if(this.reduced)return;for(let i=0;i<(kind==='gold'?20:kind==='splash'?12:9);i++)this.splashes.push({x,y,vx:(Math.random()-.5)*110,vy:-35-Math.random()*75,born:this.eng.time,life:.55+Math.random()*.4,kind});}
    draw(){const e=this.eng,ctx=this.ctx,W=e.width,H=320,p=this.palette();ctx.setTransform(this.canvas.width/W,0,0,this.canvas.height/H,0,0);ctx.clearRect(0,0,W,H);const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,p.top);gradient.addColorStop(.57,p.horizon);gradient.addColorStop(1,p.water);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
      if(this.ready)this.landscape(p);else this.fallback(p);
      this.ocean(p);
      for(const f of e.ferries){if(this.ready){ctx.save();ctx.globalAlpha=.8;ctx.drawImage(this.sprites.ferry,f.x,159,123,68);ctx.restore();}}
      for(const r of e.rewards)if(!r.collected)this.reward(r);
      for(const o of e.obstacles)this.hazard(o,p);
      this.santa(p);this.particles();
      if(e.state!=='running')this.overlay();
      const phase=document.getElementById('runnerSkyPhase');if(phase)phase.textContent=p.label;
      const label=document.getElementById('runnerLandmark');if(label)label.textContent=['Sky Tower · Waitematā','Harbour Bridge · Devonport','Rangitoto · Hauraki Gulf'][Math.floor(e.world*.055/380)%3];
    }
    landscape(p){const ctx=this.ctx,W=this.eng.width;const shift=this.reduced?0:this.eng.world*.045,span=1200,offset=shift%span;ctx.save();ctx.fillStyle='#B1DCE9';ctx.fillRect(0,0,W,185);
      // Use a textured scenic strip; mirrored edges avoid a hard skyline seam.
      for(let k=-1;k<3;k++){const x=k*span-offset;ctx.save();if((Math.floor(shift/span)+k)%2){ctx.translate(x+span,0);ctx.scale(-1,1);ctx.drawImage(this.atlas,0,0,640,185,0,0,span,185);}else ctx.drawImage(this.atlas,0,0,640,185,x,0,span,185);ctx.restore();}
      if(p.night>0){ctx.fillStyle='rgba(12,28,58,'+(p.night*.72)+')';ctx.fillRect(0,0,W,187);ctx.globalAlpha=p.night;ctx.fillStyle='#FFF0C9';for(let i=0;i<27;i++){ctx.beginPath();ctx.arc((i*113+45)%W,16+(i*31)%104,.8+(i%3)*.25,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(W-94,48,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#203B5C';ctx.beginPath();ctx.arc(W-88,44,13,0,Math.PI*2);ctx.fill();}
      else if(!this.reduced){const sunset=Math.max(0,Math.sin(this.eng.time*Math.PI/32));ctx.fillStyle='rgba(251,181,115,'+(sunset*.15)+')';ctx.fillRect(0,0,W,187);}ctx.restore();}
    fallback(p){const c=this.ctx,W=this.eng.width;c.fillStyle='#527B83';c.beginPath();c.moveTo(0,187);c.bezierCurveTo(W*.3,180,W*.52,126,W*.65,173);c.lineTo(W,187);c.fill();c.strokeStyle='#456C77';c.lineWidth=3;c.beginPath();c.moveTo(85,183);c.lineTo(85,68);c.stroke();c.beginPath();c.ellipse(85,108,10,4,0,0,7);c.fill();}
    ocean(p){const c=this.ctx,e=this.eng,W=e.width,t=e.time,horizon=180;const base=c.createLinearGradient(0,horizon,0,320);base.addColorStop(0,this.mix(p.water,'#C5E8E9',.22));base.addColorStop(.6,p.water);base.addColorStop(1,this.mix(p.water,'#164A61',.30));c.fillStyle=base;c.fillRect(0,horizon,W,140);
      if(this.ready){c.save();for(let y=horizon;y<320;y+=3){const depth=(y-horizon)/140;const sy=187+((depth*111+t*(this.reduced?0:3.3))%122);const tile=860+depth*540;const offset=(e.world*(.07+depth*.23)+Math.sin(t*1.1+depth*9)*4)%tile;const bob=this.reduced?0:Math.sin(depth*11+t*1.7)*(depth*1.4);c.globalAlpha=.57+depth*.12;for(let x=-offset;x<W;x+=tile)c.drawImage(this.atlas,0,sy,640,3,x,y+bob,tile,4.5);}c.restore();}
      c.save();c.globalAlpha=p.night*.57;c.fillStyle='#122D4C';c.fillRect(0,horizon,W,140);c.restore();
      // Broken travelling highlights and translucent swells, not a row of repeating symbols.
      for(let row=0;row<5;row++){const y=193+row*27,amp=1+row*.52,k=.018-row*.001;const phase=e.world*(.025+row*.025)+t*17;const g=c.createLinearGradient(0,y-4,0,y+12);g.addColorStop(0,'rgba(225,249,250,.05)');g.addColorStop(.3,'rgba(210,241,240,'+(p.night>.4?.08:.13)+')');g.addColorStop(1,'rgba(25,80,110,0)');c.beginPath();for(let x=-12;x<W+12;x+=12){const yy=y+Math.sin((x+phase)*k)*amp+Math.sin(x*.008+t)*amp*.45;if(x<0)c.moveTo(x,yy);else c.lineTo(x,yy);}c.lineTo(W+12,y+18);c.lineTo(-12,y+18);c.closePath();c.fillStyle=g;c.fill();}
      c.save();c.strokeStyle=p.night>.4?'rgba(191,223,231,.2)':'rgba(246,255,255,.38)';c.lineWidth=.7;for(let i=0;i<27;i++){const depth=(i%6)/5,x=((i*197-e.world*(.06+depth*.3))%(W+80)+W+80)%(W+80)-40,y=188+depth*119+Math.sin(t+i)*2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+7+depth*6,y-1,x+18+depth*18,y+.5);c.stroke();}c.restore();}
    santa(){
      const c=this.ctx,e=this.eng,p=e.player,water=254;
      const bob=p.grounded&&!this.reduced?Math.sin(e.time*5.4)*1.1:0;
      const cx=176,by=water+p.jumpY+bob;
      c.save();c.globalAlpha=p.grounded?.26:.1;c.fillStyle='#164D65';c.beginPath();c.ellipse(cx,258,49,4,0,0,Math.PI*2);c.fill();c.restore();
      if(p.grounded){c.save();c.strokeStyle='rgba(238,254,250,.65)';c.lineWidth=1.3;for(let k=0;k<4;k++){const x=130-k*16,y=255+k*.7;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-14,y-3-Math.sin(e.time*6+k),x-26,y+1);c.stroke();}c.restore();}
      const angle=p.grounded?(this.reduced?0:Math.sin(e.time*5.4)*.014):Math.max(-.10,Math.min(.10,p.vy*.00014));
      c.save();c.translate(cx,by);c.rotate(angle);
      let pose=null;
      if(this.ready){
        if(p.duck){
          // The crouching illustration already has one paddle held across the lap.
          c.drawImage(this.sprites.duck,-64,-40,132,42);
        }else{
          if(!this.rowingRig)this.rowingRig=new SinglePaddleRig(this.sprites.santa);
          c.save();c.translate(-64,-60);c.scale(132/314,62/127);
          pose=this.rowingRig.draw(c,e.time,p.grounded,this.reduced);c.restore();
        }
      }else{
        c.fillStyle='#BD4234';c.beginPath();c.ellipse(0,-7,48,8,0,0,Math.PI*2);c.fill();
        c.fillStyle='#FFF5E5';c.font='28px Georgia';c.fillText('🎅',-14,-14);
      }
      c.restore();
      // Water contact uses the same blade tip as the hand rig, not a second prop.
      if(pose&&pose.immersed&&p.grounded&&!p.duck&&!this.reduced){
        const lx=-64+pose.tip[0]*132/314,ly=-60+pose.tip[1]*62/127;
        const x=cx+lx*Math.cos(angle)-ly*Math.sin(angle),y=by+lx*Math.sin(angle)+ly*Math.cos(angle);
        if(Math.abs(y-water)<8){c.save();c.strokeStyle='rgba(239,253,251,.7)';c.lineWidth=.85;
          for(let k=0;k<3;k++){c.beginPath();c.ellipse(x-2-k*4,water+1+k*.65,5+k*3,1.2+k*.25,0,.1,Math.PI*1.3);c.stroke();}
          c.restore();
        }
      }
    }
    warning(x,y,action){const c=this.ctx;c.save();c.fillStyle='#F6BC60';c.strokeStyle='#283F4E';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y-8);c.lineTo(x+8,y+7);c.lineTo(x-8,y+7);c.closePath();c.fill();c.stroke();c.fillStyle='#213745';c.font='bold 11px Arial';c.textAlign='center';c.fillText('!',x,y+4);if(this.eng.time<20){c.font='bold 10px Arial';c.strokeStyle='#F2FAF6';c.lineWidth=3;c.strokeText(action,x,y-14);c.fillText(action,x,y-14);}c.restore();}
    hazard(o,p){const c=this.ctx,y=254;c.save();if(o.type==='buoy'){if(this.ready)c.drawImage(this.sprites.buoy,o.x-3,y-50,38,52);else{c.fillStyle='#EFA435';c.fillRect(o.x,y-40,32,40);}this.warning(o.x+16,y-63,'HOP');}
      else if(o.type==='sailboat'){if(this.ready)c.drawImage(this.sprites.sailboat,o.x-3,y-68,76,70);else{c.fillStyle='#F0F6F3';c.fillRect(o.x,y-54,70,54);}this.warning(o.x+35,y-79,'HOP');}
      else if(o.type==='gull'){const flap=this.reduced?0:Math.sin(this.eng.time*9)*.07;if(this.ready){c.translate(o.x+23,y-46);c.rotate(flap);c.drawImage(this.sprites.gull,-30,-19,59,37);c.rotate(-flap);c.translate(-o.x-23,-y+46);}else{c.strokeStyle='#243E4A';c.lineWidth=3;c.beginPath();c.moveTo(o.x,y-45);c.quadraticCurveTo(o.x+11,y-60,o.x+23,y-45);c.quadraticCurveTo(o.x+35,y-59,o.x+46,y-45);c.stroke();}this.warning(o.x+23,y-81,'DUCK');}
      else {const x=o.x,g=c.createLinearGradient(x,y-24,x,y+4);g.addColorStop(0,'#B7E8E9');g.addColorStop(.5,'#256178');g.addColorStop(1,'#72B8C8');c.fillStyle=g;c.beginPath();c.moveTo(x-1,y);c.bezierCurveTo(x+9,y-3,x+14,y-26,x+30,y-20);c.bezierCurveTo(x+42,y-15,x+21,y-14,x+34,y-6);c.quadraticCurveTo(x+47,y+1,x+59,y-3);c.lineTo(x+60,y+4);c.closePath();c.fill();c.strokeStyle='#E9FDF9';c.lineWidth=1.6;c.beginPath();c.moveTo(x+8,y-7);c.bezierCurveTo(x+16,y-28,x+37,y-23,x+29,y-16);c.stroke();this.warning(x+28,y-38,'HOP');}c.restore();}
    reward(r){const c=this.ctx,y=r.y+Math.sin(r.bob)*3;c.save();const g=c.createRadialGradient(r.x,y,3,r.x,y,r.golden?28:23);g.addColorStop(0,r.golden?'rgba(255,237,167,.65)':'rgba(255,235,224,.35)');g.addColorStop(1,'rgba(255,242,189,0)');c.fillStyle=g;c.fillRect(r.x-30,y-30,60,60);if(this.ready)c.drawImage(r.golden?this.sprites.gold:this.sprites.flower,r.x-19,y-20,38,40);else{c.fillStyle=r.golden?'#FFD455':'#CE4341';c.beginPath();c.arc(r.x,y,14,0,7);c.fill();}c.fillStyle=r.golden?'#FFF3A9':'#FFFFF4';c.strokeStyle=r.golden?'#A77512':'#9E3839';c.lineWidth=2;c.textAlign='center';c.font='bold 13px Arial';c.strokeText(r.golden?'★':'+',r.x+15,y-14);c.fillText(r.golden?'★':'+',r.x+15,y-14);c.restore();}
    particles(){const c=this.ctx,t=this.eng.time;this.splashes=this.splashes.filter(p=>t-p.born>=0&&t-p.born<p.life);for(const p of this.splashes){const age=t-p.born;c.save();c.globalAlpha=1-age/p.life;c.fillStyle=p.kind==='gold'?'#FFE8A2':p.kind==='splash'?'#E0F8FE':'#F4BBAC';c.beginPath();c.arc(p.x+p.vx*age,p.y+p.vy*age+80*age*age,1.8,0,7);c.fill();c.restore();}}
    overlay(){const c=this.ctx,e=this.eng,W=e.width,ready=e.state==='ready',paused=e.state==='paused';c.save();if(!ready){c.fillStyle='rgba(12,33,55,.25)';c.fillRect(0,0,W,320);}const w=Math.min(320,W-48),x=(W-w)/2;c.fillStyle='rgba(246,253,251,.91)';c.beginPath();c.roundRect(x,85,w,96,14);c.fill();c.textAlign='center';c.fillStyle='#204559';c.font='bold 23px Georgia';c.fillText(ready?'A summer harbour escape':paused?'Take a breather':(this.result?.title||'A good day on the water'),W/2,119);c.font='13px Arial';c.fillStyle='#426C79';c.fillText(ready?'Tap Start Run when you’re ready':paused?'Your run is saved — tap Resume':'See your result below · try another run',W/2,148);c.restore();}
  }
  window.HarbourRenderer=Renderer;
})();
