/* Licensed instrumental recordings; existing game effects and renderer are unchanged. */
(() => {
  'use strict';
  const Base=window.HarbourAudio;if(!Base)return;
  const TRACKS=Object.freeze([
    {file:'bells-bright.mp3',label:'Instrumental 1'},
    {file:'bells-ensemble.mp3',label:'Instrumental 2'}
  ]);
  class RecordedAudio extends Base {
    constructor(){
      super();this.media=null;this.mediaSource=null;this.loadedTrack=-1;this.fadeTimer=null;this.requestId=0;this.playbackError='';this.track=0;
      try{const n=Number(localStorage.getItem('harbour.recording.track')||0);if(Number.isInteger(n)&&n>=0&&n<TRACKS.length)this.track=n;}catch(_){}
    }
    // Do not schedule synthesized accompaniment over the recording.
    sequence(){}
    ensureMedia(){
      if(!super.ensure())return false;
      if(!this.media){
        this.media=new Audio();this.media.preload='none';this.media.loop=true;this.media.volume=.7;
        this.media.setAttribute('playsinline','');
        this.media.addEventListener('error',()=>{this.playbackError='Background music unavailable. Try switching the track.';});
        this.mediaSource=this.ctx.createMediaElementSource(this.media);this.mediaSource.connect(this.music);
      }
      return true;
    }
    start(){
      this.playing=true;this.stopTimer();clearTimeout(this.fadeTimer);
      if(!this.musicOn||!this.ensureMedia())return;
      const id=++this.requestId;this.playbackError='';
      if(this.loadedTrack!==this.track){
        this.media.pause();this.media.src='/gameplay/music/'+TRACKS[this.track].file;
        this.loadedTrack=this.track;this.media.load();
      }
      this.music.gain.cancelScheduledValues(this.ctx.currentTime);
      this.music.gain.setTargetAtTime(.42,this.ctx.currentTime,.12);
      const attempt=this.media.play();
      if(attempt&&typeof attempt.then==='function')attempt.then(()=>{
        if(id!==this.requestId&&(!this.playing||!this.musicOn))this.media.pause();
      }).catch(error=>{if(id===this.requestId&&error.name!=='AbortError')this.playbackError='Tap Music On to enable background music.';});
    }
    fadeOut(){
      const id=++this.requestId;this.stopTimer();clearTimeout(this.fadeTimer);
      if(this.ctx){this.music.gain.cancelScheduledValues(this.ctx.currentTime);this.music.gain.setTargetAtTime(.0001,this.ctx.currentTime,.035);}
      if(this.media)this.fadeTimer=setTimeout(()=>{if(id===this.requestId)this.media.pause();},140);
    }
    pause(){this.playing=false;this.fadeOut();}
    toggleMusic(){
      this.musicOn=!this.musicOn;
      try{localStorage.setItem('harbour.music',this.musicOn?'on':'off');}catch(_){}
      if(!this.musicOn)this.fadeOut();else if(this.playing)this.start();
      return this.musicOn;
    }
    switchTrack(){
      this.track=(this.track+1)%TRACKS.length;
      try{localStorage.setItem('harbour.recording.track',String(this.track));}catch(_){}
      ++this.requestId;clearTimeout(this.fadeTimer);if(this.media)this.media.pause();this.loadedTrack=-1;
      if(this.playing&&this.musicOn)this.start();
      return this.track;
    }
    diagnostic(){return {...super.diagnostic(),trackName:TRACKS[this.track].label,recording:true,
      mediaState:this.media?(this.media.paused?'paused':'playing'):'not-started',
      mediaReady:this.media?.readyState||0,mediaTime:this.media?.currentTime||0,
      mediaDuration:Number.isFinite(this.media?.duration)?this.media.duration:0,
      musicError:this.playbackError,edition:'2026.09.24-neutral-audio.1'};}
  }
  window.HarbourAudio=RecordedAudio;
  document.addEventListener('DOMContentLoaded',()=>{
    const label=()=>{const b=document.getElementById('runnerTrackBtn');if(b){b.textContent=(window.HarbourDash?.audio().trackName||'Instrumental 1')+' ↻';b.title='Switch instrumental recording';}};
    label();for(const id of ['runnerTrackBtn','runnerMusicBtn','runnerSoundBtn'])document.getElementById(id)?.addEventListener('click',label);
    const reference=document.getElementById('runnerSubmitPanel');
    if(reference&&!document.getElementById('runnerMusicCredit')){
      const credit=document.createElement('p');credit.id='runnerMusicCredit';credit.className='text-xs text-pine/60 mt-3';
      credit.append(document.createTextNode('Music: Kevin MacLeod · '));
      const link=document.createElement('a');link.href='/gameplay/music/CREDITS.md';link.target='_blank';link.rel='noopener noreferrer';link.className='underline';link.textContent='CC BY 4.0 / credits';credit.append(link);reference.after(credit);
    }
  });
})();
