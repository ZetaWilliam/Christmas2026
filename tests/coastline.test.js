'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');
assert.equal(coast.version,'2026.09.28-horizon-fixed.5');
assert.equal(coast.LANDMARKS.length,10);
assert.equal(new Set(coast.LANDMARKS.map(o=>o.id)).size,10);
assert.deepEqual(coast.LANDMARKS.map(o=>o.id),[
  'city','bridge','rangitoto','coromandel','wellington','kaikoura','banks','otago','nugget','fiordland'
]);
let samples=0;
for(const width of [320,390,640,960,1440]){
 const passed=new Set(),previous=new Set();
 for(let world=0;world<=260000;world+=80){
  const objects=coast.layout(world,width),ids=objects.map(o=>o.id);
  assert.equal(new Set(ids).size,ids.length,'No duplicated named landmark in one frame');
  for(const o of objects){
   assert(!passed.has(o.id),'An exited landmark must never be recycled into view');
   assert.equal(o.screenX,o.x-coast.camera(world));
   assert(o.width>0&&o.height>0,'Landmark dimensions stay positive');
   const later=coast.layout(world+1,width).find(x=>x.id===o.id);
   if(later)assert(Math.abs(later.screenX-o.screenX+.105)<1e-9,'Motion is continuous at route boundaries');
  }
  for(const id of previous)if(!ids.includes(id))passed.add(id);
  previous.clear();for(const id of ids)previous.add(id);
  samples++;
 }
 assert.equal(passed.size,10,'Every named landmark occurs once along the route');
 assert.deepEqual(coast.layout(260000,width),[],'No named-landmark repeat at long distances');
 assert.deepEqual(coast.layout(260000,width,true),coast.layout(0,width,true),'Reduced motion is stationary');
}
assert(coast.camera(10000)>1000,'The route should advance fast enough for visible landmark changes in a normal run');
for(let i=1;i<coast.LANDMARKS.length;i++){
 assert(coast.LANDMARKS[i].x>coast.LANDMARKS[i-1].x,'Landmarks remain in one-way geographic sequence');
 assert(coast.LANDMARKS[i].x-coast.LANDMARKS[i-1].x<950,'Route spacing should avoid long empty scenic gaps');
}
for(const period of [700,1200,1800,2400,4800]){
 let different=0;
 for(let x=0;x<7600;x+=13){
  if(Math.abs(coast.height(x)-coast.height(x+period))>.01)different++;
  assert(Math.abs(coast.height(x+.001)-coast.height(x))<.001,'Distant terrain must be continuous');
 }
 assert(different>500,'Terrain must not repeat a fixed strip');
}
for(const seam of [1200,2400,3600,4800,6000,7200]){
 assert(Math.abs(coast.height(seam-1e-6)-coast.height(seam+1e-6))<1e-5);
}
for(const x of coast.LANDMARKS.map(o=>o.x+Math.min(180,o.width?o.width*.35:160))){
 assert(coast.connectedHeight(x,0)>=coast.height(x,0),'Named scenery blends into the continuous shoreline');
}
// Regression: animePlate() returns a canvas, so rowBackdrop() must accept canvas width/height
// instead of assuming HTMLImageElement naturalWidth/naturalHeight.
const originalDocument=global.document;
global.document={
 createElement(type){
  assert.equal(type,'canvas');
  return {
   width:0,height:0,
   getContext(){
    return {
     drawImage(){},
     getImageData(_x,_y,w,h){return {data:new Uint8ClampedArray(w*h*4)};}
    };
   }
  };
 }
};
try{
 const canvasRows=coast.rowBackdrop({width:12,height:3});
 assert.equal(canvasRows.length,3,'rowBackdrop accepts a canvas-like source');
 assert.deepEqual(canvasRows[0],[0,0,0]);
}finally{
 if(originalDocument===undefined)delete global.document;
 else global.document=originalDocument;
}
const coastSource=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!coastSource.includes('scale(-1,1)'),'Named coast artwork must never be mirrored');
const plate=coast.panoramaPlacement(0);
assert(Math.abs((plate.y+coast.PANORAMA.waterlineY*plate.scale)-178)<1e-9,'Panorama shoreline must align exactly with the gameplay horizon');
assert(plate.y<0&&plate.y>-120,'Panorama is shifted upward enough to keep the skyline above water without losing the tower');
assert.equal(coast.PANORAMA.sourceWidth,1080);
assert.equal(coast.PANORAMA.sourceHeight,360);
assert(coastSource.includes('function longCloud'),'Long white clouds are drawn as continuous painted forms');
assert(coastSource.includes('function constellation'),'Night sky uses grouped constellations, not an even dot grid');
assert(!coastSource.includes("c.filter=p.night>.5?'saturate"),'Crisp panorama must not be blurred by the old landmark filter chain');
assert(coastSource.includes("c.drawImage(this.image,plate.x,plate.y,plate.width,plate.height)"),'Panorama is drawn with horizon-aware placement');
// The patch changes only distant rendering; water, Santa, hazards, rewards and results remain inherited.
class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base};
const context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(coastSource,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])
 assert.equal(Updated.prototype[method],Base.prototype[method],method+' remains unchanged');
assert.equal(coast.camera(NaN),0);
console.log('Coast tests passed: '+samples+' views; approved Auckland panorama aligned to horizon, 10 one-time landmarks and continuous route.');
