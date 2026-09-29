'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.30-dunedin-repair.14');
assert.deepEqual(coast.SCENES.map(s=>s.id),['auckland','queenstown','milford','christchurch','dunedin','wellington']);
assert.equal(new Set(coast.SCENES.map(s=>s.id)).size,6);
assert.equal(coast.SCENE_DISTANCE,900,'Each scene should advance after about 900 distance');
assert.equal(coast.ROUTE_DISTANCE,5400,'All six panoramas should rotate in a 5400-distance loop');
assert(coast.PAN_FRACTION<=.065,'Each full panorama should still move only gently within its scene');
assert.equal(coast.CHRISTCHURCH_FOCUS_Y,0,'Christchurch must preserve the very top of the source image so the spire cannot be cropped.');
assert(Math.abs(coast.DUNEDIN_REPAIR_X-400/768)<1e-12);
assert(Math.abs(coast.DUNEDIN_REPAIR_Y-70/360)<1e-12);
assert(Math.abs(coast.DUNEDIN_REPAIR_W-368/768)<1e-12);
assert(Math.abs(coast.DUNEDIN_REPAIR_H-200/360)<1e-12);
assert.equal(coast.WELLINGTON_WATER_EXTENSION,26,'Only Wellington gets a short harbour-water extension below the horizon.');

for(let i=0;i<coast.SCENES.length;i++){
  const world=(i*coast.SCENE_DISTANCE+80)*10;
  const state=coast.sceneState(world);
  assert.equal(state.current.id,coast.SCENES[i].id,'Scene order mismatch at '+i);
  assert.equal(state.nextScene.id,coast.SCENES[(i+1)%coast.SCENES.length].id);
  assert.equal(state.dissolve,0,'Each scene must remain fully readable before the cinematic dissolve');
}
assert.equal(coast.sceneState(coast.ROUTE_DISTANCE*10).current.id,'auckland','Wellington must loop back to Auckland');
assert.equal(coast.sceneIndex(coast.ROUTE_DISTANCE*10),0);
assert.equal(coast.sceneState(40000,true).current.id,'auckland','Reduced motion keeps Auckland stationary');

const start=1-coast.DISSOLVE_FRACTION;
const before=coast.sceneState((start-.01)*coast.SCENE_DISTANCE*10);
const middle=coast.sceneState((start+coast.DISSOLVE_FRACTION*.5)*coast.SCENE_DISTANCE*10);
const late=coast.sceneState(.995*coast.SCENE_DISTANCE*10);
assert.equal(before.dissolve,0,'Transition must not start too early');
assert(middle.dissolve>.35&&middle.dissolve<.65,'Transition midpoint must be gradual');
assert(late.dissolve>.99,'Next panorama must be effectively complete before segment rollover');

assert.equal(coast.sceneState(0).current.id,'auckland');
assert.equal(coast.sceneState(9000).current.id,'queenstown','At 900 distance the background must leave Auckland');
assert.equal(coast.sceneState(18000).current.id,'milford');
assert.equal(coast.sceneState(27000).current.id,'christchurch');
assert.equal(coast.sceneState(36000).current.id,'dunedin');
assert.equal(coast.sceneState(45000).current.id,'wellington');

const src=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!src.includes('scenePositions'),'Side-by-side stitched panorama mode must not return');
assert(!src.includes("scene.id==='auckland'?.875:1"),'Auckland must use the original full composition rather than the destructive crop');
assert(!src.includes("mask.addColorStop(0,'rgba(0,0,0,0)')"),'Full panorama scenes must not regain edge feather strips.');
assert(!src.includes('drawProcedural'),'Procedural placeholder scenery must not return');
assert(!src.includes('scale(-1,1)'),'Panoramas must never be mirrored');
assert(src.includes('this.drawPlate(c,current,W,H,state.local,1-d)'),'Outgoing panorama uses full-screen gentle pan');
assert(src.includes('this.drawPlate(c,incoming,W,H,0,d)'),'Incoming panorama dissolves in at its natural starting composition');
assert(src.includes('Math.sin(Math.PI*d)*.10'),'Transition uses a light atmospheric veil to suppress landmark ghosting');
assert(src.includes('function starPoint'),'Night sky uses individual luminous star points');
assert(src.includes('Math.sin(time*2.45'),'Stars twinkle independently');
assert(src.includes('drawNightSky'),'Stars are separated from the background pass so they render after global night lighting');

