'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
require('../tests/rowing-rig.test.js');
require('../tests/coastline.test.js');
require('../tests/scene-loading.test.js');
require('../tests/ocean-seam.test.js');
require('../tests/christchurch-art.test.js');
require('../tests/dunedin-art.test.js');
require('../tests/audio-feedback.test.js');
const source=fs.readFileSync('index.html','utf8');
const begin='    // Santa Harbour Dash — Dino-style Auckland endless runner',end='    // 微粒动画';
const start=source.indexOf(begin),finish=source.indexOf(end,start);
if(start<0||finish<=start||source.indexOf(begin,start+begin.length)>=0)throw Error('Cannot isolate legacy game. Source left unchanged.');
const version='2026.10.03-scene-art.33';
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
for(const id of ['runnerCanvas','runnerStartBtn','runnerDuckBtn','runnerComboBadge','runnerLeaderboard','teamApproach','teamMessageBoardTitle','teamMessageList','teamMessageAdminBtn','teamMessageAdminTools','rsvpForm','rosterModal'])if(!html.includes(id))throw Error('Missing retained UI: '+id);
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
const panorama=Buffer.from(fs.readFileSync('gameplay/art/coast-approved.b64','utf8').trim(),'base64');
if(panorama.toString('ascii',0,4)!=='RIFF'||panorama.toString('ascii',8,12)!=='WEBP')throw Error('Invalid approved panorama artwork');
if(crypto.createHash('sha256').update(panorama).digest('hex')!=='19b24eec043db1fcdc30cd7be479be1b8803b0cd3882155b06781a7c9907a4b3')throw Error('Approved panorama integrity check failed');
fs.writeFileSync('public/gameplay/art/coast-panorama.webp',panorama);
const sceneHashes={
  auckland:'2cc0531da6d51cebaa3b6504567c0e532c437bac148639743ba57456dd2bf59a',
  queenstown:'ad863dac256512f76c8a970144ff004853c4ebcff588e415bdefc0fc31f33602',
  milford:'606417594644ced1dc22bc17cf0a17bdf661d864e51b2534005eb1f7edac4f38',
  christchurch:'ae270dad15fb5022b5876013da81ef0345378615e21cfa7bf041d0d22ebbe5ab',
  dunedin:'9afb9889fc6c84e3833763ac5152e9a3ac70056732d641f5c14370c391acb279',
  wellington:'ee8a3d2b0de89d0d43d76f4600a04d7039ba3e2e932a5c87281148555b32c8d7'
};
fs.mkdirSync('public/gameplay/art/scenes',{recursive:true});
for(const [id,sha] of Object.entries(sceneHashes)){
  const encoded=id==='christchurch'
    ? Array.from({length:4},(_,i)=>fs.readFileSync('gameplay/art/scenes/christchurch-shoreline.'+i+'.b64','utf8').trim()).join('')
    : id==='dunedin'
      ? Array.from({length:6},(_,i)=>fs.readFileSync('gameplay/art/scenes/dunedin-waterfront.'+i+'.b64','utf8').trim()).join('')
      : fs.readFileSync('gameplay/art/scenes/'+id+'.b64','utf8').trim();
  const data=Buffer.from(encoded,'base64');
  if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WEBP')throw Error('Invalid scene artwork: '+id);
  if(crypto.createHash('sha256').update(data).digest('hex')!==sha)throw Error('Scene artwork integrity check failed: '+id);
  fs.writeFileSync('public/gameplay/art/scenes/'+id+'.webp',data);
}
const capeReingaSvg=fs.readFileSync('gameplay/art/scenes/cape-reinga.svg','utf8');
if(!capeReingaSvg.includes('<svg')||!capeReingaSvg.includes('Cape Reinga')&&!capeReingaSvg.includes('lighthouse'))throw Error('Invalid Cape Reinga artwork');
fs.writeFileSync('public/gameplay/art/scenes/cape-reinga.svg',capeReingaSvg);
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
console.log(`Built ${version}: refresh only the Wellington and Cape Reinga panorama artwork; preserve the existing route, ocean seam, gameplay, RSVP and site behavior.`);
