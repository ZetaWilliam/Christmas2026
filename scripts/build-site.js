'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
require('../tests/rowing-rig.test.js');
require('../tests/coastline.test.js');
require('../tests/audio-feedback.test.js');
const source=fs.readFileSync('index.html','utf8');
const begin='    // Santa Harbour Dash — Dino-style Auckland endless runner',end='    // 微粒动画';
const start=source.indexOf(begin),finish=source.indexOf(end,start);
if(start<0||finish<=start||source.indexOf(begin,start+begin.length)>=0)throw Error('Cannot isolate legacy game. Source left unchanged.');
const version='2026.09.24-coast.2';
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
// Only authored display text is changed. Keep identifiers, artwork, CSS and data intact.
html=html.replaceAll('Santa Harbour Dash','Harbour Dash')
 .replaceAll('>Santa Dash<','>Harbour Dash<')
 .replaceAll('e.g. Harbour Santa','e.g. Harbour Explorer')
 .replaceAll('View Escapade Christmas Info','View Escapade Event Info');
const files=['engine.js','audio.js','renderer.js','polish.js','coastline.js','recorded-audio.js','runner.js'];
function displayCopy(file,text){
 if(file==='polish.js')return text.replaceAll("'Christmas Bells'","'Instrumental 1'").replaceAll("'Christmas Bossa'","'Instrumental 2'").replaceAll('Switch original Christmas instrumental','Switch instrumental background music');
 if(file==='runner.js')return text.replaceAll("'Harbour Pop ↻'","'Instrumental 1 ↻'").replaceAll("'Summer Bossa ↻'","'Instrumental 2 ↻'");
 return text;
}
html=html.replace('</head>',`  <meta name="harbour-build" content="${version}">\n  <link rel="stylesheet" href="/gameplay/runner.css?v=${version}">\n</head>`)
 .replace('</body>',files.map(f=>`  <script src="/gameplay/${f}?v=${version}" defer></script>`).join('\n')+'\n</body>');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new vm.Script(m[1]);
for(const file of files)new vm.Script(fs.readFileSync('gameplay/'+file,'utf8'),{filename:file});
for(const id of ['runnerCanvas','runnerStartBtn','runnerDuckBtn','runnerComboBadge','runnerLeaderboard','teamApproach','rsvpForm','rosterModal'])if(!html.includes(id))throw Error('Missing retained UI: '+id);
if(html.includes('function runnerSpawnObstacle()'))throw Error('Legacy game would start twice.');
fs.mkdirSync('public/gameplay/art',{recursive:true});
fs.writeFileSync('public/index.html',html);
for(const file of [...files,'runner.css'])fs.writeFileSync('public/gameplay/'+file,displayCopy(file,fs.readFileSync('gameplay/'+file,'utf8')));
const parts=Array.from({length:5},(_,i)=>`gameplay/art/atlas.${i}.b64`);
if(parts.every(f=>fs.existsSync(f))){const atlas=Buffer.from(parts.map(f=>fs.readFileSync(f,'utf8').trim()).join(''),'base64');if(atlas.toString('ascii',0,4)!=='RIFF'||atlas.toString('ascii',8,12)!=='WEBP')throw Error('Artwork is not a valid WebP');fs.writeFileSync('public/gameplay/art/atlas.webp',atlas);}
else if(a>=0)throw Error('Production artwork incomplete.');
const coast=Buffer.from(fs.readFileSync('gameplay/art/coast.b64','utf8').trim(),'base64');
if(coast.toString('ascii',0,4)!=='RIFF'||coast.toString('ascii',8,12)!=='WEBP')throw Error('Invalid coast artwork');
if(crypto.createHash('sha256').update(coast).digest('hex')!=='dd14f17cb595a37a5ea03fdd0173554ee195e7a4e4629ce042f024df137fcdc9')throw Error('Coast artwork integrity check failed');
fs.writeFileSync('public/gameplay/art/coast.webp',coast);
// Serve the credited recordings from our own origin; never hotlink during gameplay.
const manifest=JSON.parse(fs.readFileSync('gameplay/music/manifest.json','utf8'));
if(manifest.length!==2)throw Error('Expected two licensed recordings');
fs.mkdirSync('public/gameplay/music',{recursive:true});
for(const item of manifest){
 if(!['bells-bright.mp3','bells-ensemble.mp3'].includes(item.file))throw Error('Unexpected music path');
 const data=fs.readFileSync('gameplay/music/'+item.file);
 if(data.length!==item.bytes||crypto.createHash('sha256').update(data).digest('hex')!==item.sha256)throw Error('Recording integrity check failed: '+item.file);
 fs.writeFileSync('public/gameplay/music/'+item.file,data);
}
fs.copyFileSync('gameplay/music/CREDITS.md','public/gameplay/music/CREDITS.md');
console.log(`Built ${version}: neutral page labels, clean connected coast, unchanged water/gameplay and credited recorded instrumentals.`);
