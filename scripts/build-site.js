'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync('index.html','utf8');
const begin='    // Santa Harbour Dash — Dino-style Auckland endless runner',end='    // 微粒动画';
const start=source.indexOf(begin),finish=source.indexOf(end,start);
if(start<0||finish<=start||source.indexOf(begin,start+begin.length)>=0)throw Error('Cannot isolate legacy game. Source left unchanged.');
const version=require(path.resolve('gameplay/engine.js')).version;
let html=source.slice(0,start)+'    // The isolated Harbour Dash modules are loaded below.\n'+source.slice(finish);
const gameMarker='  <!-- Santa Harbour Dash: Auckland Christmas endless runner -->',rsvpMarker='  <!-- 报名表单 -->',modalMarker='  <!-- 报名成功弹窗与电子票 -->';
const a=html.indexOf(gameMarker),b=html.indexOf(rsvpMarker),c=html.indexOf(modalMarker);
if(a>=0){
 if(!(a<b&&b<c))throw Error('Unexpected event section order. Refusing to alter RSVP.');
 let game=html.slice(a,b);
 // Remove the two introductory/development paragraphs, not event information or form labels.
 game=game.replace(/<p\b[^>]*>\s*A little Chrome-Dino-style harbour run:[\s\S]*?<\/p>/,'');
 game=game.replace(/<p\b[^>]*>\s*Just for fun — this leaderboard is separate from RSVP[\s\S]*?<\/p>/,'');
 game=game.replace('Just for fun · Auckland Christmas runner','Auckland · Summer 2026');
 html=html.slice(0,a)+html.slice(b,c)+game+html.slice(c);
}
const files=['engine.js','audio.js','renderer.js','runner.js'];
html=html.replace('</head>',`  <meta name="harbour-build" content="${version}">\n  <link rel="stylesheet" href="/gameplay/runner.css?v=${version}">\n</head>`)
 .replace('</body>',files.map(f=>`  <script src="/gameplay/${f}?v=${version}" defer></script>`).join('\n')+'\n</body>');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]);
for(const file of files)new vm.Script(fs.readFileSync('gameplay/'+file,'utf8'),{filename:file});
for(const id of ['runnerCanvas','runnerStartBtn','runnerDuckBtn','runnerComboBadge','runnerLeaderboard','teamApproach','rsvpForm','rosterModal'])if(!html.includes(id))throw Error('Missing retained UI: '+id);
if(html.includes('function runnerSpawnObstacle()'))throw Error('Legacy game would start twice.');
fs.mkdirSync('public/gameplay/art',{recursive:true});
fs.writeFileSync('public/index.html',html);
for(const file of [...files,'runner.css'])fs.copyFileSync('gameplay/'+file,'public/gameplay/'+file);
const parts=Array.from({length:5},(_,i)=>`gameplay/art/atlas.${i}.b64`);
if(parts.every(f=>fs.existsSync(f))){const atlas=Buffer.from(parts.map(f=>fs.readFileSync(f,'utf8').trim()).join(''),'base64');if(atlas.toString('ascii',0,4)!=='RIFF'||atlas.toString('ascii',8,12)!=='WEBP')throw Error('Artwork is not a valid WebP');fs.writeFileSync('public/gameplay/art/atlas.webp',atlas);}
else if(a>=0)throw Error('Production artwork incomplete.');
console.log(`Built ${version}: original RSVP and APIs retained; game follows RSVP; original instrumental audio and illustrated assets included.`);
