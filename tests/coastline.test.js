'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-six-panorama.8');
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

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
const cycleDistance=cycleWorld/10;
assert(cycleDistance>=10000&&cycleDistance<11000,'Full panorama loop remains around 10k+ distance');

for(let i=0;i<coast.SCENES.length;i++){
  const world=(i+.08)*coast.SEGMENT/coast.PARALLAX;
  const state=coast.sceneState(world);
  assert.equal(state.current.id,coast.SCENES[i].id,'Scene order mismatch at '+i);
  assert.equal(state.nextScene.id,coast.SCENES[(i+1)%coast.SCENES.length].id);
  assert(state.blend===0,'Early part of each panorama must be fully visible before crossfade');
}

const threshold=1-coast.BLEND_FRACTION;
const before=coast.sceneState((threshold-.01)*coast.SEGMENT/coast.PARALLAX);
assert.equal(before.blend,0,'Crossfade begins only in the final scene fraction');
const during=coast.sceneState((threshold+.12)*coast.SEGMENT/coast.PARALLAX);
assert(during.blend>0&&during.blend<1,'Crossfade is gradual');
const late=coast.sceneState(.995*coast.SEGMENT/coast.PARALLAX);
assert(late.blend>.99,'Outgoing scene nearly fully hands off before next segment');

const wellingtonWorld=(5+.99)*coast.SEGMENT/coast.PARALLAX;
const finalState=coast.sceneState(wellingtonWorld);
assert.equal(finalState.current.id,'wellington');
assert.equal(finalState.nextScene.id,'auckland','Wellington must crossfade back to Auckland');
assert.equal(coast.sceneState(cycleWorld).current.id,'auckland','Full route wraps exactly to Auckland');
assert.equal(coast.sceneState(cycleWorld*.63,true).current.id,'auckland','Reduced motion keeps background stationary');
assert.equal(coast.sceneState(cycleWorld*.63,true).blend,0);

const src=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!src.includes('drawProcedural'),'Old procedural landmark route must not return');
assert(!src.includes('function alpineRange'),'Procedural alpine placeholders must not return');
assert(!src.includes('scale(-1,1)'),'Panorama scenes must never be mirrored');
assert(src.includes('this.drawScene(c,a,W,H,state.local,1,false)'));
assert(src.includes('this.drawScene(c,b,W,H,1-state.local,state.blend,true)'));
assert(src.includes('function starPoint'),'Night sky still uses individual star points');
assert(src.includes("strokeStyle='rgba(196,218,242,.36)'"),'Constellation lines remain faint');

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base},context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(src,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])assert.equal(Updated.prototype[method],Base.prototype[method]);

console.log('Coast tests passed: six matching panorama scenes in fixed NZ loop with seamless crossfades.');
