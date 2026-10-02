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
test('Post-50k challenge is inactive through 50,000 and ramps to full strength by 80,000',()=>{const e=new Engine();e.start();e.score=50000;assert.equal(e.challengeLevel(),0);e.score=65000;assert.equal(e.challengeLevel(),.5);e.score=80000;assert.equal(e.challengeLevel(),1);});
test('Post-50k challenge raises top speed without changing the pre-threshold cap',()=>{const normal=new Engine();normal.start();normal.nextGroup=1e8;normal.time=150;normal.score=49999;normal.tick(C.step);assert(Math.abs(normal.speed-C.maxSpeed)<1e-9);const expert=new Engine();expert.start();expert.nextGroup=1e8;expert.time=150;expert.score=80000;expert.tick(C.step);assert(Math.abs(expert.speed-(C.maxSpeed+C.challengeSpeed))<1e-9);});
test('Post-50k challenge can add a third compatible hazard while pre-threshold groups stay at doubles',()=>{const pre=new Engine();pre.start();pre.groupCount=3;pre.time=130;pre.speed=C.maxSpeed+C.challengeSpeed;pre.score=49999;pre.random=()=>0;assert.equal(pre.chooseGroup().types.length,2);const hard=new Engine();hard.start();hard.groupCount=3;hard.time=130;hard.speed=C.maxSpeed+C.challengeSpeed;hard.score=80000;hard.random=()=>0;assert.equal(hard.chooseGroup().types.length,3);});
test('Crossing 50,000 emits the expert-water cue once',()=>{const e=new Engine();e.start();e.nextGroup=1e8;e.distance=49999.9;e.tick(C.step);let events=e.drainEvents();assert(events.some(x=>x.type==='difficulty'&&x.score===50000));e.tick(C.step);events=e.drainEvents();assert.equal(events.filter(x=>x.type==='difficulty').length,0);});
test('Normal, gold, combo and final result agree exactly',()=>{const e=new Engine();e.start();e.nextGroup=1e8;for(const gold of [false,false,true]){e.rewards.push({x:C.playerX+43,y:C.water-35,bob:0,golden:gold,collected:false,missed:false});e.tick(C.step);}assert.equal(e.flowers,3);assert.equal(e.goldenFlowers,1);assert.equal(e.combo,3);assert.equal(e.bonus,100+120+340);e.end('test');assert.equal(e.result.score,Math.floor(e.distance)+560);assert.equal(e.result.maxCombo,3);});
test('A missed flower resets consecutive combo without losing earned points',()=>{const e=new Engine();e.start();e.combo=3;e.bonus=360;e.lastFlower=0;e.nextGroup=1e8;e.rewards.push({x:C.playerX-10,y:20,bob:0,golden:false,missed:false});e.tick(C.step);assert.equal(e.combo,0);assert.equal(e.bonus,360);});
function rewardLine(delay=0,golden=false){
 const e=new Engine({seed:17});e.start();e.nextGroup=1e8;
 const center=C.playerX+44+C.startSpeed*.397;
 const line=e.makeRewardChain(center,99,golden);
 for(let i=0;i<Math.round(delay/C.step);i++)e.tick(C.step);
 e.hop();
 for(let i=0;i<125&&e.state==='running';i++)e.tick(C.step);
 return {e,line,events:e.drainEvents()};
}
test('A correctly timed jump collects all three blooms in the reward line',()=>{
 const {e,line,events}=rewardLine(0,false);
 assert.equal(line.length,3);assert.equal(e.flowers,3);
 assert.deepEqual(line.map(r=>r.chainIndex),[0,1,2]);
 assert(events.some(x=>x.type==='chainComplete'&&x.count===3));
});
test('A late jump still clips one bloom instead of making the whole line all-or-nothing',()=>{
 const {e}=rewardLine(.30,false);assert.equal(e.flowers,1);
});
test('Golden super reward occupies the middle of a three-bloom line',()=>{
 const {e,line}=rewardLine(0,true);assert.deepEqual(line.map(r=>r.golden),[false,true,false]);assert.equal(e.goldenFlowers,1);
});
test('Reward-line spacing scales with speed so the timing shape stays readable later in a run',()=>{
 const e=new Engine();e.start();e.speed=480;const line=e.makeRewardChain(600,1,false);
 assert(Math.abs((line[1].x-line[0].x)-96)<1e-9);assert(Math.abs((line[2].x-line[1].x)-96)<1e-9);
 assert(line[1].y<line[0].y&&line[1].y<line[2].y);
});
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
