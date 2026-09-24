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
  const crewDock=document.createElement('section');
  crewDock.id='runnerCrewDock';
  crewDock.className='runner-crew-dock';
  crewDock.innerHTML='<div class="runner-crew-head"><div><span>Complete the Crew</span><h3>Crew Journey</h3><p>Play on your own, then help a crew travel from the CBD to Rangitoto. Joining is optional and only becomes official when you confirm your RSVP.</p></div><button type="button" id="runnerCrewRefresh" class="runner-quiet-button">Refresh crews</button></div><div id="runnerCrewNotice" class="runner-crew-notice" aria-live="polite"></div><div id="runnerCrewList" class="runner-crew-list"><p class="runner-empty">Loading open crews…</p></div><div class="runner-crew-actions"><button type="button" id="runnerCreateCrew">Create a crew</button><button type="button" id="runnerFlexibleCrew">Happy to join any crew</button></div>';
  const gameGrid=leaderboard.closest('aside')?.parentElement;
  if(gameGrid)gameGrid.after(crewDock);
  const crewList=$('runnerCrewList'),crewNotice=$('runnerCrewNotice');
  let crewTeams=[],crewStops=[];
  const crewNames=document.createElement('datalist');crewNames.id='runnerCrewNames';document.body.append(crewNames);
  const teamInput=$('runnerTeamName');if(teamInput)teamInput.setAttribute('list','runnerCrewNames');
  const musicBtn=document.createElement('button');musicBtn.type='button';musicBtn.id='runnerMusicBtn';musicBtn.className='runner-quiet-button';sound.after(musicBtn);
  const trackBtn=document.createElement('button');trackBtn.type='button';trackBtn.id='runnerTrackBtn';trackBtn.className='runner-quiet-button runner-track';musicBtn.after(trackBtn);
  function musicLabels(){sound.textContent=music.sfxOn?'SFX On':'SFX Off';sound.setAttribute('aria-pressed',String(music.sfxOn));musicBtn.textContent=music.musicOn?'♫ Music On':'♫ Music Off';musicBtn.setAttribute('aria-pressed',String(music.musicOn));trackBtn.textContent=music.track===0?'Harbour Pop ↻':'Summer Bossa ↻';trackBtn.title='Switch instrumental background track';}
  musicLabels();musicBtn.addEventListener('click',()=>{music.toggleMusic();musicLabels();});trackBtn.addEventListener('click',()=>{music.switchTrack();musicLabels();});
  function tell(text,seconds=2.2){message.textContent=text;feedbackUntil=eng.time+seconds;}
  function ensureAudio(){return music.ensure();}
  function tone(){music.effect('flower');}
  function chime(type){music.effect(type==='end'?'splash':type);}
  const resultCard=document.createElement('div');resultCard.id='runnerResultCard';resultCard.className='runner-result';panel.prepend(resultCard);
  const tiers=[
    {min:0,id:'explorer',name:'Harbour Explorer',title:'A good day on the water',hint:'Take a breath, watch the warning markers, and enjoy another voyage.'},
    {min:400,id:'cruiser',name:'Summer Cruiser',title:'Finding your sea legs!',hint:'A smooth start. Keep your hops steady and hold Duck for the low gulls.'},
    {min:900,id:'skipper',name:'Waitematā Skipper',title:'Beautifully navigated!',hint:'Nice timing! Keep collecting blooms to build your next combo.'},
    {min:1800,id:'hero',name:'Harbour Hero',title:'You made waves!',hint:'Sharp reactions and a lovely haul of blooms. A run worth sharing.'},
    {min:3200,id:'legend',name:'Harbour Legend',title:'What a voyage!',hint:'An outstanding harbour run. That is a score to celebrate.'}
  ];
  function celebrate(result){const tier=tiers.filter(t=>result.score>=t.min).at(-1),level=tiers.indexOf(tier),record=result.score>best;art.result=tier;resultCard.dataset.tier=tier.id;resultCard.setAttribute('aria-label',tier.name+' — '+result.score+' points');resultCard.classList.remove('runner-result-enter');void resultCard.offsetWidth;resultCard.classList.add('runner-result-enter');resultCard.innerHTML='<div class="runner-result-label">'+tier.name+(record?' <span>NEW PERSONAL BEST</span>':'')+'</div><h3>'+tier.title+'</h3><div class="runner-result-score" id="runnerResultScore">0</div><p>'+tier.hint+'</p><div class="runner-result-stats"><span><b>'+result.distance+'</b>distance</span><span><b>'+result.flowers+'</b>blooms</span><span><b>'+result.goldenFlowers+'</b>golden</span><span><b>×'+result.maxCombo+'</b>best combo</span></div><button type="button" class="runner-result-replay">Another voyage →</button>';
    resultCard.querySelector('button').addEventListener('click',()=>{if(saving)return;begin();canvas.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'});});
    cancelAnimationFrame(resultFrame);const target=resultCard.querySelector('#runnerResultScore'),now=performance.now();function count(t){const p=Math.min(1,(t-now)/750);target.textContent=Math.round(result.score*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)resultFrame=requestAnimationFrame(count);}if(reduced)target.textContent=result.score.toLocaleString();else resultFrame=requestAnimationFrame(count);
    music.pause();music.effect('result',level,record);if(record){best=result.score;bestEl.textContent='Your best: '+best;try{localStorage.setItem('harbour.personalBest.v2',String(best));}catch(_){}}
  }
  function controls(){const running=eng.state==='running',paused=eng.state==='paused';hop.disabled=!running;duck.disabled=!running;pause.disabled=!running&&!paused;pause.textContent=paused?'Resume':'Pause';start.disabled=running;start.textContent=running?'Running…':paused?'Resume':eng.state==='over'?'Run Again':'Start Run';}
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));draw();}
  function sync(){score.textContent=eng.score;distance.textContent=Math.floor(eng.distance);flowers.textContent=eng.flowers;gold.textContent='★'+eng.goldenFlowers;speed.textContent=(eng.speed/C.startSpeed).toFixed(2)+'×';combo.classList.toggle('hidden',eng.combo<2||eng.state!=='running');combo.textContent='COMBO ×'+eng.combo;}
  function handleEvents(){for(const ev of eng.drainEvents()){
    if(ev.type==='collect'){art.burst(ev.golden?'gold':'flower',176,207);chime(ev.golden?'gold':ev.combo>=3&&ev.combo%3===0?'combo':'flower');tell((ev.golden?'★ Golden pōhutukawa':'Pōhutukawa')+' +'+ev.points+(ev.combo>1?' · combo ×'+ev.combo:''));}
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
  function clearRsvpTeamSelection(){
    const code=$('teamCode');
    if(code){code.value='';code.dispatchEvent(new Event('input',{bubbles:true}));}
  }
  function showCrewNotice(html){
    crewNotice.innerHTML=html||'';
    crewNotice.classList.toggle('is-visible',Boolean(html));
  }
  function reviewRsvp(){
    const rsvp=$('rsvp');if(rsvp)rsvp.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
  }
  function chooseOpenCrew(team){
    if(!team||team.full)return;
    if(teamInput)teamInput.value=team.name;
    if(typeof window.selectExistingTeam==='function')window.selectExistingTeam(Number(team.id));
    showCrewNotice('<strong>'+text(team.name)+' selected.</strong> This run can count toward the crew journey. Confirm or update your RSVP above to make the crew choice official. <button type="button" id="runnerReviewRsvp">Review RSVP</button>');
    $('runnerReviewRsvp')?.addEventListener('click',reviewRsvp);
    document.querySelectorAll('.runner-crew-card').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.teamId)===Number(team.id)));
  }
  function createCrewFromGame(){
    clearRsvpTeamSelection();
    const yes=document.querySelector('input[name="escapeRoom"][value="Yes"]');
    const approach=document.querySelector('input[name="teamApproach"][value="group"]');
    const mode=document.querySelector('input[name="teamMode"][value="create"]');
    if(yes)yes.checked=true;if(approach)approach.checked=true;if(mode)mode.checked=true;
    if(typeof window.updateTeamModeUI==='function')window.updateTeamModeUI();
    const name=$('teamName');if(name&&teamInput?.value&&!name.value)name.value=teamInput.value;
    showCrewNotice('<strong>Create a new crew.</strong> Give it a name in the RSVP form. Other people will then see the crew as an open option until it reaches six members.');
    reviewRsvp();setTimeout(()=>name?.focus(),450);
  }
  function flexibleCrewFromGame(){
    clearRsvpTeamSelection();
    const yes=document.querySelector('input[name="escapeRoom"][value="Yes"]');
    const approach=document.querySelector('input[name="teamApproach"][value="flexible"]');
    if(yes)yes.checked=true;if(approach)approach.checked=true;
    if(typeof window.updateTeamModeUI==='function')window.updateTeamModeUI();
    showCrewNotice('<strong>You are all set to stay flexible.</strong> The organisers can place you with a crew later — no public “unassigned” label is shown.');
    reviewRsvp();
  }
  function crewCard(team){
    const j=team.journey||{distance:0,flowers:0,contributors:0,progress:0,stage:'CBD',next:'Harbour Bridge',target:3600};
    const stats=j.contributors
      ? Number(j.distance||0).toLocaleString()+' journey distance · '+Number(j.flowers||0)+' blooms · '+Number(j.contributors||0)+' contributing '+(Number(j.contributors)===1?'player':'players')
      : 'No crew run yet — your score can start the journey.';
    const places=team.remaining===1?'1 place open':team.remaining+' places open';
    const stops=(crewStops.length?crewStops:[{label:'CBD'},{label:'Harbour Bridge'},{label:'Devonport'},{label:'Rangitoto'}]).map(s=>'<span>'+text(String(s.label).replace('Harbour Bridge','Bridge'))+'</span>').join('');
    return '<article class="runner-crew-card" data-team-id="'+Number(team.id)+'"><div class="runner-crew-card-head"><div><h4>'+text(team.name)+'</h4><p>'+Number(team.memberCount)+'/6 crew members · <strong>'+places+'</strong></p></div><button type="button" data-crew-join="'+Number(team.id)+'">Join crew</button></div><div class="runner-crew-journey"><div class="runner-crew-track"><i style="width:'+Math.max(0,Math.min(100,Number(j.progress)||0))+'%"></i><b style="left:'+Math.max(2,Math.min(98,Number(j.progress)||0))+'%" aria-hidden="true">⛵</b></div><div class="runner-crew-stops">'+stops+'</div></div><p class="runner-crew-stats">'+stats+'</p><p class="runner-crew-stage">Now: '+text(j.stage||'CBD')+' · Next: '+text(j.next||'Rangitoto')+'</p></article>';
  }
  function renderCrewDock(data){
    crewTeams=Array.isArray(data?.teams)?data.teams:[];
    crewStops=Array.isArray(data?.crewJourneyStops)?data.crewJourneyStops:[];
    const open=crewTeams.filter(t=>!t.full&&Number(t.remaining)>0)
      .sort((a,b)=>Number(a.remaining)-Number(b.remaining)||Number(b.journey?.distance||0)-Number(a.journey?.distance||0)||String(a.name).localeCompare(String(b.name)));
    crewNames.innerHTML=crewTeams.map(t=>'<option value="'+text(t.name)+'"></option>').join('');
    if(!open.length){
      crewList.innerHTML='<div class="runner-crew-empty"><strong>No open crews yet.</strong><span>Create the first one, or stay flexible and let the organisers place you later.</span></div>';
      return;
    }
    crewList.innerHTML=open.map(crewCard).join('');
    crewList.querySelectorAll('[data-crew-join]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=Number(btn.dataset.crewJoin),team=crewTeams.find(t=>Number(t.id)===id);chooseOpenCrew(team);
    }));
  }
  async function loadCrewDock(){
    try{
      const r=await fetch('/api/teams?list=1',{cache:'no-store'}),data=await r.json().catch(()=>({}));
      if(!r.ok||!Array.isArray(data.teams))throw Error(data.error||'Open crews unavailable.');
      renderCrewDock(data);
    }catch(error){
      crewList.innerHTML='<div class="runner-crew-empty"><strong>Open crews are temporarily unavailable.</strong><span>You can still play, save a score and use the RSVP form normally.</span></div>';
    }
  }
  $('runnerCrewRefresh')?.addEventListener('click',loadCrewDock);
  $('runnerCreateCrew')?.addEventListener('click',createCrewFromGame);
  $('runnerFlexibleCrew')?.addEventListener('click',flexibleCrewFromGame);
  function renderBoard(rows){leaderboard.innerHTML=rows.length?rows.map((r,i)=>'<div class="runner-board-row"><span>'+(i<3?['🥇','🥈','🥉'][i]:'#'+(i+1))+'</span><div><strong>'+text(r.name)+'</strong>'+(r.team?'<small>'+text(r.team)+'</small>':'')+'<small>'+Number(r.flowers||0)+' blooms · ★'+Number(r.goldenFlowers||0)+' · combo ×'+Number(r.maxCombo||0)+'</small></div><b>'+Number(r.score||0)+'</b></div>').join(''):'<p class="runner-empty">No scores yet. Set your own harbour record.</p>';}
  async function load(){try{const r=await fetch('/api/game',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error();renderBoard(data.leaderboard||[]);}catch(_){leaderboard.textContent='Leaderboard unavailable. Your game still works; try Refresh.';}}
  async function submit(){if(saving||saved||!eng.result||eng.state!=='over')return;const name=$('runnerPlayerName').value.trim(),team=$('runnerTeamName').value.trim();if(name.length<2){status.textContent='Please enter a display name (2–30 characters).';$('runnerPlayerName').focus();return;}const payload={name,team,...eng.result},id=runId;saving=true;save.disabled=true;start.disabled=true;save.textContent='Saving…';status.textContent='';try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Unable to save. Please try again.');if(id!==runId)return;saved=true;renderBoard(data.leaderboard||[]);save.textContent='✓ Score Saved';music.effect('saved');status.textContent='Saved. Only your best run appears on the board.';panel.classList.add('runner-score-saved');loadCrewDock();}catch(error){if(id===runId){save.disabled=false;save.textContent='Retry Submit';status.textContent=error.message||'Connection lost. Your result is still here.';}}finally{saving=false;controls();}}
  save.addEventListener('click',submit);$('runnerRefreshLeaderboard').addEventListener('click',load);
  window.HarbourDash=Object.freeze({version:api.version,snapshot:()=>eng.snapshot(),audio:()=>music.diagnostic(),artReady:()=>art.ready});
  controls();sync();resize();load();loadCrewDock();
})();
