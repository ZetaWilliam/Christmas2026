'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../gameplay/polish.js'),'utf8');
const coast=require('../gameplay/coastline.js');
class Base {
  mix(a,b,t){const rgb=h=>h.match(/\w\w/g).map(n=>parseInt(n,16)),x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
}
const win={HarbourRenderer:Base,HarbourAudio:class{},HarbourCoastline:coast};
vm.runInNewContext(source,{window:win,document:{addEventListener(){}}});
function paint(weight){
 const draws=[],moves=[];
 const ctx={save(){},restore(){},beginPath(){},lineTo(){},closePath(){},fill(){},stroke(){},
  moveTo(x,y){moves.push([x,y]);},
  createLinearGradient(...coords){return{coords,stops:[],addColorStop(t,color){this.stops.push([t,color]);}};},
  fillRect(...rect){draws.push({rect,fill:this.fillStyle});}
 };
 const renderer=Object.create(win.HarbourRenderer.prototype);
 renderer.ctx=ctx;renderer.eng={width:960,time:0,world:48200};renderer.reduced=false;
 renderer.coastLayer={wellingtonWeight:weight};
 renderer.ocean({water:'#3F91A6',horizon:'#EAF3EE',night:0});
 return {draws,moves};
}
const a=paint(1),normal=paint(0),mid=paint(.5);
assert.deepEqual(a.draws[0].rect,[0,152,960,168],'The live sea fills the entire gap to the raised shoreline');
assert.deepEqual(a.draws[0].fill.coords,[0,152,0,320],'There must be one gradient from the shore to the bottom');
assert.equal(a.draws[0].fill.stops[0][0],0);
assert(a.draws[0].fill.stops[0][1].endsWith(',0)'),'The join starts transparent at y=152');
assert.equal(a.draws[0].fill.stops[1][0]*168+152,158,'The sea is opaque by the exact last image row');
assert(a.moves.some(([x,y])=>y>=158&&y<178),'Animated wave detail must exist in the old static-strip region');
assert.deepEqual(normal.draws[0].rect,[0,178,960,142],'Other scenes retain their previous sea geometry');
assert.deepEqual(mid.draws[0].rect,[0,165,960,155],'The edge follows the scene dissolve continuously');
for(const weight of [0,.01,.2,.5,.8,.99,1]){
 const {draws}=paint(weight);
 const r=draws[0].rect;
 assert.equal(r[1]+r[3],320,'No uncovered bottom pixels at dissolve '+weight);
 assert(draws[0].fill.stops.every(([t])=>t>=0&&t<=1),'All gradient stops stay valid');
}
assert(!source.includes('#5A788F')&&!source.includes('#4D7488'),'No independently colored static water treatment');
console.log(JSON.stringify({continuousOcean:true,shoreJoin:[152,158],animatedFormerBand:true,transitionCoverage:true}));
