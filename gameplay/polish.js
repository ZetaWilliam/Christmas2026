/* Clean illustrated harbour + original Christmas instrumentals. No third-party recordings. */
(() => {
  'use strict';
  const BaseRenderer=window.HarbourRenderer, BaseAudio=window.HarbourAudio;
  if(!BaseRenderer||!BaseAudio)return;
  const VERSION='2026.09.23-clean.3';
  class CleanRenderer extends BaseRenderer {
    constructor(canvas,engine,reduced){
      super(canvas,engine,reduced);
      this.sceneReady=false;
      this.scene=new Image();
      this.scene.onload=()=>{this.sceneReady=true;this.draw();};
      this.scene.onerror=()=>console.warn('Illustrated harbour unavailable; using fallback.');
      this.scene.src='/gameplay/art/coast.webp?v='+VERSION;
    }
    cut(rect){
      const c=document.createElement('canvas');c.width=rect[2];c.height=rect[3];
      const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.atlas,...rect,0,0,c.width,c.height);
      const im=ctx.getImageData(0,0,c.width,c.height),d=im.data,W=c.width,H=c.height,n=W*H;
      const protectCanvas=document.createElement('canvas');protectCanvas.width=W;protectCanvas.height=H;
      const pc=protectCanvas.getContext('2d');pc.fillStyle='#fff';
      const standing=rect[0]===3,crouching=rect[0]===321;
      const shapes=standing?[
        [[147,29],[156,29],[164,27],[168,30],[170,35],[169,42],[166,44],[158,41],[150,39],[146,34]],
        [[122,23],[142,9],[151,4],[157,6],[161,10],[161,13],[150,16],[136,22],[125,26]]
      ]:crouching?[
        [[182,36],[191,39],[207,40],[209,46],[207,55],[201,59],[188,57],[181,50]],
        [[169,24],[184,23],[198,22],[207,25],[208,29],[197,30],[181,28],[169,28]]
      ]:[];
      for(const pts of shapes){pc.beginPath();pc.moveTo(...pts[0]);for(const p of pts.slice(1))pc.lineTo(...p);pc.closePath();pc.fill();}
      const protectedPixels=pc.getImageData(0,0,W,H).data;
      const seen=new Uint8Array(n),background=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
      const add=i=>{if(i<0||i>=n||seen[i])return;seen[i]=1;const j=i*4;if(protectedPixels[j+3]>127)return;
        const lo=Math.min(d[j],d[j+1],d[j+2]),hi=Math.max(d[j],d[j+1],d[j+2]);
        if(lo>240||(lo>215&&hi-lo<25)){background[i]=1;queue[tail++]=i;}};
      for(let x=0;x<W;x++){add(x);add(n-W+x);}for(let y=0;y<H;y++){add(y*W);add((y+1)*W-1);}
      // These are empty spaces enclosed by the arms/paddle, NOT Santa's beard or hat.
      const holes=standing?[[190,55],[202,83],[165,72]]:crouching?[[207,65]]:[];
      for(const [x,y]of holes)add(y*W+x);
      while(head<tail){const i=queue[head++],x=i%W;if(x)add(i-1);if(x<W-1)add(i+1);add(i-W);add(i+W);}
      for(let i=0;i<n;i++){
        const j=i*4;if(background[i]){d[j+3]=0;continue;}
        if(protectedPixels[j+3]>127)continue;
        const x=i%W,edge=(x&&background[i-1])||(x<W-1&&background[i+1])||(i>=W&&background[i-W])||(i<n-W&&background[i+W]);
        if(!edge)continue;
        // Remove the white antialias fringe rather than adding a white outline on dark water.
        const lo=Math.min(d[j],d[j+1],d[j+2]),a=Math.min(1,(255-lo)/65);
        if(a<.04){d[j+3]=0;continue;}
        if(a<1){for(let k=0;k<3;k++)d[j+k]=Math.max(0,Math.min(255,(d[j+k]-255*(1-a))/a));d[j+3]=Math.round(255*a);}
      }
      ctx.putImageData(im,0,0);return c;
    }
    palette(){
      if(this.reduced)return{top:'#C8E7F2',horizon:'#EDF5F1',water:'#549EAE',night:0,label:'Day'};
      const phase=(this.eng.time%72)/18,i=Math.floor(phase),f=(1-Math.cos((phase-i)*Math.PI))/2;
      const P=[['#C8E7F2','#EDF5F1','#549EAE'],['#EAB995','#F4DCC0','#668F9F'],['#243B56','#526F86','#315F79'],['#CBD3E6','#EFEBE4','#729CAF']];
      const a=P[i],b=P[(i+1)%4];return{top:this.mix(a[0],b[0],f),horizon:this.mix(a[1],b[1],f),water:this.mix(a[2],b[2],f),night:Math.max(0,Math.sin(Math.PI*phase/2-Math.PI/2)),label:['Day → sunset','Sunset → night','Night → dawn','Dawn → day'][i]};
    }
    landscape(p){
      const c=this.ctx,W=this.eng.width;
      if(!this.sceneReady){this.fallback(p);return;}
      const span=1200,scroll=this.reduced?0:this.eng.world*.035,offset=scroll%span,base=Math.floor(scroll/span);
      c.save();
      for(let k=-1;k<3;k++){
        const x=k*span-offset;c.save();
        if((base+k)%2){c.translate(x+span,0);c.scale(-1,1);c.drawImage(this.scene,0,0,span,185);}
        else c.drawImage(this.scene,x,0,span,185);
        c.restore();
      }
      // Gentle atmospheric tint; no duplicate building reflections or hard photo texture.
      if(p.night>.05){c.fillStyle='rgba(21,38,70,'+(p.night*.64)+')';c.fillRect(0,0,W,185);}
      else if(!this.reduced){c.fillStyle='rgba(251,194,151,'+(Math.max(0,Math.sin(this.eng.time*Math.PI/36))*.12)+')';c.fillRect(0,0,W,185);}
      if(p.night>.2){c.globalAlpha=p.night*.72;c.fillStyle='#FFF4D9';for(let i=0;i<19;i++){c.beginPath();c.arc((i*157+35)%W,19+(i*29)%88,.65+(i%3)*.23,0,7);c.fill();}
        c.beginPath();c.arc(W-78,46,12,0,7);c.fill();c.fillStyle='#344B6B';c.beginPath();c.arc(W-73,42,11,0,7);c.fill();}
      c.restore();
    }
    ocean(p){
      const c=this.ctx,e=this.eng,W=e.width,t=this.reduced?0:e.time,h=178;
      const base=c.createLinearGradient(0,h,0,320);base.addColorStop(0,this.mix(p.water,p.horizon,.37));base.addColorStop(.48,p.water);base.addColorStop(1,this.mix(p.water,'#294F6B',.20));c.fillStyle=base;c.fillRect(0,h,W,142);
      // Perspective swells approach the viewer and drift sideways with the journey.
      // Broad cel-shaded faces, sparse broken foam, no repeating wave icons.
      for(let row=0;row<8;row++){
        const phase=(row/8+t*.026)%1,depth=phase*phase,y=h+8+depth*132,amp=.5+depth*2.6,shift=e.world*(.05+depth*.11)+t*9;
        c.beginPath();
        for(let x=-12;x<=W+12;x+=10){const v=y+Math.sin((x+shift)*(.021-depth*.009)+row*.8)*amp+Math.sin((x-shift*.45)*.036)*amp*.20;if(x===-12)c.moveTo(x,v);else c.lineTo(x,v);}
        c.lineTo(W+12,y+9+depth*12);c.lineTo(-12,y+9+depth*12);c.closePath();
        const face=c.createLinearGradient(0,y-amp,0,y+10+depth*12);face.addColorStop(0,'rgba(222,245,247,'+(.08+depth*.11)+')');face.addColorStop(.40,'rgba(42,106,136,.045)');face.addColorStop(1,'rgba(44,108,135,0)');c.fillStyle=face;c.fill();
        c.lineWidth=.6+depth*.5;c.strokeStyle='rgba(239,253,251,'+((p.night>.3?.15:.25)+depth*.07)+')';
        for(let j=0;j<4;j++){const x=((j*237+row*83-shift)%(W+180)+W+180)%(W+180)-90,len=20+depth*46;
          c.beginPath();for(let dx=0;dx<len;dx+=5){const xx=x+dx,v=y+Math.sin((xx+shift)*(.021-depth*.009)+row*.8)*amp+Math.sin((xx-shift*.45)*.036)*amp*.20;if(dx===0)c.moveTo(xx,v);else c.lineTo(xx,v);}c.stroke();}
      }
      c.save();const beam=c.createLinearGradient(W*.68,182,W*.90,320);beam.addColorStop(0,'rgba(240,248,224,0)');beam.addColorStop(.5,'rgba(237,249,236,'+(p.night>.2?.025:.06)+')');beam.addColorStop(1,'rgba(237,249,236,0)');c.fillStyle=beam;c.fillRect(0,182,W,138);c.restore();
    }
  }
  class ChristmasAudio extends BaseAudio {
    constructor(){super();this.track=Number.isInteger(this.track)&&this.track>=0&&this.track<2?this.track:0;}
    sleigh(t,accent=false){
      if(!this.ctx||!this.music)return;
      const c=this.ctx,g=c.createGain();g.connect(this.music);const length=accent?.19:.11;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(accent?.030:.017,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+length);
      for(const f of [2310,3230,4470,5890]){const o=c.createOscillator();o.type='sine';o.frequency.value=f;o.connect(g);this.nodes.add(o);o.start(t);o.stop(t+length+.02);o.onended=()=>{this.nodes.delete(o);o.disconnect();};}
      setTimeout(()=>g.disconnect(),Math.max(0,(t-c.currentTime+length+.1)*1000));
    }
    sequence(){
      if(!this.playing||!this.musicOn||!this.ctx)return;
      const c=this.ctx,bossa=this.track===1,bpm=bossa?104:112,eighth=60/bpm/2;
      if(this.next<c.currentTime-.15)this.next=c.currentTime+.04;
      const melodies=[
        [78,81,85,-1,83,81,78,76],[78,-1,81,83,85,83,81,-1],
        [74,78,81,-1,83,81,78,74],[76,-1,79,81,79,76,73,-1],
        [85,85,83,81,78,-1,81,83],[85,-1,88,86,85,83,81,-1],
        [83,81,78,-1,76,74,78,81],[79,76,73,-1,74,-1,-1,-1],
        [81,-1,85,88,86,85,81,-1],[78,81,83,-1,85,83,81,78],
        [79,-1,83,86,85,83,79,-1],[76,79,81,83,81,79,76,-1],
        [85,83,81,-1,78,81,85,-1],[86,85,83,81,78,-1,76,-1],
        [79,81,83,-1,81,79,76,73],[74,-1,78,-1,81,-1,86,-1]
      ];
      const chords=[[62,66,69,73],[59,62,66,69],[55,59,62,66],[57,61,64,67]];
      while(this.next<c.currentTime+.20){
        const s=this.step%128,bar=Math.floor(s/8),beat=s%8,chord=chords[bar%4],at=this.next+(bossa&&beat%2?.018:0);
        if([0,3,6].includes(beat))for(const n of chord)this.note(n,at,bossa?.36:.66,.022,'keys');
        if(beat===0||beat===4)this.note(chord[0]-24+(beat===4?7:0),at,.29,.095,'bass');
        if(beat===0||beat===4)this.drum('kick',at);
        if(beat===2||beat===6)this.drum('snare',at);
        if(!bossa||beat%2)this.sleigh(at,beat===2||beat===6);
        const n=melodies[bar][beat];if(n>0)this.note(n+(bossa?-12:0),at,beat===6?.36:.25,bossa?.057:.060,bossa?'keys':'bell');
        if(!bossa&&bar%4===3&&beat===7)this.note(93,at,.65,.020,'bell');
        this.step++;this.next+=eighth;
      }
    }
    diagnostic(){return{...super.diagnostic(),trackName:this.track===0?'Christmas Bells':'Christmas Bossa',edition:VERSION};}
  }
  window.HarbourRenderer=CleanRenderer;window.HarbourAudio=ChristmasAudio;
  window.HarbourPolish=Object.freeze({version:VERSION});
  // This runs after the existing adapter has created the controls; only labels are changed.
  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.getElementById('runnerTrackBtn');if(!button)return;
    const label=()=>{const d=window.HarbourDash?.audio();button.textContent=(d?.track===1?'Christmas Bossa':'Christmas Bells')+' ↻';button.title='Switch original Christmas instrumental';};
    label();button.addEventListener('click',label);
  });
})();
