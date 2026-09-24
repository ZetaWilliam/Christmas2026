'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');

const code=fs.readFileSync(__dirname+'/../api/teams.js','utf8');
let calls=[];
const sql=async(strings,...args)=>{
  const query=strings.join('?');calls.push({query,args});
  if(query.includes('WITH best_per_player')) return [
    {id:11,name:'The Receptors',member_count:4,journey_distance:2150,journey_flowers:16,journey_contributors:3},
    {id:12,name:'PK Crew',member_count:6,journey_distance:3800,journey_flowers:22,journey_contributors:3}
  ];
  throw Error('Unexpected SQL in crew test: '+query.slice(0,80));
};
const context={
  module:{exports:{}},
  require(name){
    if(name==='@neondatabase/serverless') return {neon:()=>sql};
    if(name==='node:crypto') return {randomBytes:()=>Buffer.from('1234567890','hex')};
    throw Error('Unexpected module '+name);
  },
  process:{env:{DATABASE_URL:'stub',ADMIN_PASSCODE:'secret'}},
  console,
  Buffer
};
vm.runInNewContext(code,context);
const handler=context.module.exports;
async function request(query){
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(body){this.body=JSON.parse(JSON.stringify(body));return this;}};
  await handler({method:'GET',query},res);return res;
}
(async()=>{
  const r=await request({list:'1'});
  assert.equal(r.code,200);
  assert.equal(r.body.teams.length,2);
  const open=r.body.teams[0],full=r.body.teams[1];
  assert.equal(open.remaining,2);assert.equal(open.full,false);
  assert.equal(open.journey.distance,2150);
  assert.equal(open.journey.flowers,16);
  assert.equal(open.journey.contributors,3);
  assert.equal(open.journey.stage,'Devonport');
  assert.equal(open.journey.next,'Rangitoto');
  assert.equal(open.journey.target,3600);
  assert(open.journey.progress>=59&&open.journey.progress<=60);
  assert.equal(full.full,true);assert.equal(full.journey.progress,100);
  assert(!JSON.stringify(r.body).includes('email'));
  assert(!JSON.stringify(r.body).includes('invite_code'));
  assert(calls[0].query.includes('rn <= 3'),'Crew Journey must cap contributions to three best players.');
  assert(calls[0].query.includes('runner_scores'),'Crew Journey must be derived from game runs.');

  const runner=fs.readFileSync(__dirname+'/../gameplay/runner.js','utf8');
  for(const needle of ['runnerCrewDock','Complete the Crew','loadCrewDock','chooseOpenCrew','selectExistingTeam','Happy to join any crew'])
    assert(runner.includes(needle),'Missing crew UX: '+needle);
  assert(runner.includes("teamInput.value=team.name"),'Selecting a crew tags the game score with the exact crew name.');
  assert(runner.includes("confirm your RSVP")||runner.includes("Confirm or update your RSVP"),'Crew selection must remain provisional until RSVP confirmation.');
  console.log(JSON.stringify({crewApi:'ok',privacy:'aggregate only',journey:'top 3 best players',gameToRsvp:'wired'},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