const polish=fs.readFileSync(path.join(__dirname,'../gameplay/polish.js'),'utf8');
assert(polish.includes("image.decoding='async'"),'Panorama images request asynchronous decode');
assert(polish.includes("typeof image.decode==='function'?image.decode()"),'All panoramas are decoded before sceneReady');
assert(polish.includes('this.sceneExpected=SCENES.length+1'),'Dunedin repair asset must be counted in scene readiness.');
assert(polish.includes("repair.src='/gameplay/art/scenes/dunedin-repair.webp?v='+VERSION"),'Dunedin repair asset must preload with the six scenes.');
assert(polish.includes('this.sceneReady=this.sceneLoaded===this.sceneExpected'),'All six scenes plus the repair patch must be decoded before use.');
assert(polish.includes("scene.current.id==='wellington'"),'Wellington water treatment must be scene-specific.');
assert(polish.includes("scene.nextScene.id==='wellington'"),'Wellington water blend must enter and leave smoothly during dissolves.');
assert(polish.includes("this.mix(normalTop,'#5A788F',.82*wellingtonWeight)"),'Wellington horizon water must blend toward the muted harbour steel-blue.');
assert(polish.includes("1-.94*wellingtonWeight"),'Wellington dynamic water must begin mostly transparent so the retained harbour water remains visible at the horizon.');
assert(src.includes("scene.id==='christchurch'?CHRISTCHURCH_FOCUS_Y:.5"),'Christchurch must use the dedicated upward focal point while all other scenes retain center framing.');
assert(src.includes('function drawChristchurchSpire'),'Christchurch must include a scene-anchored Gothic spire repair layer.');
assert(src.includes("if(scene.id==='christchurch')drawChristchurchSpire"),'The spire repair must only run for Christchurch.');
assert(src.includes("sourceX=img.naturalWidth*.7215"),'Spire repair must stay anchored to the tower position in the source panorama.');
assert(src.includes("tipSourceY=img.naturalHeight*.105"),'Spire repair must extend well above the truncated source tower top.');
assert(src.includes("scene.id==='dunedin'"),'Dunedin must have a scene-specific repair pass.');
assert(src.includes('prepareDunedinRepair'),'Dunedin repair artwork must be cached and feathered.');
assert(src.includes("g.globalCompositeOperation='destination-in'"),'Repair patch edges must be alpha-feathered.');
assert(src.includes("g.drawImage(repair,dx,dy,dw,dh)"),'Clean Dunedin repair patch must be drawn into the damaged source region.');
assert(!src.includes("wash.addColorStop(1,'rgba(72,102,106,.56)')"),'Legacy colour-wash masking must be removed once clean repair artwork is available.');
assert(!src.includes("scene.id==='auckland'&&")&&!src.includes("scene.id==='queenstown'&&")&&!src.includes("scene.id==='milford'&&"),'No new colour repair may affect the other panoramas.');
assert(src.includes("const srcRatio=img.naturalWidth/img.naturalHeight,targetRatio=targetW/H"),'Wellington extension must not change the panorama framing height.');
assert(src.includes("g.drawImage(img,sx,sy,sw,sh,0,0,targetW,H)"),'All panoramas must keep their original visual height.');
assert(src.includes("const waterSlice=sh*.10"),'Wellington must extend only the bottom harbour-water slice below the horizon.');
assert(!polish.includes("current.id==='auckland'")&&!polish.includes("current.id==='queenstown'")&&!polish.includes("current.id==='milford'")&&!polish.includes("current.id==='dunedin'"),'No other scene may receive a new ocean override.');

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base},context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(src,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])assert.equal(Updated.prototype[method],Base.prototype[method]);

console.log(JSON.stringify({scenes:6,sceneDistance:coast.SCENE_DISTANCE,loopDistance:coast.ROUTE_DISTANCE,cinematicDissolve:true,originalPanoramas:true,christchurchSpireRestored:true,dunedinCleanRepair:true,wellingtonWaterOnlyExtension:true}));
