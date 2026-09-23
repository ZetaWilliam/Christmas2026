'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../gameplay/renderer.js'),'utf8');
const begin=source.indexOf('  class SinglePaddleRig {'),end=source.indexOf('  class Renderer{',begin);
assert(begin>=0&&end>begin,'Articulated paddle rig must be included');
const Rig=vm.runInNewContext(source.slice(begin,end)+'; SinglePaddleRig;');
const rig=Object.create(Rig.prototype);
Object.assign(rig,{top:[199,35],bottom:[212,73],nearShoulder:[157,49],farShoulder:[166,65],gripSpan:Math.hypot(13,38)});
const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const error=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let maxError=0,poses=0;
for(const grounded of [true,false])for(const reduced of [true,false])for(let i=0;i<240;i++){
 const p=rig.pose(i/120,grounded,reduced);
 for(const [matrix,origin,target]of [[p.paddle,rig.top,p.top],[p.paddle,rig.bottom,p.bottom],[p.near,rig.top,p.top],[p.far,rig.bottom,p.bottom],[p.near,rig.nearShoulder,rig.nearShoulder],[p.far,rig.farShoulder,rig.farShoulder]]){
  const e=error(apply(matrix,origin),target);maxError=Math.max(maxError,e);assert(e<1e-8,'Detached hand or shoulder');
 }
 assert(Math.abs(error(p.top,p.bottom)-rig.gripSpan)<1e-8,'The single paddle must remain rigid');
 if(!grounded||reduced)assert.equal(p.immersed,false,'No water stroke in air or reduced motion');
 poses++;
}
assert(error(rig.pose(0,true,false).tip,rig.pose(.58,true,false).tip)>35,'Blade must make a visible stroke');
assert.equal(JSON.stringify(rig.pose(0,false,false)),JSON.stringify({...rig.pose(1,false,false),phase:0}),'Airborne pose holds the paddle, without rowing');
const base={},paddle={},near={},far={},draws=[];Object.assign(rig,{base,paddle,near,far});
rig.layer=(_ctx,image)=>draws.push(image);rig.draw({drawImage:image=>draws.push(image)},.3,true,false);
assert.equal(draws.filter(x=>x===paddle).length,1,'Exactly one paddle per standing frame');
assert.deepEqual(draws,[base,paddle,far,near],'Hands must cover the shaft; no baked-in standing sprite');
const standing=source.slice(source.indexOf('    santa(){'),source.indexOf('    warning('));
assert(!standing.includes('this.paddle('),'Remove the disconnected extra paddle');
assert(standing.includes('this.sprites.duck'),'Crouching keeps its one held paddle');
console.log(JSON.stringify({rowingRigPoses:poses,maxGripError:maxError,paddlesPerStandingFrame:1,airborneStroke:false},null,2));
