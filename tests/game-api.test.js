'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../api/game.js','utf8');
let rows=[],recent=false,calls=[];
const sql=async(strings,...args)=>{
 const query=strings.join('?');calls.push({query,args});
 if(query.includes('SELECT 1'))return recent?[{}]:[];
 if(query.includes('INSERT INTO')){const [display_name,team_name,score,distance,flowers,golden_flowers,max_combo]=args;rows=[{display_name,team_name,score,distance,flowers,golden_flowers,max_combo}];return [];}
 if(query.includes('FROM (')){assert(query.split('FROM (')[0].includes('golden_flowers, max_combo'),'projection must retain all stats');return rows;}
 throw Error('Unexpected query');
};
const context={module:{exports:{}},require:name=>{assert.equal(name,'@neondatabase/serverless');return{neon:()=>sql};},process:{env:{DATABASE_URL:'local-test-stub'}},console};
vm.runInNewContext(code,context);const handler=context.module.exports;
async function request(method,body){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=JSON.parse(JSON.stringify(b));return this;}};await handler({method,body},res);return res;}
const good={name:'QA harbour',team:'',score:1510,distance:790,flowers:4,goldenFlowers:1,maxCombo:4,durationMs:24000};
(async()=>{let checks=0;
 let r=await request('POST',good);assert.equal(r.code,200);assert.equal(r.body.leaderboard[0].goldenFlowers,1);assert.equal(r.body.leaderboard[0].maxCombo,4);checks++;
 const g=await request('GET');assert.deepEqual(g.body,r.body);checks++;
 const before=calls.filter(x=>x.query.includes('INSERT')).length;
 for(const b of ['{',null,[],{...good,goldenFlowers:5},{...good,maxCombo:5},{...good,score:99999},{...good,flowers:null},{...good,score:'1510'},{...good,durationMs:900},{...good,goldenFlowers:101}]){r=await request('POST',b);assert.equal(r.code,400);checks++;}
 assert.equal(calls.filter(x=>x.query.includes('INSERT')).length,before);checks++;
 recent=true;r=await request('POST',good);assert.equal(r.code,429);checks++;
 r=await request('DELETE');assert.equal(r.code,405);checks++;
 console.log(JSON.stringify({apiChecks:checks,GET_POST_stats_equal:true,database:'stubbed; no production writes'},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
