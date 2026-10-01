'use strict';
// Integrity pin for the visually verified Christchurch shoreline repair.
// The 768x144 frame and existing spire anchor remain unchanged.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const encoded=Array.from({length:4},(_,i)=>
  fs.readFileSync(path.join(__dirname,'../gameplay/art/scenes/christchurch-shoreline.'+i+'.b64'),'utf8').trim()).join('');
const image=Buffer.from(encoded,'base64');
assert.equal(image.toString('base64'),encoded,'Artwork payload must not be truncated or mistranscribed');
assert.equal(image.toString('ascii',0,4),'RIFF');
assert.equal(image.toString('ascii',8,12),'WEBP');
assert.equal(image.readUInt32LE(4)+8,image.length,'RIFF length must cover the complete image');
assert.equal(image.length,22974);
assert.equal(crypto.createHash('sha256').update(image).digest('hex'),
  'ae270dad15fb5022b5876013da81ef0345378615e21cfa7bf041d0d22ebbe5ab',
  'Only the approved clean shoreline artwork may be published');
assert.equal(image.toString('ascii',12,16),'VP8 ');
assert.equal(image.readUInt16LE(26)&0x3fff,768);
assert.equal(image.readUInt16LE(28)&0x3fff,144);
console.log(JSON.stringify({christchurchShoreline:'verified',width:768,height:144,bytes:image.length}));
