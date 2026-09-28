'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-seamless-route.6');
assert.equal(coast.LANDMARKS.length,15);
assert.equal(new Set(coast.LANDMARKS.map(o=>o.id)).size,15);
assert.deepEqual(coast.LANDMARKS.map(o=>o.id),[
  'city','bridge','rangitoto','coromandel','taranaki','wellington','palliser',
  'kaikoura','banks','porthills','moeraki','otago','nugget','fiordland','bluff'
]);

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
const cycleDistance=cycleWorld/10;
assert(cycleDistance>=10000,'A complete scenic circuit must not repeat before 10,000 distance/score points');
assert(cycleDistance<11000,'The first scenic repeat should stay close to the requested 10,000-point mark');

for(const width of [320,390,640,960,1440]){
  const seen=new Set();
  for(let world=0;world<cycleWorld-1;world+=80){
    const objects=coast.layout(world,width),ids=objects.map(o=>o.id);
    assert.equal(new Set(ids).size,ids.length,'No duplicated named landmark in one frame');
    for(const o of objects){
      seen.add(o.id);
      assert(o.width>0&&o.height>0,'Landmark dimensions stay positive');
    }
  }
  assert.equal(seen.size,15,'Every named landmark appears during one scenic circuit');

  const a=coast.layout(0,width),b=coast.layout(cycleWorld,width);
  assert.deepEqual(a.map(o=>o.id),b.map(o=>o.id),'The full landmark sequence repeats only after one complete circuit');
  for(let i=0;i<a.length;i++)assert(Math.abs(a[i].screenX-b[i].screenX)<1e-7,'Looped landmark positions remain seamless');
  assert.deepEqual(coast.layout(cycleWorld*.43,width,true),coast.layout(0,width,true),'Reduced motion is stationary');
}

assert.equal(coast.camera(0),0);
assert(Math.abs(coast.camera(cycleWorld))<1e-7,'Camera wraps exactly at the scenic circuit boundary');
assert(coast.rawCamera(cycleWorld)>10000,'Raw scenic progress spans the full long route before wrapping');

for(let i=1;i<coast.LANDMARKS.length;i++){
  assert(coast.LANDMARKS[i].x>coast.LANDMARKS[i-1].x,'Landmarks remain in one-way geographic sequence');
  assert(coast.LANDMARKS[i].x-coast.LANDMARKS[i-1].x<900,'Route spacing avoids long empty scenic gaps');
}

// Terrain is truly periodic at the long route boundary, but not on shorter obvious strips.
for(const x of [0,173,910,2250,5170,8840,11199]){
  assert(Math.abs(coast.height(x)-coast.height(x+coast.ROUTE_SPAN))<1e-10,'Terrain joins perfectly at the full loop');
  assert(Math.abs(coast.connectedHeight(x)-coast.connectedHeight(x+coast.ROUTE_SPAN))<1e-10,'Connected shoreline joins perfectly at the full loop');
}
for(const period of [700,1200,2400,5600]){
  let different=0;
  for(let x=0;x<coast.ROUTE_SPAN;x+=37)if(Math.abs(coast.height(x)-coast.height(x+period))>.01)different++;
  assert(different>200,'Terrain must not repeat on a short visible strip');
}
assert(Math.abs(coast.height(coast.ROUTE_SPAN-1e-6)-coast.height(1e-6))<1e-5,'Terrain is continuous across the wrap');

// Approved panorama remains horizon-aligned and its replacement is delayed until the 10k blend zone.
const plate=coast.panoramaPlacement(0);
assert(Math.abs((plate.y+coast.PANORAMA.waterlineY*plate.scale)-178)<1e-9,'Panorama shoreline aligns with the gameplay horizon');
assert(plate.y<0&&plate.y>-120,'Skyline remains above the animated water');
assert.equal(coast.PANORAMA.sourceWidth,1080);
assert.equal(coast.PANORAMA.sourceHeight,360);

const blendStartCamera=coast.ROUTE_SPAN-coast.LOOP_BLEND;
const beforeBlendWorld=(blendStartCamera-1)/coast.PARALLAX;
const inBlendWorld=(blendStartCamera+30)/coast.PARALLAX;
assert.equal(coast.panoramaPlacements(beforeBlendWorld,960).length,0,'Next Auckland plate stays hidden before the 10k transition');
const blend=coast.panoramaPlacements(inBlendWorld,960);
assert(blend.length>=1&&blend.some(p=>p.alpha>0),'Next Auckland plate fades in only inside the final loop transition');
const almostWrap=coast.panoramaPlacements((coast.ROUTE_SPAN-.01)/coast.PARALLAX,960);
const incoming=almostWrap.at(-1);
assert(incoming.alpha>.99&&Math.abs(incoming.x-coast.PANORAMA.startX)<1,'Incoming Auckland plate is aligned before the loop resets');

const originalDocument=global.document;
global.document={
  createElement(type){
    assert.equal(type,'canvas');
    return {
      width:0,height:0,
      getContext(){
        return {
          drawImage(){},fillRect(){},
          createLinearGradient(){return {addColorStop(){}};},
          getImageData(_x,_y,w,h){return {data:new Uint8ClampedArray(w*h*4)};},
          putImageData(){},
          set globalCompositeOperation(_v){},get globalCompositeOperation(){return 'source-over';},
          set fillStyle(_v){},get fillStyle(){return '';}
        };
      }
    };
  }
};
try{
  const canvasRows=coast.rowBackdrop({width:12,height:3});
  assert.equal(canvasRows.length,3,'rowBackdrop accepts a canvas-like source');
}finally{
  if(originalDocument===undefined)delete global.document;
  else global.document=originalDocument;
}

const coastSource=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(!coastSource.includes('scale(-1,1)'),'Named coast artwork must never be mirrored');
assert(coastSource.includes("globalCompositeOperation='destination-in'"),'Panorama edges are alpha-feathered instead of hard-cut');
assert(coastSource.includes("c.globalAlpha=plate.alpha??1"),'The 10k Auckland return is cross-faded');
assert(coastSource.includes('Mount Taranaki · West Coast'));
assert(coastSource.includes('Cape Palliser · Wairarapa'));
assert(coastSource.includes('Moeraki Boulders · Otago Coast'));
assert(coastSource.includes('Motupōhue · Bluff'));

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base};
const context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(coastSource,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])
  assert.equal(Updated.prototype[method],Base.prototype[method],method+' remains unchanged');

console.log('Coast tests passed: 15-landmark seamless circuit; first repeat after 10k+ and feathered Auckland transition.');
