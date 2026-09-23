/* Santa Harbour Dash physics. No DOM, clocks or network: identical logic is tested in Node and browsers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HarbourEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const C=Object.freeze({step:1/120,water:254,playerX:132,gravity:1550,jumpV:-620,startSpeed:312,maxSpeed:492,acceleration:2.2,grace:9.5,buffer:.12,comboWindow:6,maxSeconds:600});
  const specs=Object.freeze({buoy:{w:32,h:40},wake:{w:56,h:20},sailboat:{w:70,h:54},gull:{w:46,h:16}});
  function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function overlap(a,b,p=0){return a.x+p<b.x+b.w&&a.x+a.w-p>b.x&&a.y+p<b.y+b.h&&a.y+a.h-p>b.y;}
  class Engine{
    constructor(options={}){this.width=options.width||960;this.seed=options.seed===undefined?Math.floor(Math.random()*4294967295):options.seed;this.reset();}
    reset(seed=this.seed){this.random=rng(seed);this.state='ready';this.time=0;this.world=0;this.distance=0;this.score=0;this.speed=C.startSpeed;this.bonus=0;this.flowers=0;this.goldenFlowers=0;this.combo=0;this.maxCombo=0;this.lastFlower=-Infinity;this.player={jumpY:0,vy:0,duck:false,grounded:true};this.duckHeld=false;this.lastDuckTime=-Infinity;this.resumeDuckUntil=-1;this.jumpUntil=-1;this.accumulator=0;this.nextGroup=250;this.groupCount=0;this.groupId=0;this.lastRewardWorld=-Infinity;this.eligibleSinceGold=0;this.lastGoldTime=-Infinity;this.milestone=0;this.obstacles=[];this.rewards=[];this.ferries=[];this.events=[];this.reason='';this.result=null;}
    start(seed=this.seed){this.reset(seed);this.state='running';}
    pause(){if(this.state==='running'){this.player.duck=this.player.grounded&&(this.player.duck||this.time-this.lastDuckTime<=C.step*2);this.state='paused';this.duckHeld=false;this.jumpUntil=-1;this.accumulator=0;}}
    resume(){if(this.state==='paused'){this.resumeDuckUntil=this.player.duck?this.time+.20:-1;this.state='running';this.accumulator=0;}}
    hop(){if(this.state!=='running')return;this.jumpUntil=this.time+C.buffer;if(this.player.grounded)this.launch();}
    launch(){this.player.duck=false;this.player.grounded=false;this.player.vy=C.jumpV;this.jumpUntil=-1;}
    duck(on){this.duckHeld=!!on;if(on)this.lastDuckTime=this.time;if(this.state==='running')this.player.duck=(this.duckHeld||this.time<this.resumeDuckUntil)&&this.player.grounded;}
    playerBoxes(){const y=C.water+this.player.jumpY;return [
      {x:C.playerX+19,y:y-10,w:50,h:8},
      {x:C.playerX+33,y:y-(this.player.duck?32:55),w:26,h:this.player.duck?22:44}
    ];}
    pickupBoxes(){const y=C.water+this.player.jumpY;return [
      {x:C.playerX+14,y:y-11,w:60,h:9},
      {x:C.playerX+31,y:y-(this.player.duck?34:58),w:30,h:this.player.duck?25:49}
    ];}
    obstacleBox(o){const s=specs[o.type];return{x:o.x,y:o.type==='gull'?C.water-54:C.water-s.h,w:s.w,h:s.h};}
    emit(type,data={}){this.events.push({type,...data});}
    drainEvents(){const a=this.events;this.events=[];return a;}
    end(reason){if(this.state!=='running')return;this.score=Math.floor(this.distance)+this.bonus;this.state='over';this.reason=reason;this.duckHeld=false;this.result=Object.freeze({score:this.score,distance:Math.floor(this.distance),flowers:this.flowers,goldenFlowers:this.goldenFlowers,maxCombo:this.maxCombo,durationMs:Math.min(600000,Math.max(1000,Math.round(this.time*1000)))});this.emit('end',{reason,result:this.result});}
    advance(seconds){if(this.state!=='running')return;if(!Number.isFinite(seconds)||seconds<0)return;if(seconds>.25){this.pause();this.emit('pause');return;}this.accumulator+=seconds;let steps=0;while(this.accumulator+1e-10>=C.step&&this.state==='running'&&steps++<32){this.accumulator-=C.step;this.tick(C.step);}}
    make(type,x,group){const o={type,x,group,w:specs[type].w,h:specs[type].h};this.obstacles.push(o);return o;}
    pairFits(types,gap=18,speed=this.speed){if(types.every(x=>x==='gull'))return true;if(types.some(x=>x==='gull'))return false;const height=Math.max(...types.map(x=>specs[x].h));const airborne=Math.sqrt(Math.max(0,C.jumpV*C.jumpV-2*C.gravity*(height+4)))*2/C.gravity;const span=types.reduce((s,x)=>s+specs[x].w,0)+gap*(types.length-1);return(span+60)/speed <= airborne-.18;}
    chooseGroup(){const d=Math.min(1,Math.max(0,(this.time-20)/100));let type;
      if(this.groupCount<3)type=['buoy','wake','buoy'][this.groupCount];
      else {const r=this.random();type=r<.30?'buoy':r<.52?'wake':r<.78?'sailboat':'gull';}
      let types=[type],gap=16+Math.floor(this.random()*9);
      if(this.time>=30&&this.random()<.10+d*.24){const second=type==='gull'?'gull':['buoy','wake','sailboat'][Math.floor(this.random()*3)];if(this.pairFits([type,second],gap))types.push(second);}
      return {types,gap,d};
    }
    spawnGroup(){const p=this.chooseGroup(),id=++this.groupId,start=this.width+40;let x=start;
      for(const type of p.types){this.make(type,x,id);x+=specs[type].w+p.gap;}
      const span=x-p.gap-start;
      // Separate clusters by actual flight time + reaction margin, not arbitrary pixels.
      const clearSeconds=2.25-p.d*.80+this.random()*.28;
      this.nextGroup=span+this.speed*clearSeconds;
      this.groupCount++;
      if(this.random()<.16&&this.ferries.length<2)this.ferries.push({x:this.width+100,y:166,speedScale:.30});
      // Every reward belongs to a known safe group or a ground-level gap. No blind independent spawning.
      if(this.time>=3&&this.world-this.lastRewardWorld>this.speed*3.4&&this.random()<.88){
        const isGull=p.types[0]==='gull';
        let rx,ry;
        if(!isGull&&this.random()<.64){rx=start+span/2;ry=C.water-134;}
        else {rx=start+span+this.speed*.85;ry=C.water-27;}
        let golden=false;
        if(this.time>=18&&this.time-this.lastGoldTime>=12){this.eligibleSinceGold++;golden=this.random()<.09||this.eligibleSinceGold>=10;if(golden){this.lastGoldTime=this.time;this.eligibleSinceGold=0;}}
        this.rewards.push({x:rx,y:ry,golden,collected:false,missed:false,group:id,bob:this.random()*Math.PI*2});
        this.lastRewardWorld=this.world;
      }
    }
    collect(r){r.collected=true;this.combo=Math.min(100,this.time-this.lastFlower<=C.comboWindow?this.combo+1:1);this.lastFlower=this.time;this.maxCombo=Math.max(this.maxCombo,this.combo);this.flowers++;if(r.golden)this.goldenFlowers++;const points=(r.golden?300:100)+Math.min(100,(this.combo-1)*20);this.bonus+=points;this.emit('collect',{points,golden:r.golden,combo:this.combo});}
    tick(dt){this.time+=dt;if(this.duckHeld)this.lastDuckTime=this.time;if(this.player.grounded)this.player.duck=this.duckHeld||this.time<this.resumeDuckUntil;this.speed=Math.min(C.maxSpeed,C.startSpeed+Math.max(0,this.time-C.grace)*C.acceleration);const dx=this.speed*dt;this.world+=dx;this.distance+=dx/10;
      if(!this.player.grounded){this.player.jumpY+=this.player.vy*dt+.5*C.gravity*dt*dt;this.player.vy+=C.gravity*dt;if(this.player.jumpY>=0){this.player.jumpY=0;this.player.vy=0;this.player.grounded=true;this.player.duck=this.duckHeld;if(this.jumpUntil>=this.time)this.launch();}}
      this.nextGroup-=dx;if(this.nextGroup<=0)this.spawnGroup();
      for(const o of this.obstacles)o.x-=dx;for(const r of this.rewards){r.x-=dx;r.bob+=dt*3;}for(const f of this.ferries)f.x-=dx*f.speedScale;
      this.obstacles=this.obstacles.filter(o=>o.x+o.w>-30);this.rewards=this.rewards.filter(r=>r.x>-50&&!r.collected);this.ferries=this.ferries.filter(f=>f.x>-180);
      if(this.combo&&this.time-this.lastFlower>C.comboWindow){this.combo=0;this.emit('comboEnd');}
      const boxes=this.playerBoxes();
      for(const o of this.obstacles)if(boxes.some(b=>overlap(b,this.obstacleBox(o),2))){this.end(o.type==='gull'?'Low gull — hold Duck to pass underneath.':'Harbour hazard — try hopping a little earlier.');return;}
      for(const r of this.rewards){if(r.collected)continue;const y=r.y+Math.sin(r.bob)*3;const rewardBox={x:r.x-17,y:y-17,w:34,h:34};if(this.pickupBoxes().some(b=>overlap(b,rewardBox)))this.collect(r);else if(!r.missed&&r.x+17<C.playerX+14){r.missed=true;if(this.combo){this.combo=0;this.emit('comboEnd');}}}
      this.score=Math.floor(this.distance)+this.bonus;
      const m=Math.floor(this.distance/500)*500;if(m>this.milestone){this.milestone=m;this.emit('milestone',{distance:m});}
      if(this.time>=C.maxSeconds)this.end('Harbour marathon complete — brilliant paddling!');
    }
    snapshot(){return {state:this.state,time:this.time,speed:this.speed,world:this.world,score:this.score,distance:this.distance,flowers:this.flowers,goldenFlowers:this.goldenFlowers,combo:this.combo,maxCombo:this.maxCombo,player:{...this.player},obstacles:this.obstacles.map(o=>({...o})),rewards:this.rewards.map(r=>({...r})),reason:this.reason,result:this.result};}
  }
  return Object.freeze({Engine,C,specs,overlap,rng,version:'2026.09.23-summer.2'});
});
