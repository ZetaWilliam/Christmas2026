'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

const code=fs.readFileSync(__dirname+'/../api/messages.js','utf8');
let calls=[],mode='get';
const sql=async(strings,...args)=>{
  const query=strings.join('?').replace(/\s+/g,' ').trim();
  calls.push({query,args});
  if(query.startsWith('CREATE TABLE')||query.startsWith('CREATE INDEX')) return [];
  if(query.includes('SELECT id, display_name, message, created_at')) return [
    {id:2,display_name:'Aroha',message:'Anyone keen for a puzzle-heavy room?',created_at:'2026-09-29T00:01:00+13:00'},
    {id:1,display_name:'Zack',message:'Looking forward to the gathering!',created_at:'2026-09-29T00:00:00+13:00'}
  ];
  if(query.includes('SELECT 1 FROM event_messages')) return mode==='rate'? [{'?column?':1}] : [];
  if(query.includes('INSERT INTO event_messages')) return [];
  if(query.includes('DELETE FROM event_messages')) return [];
  throw Error('Unexpected SQL: '+query);
};
const context={
  module:{exports:{}},
  require(name){
    if(name==='@neondatabase/serverless') return {neon:()=>sql};
    throw Error('Unexpected module '+name);
  },
  process:{env:{DATABASE_URL:'stub'}},
  console
};
vm.runInNewContext(code,context);
const handler=context.module.exports;
assert.equal(handler.cleanName('  Aroha\n K  '),'Aroha K');
assert.equal(handler.cleanMessage('  Hi\t team!  '),'Hi team!');

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

  const html=fs.readFileSync(__dirname+'/../index.html','utf8');
  for(const needle of ['teamMessageBoardTitle','teamMessageList','teamMessageName','teamMessageText','teamMessageCount','postTeamMessage','refreshTeamMessages','Please keep it friendly and respectful.','maxlength="100"'])
    assert(html.includes(needle),'Missing message-board UI or friendliness guidance: '+needle);
  const formStart=html.indexOf('<form id="rsvpForm"'),formEnd=html.indexOf('</form>',formStart),board=html.indexOf('id="teamMessageBoardTitle"');
  assert(formStart>=0&&formEnd>formStart&&board>formEnd,'Message board must sit outside the RSVP form as an independent sidebar.');
  const teamChoicesStart=html.indexOf('id="teamChoices"'),teamChoicesEnd=html.indexOf('</div>\n\n          <div>\n            <label class="block text-xs font-bold uppercase tracking-wider text-pine/80 mb-1.5">',teamChoicesStart);
  const teamChoices=html.slice(teamChoicesStart,teamChoicesEnd);
  assert(!teamChoices.includes('teamMessageBoardTitle'),'Team choices must stay full-width without an embedded message board.');
  console.log(JSON.stringify({messageBoard:'ok',privacy:'nickname + message only',friendlyPrompt:true,limit:100,rateLimit:'15s/name'}));
})().catch(e=>{console.error(e);process.exit(1);});
