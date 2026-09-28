/* Santa Harbour Dash browser adapter. RSVP and organiser code are deliberately independent. */
(() => {
  'use strict';
  const api=window.HarbourEngine, $=id=>document.getElementById(id);
  const canvas=$('runnerCanvas');if(!canvas||!api)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const eng=new api.Engine({width:window.innerWidth<640?640:960});
  const art=new window.HarbourRenderer(canvas,eng,window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const music=new window.HarbourAudio();
  const C=api.C, score=$('runnerScore'),distance=$('runnerDistance'),flowers=$('runnerFlowers'),gold=$('runnerGoldenFlowers'),speed=$('runnerSpeed');
  const start=$('runnerStartBtn'),hop=$('runnerHopBtn'),duck=$('runnerDuckBtn'),sound=$('runnerSoundBtn'),combo=$('runnerComboBadge'),message=$('runnerMessage');
  const panel=$('runnerSubmitPanel'),save=$('runnerSaveBtn'),status=$('runnerSaveStatus'),leaderboard=$('runnerLeaderboard');
  let resultFrame=0,raf=0,lastFrame=0,audio=null,saving=false,saved=false,runId=0,endedWall=0,held=new Set(),duckPointers=new Set(),soundOn=true,feedbackUntil=0;
  let best=0;try{best=Number(localStorage.getItem('harbour.personalBest.v2'))||0;soundOn=localStorage.getItem('harbour.sound')!=='off';}catch(_){}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage=canvas.parentElement;stage.classList.add('runner-stage');
  const helper=canvas.nextElementSibling,place=$('runnerLandmark').parentElement;
  const bar=document.createElement('div');bar.className='runner-context';stage.before(bar);
  helper.className='runner-help';helper.textContent='Space / ↑: hop · Hold ↓ / S: duck · P: pause';helper.id='runnerInstructions';bar.append(helper);
  place.className='runner-location';bar.append(place);
  message.className='runner-feedback';stage.after(message);message.setAttribute('role','status');
  canvas.setAttribute('aria-describedby','runnerInstructions');canvas.style.aspectRatio=eng.width+'/320';
  const pause=document.createElement('button');pause.type='button';pause.id='runnerPauseBtn';pause.className='runner-quiet-button';pause.textContent='Pause';pause.disabled=true;start.before(pause);
  const bestEl=document.createElement('span');bestEl.className='runner-best';bestEl.textContent='Your best: '+best;score.parentElement.append(bestEl);
  const runSummary=document.createElement('p');runSummary.id='runnerRunSummary';runSummary.className='runner-summary';panel.prepend(runSummary);
  const musicBtn=document.createElement('button');musicBtn.type='button';musicBtn.id='runnerMusicBtn';musicBtn.className='runner-quiet-button';sound.after(musicBtn);
  const trackBtn=document.createElement('button');trackBtn.type='button';trackBtn.id='runnerTrackBtn';trackBtn.className='runner-quiet-button runner-track';musicBtn.after(trackBtn);
  function musicLabels(){sound.textContent=music.sfxOn?'SFX On':'SFX Off';sound.setAttribute('aria-pressed',String(music.sfxOn));musicBtn.textContent=music.musicOn?'♫ Music On':'♫ Music Off';musicBtn.setAttribute('aria-pressed',String(music.musicOn));trackBtn.textContent=music.track===0?'Harbour Pop ↻':'Summer Bossa ↻';trackBtn.title='Switch instrumental background track';}
  musicLabels();musicBtn.addEventListener('click',()=>{music.toggleMusic();musicLabels();});trackBtn.addEventListener('click',()=>{music.switchTrack();musicLabels();});
  function tell(text,seconds=2.2){message.textContent=text;feedbackUntil=eng.time+seconds;}
  function ensureAudio(){return music.ensure();}
  function tone(){music.effect('flower');}
  function chime(type){music.effect(type==='end'?'splash':type);}
  const resultCard=document.createElement('div');resultCard.id='runnerResultCard';resultCard.className='runner-result';panel.prepend(resultCard);
  const teamInput=$('runnerTeamName');
  const teamNames=document.createElement('datalist');teamNames.id='runnerTeamNames';document.body.append(teamNames);
  if(teamInput)teamInput.setAttribute('list','runnerTeamNames');
  async function loadTeamNames(){
    try{
      const r=await fetch('/api/teams?list=1',{cache:'no-store'}),data=await r.json().catch(()=>({}));
      if(!r.ok||!Array.isArray(data.teams))return;
      teamNames.innerHTML=data.teams.map(t=>'<option value="'+text(t.name)+'"></option>').join('');
    }catch(_){}
  }
  const tiers=[
    {min:0,id:'explorer',band:'low',name:'Harbour Explorer'},
    {min:2000,id:'cruiser',band:'low',name:'Summer Cruiser'},
    {min:5000,id:'skipper',band:'mid',name:'Waitematā Skipper'},
    {min:10000,id:'hero',band:'mid',name:'Coastal Explorer'},
    {min:20000,id:'legend',band:'high',name:'Harbour Hero'}
  ];
  const bandMeta=Object.freeze({
    low:{label:'Starter Tier',headline:'Keep Going',hint:'The swell was rough this time — try another run.',sub:'Build your rhythm and watch the hazard markers.',secondary:'Back to Event'},
    mid:{label:'Coastal Explorer',headline:'Great Run',hint:'You made strong progress along the coast.',sub:'Keep Going Further',secondary:'Share'},
    high:{label:'Top Tier',headline:'Harbour Hero',hint:'You reached the top celebration tier.',sub:'A standout run along the coast.',secondary:'View Leaderboard'}
  });
  const scoreMilestones=[2000,5000,10000,20000];

  function milestoneMarkup(value){
    const nextIndex=scoreMilestones.findIndex(m=>value<m);
    const currentIndex=nextIndex<0?scoreMilestones.length-1:nextIndex;
    return '<div class="runner-result-progress" aria-label="Score milestones">'+scoreMilestones.map((m,i)=>{
      const complete=value>=m;
      const current=i===currentIndex;
      return '<div class="runner-result-milestone '+(complete?'is-complete ':'')+(current?'is-current':'')+'">'+
        '<span class="runner-result-dot" aria-hidden="true">'+(complete&&!current?'✓':'')+'</span>'+
        '<span class="runner-result-threshold">'+m.toLocaleString()+'</span></div>';
    }).join('')+'</div>';
  }

  async function shareResult(result,headline){
    const shareData={title:'Harbour Dash · '+headline,text:headline+' — '+result.score.toLocaleString()+' points',url:window.location.href.split('#')[0]+'#game'};
    try{
      if(navigator.share){await navigator.share(shareData);return;}
      await navigator.clipboard.writeText(shareData.text+' · '+shareData.url);
      status.textContent='Result link copied.';
    }catch(_){status.textContent='Share cancelled.';}
  }

  function celebrate(result){
    const tier=tiers.filter(t=>result.score>=t.min).at(-1),level=tiers.indexOf(tier),record=result.score>best,meta=bandMeta[tier.band];
    const headline=tier.band==='high'&&record?'New High Score':meta.headline;
    const tierLabel=tier.band==='high'&&record?'Harbour Hero · '+meta.label:meta.label;
    art.result={title:headline};
    resultCard.dataset.tier=tier.id;resultCard.dataset.band=tier.band;
    resultCard.setAttribute('aria-label',headline+' — '+result.score+' points');
    resultCard.classList.remove('runner-result-enter');void resultCard.offsetWidth;resultCard.classList.add('runner-result-enter');
    resultCard.innerHTML=
      '<div class="runner-result-kicker">'+tierLabel+(record&&tier.band!=='high'?' <span>NEW PERSONAL BEST</span>':'')+'</div>'+
      '<h3>'+headline+'</h3>'+
      '<p class="runner-result-hint">'+meta.hint+'</p>'+
      '<div class="runner-result-scorebox"><span>SCORE</span><div class="runner-result-score" id="runnerResultScore">0</div></div>'+
      milestoneMarkup(result.score)+
      '<div class="runner-result-tier"><strong>'+meta.label+'</strong><span>'+meta.sub+'</span></div>'+
      '<div class="runner-result-stats"><span><b>'+result.distance+'</b>distance</span><span><b>'+result.flowers+'</b>blooms</span><span><b>'+result.goldenFlowers+'</b>golden</span><span><b>×'+result.maxCombo+'</b>best combo</span></div>'+
      '<div class="runner-result-actions"><button type="button" class="runner-result-replay">Play Again</button><button type="button" class="runner-result-secondary">'+meta.secondary+'</button></div>';
    resultCard.querySelector('.runner-result-replay').addEventListener('click',()=>{if(saving)return;begin();canvas.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});});
    resultCard.querySelector('.runner-result-secondary').addEventListener('click',()=>{
      if(tier.band==='low'){document.getElementById('about')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});}
      else if(tier.band==='mid'){shareResult(result,headline);}
      else leaderboard.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});
    });
    cancelAnimationFrame(resultFrame);const target=resultCard.querySelector('#runnerResultScore'),now=performance.now();
    function count(t){const p=Math.min(1,(t-now)/720);target.textContent=Math.round(result.score*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)resultFrame=requestAnimationFrame(count);}
    if(reduced)target.textContent=result.score.toLocaleString();else resultFrame=requestAnimationFrame(count);
    music.pause();music.effect('result',level,record);
    if(record){best=result.score;bestEl.textContent='Your best: '+best;try{localStorage.setItem('harbour.personalBest.v2',String(best));}catch(_){}}
  }
  function controls(){const running=eng.state==='running',paused=eng.state==='paused';hop.disabled=!running;duck.disabled=!running;pause.disabled=!running&&!paused;pause.textContent=paused?'Resume':'Pause';start.disabled=running;start.textContent=running?'Running…':paused?'Resume':eng.state==='over'?'Run Again':'Start Run';}
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));draw();}
  function sync(){score.textContent=eng.score;distance.textContent=Math.floor(eng.distance);flowers.textContent=eng.flowers;gold.textContent='★'+eng.goldenFlowers;speed.textContent=(eng.speed/C.startSpeed).toFixed(2)+'×';combo.classList.toggle('hidden',eng.combo<2||eng.state!=='running');combo.textContent='COMBO ×'+eng.combo;}
  function handleEvents(){for(const ev of eng.drainEvents()){
    if(ev.type==='collect'){art.burst(ev.golden?'gold':'flower',176,207);chime(ev.golden?'gold':ev.combo>=3&&ev.combo%3===0?'combo':'flower');tell((ev.golden?'★ Golden pōhutukawa':'Pōhutukawa')+' +'+ev.points+(ev.combo>1?' · combo ×'+ev.combo:''));}
    if(ev.type==='chainComplete'){art.burst(ev.golden?'gold':'flower',176,177);music.effect('combo');tell('Perfect bloom line · '+ev.count+'/'+ev.count+'!',2.6);}
    if(ev.type==='comboEnd')combo.classList.add('hidden');
    if(ev.type==='milestone'){chime('milestone');if(eng.time>feedbackUntil)tell(ev.distance+' distance — keep going!');}
    if(ev.type==='pause')pauseRun();
    if(ev.type==='end'){endedWall=performance.now();controls();held.clear();duckPointers.clear();chime('end');celebrate(ev.result);panel.classList.remove('hidden');save.disabled=false;save.textContent='Submit Score';status.textContent='';tell(ev.reason,999);runSummary.textContent=ev.result.score+' points · '+ev.result.flowers+' blooms · '+ev.result.goldenFlowers+' gold · best combo ×'+ev.result.maxCombo;if(eng.score>best){best=eng.score;bestEl.textContent='Your best: '+best;try{localStorage.setItem('harbour.personalBest.v2',String(best));}catch(_){}}}
  }}
  function tick(now){if(eng.state!=='running')return;const audioState=music.diagnostic();musicBtn.title=audioState.musicError||'Toggle instrumental background music';musicBtn.dataset.unavailable=audioState.musicError?'true':'false';const dt=(now-lastFrame)/1000;lastFrame=now;eng.advance(dt);handleEvents();sync();draw();if(eng.state==='running')raf=requestAnimationFrame(tick);}
  function begin(){if(saving)return;if(eng.state==='paused'){resumeRun();return;}if(eng.state==='running')return;cancelAnimationFrame(raf);cancelAnimationFrame(resultFrame);art.splashes=[];art.result=null;panel.classList.remove('runner-score-saved');runId++;saved=false;held.clear();duckPointers.clear();eng.start(Math.floor(Math.random()*4294967295));ensureAudio();music.start();music.effect('start');panel.classList.add('hidden');save.disabled=false;save.textContent='Submit Score';status.textContent='';tell('A gentle start. Hop over ⚠ hazards; hold Duck for gulls.',3);controls();sync();canvas.focus({preventScroll:true});lastFrame=performance.now();raf=requestAnimationFrame(tick);}
  function pauseRun(){if(eng.state!=='running'&&eng.state!=='paused')return;eng.pause();music.pause();cancelAnimationFrame(raf);held.clear();duckPointers.clear();controls();tell('Paused — your run and combo are safe. Resume when ready.',999);sync();draw();}
  function resumeRun(){if(eng.state!=='paused')return;eng.resume();ensureAudio();music.start();controls();tell('Back on the water.',1);canvas.focus({preventScroll:true});lastFrame=performance.now();raf=requestAnimationFrame(tick);}
  function togglePause(){if(eng.state==='paused')resumeRun();else pauseRun();}
  function pressHop(){if(eng.state==='running'){if(eng.player.grounded)music.effect('hop');eng.hop();}}
  function updateDuck(){const on=held.size>0||duckPointers.size>0;if(on&&!eng.player.duck&&eng.state==='running')music.effect('duck');eng.duck(on);}
  function releaseControls(){held.clear();duckPointers.clear();eng.duck(false);}
  start.addEventListener('click',begin);pause.addEventListener('click',togglePause);
  sound.addEventListener('click',()=>{music.toggleEffects();musicLabels();if(music.sfxOn)music.effect('flower');});
  hop.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.preventDefault();canvas.focus({preventScroll:true});pressHop();});
  hop.addEventListener('click',ev=>{if(ev.detail===0)pressHop();});
  duck.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.preventDefault();duckPointers.add(ev.pointerId);try{duck.setPointerCapture(ev.pointerId);}catch(_){}canvas.focus({preventScroll:true});updateDuck();});
  function releasePointer(ev){duckPointers.delete(ev.pointerId);updateDuck();}
  for(const name of ['pointerup','pointercancel','lostpointercapture'])duck.addEventListener(name,releasePointer);
  window.addEventListener('pointerup',releasePointer);window.addEventListener('pointercancel',releasePointer);
  duck.addEventListener('keydown',ev=>{if([' ','Enter'].includes(ev.key)){ev.preventDefault();held.add('button');updateDuck();}});
  duck.addEventListener('keyup',ev=>{if([' ','Enter'].includes(ev.key)){ev.preventDefault();held.delete('button');updateDuck();}});
  canvas.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;ev.preventDefault();canvas.focus({preventScroll:true});if(eng.state==='running')pressHop();else if(eng.state==='paused')resumeRun();else if(performance.now()-endedWall>350)begin();});
  // Only the focused game accepts game keys. Site scrolling and RSVP text fields remain untouched.
  canvas.addEventListener('keydown',ev=>{if(ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase();if([' ','arrowup','w'].includes(k)){ev.preventDefault();if(ev.repeat)return;if(eng.state==='running')pressHop();else if(eng.state==='paused')resumeRun();else if(performance.now()-endedWall>350)begin();}else if(['arrowdown','s'].includes(k)){ev.preventDefault();held.add(k);updateDuck();}else if(k==='p'||k==='escape'){ev.preventDefault();if(!ev.repeat)togglePause();}});
  document.addEventListener('keyup',ev=>{held.delete(ev.key.toLowerCase());updateDuck();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseRun();});
  window.addEventListener('blur',()=>{releaseControls();pauseRun();});
  window.addEventListener('resize',()=>{if(eng.state==='running')pauseRun();resize();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pauseRun();},{threshold:0}).observe(canvas);
  function draw(){art.draw();}
  function text(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderBoard(rows){leaderboard.innerHTML=rows.length?rows.map((r,i)=>'<div class="runner-board-row"><span>'+(i<3?['🥇','🥈','🥉'][i]:'#'+(i+1))+'</span><div><strong>'+text(r.name)+'</strong>'+(r.team?'<small>'+text(r.team)+'</small>':'')+'<small>'+Number(r.flowers||0)+' blooms · ★'+Number(r.goldenFlowers||0)+' · combo ×'+Number(r.maxCombo||0)+'</small></div><b>'+Number(r.score||0)+'</b></div>').join(''):'<p class="runner-empty">No scores yet. Set your own harbour record.</p>';}
  async function load(){try{const r=await fetch('/api/game',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error();renderBoard(data.leaderboard||[]);}catch(_){leaderboard.textContent='Leaderboard unavailable. Your game still works; try Refresh.';}}
  async function submit(){if(saving||saved||!eng.result||eng.state!=='over')return;const name=$('runnerPlayerName').value.trim(),team=$('runnerTeamName').value.trim();if(name.length<2){status.textContent='Please enter a display name (2–30 characters).';$('runnerPlayerName').focus();return;}const payload={name,team,...eng.result},id=runId;saving=true;save.disabled=true;start.disabled=true;save.textContent='Saving…';status.textContent='';try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Unable to save. Please try again.');if(id!==runId)return;saved=true;renderBoard(data.leaderboard||[]);save.textContent='✓ Score Saved';music.effect('saved');status.textContent='Saved. Only your best run appears on the board.';panel.classList.add('runner-score-saved');}catch(error){if(id===runId){save.disabled=false;save.textContent='Retry Submit';status.textContent=error.message||'Connection lost. Your result is still here.';}}finally{saving=false;controls();}}
  save.addEventListener('click',submit);$('runnerRefreshLeaderboard').addEventListener('click',load);
  window.HarbourDash=Object.freeze({version:api.version,snapshot:()=>eng.snapshot(),audio:()=>music.diagnostic(),artReady:()=>art.ready});
  controls();sync();resize();load();loadTeamNames();
})();
