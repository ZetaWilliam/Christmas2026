/* Santa Harbour Dash browser adapter. RSVP and organiser code are deliberately independent. */
(() => {
  'use strict';
  const api=window.HarbourEngine, $=id=>document.getElementById(id);
  const canvas=$('runnerCanvas');if(!canvas||!api)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const eng=new api.Engine({width:window.innerWidth<640?640:960});
  const C=api.C, score=$('runnerScore'),distance=$('runnerDistance'),flowers=$('runnerFlowers'),gold=$('runnerGoldenFlowers'),speed=$('runnerSpeed');
  const start=$('runnerStartBtn'),hop=$('runnerHopBtn'),duck=$('runnerDuckBtn'),sound=$('runnerSoundBtn'),combo=$('runnerComboBadge'),message=$('runnerMessage');
  const panel=$('runnerSubmitPanel'),save=$('runnerSaveBtn'),status=$('runnerSaveStatus'),leaderboard=$('runnerLeaderboard');
  let raf=0,lastFrame=0,audio=null,saving=false,saved=false,runId=0,endedWall=0,held=new Set(),duckPointers=new Set(),soundOn=true,feedbackUntil=0;
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
  const mutedText=()=>{sound.textContent=soundOn?'🔊 Sound':'🔇 Muted';sound.setAttribute('aria-pressed',String(soundOn));};mutedText();
  function tell(text,seconds=2.2){message.textContent=text;feedbackUntil=eng.time+seconds;}
  function ensureAudio(){if(!soundOn)return null;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!audio)audio=new A();if(audio.state==='suspended')audio.resume().catch(()=>{});return audio;}catch(_){return null;}}
  function tone(f,d=.09,delay=0){const a=ensureAudio();if(!a)return;try{const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+delay;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.025,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+d+.02);}catch(_){}}
  function chime(type){if(type==='gold'){tone(660,.1);tone(880,.12,.08);tone(1175,.16,.17);}else if(type==='milestone'){tone(523);tone(659,.09,.08);tone(784,.14,.16);}else if(type==='end'){tone(150,.13);}else tone(740,.07);}
  function controls(){const running=eng.state==='running',paused=eng.state==='paused';hop.disabled=!running;duck.disabled=!running;pause.disabled=!running&&!paused;pause.textContent=paused?'Resume':'Pause';start.disabled=running;start.textContent=running?'Running…':paused?'Resume':eng.state==='over'?'Run Again':'Start Run';}
  function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));draw();}
  function sync(){score.textContent=eng.score;distance.textContent=Math.floor(eng.distance);flowers.textContent=eng.flowers;gold.textContent='★'+eng.goldenFlowers;speed.textContent=(eng.speed/C.startSpeed).toFixed(2)+'×';combo.classList.toggle('hidden',eng.combo<2||eng.state!=='running');combo.textContent='COMBO ×'+eng.combo;}
  function handleEvents(){for(const ev of eng.drainEvents()){
    if(ev.type==='collect'){chime(ev.golden?'gold':'flower');tell((ev.golden?'★ Golden pōhutukawa':'Pōhutukawa')+' +'+ev.points+(ev.combo>1?' · combo ×'+ev.combo:''));}
    if(ev.type==='comboEnd')combo.classList.add('hidden');
    if(ev.type==='milestone'){chime('milestone');if(eng.time>feedbackUntil)tell(ev.distance+' distance — keep going!');}
    if(ev.type==='pause')pauseRun();
    if(ev.type==='end'){endedWall=performance.now();controls();held.clear();duckPointers.clear();chime('end');panel.classList.remove('hidden');save.disabled=false;save.textContent='Submit Score';status.textContent='';tell(ev.reason,999);runSummary.textContent=ev.result.score+' points · '+ev.result.flowers+' blooms · '+ev.result.goldenFlowers+' gold · best combo ×'+ev.result.maxCombo;if(eng.score>best){best=eng.score;bestEl.textContent='Your best: '+best;try{localStorage.setItem('harbour.personalBest.v2',String(best));}catch(_){}}}
  }}
  function tick(now){if(eng.state!=='running')return;const dt=(now-lastFrame)/1000;lastFrame=now;eng.advance(dt);handleEvents();sync();draw();if(eng.state==='running')raf=requestAnimationFrame(tick);}
  function begin(){if(saving)return;if(eng.state==='paused'){resumeRun();return;}if(eng.state==='running')return;cancelAnimationFrame(raf);runId++;saved=false;held.clear();duckPointers.clear();eng.start(Math.floor(Math.random()*4294967295));ensureAudio();panel.classList.add('hidden');save.disabled=false;save.textContent='Submit Score';status.textContent='';tell('A gentle start. Hop over ⚠ hazards; hold Duck for gulls.',3);controls();sync();canvas.focus({preventScroll:true});lastFrame=performance.now();raf=requestAnimationFrame(tick);}
  function pauseRun(){if(eng.state!=='running'&&eng.state!=='paused')return;eng.pause();cancelAnimationFrame(raf);held.clear();duckPointers.clear();controls();tell('Paused — your run and combo are safe. Resume when ready.',999);sync();draw();}
  function resumeRun(){if(eng.state!=='paused')return;eng.resume();ensureAudio();controls();tell('Back on the water.',1);canvas.focus({preventScroll:true});lastFrame=performance.now();raf=requestAnimationFrame(tick);}
  function togglePause(){if(eng.state==='paused')resumeRun();else pauseRun();}
  function pressHop(){if(eng.state==='running')eng.hop();}
  function updateDuck(){eng.duck(held.size>0||duckPointers.size>0);}
  function releaseControls(){held.clear();duckPointers.clear();eng.duck(false);}
  start.addEventListener('click',begin);pause.addEventListener('click',togglePause);
  sound.addEventListener('click',()=>{soundOn=!soundOn;mutedText();try{localStorage.setItem('harbour.sound',soundOn?'on':'off');}catch(_){}if(soundOn){ensureAudio();tone(660,.08);}});
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
  // Coherent palette driven by simulation time; pausing does not advance night or expire a combo.
  function mix(a,b,t){const n=x=>x.match(/\w\w/g).map(y=>parseInt(y,16));const x=n(a),y=n(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
  function sky(){if(reduced)return {top:'#DFF2F4',horizon:'#F8F0DF',water:'#75AAA1',night:0,label:'Day'};const phase=(eng.time%48)/12,i=Math.floor(phase),t=(1-Math.cos((phase-i)*Math.PI))/2;const palettes=[['#DFF2F4','#F8F0DF','#75AAA1'],['#EDA373','#F5CF99','#4F858B'],['#10213B','#294159','#21465A'],['#C4C9E1','#E8D4CE','#547C8B']];const a=palettes[i],b=palettes[(i+1)%4];return {top:mix(a[0],b[0],t),horizon:mix(a[1],b[1],t),water:mix(a[2],b[2],t),night:Math.max(0,Math.sin(Math.PI*phase/2-Math.PI/2)),label:['Day → sunset','Sunset → night','Night → dawn','Dawn → day'][i]};}
  const landmarks=['CBD · Sky Tower','Waitematā · Harbour Bridge','Devonport · Ferry','Rangitoto'];
  function draw(){const W=eng.width,H=320,p=sky();ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,p.top);gradient.addColorStop(.58,p.horizon);gradient.addColorStop(.59,p.water);gradient.addColorStop(1,mix(p.water,'#214B49',.3));ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    $('runnerSkyPhase').textContent=reduced?'Day':p.label;
    ctx.save();ctx.globalAlpha=.5;ctx.fillStyle='#F6D37A';ctx.beginPath();ctx.arc(W-83,58,22,0,Math.PI*2);ctx.fill();ctx.restore();
    if(p.night>.1&&!reduced){ctx.save();ctx.globalAlpha=p.night;ctx.fillStyle='#fff3d6';for(let i=0;i<25;i++){ctx.beginPath();ctx.arc((i*137+29)%W,22+(i*47)%117,i%3?.9:1.6,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(W-83,58,22,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.top;ctx.beginPath();ctx.arc(W-74,51,20,0,Math.PI*2);ctx.fill();ctx.restore();}
    const scroll=eng.world*(reduced?.08:.24),seg=700,base=Math.floor(scroll/seg);$('runnerLandmark').textContent=landmarks[Math.floor((scroll+W*.5)/seg)%4];
    for(let i=-1;i<=2;i++){const x=-(scroll%seg)+i*seg,idx=((base+i)%4+4)%4;backdrop(x,idx,p.night);}
    for(const f of eng.ferries)ferry(f.x,f.y,p.night);
    ctx.save();ctx.strokeStyle=p.night>.5?'#6D9EA6':'#C7E3DB';ctx.lineWidth=1.5;for(let x=-(eng.world*.7%90);x<W+90;x+=90){ctx.beginPath();ctx.moveTo(x,272);ctx.quadraticCurveTo(x+22,266,x+45,272);ctx.quadraticCurveTo(x+67,278,x+90,272);ctx.stroke();}ctx.restore();
    for(const r of eng.rewards)if(!r.collected)flower(r.x,r.y+Math.sin(r.bob)*3,r.golden);
    for(const o of eng.obstacles)hazard(o,p.night);
    santa();
    if(eng.state!=='running')overlay();
  }
  function backdrop(x,kind,night){ctx.save();ctx.translate(x,0);ctx.strokeStyle=night>.5?'#6C8294':'#587F76';ctx.fillStyle=night>.5?'#233345':'#83A59C';ctx.lineWidth=4;
    if(kind===0){for(let i=0;i<9;i++){const h=34+(i*23)%68;ctx.fillRect(20+i*76,226-h,51,h);}ctx.fillStyle=night>.5?'#8CA4B2':'#54766C';ctx.fillRect(339,60,5,160);ctx.beginPath();ctx.ellipse(342,91,12,6,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(339,63);ctx.lineTo(342,30);ctx.lineTo(345,63);ctx.fill();if(night>.4){ctx.fillStyle='#C5B581';for(let i=0;i<18;i++)ctx.fillRect(25+i*35,185-(i*13)%41,3,4);}}
    else if(kind===1){ctx.beginPath();ctx.moveTo(35,215);ctx.quadraticCurveTo(350,60,665,215);ctx.stroke();ctx.beginPath();ctx.moveTo(35,215);ctx.lineTo(665,215);ctx.stroke();ctx.lineWidth=2;for(let i=0;i<7;i++){const xx=80+i*90;ctx.beginPath();ctx.moveTo(xx,139+Math.pow((xx-350)/40,2));ctx.lineTo(xx,241);ctx.stroke();}}
    else if(kind===2){ctx.beginPath();ctx.moveTo(0,238);ctx.quadraticCurveTo(120,184,310,212);ctx.quadraticCurveTo(465,236,700,195);ctx.lineTo(700,249);ctx.lineTo(0,249);ctx.fill();ctx.fillStyle=night>.5?'#536B7B':'#597D70';ctx.fillRect(380,199,81,29);ctx.beginPath();ctx.moveTo(370,199);ctx.lineTo(420,178);ctx.lineTo(472,199);ctx.fill();}
    else {ctx.beginPath();ctx.moveTo(0,244);ctx.quadraticCurveTo(165,235,245,207);ctx.quadraticCurveTo(300,198,355,155);ctx.quadraticCurveTo(408,202,485,216);ctx.quadraticCurveTo(575,236,700,245);ctx.lineTo(700,250);ctx.lineTo(0,250);ctx.fill();}ctx.restore();}
  function ferry(x,y,night){ctx.save();ctx.translate(x,y);ctx.globalAlpha=.62;ctx.fillStyle=night>.5?'#9BAFB7':'#F3F7F4';ctx.strokeStyle='#385661';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,28);ctx.lineTo(144,28);ctx.lineTo(128,49);ctx.lineTo(18,49);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#376C7F';ctx.fillRect(27,8,84,21);ctx.fillStyle='#BCD8DB';for(let i=0;i<4;i++)ctx.fillRect(34+i*18,14,11,7);ctx.restore();}
  function warning(x,y,action){ctx.save();ctx.fillStyle='#F5AE43';ctx.strokeStyle='#25313C';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-10);ctx.lineTo(x+10,y+9);ctx.lineTo(x-10,y+9);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#25313C';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText('!',x,y+6);if(eng.time<25){ctx.font='bold 11px Arial';ctx.fillStyle='#273C43';ctx.strokeStyle='#F6F4E9';ctx.lineWidth=3;ctx.strokeText(action,x,y-16);ctx.fillText(action,x,y-16);}ctx.restore();}
  function hazard(o,night){ctx.save();ctx.translate(o.x,C.water);ctx.lineWidth=2.5;ctx.strokeStyle='#26363D';ctx.fillStyle='#F39C36';
    if(o.type==='buoy'){ctx.beginPath();ctx.moveTo(5,-40);ctx.lineTo(27,-40);ctx.lineTo(32,-3);ctx.lineTo(0,-3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#27333B';ctx.fillRect(4,-24,24,7);}
    else if(o.type==='wake'){ctx.lineWidth=5;ctx.strokeStyle='#274D60';ctx.beginPath();ctx.moveTo(0,-4);ctx.quadraticCurveTo(14,-29,28,-9);ctx.quadraticCurveTo(43,2,56,-15);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#E8F4F2';ctx.stroke();}
    else if(o.type==='sailboat'){ctx.fillStyle='#F1F4F1';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(70,-12);ctx.lineTo(58,-1);ctx.lineTo(9,-1);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(33,-54);ctx.lineTo(33,-12);ctx.stroke();ctx.fillStyle='#32647A';ctx.beginPath();ctx.moveTo(36,-51);ctx.lineTo(65,-16);ctx.lineTo(36,-16);ctx.fill();ctx.fillStyle='#F3A648';ctx.beginPath();ctx.moveTo(29,-47);ctx.lineTo(8,-16);ctx.lineTo(29,-16);ctx.fill();}
    else {const flap=Math.sin(eng.time*12)*3;ctx.translate(0,-54);ctx.strokeStyle=night>.5?'#F0F2E7':'#263941';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(1,10);ctx.quadraticCurveTo(12,flap,23,10);ctx.quadraticCurveTo(35,-flap,45,10);ctx.stroke();ctx.fillStyle='#ECF0E8';ctx.beginPath();ctx.ellipse(23,10,6,4,0,0,Math.PI*2);ctx.fill();}
    ctx.restore();warning(o.x+o.w/2,o.type==='gull'?C.water-76:C.water-o.h-17,o.type==='gull'?'DUCK':'HOP');}
  function flower(x,y,golden){ctx.save();ctx.translate(x,y);ctx.shadowColor=golden?'#FFE177':'#ED8C89';ctx.shadowBlur=reduced?0:golden?13:7;ctx.fillStyle=golden?'#FFF6C9':'#FFF7ED';ctx.beginPath();ctx.arc(0,0,golden?20:17,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    // Filament-like stamens make this read as pōhutukawa, not an obstacle or buoy.
    ctx.strokeStyle=golden?'#D69715':'#C43538';ctx.lineWidth=1.7;for(let i=0;i<16;i++){const a=i*Math.PI/8,r=golden?16:14;ctx.beginPath();ctx.moveTo(Math.cos(a)*3,Math.sin(a)*3);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();ctx.fillStyle=golden?'#F2BE32':'#DE5547';ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,2.0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#315A41';ctx.beginPath();ctx.ellipse(15,15,7,3,.6,0,Math.PI*2);ctx.fill();ctx.fillStyle=golden?'#8D640D':'#BA8723';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText(golden?'★':'+',0,5);ctx.restore();}
  function santa(){const p=eng.player,y=C.water-48+p.jumpY,bob=p.grounded&&!reduced?Math.sin(eng.time*7)*1:0;ctx.save();ctx.translate(C.playerX,y+bob);ctx.fillStyle='#B93932';ctx.strokeStyle='#6D3430';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,38);ctx.quadraticCurveTo(42,51,88,38);ctx.quadraticCurveTo(75,56,14,52);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#EAC478';ctx.beginPath();ctx.moveTo(8,39);ctx.lineTo(82,39);ctx.stroke();const b=p.duck?18:4;ctx.fillStyle='#BA3B32';ctx.beginPath();ctx.ellipse(43,b+25,16,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#F2D2B3';ctx.beginPath();ctx.arc(43,b+4,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#FFF6E5';ctx.beginPath();ctx.arc(43,b+10,11,0,Math.PI);ctx.fill();ctx.fillStyle='#BC3D35';ctx.beginPath();ctx.moveTo(32,b+1);ctx.quadraticCurveTo(43,b-13,57,b+1);ctx.closePath();ctx.fill();ctx.fillStyle='#FFF6E5';ctx.fillRect(32,b-1,25,4);ctx.fillStyle='#313D3C';ctx.fillRect(40,b+3,11,2);const stroke=Math.sin(eng.time*8)*5;ctx.strokeStyle='#D7B870';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(43,b+25);ctx.lineTo(17,16+stroke);ctx.moveTo(44,b+25);ctx.lineTo(74,46-stroke);ctx.stroke();ctx.restore();}
  function overlay(){ctx.save();const title=eng.state==='ready'?'READY TO PADDLE?':eng.state==='paused'?'PAUSED':'SPLASH!';ctx.fillStyle=eng.state==='ready'?'rgba(246,249,244,.91)':'rgba(20,44,52,.82)';const w=Math.min(400,eng.width-60);ctx.fillRect((eng.width-w)/2,92,w,95);ctx.textAlign='center';ctx.fillStyle=eng.state==='ready'?'#1C4235':'#FFF7E7';ctx.font='bold 24px Georgia';ctx.fillText(title,eng.width/2,126);ctx.font='14px Arial';ctx.fillText(eng.state==='ready'?'Hop over hazards · Duck under gulls':eng.state==='paused'?'Resume when ready — no progress is lost':'Press Space or Run Again',eng.width/2,157);ctx.restore();}
  function text(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function renderBoard(rows){leaderboard.innerHTML=rows.length?rows.map((r,i)=>'<div class="runner-board-row"><span>'+(i<3?['🥇','🥈','🥉'][i]:'#'+(i+1))+'</span><div><strong>'+text(r.name)+'</strong>'+(r.team?'<small>'+text(r.team)+'</small>':'')+'<small>'+Number(r.flowers||0)+' blooms · ★'+Number(r.goldenFlowers||0)+' · combo ×'+Number(r.maxCombo||0)+'</small></div><b>'+Number(r.score||0)+'</b></div>').join(''):'<p class="runner-empty">No scores yet. Set your own harbour record.</p>';}
  async function load(){try{const r=await fetch('/api/game',{cache:'no-store'});const data=await r.json();if(!r.ok)throw Error();renderBoard(data.leaderboard||[]);}catch(_){leaderboard.textContent='Leaderboard unavailable. Your game still works; try Refresh.';}}
  async function submit(){if(saving||saved||!eng.result||eng.state!=='over')return;const name=$('runnerPlayerName').value.trim(),team=$('runnerTeamName').value.trim();if(name.length<2){status.textContent='Please enter a display name (2–30 characters).';$('runnerPlayerName').focus();return;}const payload={name,team,...eng.result},id=runId;saving=true;save.disabled=true;start.disabled=true;save.textContent='Saving…';status.textContent='';try{const r=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Unable to save. Please try again.');if(id!==runId)return;saved=true;renderBoard(data.leaderboard||[]);save.textContent='Score Saved';status.textContent='Saved. Only your best run appears on the board.';}catch(error){if(id===runId){save.disabled=false;save.textContent='Retry Submit';status.textContent=error.message||'Connection lost. Your result is still here.';}}finally{saving=false;controls();}}
  save.addEventListener('click',submit);$('runnerRefreshLeaderboard').addEventListener('click',load);
  window.HarbourDash=Object.freeze({version:api.version,snapshot:()=>eng.snapshot()});
  controls();sync();resize();load();
})();
