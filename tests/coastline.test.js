'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-continuous-scroll.9');
assert.deepEqual(coast.SCENES.map(s=>s.id),['auckland','queenstown','milford','christchurch','dunedin','wellington']);
assert.deepEqual(coast.SCENES.map(s=>s.label),[
  'Auckland · Tāmaki Makaurau',
  'Queenstown · Tāhuna',
  'Milford Sound · Piopiotahi',
  'Christchurch · Ōtautahi',
  'Dunedin · Ōtepoti',
  'Wellington · Te Whanganui-a-Tara'
]);
assert.equal(new Set(coast.SCENES.map(s=>s.id)).size,6);

assert(coast.PARALLAX<.05,'Background must move slowly with the boat rather than race through scenes');
assert(coast.PLATE_WIDTH>coast.SCENE_STEP,'Neighbouring panorama plates must overlap');
assert.equal(coast.PLATE_WIDTH-coast.SCENE_STEP,coast.FEATHER*2,'Feather zones must exactly share the overlap without a dark seam');

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
const cycleDistance=cycleWorld/10;
assert(cycleDistance>15000&&cycleDistance<16000,'Full six-scene loop should take roughly 15k distance after slowing the panorama');

for(let i=0;i<coast.SCENES.length;i++){
  const world=i*coast.SCENE_STEP/coast.PARALLAX;
  assert.equal(coast.sceneIndex(world),i,'Scene order mismatch at '+i);
}
assert.equal(coast.sceneIndex(cycleWorld),0,'Wellington must wrap continuously back to Auckland');
assert.equal(coast.sceneIndex(cycleWorld*.63,true),0,'Reduced motion keeps the background stationary');

const width=960,world=1.2*coast.SCENE_STEP/coast.PARALLAX,deltaWorld=100;
const before=coast.scenePositions(world,width),after=coast.scenePositions(world+deltaWorld,width);
for(const item of before){
  const match=after.find(x=>x.id===item.id&&Math.abs((x.x-item.x)+deltaWorld*coast.PARALLAX)<.001);
  if(item.x>-100&&item.x<width+100)assert(match,'Visible panorama must translate continuously with world progress: '+item.id);
}

for(const w of [320,640,960,1440]){
  const positions=coast.scenePositions(2.4*coast.SCENE_STEP/coast.PARALLAX,w);
  assert(positions.length>=2,'Overlapping scenes should cover every viewport without switching gaps');
  for(let i=1;i<positions.length;i++)assert(positions[i].x>=positions[i-1].x,'Scene positions remain ordered');
}

const src=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!src.includes('state.blend'),'Old discrete crossfade state must not return');
assert(!src.includes('drawScene(c,a'),'Old scene-switch renderer must not return');
assert(!src.includes('drawProcedural'),'Procedural placeholder scenery must not return');
assert(!src.includes('scale(-1,1)'),'Panoramas must never be mirrored');
assert(src.includes("globalCompositeOperation='destination-in'"),'Panorama edges must be pre-feathered once');
assert(src.includes('Math.sin(time*3.1'),'Stars must twinkle over time');
assert(src.includes('function starPoint'),'Night sky uses individual glowing star points');
assert(src.includes('function constellation'),'Night sky includes point-star constellations');
assert(src.includes("strokeStyle='rgba(196,218,242,.34)'"),'Constellation guide lines remain faint');

const polish=fs.readFileSync(path.join(__dirname,'../gameplay/polish.js'),'utf8');
assert(polish.includes("image.decoding='async'"),'Panorama images request asynchronous decode');
assert(polish.includes("typeof image.decode==='function'?image.decode()"),'Every panorama is decoded before sceneReady');
assert(polish.includes('this.sceneReady=this.sceneLoaded===SCENES.length'),'All six decoded scenes are ready before continuous rendering starts');

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base},context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(src,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])assert.equal(Updated.prototype[method],Base.prototype[method]);

console.log(JSON.stringify({scenes:6,loopDistance:Number(cycleDistance.toFixed(1)),parallax:coast.PARALLAX,continuousScroll:true,twinklingConstellations:true}));
