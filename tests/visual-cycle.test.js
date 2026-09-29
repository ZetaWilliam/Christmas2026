'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

const rendererSource=fs.readFileSync('gameplay/renderer.js','utf8');
const window={};
vm.runInNewContext(rendererSource,{window,Image:function(){}});
const cycle=window.HarbourVisualCycle;
assert(cycle,'Renderer must expose its day-night cycle for regression testing');
assert.equal(cycle.seconds,120,'Full day-night cycle is 120 seconds');
assert(cycle.state(0).night<1e-9,'Cycle starts in full daylight');
assert(cycle.state(60).night>.999,'Mid-cycle reaches full night');
assert(cycle.state(120).night<1e-9,'Cycle returns seamlessly to daylight');

let dark=0,total=2400;
for(let i=0;i<total;i++)if(cycle.state(i/total*cycle.seconds).night>=.5)dark++;
const darkShare=dark/total;
assert(darkShare>.245&&darkShare<.255,'Visible night must occupy about one quarter of the 120-second cycle (about 30 seconds).');
assert(Math.abs(cycle.state(45).night-.5)<.001,'Night threshold begins around 45 seconds.');
assert(cycle.state(60).night>.999,'Mid-cycle still reaches full night.');
assert(Math.abs(cycle.state(75).night-.5)<.001,'Night threshold ends around 75 seconds.');

const drawCall=rendererSource.indexOf('this.environmentLight(p);');
const starHook=rendererSource.indexOf("if(typeof this.nightSkyHighlights==='function')this.nightSkyHighlights(p);");
const santaCall=rendererSource.indexOf('this.santa(p);this.particles();');
const overlayCall=rendererSource.indexOf("if(e.state!=='running')this.overlay();");
assert(santaCall>=0&&drawCall>santaCall&&starHook>drawCall&&overlayCall>starHook,'Whole-scene lighting stays before star highlights, while pause/result overlay remains on top');
assert(rendererSource.includes("c.globalAlpha=p.night*.34"),'Whole-scene darkness must scale continuously with night');
assert(rendererSource.includes("c.fillStyle='#07162B'"),'Night lighting uses a full-frame deep-blue wash');
assert(rendererSource.includes("c.globalAlpha=p.warm*.055"),'Dawn/dusk warmth is also applied to the whole frame');

const runner=fs.readFileSync('gameplay/runner.js','utf8');
assert(runner.includes("{min:20000,id:'legend',band:'high',name:'Harbour Hero'}"),'Top tier must start at 20000');
assert(runner.includes('const scoreMilestones=[2000,5000,10000,20000];'),'Visible score milestones must end at 20000');
assert(!runner.includes("{min:8000,id:'legend'"),'Legacy 8000-point top tier must not return');

console.log(JSON.stringify({cycleSeconds:cycle.seconds,visibleNightSeconds:Number((cycle.seconds*darkShare).toFixed(1)),darkShare:Number(darkShare.toFixed(3)),topTier:20000,wholeSceneLighting:true,starsAfterNightLighting:true}));
