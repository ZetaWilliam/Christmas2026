'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'harbour-build-'));
try{
 fs.cpSync(path.join(root,'gameplay'),path.join(tmp,'gameplay'),{recursive:true});
 const source=fs.readFileSync(path.join(root,'index.html'),'utf8');fs.writeFileSync(path.join(tmp,'index.html'),source);
 execFileSync(process.execPath,[path.join(root,'scripts/build-site.js')],{cwd:tmp});
 const h=fs.readFileSync(path.join(tmp,'public/index.html'),'utf8');
 const formStart='  <!-- 报名表单 -->',formEnd='  <!-- 报名成功弹窗与电子票 -->',game='  <!-- Santa Harbour Dash: Auckland Christmas endless runner -->';
 const originalForm=source.slice(source.indexOf(formStart),source.indexOf(formEnd));
 assert(h.includes(originalForm),'The RSVP form must be byte-for-byte unchanged');
 assert(h.indexOf('id="rsvp"')<h.indexOf('id="game"'),'Game must follow registration');
 assert(!h.includes('A little Chrome-Dino-style harbour run:'),'Remove long game intro');
 assert(!h.includes('Just for fun — this leaderboard is separate from RSVP'),'Remove long development credit paragraph');
 assert(!h.includes('function runnerSpawnObstacle'),'Legacy runner must not run twice');
 for(const file of ['engine.js','audio.js','renderer.js','polish.js','recorded-audio.js','runner.js','runner.css']){
  assert(h.includes('/gameplay/'+file));
  let expected=fs.readFileSync(path.join(root,'gameplay',file),'utf8');
  if(file==='polish.js')expected=expected.replaceAll("'Christmas Bells'","'Instrumental 1'").replaceAll("'Christmas Bossa'","'Instrumental 2'").replaceAll('Switch original Christmas instrumental','Switch instrumental background music');
  if(file==='runner.js')expected=expected.replaceAll("'Harbour Pop ↻'","'Instrumental 1 ↻'").replaceAll("'Summer Bossa ↻'","'Instrumental 2 ↻'");
  assert.equal(fs.readFileSync(path.join(tmp,'public/gameplay',file),'utf8'),expected);
 }
 const art=fs.readFileSync(path.join(tmp,'public/gameplay/art/atlas.webp'));
 assert.equal(art.toString('ascii',0,4),'RIFF');assert.equal(art.toString('ascii',8,12),'WEBP');
 const authStart='    let isAuthorized = false;',legacy='    // Santa Harbour Dash — Dino-style Auckland endless runner';
 const originalNonGame=source.slice(source.indexOf(authStart),source.indexOf(legacy));
 assert(h.includes(originalNonGame),'Cloud RSVP, teams, organiser code must be unchanged');
 assert.equal(fs.readFileSync(path.join(tmp,'index.html'),'utf8'),source,'Build never modifies source template');
 const {Engine}=require('../gameplay/engine.js'),e=new Engine();
 const hitArea=e.playerBoxes().reduce((n,b)=>n+b.w*b.h,0),pickupArea=e.pickupBoxes().reduce((n,b)=>n+b.w*b.h,0);
 assert(hitArea<pickupArea*.8,'Hazard collision should be smaller without reducing reward pickup');
 const prose=h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
 const visible=(prose.match(/>([^<]*)</g)||[]).join(' ');
 assert(!/\b(?:Santa|Christmas|Xmas)\b/i.test(visible),'Neutral authored page wording');
 for(const value of prose.matchAll(/(?:aria-label|title|placeholder)="([^"]*)"/g))assert(!/\b(?:Santa|Christmas|Xmas)\b/i.test(value[1]),'Neutral accessible labels');
 assert(prose.includes('Harbour Dash'));assert(prose.includes('View Escapade Event Info'));
 for(const file of ['bells-bright.mp3','bells-ensemble.mp3','CREDITS.md'])assert(fs.existsSync(path.join(tmp,'public/gameplay/music',file)));
 console.log('Summer build checks passed: RSVP/cloud source unchanged, game after form, art/audio complete, reduced hitbox.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
