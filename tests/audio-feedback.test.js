'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const window={};vm.runInNewContext(fs.readFileSync(__dirname+'/../gameplay/audio.js','utf8'),{window,localStorage:{getItem:()=>null},setTimeout,clearTimeout,setInterval,clearInterval});
const player=new window.HarbourAudio();let notes=[];
player.ensure=()=>true;player.ctx={currentTime:3};player.fx={gain:{setTargetAtTime(){}}};
player.note=(...args)=>notes.push(args);
let checks=0;const motifs=[];
for(let tier=0;tier<5;tier++){
 notes=[];player.effect('result',tier);assert(notes.length>=2);assert(notes.every(n=>n[1]>=3&&n[2]>0));motifs.push(JSON.stringify(notes.map(n=>n.slice(0,3))));checks++;
}
assert.equal(new Set(motifs).size,5,'Each result tier has its own short melody');checks++;
notes=[];player.effect('result',4,false);const normal=notes.length;
notes=[];player.effect('result',4,true);assert.equal(notes.length,normal+2,'Personal best adds a separate soft motif');checks++;
for(const cue of ['start','hop','duck','flower','gold','combo','milestone','splash','saved']){notes=[];player.effect(cue);assert(notes.length>0);assert.equal(player.lastEffect,cue);checks++;}
player.sfxOn=false;notes=[];player.effect('gold');assert.equal(notes.length,0,'SFX mute is independent and respected');checks++;
const runner=fs.readFileSync(__dirname+'/../gameplay/runner.js','utf8');
assert(runner.includes("music.effect('saved')"));assert(runner.includes("music.effect('result',level,record)"));checks++;
console.log(JSON.stringify({audioFeedbackChecks:checks,resultMelodies:5,productionWrites:0}));
