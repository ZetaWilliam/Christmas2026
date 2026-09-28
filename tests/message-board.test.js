'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),Buffer=require('node:buffer').Buffer;

const code=fs.readFileSync(__dirname+'/../api/messages.js','utf8');
const EXPECTED_HASH='47ac7ff1d61825000c3771813c2f6a5ef1922cd482ab033daf65d89699f2626c';
let calls=[],mode='get';
const sql=async(strings,...args)=>{
  const query=strings.join('?').replace(/\s+/g,' ').trim();
  calls.push({query,args});
  if(query.startsWith('CREATE TABLE')||query.startsWith('CREATE INDEX')) return [];
  if(query.includes('SELECT id, display_name, message, created_at')) return [
    {id:9,display_name:'Aroha',message:'Anyone keen for a puzzle-heavy room?',created_at:'2026-09-29T00:01:00+13:00'},
    {id:8,display_name:'Zack',message:'Looking forward to the gathering!',created_at:'2026-09-29T00:00:00+13:00'}
  ];
  if(query.includes('SELECT 1 FROM event_messages')) return mode==='rate'? [{'?column?':1}] : [];
  if(query.includes('INSERT INTO event_messages')) return [];
  if(query.includes('DELETE FROM event_messages')) return [];
  throw Error('Unexpected SQL: '+query);
};
const fakeCrypto={
  createHash(){
    let input='';
    return {
      update(v){input=String(v||'');return this;},
      digest(){
        if(input==='test-organizer-key') return Buffer.from(EXPECTED_HASH,'hex');
        return Buffer.alloc(32,0);
      }
    };
  },
  timingSafeEqual(a,b){return Buffer.compare(a,b)===0;}
};
const context={
  module:{exports:{}},
  Buffer,
  require(name){
    if(name==='@neondatabase/serverless') return {neon:()=>sql};
    if(name==='node:crypto') return fakeCrypto;
    throw Error('Unexpected module '+name);
  },
  process:{env:{DATABASE_URL:'stub'}},
  console
};
vm.runInNewContext(code,context);
const handler=context.module.exports;
assert.equal(handler.cleanName('  Aroha\n K  '),'Aroha K');
assert.equal(handler.cleanMessage('  Hi\t team!  '),'Hi team!');
assert.equal(handler.validOrganizerKey('test-organizer-key'),true);
assert.equal(handler.validOrganizerKey('wrong-key'),false);

async function request(method,body){
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(data){this.body=JSON.parse(JSON.stringify(data));return this;}};
  await handler({method,body},res);return res;
}
(async()=>{
  let r=await request('GET');
  assert.equal(r.code,200);
  assert.equal(r.body.messages.length,2);
  assert.equal(r.body.messages[0].name,'Aroha');
  assert(!JSON.stringify(r.body).includes('email'),'Message board must never expose RSVP email data.');
  assert(calls.some(c=>c.query.includes('WHERE id <= ?')&&c.args[0]===7),'Pre-launch test messages 1–7 must be cleared automatically.');

  calls=[];mode='post';
  r=await request('POST',{name:'  Mia  ',message:'  Happy to join a team!  '});
  assert.equal(r.code,201);assert.equal(r.body.ok,true);
  assert(calls.some(c=>c.query.includes('INSERT INTO event_messages')),'Posting must persist to the database.');
  const insert=calls.find(c=>c.query.includes('INSERT INTO event_messages'));
  assert.deepEqual(insert.args,['Mia','Happy to join a team!']);

  r=await request('POST',{name:'X',message:'hello'});
  assert.equal(r.code,400);
  r=await request('POST',{name:'Friendly User',message:'x'.repeat(101)});
  assert.equal(r.code,400);

  mode='rate';
  r=await request('POST',{name:'Mia',message:'Another one'});
  assert.equal(r.code,429);

  r=await request('POST',{action:'admin-auth',adminKey:'wrong-key'});
  assert.equal(r.code,401);
  r=await request('POST',{action:'admin-auth',adminKey:'test-organizer-key'});
  assert.equal(r.code,200);assert.equal(r.body.admin,true);

  calls=[];mode='get';
  r=await request('DELETE',{adminKey:'test-organizer-key',id:9});
  assert.equal(r.code,200);
  assert(calls.some(c=>c.query.includes('WHERE id = ?')&&c.args[0]===9),'Admin must be able to delete one message.');

  calls=[];
  r=await request('DELETE',{adminKey:'test-organizer-key',clearAll:true});
  assert.equal(r.code,200);
  assert(calls.some(c=>c.query==='DELETE FROM event_messages'),'Admin must be able to clear all messages.');

  r=await request('DELETE',{adminKey:'wrong-key',id:9});
  assert.equal(r.code,401);

  const html=fs.readFileSync(__dirname+'/../index.html','utf8');
  for(const needle of [
    'teamMessageBoardTitle','teamMessageList','teamMessageBoardCount','teamMessageName','teamMessageText','teamMessageCount',
    'postTeamMessage','refreshTeamMessages','Please keep it friendly and respectful.','maxlength="100"',
    'Newest first · scroll down for earlier messages ↓','overflow-y-scroll','scrollbar-gutter:stable',
    'teamMessageAdminBtn','teamMessageAdminTools','toggleMessageBoardAdmin','deleteTeamMessage','clearAllTeamMessages'
  ]) assert(html.includes(needle),'Missing message-board/admin UI: '+needle);
  const formStart=html.indexOf('<form id="rsvpForm"'),formEnd=html.indexOf('</form>',formStart),board=html.indexOf('id="teamMessageBoardTitle"');
  assert(formStart>=0&&formEnd>formStart&&board>formEnd,'Message board must sit outside the RSVP form as an independent sidebar.');
  assert(code.includes('LIMIT 100'),'Message API must return enough history for scrollback.');
  assert(!html.includes('Pohutukawa-9Dec26-Harbour!'),'Organizer key plaintext must never be shipped to the browser.');
  console.log(JSON.stringify({messageBoard:'admin-ready',privacy:'nickname + message only',friendlyPrompt:true,limit:100,history:100,adminDelete:true,prelaunchClearedThroughId:7}));
})().catch(e=>{console.error(e);process.exit(1);});
