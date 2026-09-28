'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const coast=require('../gameplay/coastline.js');

assert.equal(coast.version,'2026.09.28-south-island.7');
assert.equal(coast.LANDMARKS.length,15);
assert.equal(new Set(coast.LANDMARKS.map(o=>o.id)).size,15);
assert.deepEqual(coast.LANDMARKS.map(o=>o.id),[
  'city','bridge','rangitoto','coromandel','taranaki','wellington','palliser',
  'kaikoura','banks','aoraki','queenstown','wanaka','milford','doubtful','bluff'
]);

const labels=coast.LANDMARKS.map(o=>o.label).join(' | ');
for(const name of [
  'Aoraki / Mount Cook · Southern Alps',
  'Queenstown · Lake Wakatipu',
  'Wānaka · Southern Lakes',
  'Piopiotahi / Milford Sound · Fiordland',
  'Patea / Doubtful Sound · Fiordland'
]) assert(labels.includes(name),'Missing upgraded South Island landmark: '+name);

const cycleWorld=coast.ROUTE_SPAN/coast.PARALLAX;
const cycleDistance=cycleWorld/10;
assert(cycleDistance>=10000,'A complete scenic circuit must not repeat before 10,000 distance/score points');
assert(cycleDistance<11000,'The first scenic repeat should stay close to the requested 10,000-point mark');

for(const width of [320,390,640,960,1440]){
  const seen=new Set();
  for(let world=0;world<cycleWorld-1;world+=80){
    const objects=coast.layout(world,width),ids=objects.map(o=>o.id);
    assert.equal(new Set(ids).size,ids.length,'No duplicated named landmark in one frame');
    for(const o of objects){seen.add(o.id);assert(o.width>0&&o.height>0);}
  }
  assert.equal(seen.size,15,'Every named landmark appears during one scenic circuit');
  const a=coast.layout(0,width),b=coast.layout(cycleWorld,width);
  assert.deepEqual(a.map(o=>o.id),b.map(o=>o.id),'The full landmark sequence repeats only after one complete circuit');
  for(let i=0;i<a.length;i++)assert(Math.abs(a[i].screenX-b[i].screenX)<1e-7,'Looped landmark positions remain seamless');
  assert.deepEqual(coast.layout(cycleWorld*.43,width,true),coast.layout(0,width,true),'Reduced motion is stationary');
}

for(let i=1;i<coast.LANDMARKS.length;i++){
  assert(coast.LANDMARKS[i].x>coast.LANDMARKS[i-1].x,'Landmarks remain in one-way scenic sequence');
  assert(coast.LANDMARKS[i].x-coast.LANDMARKS[i-1].x<900,'Route spacing avoids long empty scenic gaps');
}

for(const x of [0,173,910,2250,5170,8840,11199]){
  assert(Math.abs(coast.height(x)-coast.height(x+coast.ROUTE_SPAN))<1e-10,'Terrain joins perfectly at the full loop');
  assert(Math.abs(coast.connectedHeight(x)-coast.connectedHeight(x+coast.ROUTE_SPAN))<1e-10,'Connected shoreline joins perfectly at the full loop');
}
assert(Math.abs(coast.height(coast.ROUTE_SPAN-1e-6)-coast.height(1e-6))<1e-5,'Terrain is continuous across the wrap');

const plate=coast.panoramaPlacement(0);
assert(Math.abs((plate.y+coast.PANORAMA.waterlineY*plate.scale)-178)<1e-9,'Panorama shoreline aligns with the gameplay horizon');
assert(plate.y<0&&plate.y>-120,'Skyline remains above animated water');

const blendStartCamera=coast.ROUTE_SPAN-coast.LOOP_BLEND;
assert.equal(coast.panoramaPlacements((blendStartCamera-1)/coast.PARALLAX,960).length,0,'Next Auckland plate stays hidden before 10k transition');
const blend=coast.panoramaPlacements((blendStartCamera+30)/coast.PARALLAX,960);
assert(blend.some(p=>p.alpha>0),'Next Auckland plate fades in only inside the final loop transition');

const originalDocument=global.document;
global.document={
  createElement(type){
    assert.equal(type,'canvas');
    return {
      width:0,height:0,
      getContext(){
        return {
          drawImage(){},fillRect(){},beginPath(){},arc(){},fill(){},stroke(){},moveTo(){},lineTo(){},
          createLinearGradient(){return {addColorStop(){}};},
          createRadialGradient(){return {addColorStop(){}};},
          getImageData(_x,_y,w,h){return {data:new Uint8ClampedArray(w*h*4)};},
          putImageData(){},
          set globalCompositeOperation(_v){},get globalCompositeOperation(){return 'source-over';},
          set fillStyle(_v){},get fillStyle(){return '';},
          set strokeStyle(_v){},set lineWidth(_v){},set globalAlpha(_v){}
        };
      }
    };
  }
};
try{assert.equal(coast.rowBackdrop({width:12,height:3}).length,3);}
finally{if(originalDocument===undefined)delete global.document;else global.document=originalDocument;}

const coastSource=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
assert(coastSource.includes("globalCompositeOperation='destination-in'"),'Auckland panorama keeps feathered edges');
assert(coastSource.includes('function starPoint'),'Stars are rendered as individual light points');
assert(coastSource.includes('function starField'),'Night sky includes a field of individual star points');
assert(coastSource.includes("strokeStyle='rgba(196,218,242,.42)'"),'Constellation guides are deliberately faint');
for(const helper of ['function alpineRange','function snowCap','function mistBand','function pineLine','function townLights','function waterfall'])
  assert(coastSource.includes(helper),'South Island scenery helper missing: '+helper);

class Base {draw(){} ocean(){} santa(){} hazard(){} reward(){} particles(){} overlay(){}}
const win={HarbourRenderer:Base},context={window:win,document:{getElementById:()=>null}};context.globalThis=win;
vm.runInNewContext(coastSource,context);
const Updated=win.HarbourRenderer;assert(Updated!==Base);
for(const method of ['ocean','santa','hazard','reward','particles','overlay'])assert.equal(Updated.prototype[method],Base.prototype[method]);

console.log('Coast tests passed: seamless 10k+ route with detailed Aoraki, Queenstown, Wānaka and Fiordland scenes plus point-star constellations.');
