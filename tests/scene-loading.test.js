'use strict';
// Executable regressions for real image requests, missing scenes and shoreline geometry.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../gameplay/coastline.js'),'utf8');
const makeContext=()=>({calls:[],save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},
  createLinearGradient(){return {addColorStop(){}};},drawImage(...args){this.calls.push(args);}});
const surfaces=[];
const sandbox={module:{exports:{}},document:{createElement(){const ctx=makeContext(),canvas={getContext:()=>ctx};surfaces.push({canvas,ctx});return canvas;}}};
vm.runInNewContext(source,sandbox);
const coast=sandbox.module.exports;
const images={};
for(const id of ['auckland','wellington','capereinga'])images[id]={id,complete:true,naturalWidth:768,naturalHeight:id==='capereinga'?360:144};
const layer=new coast.CoastLayer(),ctx=makeContext(),p={top:'#A8D8F0',horizon:'#EAF3EE'};
const eng={width:960,world:48200};
layer.draw(ctx,eng,p,images,true);
assert.equal(layer.displayedScene.id,'wellington');
assert.equal(layer.wellingtonWeight,1,'The visible Wellington plate determines the ocean geometry');
const wellingtonPlate=layer.cache.wellington.canvas;
const painted=surfaces.find(s=>s.canvas===wellingtonPlate).ctx.calls;
assert.equal(painted.length,1,'Wellington source must be painted exactly once, never repeated under the sea');
assert.equal(painted[0][6],-coast.WELLINGTON_FRAME_LIFT,'Wellington photograph moves up without scaling buildings');
assert.equal(painted[0][8],182,'Wellington keeps the original drawing scale');
assert(painted[0][6]+painted[0][8]<178,'All building pixels must end above the dynamic ocean');
const cape=images.capereinga;
delete images.capereinga;delete layer.cache.capereinga;
eng.world=58940;ctx.calls=[];
layer.draw(ctx,eng,p,images,true);
assert(ctx.calls.some(call=>call[0]===wellingtonPlate),'A missing Cape Reinga must retain a loaded panorama');
assert.equal(layer.displayedScene.id,'wellington','The label must describe the fallback that is actually visible');
assert.equal(layer.wellingtonWeight,1,'A missing Cape image must retain the matching Wellington ocean edge');
images.capereinga=cape;ctx.calls=[];
layer.draw(ctx,eng,p,images,true);
assert.equal(layer.displayedScene.id,'capereinga','A late Cape Reinga image must replace the fallback');
assert.equal(layer.wellingtonWeight,0,'The normal sea edge returns when Cape Reinga loads');
assert(ctx.calls.some(call=>call[0]===layer.cache.capereinga.canvas));
// A direct late-game render or resize also needs a useful fallback without a previous frame.
const direct=new coast.CoastLayer();
direct.draw(ctx,eng,p,{auckland:images.auckland,wellington:images.wellington},false);
assert.equal(direct.displayedScene.id,'wellington');
eng.width=640;direct.draw(ctx,eng,p,{auckland:images.auckland,wellington:images.wellington},false);
assert.equal(direct.displayedScene.id,'wellington');
// Check lighthouse headroom in both supported game-coordinate widths.
for(const width of [640,960]){
 const check=new coast.CoastLayer();check.prepare({capereinga:cape},width,182);
 const call=surfaces.find(s=>s.canvas===check.cache.capereinga.canvas).ctx.calls[0];
 const [,sx,sy,sw,sh,dx,dy,dw,dh]=call;
 const tip=(114-sy)/sh*dh+dy,base=(184-sy)/sh*dh+dy;
 assert(tip>=16&&base<=160,'The complete lighthouse must sit above the sea with headroom at '+width);
}
eng.world=0;eng.width=960;layer.draw(ctx,eng,p,images,true);
assert.equal(layer.displayedScene.id,'auckland','Returning to the opening scene must not keep a stale fallback');
console.log(JSON.stringify({missingSceneRetention:true,lateAssetRecovery:true,resizeFallback:true,wellingtonImageDraws:1,lighthouseSafeWidths:[640,960]}));
