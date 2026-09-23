const assert=require('node:assert/strict');const fs=require('node:fs');const {Engine,C,specs,overlap}=require('../gameplay/engine.js');
const outcomes=[];function test(name,fn){fn();outcomes.push({test:name,passed:true});}
function isolated(type,duck=false){const e=new Engine({seed:1});e.start();e.nextGroup=1e8;e.duck(duck);e.make(type,C.playerX+25,1);e.tick(C.step);return e;}
test('Standing low gull hits; held duck clears',()=>{assert.equal(isolated('gull').state,'over');assert.equal(isolated('gull',true).state,'running');});
test('Buoy, wake, sailboat require hop (including while ducking)',()=>{for(const t of ['buoy','wake','sailboat'])for(const d of [false,true])assert.equal(isolated(t,d).state,'over');});
test('Slightly early next-hop input is buffered for landing',()=>{const e=new Engine();e.start();e.nextGroup=1e8;e.hop();for(let i=0;i<84;i++)e.tick(C.step);assert.equal(e.player.grounded,false);e.hop();for(let i=0;i<16;i++)e.tick(C.step);assert.equal(e.player.grounded,false);assert(e.player.vy<0);});
test('Duck held in air remains held on landing',()=>{const e=new Engine();e.start();e.nextGroup=1e8;e.hop();e.duck(true);for(let i=0;i<110;i++)e.tick(C.step);assert(e.player.grounded&&e.player.duck);});
test('Pause freezes time, distance, combo and physics',()=>{const e=new Engine();e.start();e.advance(.1);e.pause();const before=e.snapshot();for(let i=0;i<100;i++)e.advance(.1);assert.deepEqual(e.snapshot(),before);e.resume();e.advance(.1);assert(e.time>before.time);});
test('Pause underneath a gull preserves crouch and grants a short resume handover',()=>{const e=new Engine();e.start();e.nextGroup=1e8;e.duck(true);e.make('gull',C.playerX+25,1);e.tick(C.step);e.duck(false);e.pause();assert(e.player.duck);e.resume();e.tick(C.step);assert.equal(e.state,'running');assert(e.player.duck);});
test('Long frame pauses instead of skipping a hazard',()=>{const e=new Engine();e.start();e.advance(1);assert.equal(e.state,'paused');assert.equal(e.world,0);});
test('Normal, gold, combo and final result agree exactly',()=>{const e=new Engine();e.start();e.nextGroup=1e8;for(const gold of [false,false,true]){e.rewards.push({x:C.playerX+43,y:C.water-35,bob:0,golden:gold,collected:false,missed:false});e.tick(C.step);}assert.equal(e.flowers,3);assert.equal(e.goldenFlowers,1);assert.equal(e.combo,3);assert.equal(e.bonus,100+120+340);e.end('test');assert.equal(e.result.score,Math.floor(e.distance)+560);assert.equal(e.result.maxCombo,3);});
test('A missed flower resets consecutive combo without losing earned points',()=>{const e=new Engine();e.start();e.combo=3;e.bonus=360;e.lastFlower=0;e.nextGroup=1e8;e.rewards.push({x:C.playerX-10,y:20,bob:0,golden:false,missed:false});e.tick(C.step);assert.equal(e.combo,0);assert.equal(e.bonus,360);});
function auto(e){const groups=new Map();for(const o of e.obstacles){if(o.x+o.w<C.playerX+14)continue;if(!groups.has(o.group))groups.set(o.group,[]);groups.get(o.group).push(o);}const g=[...groups.values()].sort((a,b)=>a[0].x-b[0].x)[0];if(!g){e.duck(false);return;}if(g[0].type==='gull'){const danger=g.some(o=>o.x<C.playerX+200&&o.x+o.w>C.playerX+20);e.duck(danger);return;}e.duck(false);const left=g[0].x,right=g.at(-1).x+g.at(-1).w,mid=(left+right)/2;const eta=(mid-(C.playerX+44))/e.speed;if(e.player.grounded&&eta<=.397&&eta>-.1)e.hop();}
const runs=[];
for(const width of [640,960])for(const hz of [30,60,120])for(let seed=1;seed<=24;seed++){
 const e=new Engine({width,seed});e.start();for(let frame=0;frame<hz*150&&e.state==='running';frame++){auto(e);e.advance(1/hz);e.drainEvents();}
 runs.push({width,hz,seed,seconds:+e.time.toFixed(3),state:e.state,gold:e.goldenFlowers,flowers:e.flowers,score:e.score});
}
test('144 seeded runs remain navigable for 150 seconds at 30/60/120fps, desktop/mobile',()=>assert(runs.every(r=>r.seconds>=149.99),JSON.stringify(runs.filter(r=>r.seconds<149.99).slice(0,12))));
// Test timing windows independently of the adaptive policy across all generated pair shapes.
const pairWindows=[];
for(const speed of [300,340,380,420,480])for(const a of ['buoy','wake','sailboat'])for(const b of ['buoy','wake','sailboat'])for(const gap of [16,20,24]){
 const probe=new Engine();if(!probe.pairFits([a,b],gap,speed))continue;
 let success=[];for(let offset=-.16;offset<=.16;offset+=.01){const e=new Engine();e.start();e.nextGroup=1e9;e.speed=speed;let o=e.make(a,480,1);e.make(b,480+specs[a].w+gap,1);let jumped=false;const dt=C.step;
  for(let k=0;k<650&&e.state==='running';k++){
   const mid=(e.obstacles[0].x+e.obstacles.at(-1).x+specs[b].w)/2;
   if(!jumped&&(mid-(C.playerX+44))/speed<=.40+offset){e.hop();jumped=true;}
   if(!e.player.grounded){e.player.jumpY+=e.player.vy*dt+.5*C.gravity*dt*dt;e.player.vy+=C.gravity*dt;if(e.player.jumpY>=0){e.player.jumpY=0;e.player.vy=0;e.player.grounded=true;}}
   for(const ob of e.obstacles)ob.x-=speed*dt;
   if(e.obstacles.some(ob=>e.playerBoxes().some(pb=>overlap(pb,e.obstacleBox(ob),2))))e.state='over';
   if(e.obstacles.at(-1).x+specs[b].w<C.playerX)break;
  }
  if(e.state==='running')success.push(+offset.toFixed(2));
 }
 pairWindows.push({speed,a,b,gap,windowMs:success.length?Math.round((success.at(-1)-success[0])*1000):0});
}
test('Every allowed double-hazard pattern has at least 140ms input timing latitude',()=>assert(pairWindows.every(r=>r.windowMs>=140),JSON.stringify(pairWindows.filter(r=>r.windowMs<140))));
const doc={outcomes,runs,minimumPairWindowMs:Math.min(...pairWindows.map(r=>r.windowMs)),pairPatterns:pairWindows.length,pairWindows};
fs.writeFileSync(__dirname+'/engine-results.json',JSON.stringify(doc,null,2));console.log(JSON.stringify({checks:outcomes.length,runs:runs.length,completed:runs.filter(r=>r.seconds>=149.99).length,pairPatterns:doc.pairPatterns,minimumPairWindowMs:doc.minimumPairWindowMs},null,2));
