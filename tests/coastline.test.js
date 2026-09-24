'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');
assert.equal(coast.version,'2026.09.24-coast.2');
assert.equal(coast.LANDMARKS.length,3);
assert.equal(new Set(coast.LANDMARKS.map(o=>o.id)).size,3);
assert.deepEqual(coast.LANDMARKS.map(o=>o.id),['city','bridge','rangitoto']);
let samples=0;
for(const width of [320,390,640,960,1440]){
 const passed=new Set(),previous=new Set();
 for(let world=0;world<=320000;world+=80){
  const objects=coast.layout(world,width),ids=objects.map(o=>o.id);
  assert.equal(new Set(ids).size,ids.length,'No duplicated named landmark in one frame');
  for(const o of objects){
   assert(!passed.has(o.id),'An exited landmark must never be recycled into view');
   assert.equal(o.screenX,o.x-coast.camera(world));
   assert(o.scale>0,'Landmarks must never be mirrored');
   const later=coast.layout(world+1,width).find(x=>x.id===o.id);
   if(later)assert(Math.abs(later.screenX-o.screenX+.035)<1e-9,'Motion is continuous at old tile boundaries');
  }
  for(const id of previous)if(!ids.includes(id))passed.add(id);
  previous.clear();for(const id of ids)previous.add(id);
  samples++;
 }
 assert.equal(passed.size,3,'Every preserved landmark occurs once along the route');
 assert.deepEqual(coast.layout(250000,width),[],'No named-landmark repeat at long distances');
 assert.deepEqual(coast.layout(250000,width,true),coast.layout(0,width,true),'Reduced motion is stationary');
}
for(const period of [700,1200,1800,2400,4800]){
 let different=0;
 for(let x=0;x<6000;x+=13){
  if(Math.abs(coast.height(x)-coast.height(x+period))>.01)different++;
  assert(Math.abs(coast.height(x+.001)-coast.height(x))<.001,'Distant terrain must be continuous');
 }
 assert(different>440,'Terrain must not repeat a fixed strip');
}
for(const seam of [1200,2400,3600,4800]){
 assert(Math.abs(coast.height(seam-1e-6)-coast.height(seam+1e-6))<1e-5);
}
for(const x of [185,650,1000,1650]){
 assert(coast.connectedHeight(x,0)>coast.height(x,0),'Landmark bases should blend into the continuous near shoreline');
 assert(Math.abs(coast.connectedHeight(x-.001,0)-coast.connectedHeight(x+.001,0))<.001,'Connected shoreline must be continuous');
}
const coastSource=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!coastSource.includes('scale(-1,1)'),'Named coast artwork must never be mirrored');
assert(coastSource.includes('function bridgeMask'),'Bridge uses a structure-only mask instead of an opaque source rectangle');
assert(coastSource.includes('rowBackdrop'),'City/island extraction removes source-sky matte pixels');
// The patch changes only distant rendering and its text label; everything else is inherited.
class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base};
const context={window:win,document:{getElementById:()=>null}};
context.globalThis=win;
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8'),context);
const Updated=win.HarbourRenderer;
assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])
 assert.equal(Updated.prototype[method],Base.prototype[method],method+' remains unchanged');
assert.equal(coast.camera(NaN),0);
console.log('Coast tests passed: '+samples+' views; 3 landmarks each once; no mirrored/recycled coast; inherited water, character, hazards and results.');
