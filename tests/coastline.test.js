'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-cinematic-dissolve.10');
assert.deepEqual(coast.SCENES.map(s=>s.id),['auckland','queenstown','milford','christchurch','dunedin','wellington']);
assert.equal(new Set(coast.SCENES.map(s=>s.id)).size,6);
assert(coast.PARALLAX<=.027,'Boat-linked background panning must remain slow');
assert(coast.PAN_FRACTION<=.065,'Each full panorama should move only gently within its scene');

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
const cycleDistance=cycleWorld/10;
assert(cycleDistance>=19900&&cycleDistance<=20100,'One full six-scene panorama loop should align with the 20k top-tier journey');

for(let i=0;i<coast.SCENES.length;i++){
  const early=(i+.12)*coast.SEGMENT/coast.PARALLAX;
  const state=coast.sceneState(early);
  assert.equal(state.current.id,coast.SCENES[i].id,'Scene order mismatch at '+i);
  assert.equal(state.nextScene.id,coast.SCENES[(i+1)%coast.SCENES.length].id);
  assert.equal(state.dissolve,0,'Each scene must remain fully readable before the cinematic dissolve');
}
assert.equal(coast.sceneState(cycleWorld).current.id,'auckland','Wellington must loop back to Auckland');
assert.equal(coast.sceneIndex(cycleWorld),0);
assert.equal(coast.sceneState(cycleWorld*.63,true).current.id,'auckland','Reduced motion keeps Auckland stationary');

const start=1-coast.DISSOLVE_FRACTION;
const before=coast.sceneState((start-.01)*coast.SEGMENT/coast.PARALLAX);
const middle=coast.sceneState((start+coast.DISSOLVE_FRACTION*.5)*coast.SEGMENT/coast.PARALLAX);
const late=coast.sceneState(.995*coast.SEGMENT/coast.PARALLAX);
assert.equal(before.dissolve,0,'Transition must not start too early');
assert(middle.dissolve>.35&&middle.dissolve<.65,'Transition midpoint must be gradual');
assert(late.dissolve>.99,'Next panorama must be effectively complete before segment rollover');

const src=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!src.includes('scenePositions'),'Side-by-side stitched panorama mode must not return');
assert(!src.includes("scene.id==='auckland'?.875:1"),'Auckland must use the original full composition rather than the destructive crop');
assert(!src.includes("globalCompositeOperation='destination-in'"),'Panorama edges must not be feather-cut into visible strips');
assert(!src.includes('drawProcedural'),'Procedural placeholder scenery must not return');
assert(!src.includes('scale(-1,1)'),'Panoramas must never be mirrored');
assert(src.includes('this.drawPlate(c,current,W,H,state.local,1-d)'),'Outgoing panorama uses full-screen slow pan');
assert(src.includes('this.drawPlate(c,incoming,W,H,0,d)'),'Incoming panorama dissolves in at its natural starting composition');
assert(src.includes('Math.sin(Math.PI*d)*.10'),'Transition uses a light atmospheric veil to suppress landmark ghosting');
assert(src.includes('function starPoint'),'Night sky uses individual luminous star points');
assert(src.includes('Math.sin(time*2.45'),'Stars twinkle independently');
assert(src.includes('drawNightSky'),'Stars are separated from the background pass so they can render after global night lighting');

const polish=fs.readFileSync(path.join(__dirname,'../gameplay/polish.js'),'utf8');
assert(polish.includes("image.decoding='async'"),'Panorama images request asynchronous decode');
assert(polish.includes("typeof image.decode==='function'?image.decode()"),'All panoramas are decoded before sceneReady');
assert(polish.includes('this.sceneReady=this.sceneLoaded===SCENES.length'),'All six decoded scenes must be ready before the game uses them');

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base},context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(src,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])assert.equal(Updated.prototype[method],Base.prototype[method]);

console.log(JSON.stringify({scenes:6,loopDistance:Number(cycleDistance.toFixed(1)),parallax:coast.PARALLAX,cinematicDissolve:true,originalPanoramas:true}));
