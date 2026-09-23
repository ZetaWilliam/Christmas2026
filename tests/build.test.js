'use strict';const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'harbour-build-'));
try{
 fs.mkdirSync(path.join(tmp,'gameplay'));for(const f of ['engine.js','runner.js','runner.css'])fs.copyFileSync(path.join(root,'gameplay',f),path.join(tmp,'gameplay',f));
 const prefix='<!doctype html><html><head></head><body><!-- rsvpForm rosterModal teamApproach runnerCanvas runnerStartBtn runnerDuckBtn runnerComboBadge runnerLeaderboard --><script>\nfunction handleFormSubmit(){return "unchanged";}\n';
 const legacy='    // Santa Harbour Dash — Dino-style Auckland endless runner\nfunction runnerSpawnObstacle(){return "old";}\n';
 const suffix='    // 微粒动画\nfunction animateSparkles(){return "unchanged";}\n</script></body></html>';
 fs.writeFileSync(path.join(tmp,'index.html'),prefix+legacy+suffix);
 execFileSync(process.execPath,[path.join(root,'scripts/build-site.js')],{cwd:tmp});
 const h=fs.readFileSync(path.join(tmp,'public/index.html'),'utf8');
 assert(h.includes('function handleFormSubmit(){return "unchanged";}'));assert(h.includes('function animateSparkles(){return "unchanged";}'));assert(!h.includes('function runnerSpawnObstacle'));assert(h.includes('/gameplay/engine.js'));assert(h.includes('/gameplay/runner.js'));assert.equal(fs.readFileSync(path.join(tmp,'index.html'),'utf8'),prefix+legacy+suffix);
 console.log('Build isolation assertions passed: source template and non-game code preserved.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
