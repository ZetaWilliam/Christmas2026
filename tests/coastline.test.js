'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-six-city-loop.1');
assert.deepEqual(coast.SCENES.map(s=>s.id),[
  'auckland','queenstown','milford','christchurch','dunedin','wellington'
]);
assert.deepEqual(coast.SCENES.map(s=>s.label),[
  'Auckland · Waitematā Harbour',
  'Queenstown · Lake Wakatipu',
  'Piopiotahi / Milford Sound · Fiordland',
  'Christchurch · Ōtautahi',
  'Dunedin · Ōtepoti',
  'Wellington · Te Whanganui-a-Tara'
]);
assert.equal(coast.SCENES.length,6);
assert.equal(coast.SEGMENT_SPAN,coast.ROUTE_SPAN/6);
assert(coast.FADE_FRACTION>=.1&&coast.FADE_FRACTION<=.2,'City transitions use a restrained cross-fade');

// Every crop begins below the title area of the approved six-panel art sheet.
for(const scene of coast.SCENES){
  assert(scene.cropY>=100,'Scene crop must remove the generated city-name text: '+scene.id);
  assert(scene.cropY+coast.SHEET.cropHeight<=coast.SHEET.panelHeight,'Scene crop stays inside its panel: '+scene.id);
}

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
for(let i=0;i<coast.SCENES.length;i++){
  const world=(i*coast.SEGMENT_SPAN+.01)/coast.PARALLAX,state=coast.sceneState(world);
  assert.equal(state.current.id,coast.SCENES[i].id,'Scene order stays fixed');
  assert.equal(state.next.id,coast.SCENES[(i+1)%6].id,'Each city cross-fades to the next requested city');
}
assert.equal(coast.sceneState(0).current.id,'auckland');
assert.equal(coast.sceneState(cycleWorld).current.id,'auckland','Full loop returns to Auckland');

const noFade=coast.sceneState((coast.SEGMENT_SPAN*.5)/coast.PARALLAX);
assert.equal(noFade.blend,0,'Middle of a city scene is not double-exposed');
const late=coast.sceneState((coast.SEGMENT_SPAN*.94)/coast.PARALLAX);
assert(late.blend>0&&late.blend<1,'Late scene progress cross-fades into the next city');

// Cropping uses the artwork itself, not generated city labels, and adapts to mobile aspect ratios.
const desktop=coast.sourceRect(coast.SCENES[0],960/320,0);
const mobile=coast.sourceRect(coast.SCENES[0],640/320,0);
assert(desktop.y>=100&&mobile.y>=100);
assert(mobile.w<desktop.w,'Mobile viewport crops horizontally instead of distorting the art');
assert(Math.abs(desktop.w/desktop.h-3)<.02,'Desktop source crop matches the 3:1 game canvas');

const source=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(source.includes("this.image.src='/gameplay/art/city-montage.webp?v='+VERSION"),'Six-city montage is the only scenic image source');
assert(source.includes('this.drawScene(c,state.current,1'),'Current panorama is drawn at full opacity');
assert(source.includes('this.drawScene(c,state.next,state.blend'),'Next panorama is cross-faded');
for(const obsolete of ['drawProcedural(','alpineRange(','townLights(','waterfall(','hill(c,']){
  assert(!source.includes(obsolete),'Legacy procedural scenery must not return: '+obsolete);
}

// Renderer integration still replaces only the landscape layer; gameplay art methods remain inherited.
class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base};
const context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(source,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])
  assert.equal(Updated.prototype[method],Base.prototype[method],method+' remains unchanged');

console.log('Coast tests passed: six consistent city panoramas, text-free crops, fixed order and cross-faded repeating loop.');
