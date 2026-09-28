/* Six-city New Zealand illustrated panorama loop. Every scene is cropped from one approved art sheet so the style stays consistent. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.HarbourCoastline=api;
    const Base=root.HarbourRenderer;
    if(!Base)return;
    root.HarbourRenderer=class extends Base{
      landscape(p){
        if(!this.coastLayer)this.coastLayer=new api.CoastLayer();
        this.coastLayer.draw(this.ctx,this.eng,p,this.reduced);
      }
      fallback(p){this.landscape(p);}
      draw(){
        super.draw();
        const el=document.getElementById('runnerLandmark');
        if(el&&this.coastLayer)el.textContent=this.coastLayer.label(this.eng.world,this.reduced);
      }
    };
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const VERSION='2026.09.28-six-city-loop.1';
  const HORIZON=178;
  const PARALLAX=.105;
  const ROUTE_SPAN=11200;
  const SEGMENT_SPAN=ROUTE_SPAN/6;
  const FADE_FRACTION=.16;
  const SHEET=Object.freeze({width:2172,height:724,panelWidth:724,panelHeight:362,cropHeight:242});
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};

  const SCENES=Object.freeze([
    Object.freeze({id:'auckland',label:'Auckland · Waitematā Harbour',col:0,row:0,cropY:106}),
    Object.freeze({id:'queenstown',label:'Queenstown · Lake Wakatipu',col:1,row:0,cropY:120}),
    Object.freeze({id:'milford',label:'Piopiotahi / Milford Sound · Fiordland',col:2,row:0,cropY:118}),
    Object.freeze({id:'christchurch',label:'Christchurch · Ōtautahi',col:0,row:1,cropY:112}),
    Object.freeze({id:'dunedin',label:'Dunedin · Ōtepoti',col:1,row:1,cropY:112}),
    Object.freeze({id:'wellington',label:'Wellington · Te Whanganui-a-Tara',col:2,row:1,cropY:112})
  ]);

  function rawCamera(world,reduced=false){
    return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;
  }
  function routeX(x){
    const n=Number.isFinite(x)?x:0;
    return ((n%ROUTE_SPAN)+ROUTE_SPAN)%ROUTE_SPAN;
  }
  function camera(world,reduced=false){return reduced?0:routeX(rawCamera(world,false));}

  function sceneState(world,reduced=false){
    const local=camera(world,reduced),pos=local/SEGMENT_SPAN,index=Math.min(SCENES.length-1,Math.floor(pos)),
      progress=reduced?0:pos-index,nextIndex=(index+1)%SCENES.length,
      fadeStart=1-FADE_FRACTION,blend=progress<=fadeStart?0:smooth((progress-fadeStart)/FADE_FRACTION);
    return Object.freeze({local,index,nextIndex,progress,blend,current:SCENES[index],next:SCENES[nextIndex]});
  }

  function sourceRect(scene,targetRatio,pan=0){
    const sx=scene.col*SHEET.panelWidth,sy=scene.row*SHEET.panelHeight+scene.cropY,
      sw=SHEET.panelWidth,sh=SHEET.cropHeight,sourceRatio=sw/sh;
    let x=sx,y=sy,w=sw,h=sh;
    if(sourceRatio>targetRatio){
      w=sh*targetRatio;
      x=sx+(sw-w)/2+pan;
      x=clamp(x,sx,sx+sw-w);
    }else if(sourceRatio<targetRatio){
      h=sw/targetRatio;
      y=sy+(sh-h)/2;
    }
    return Object.freeze({x,y,w,h});
  }

  function starPoint(c,x,y,r,alpha){
    c.save();c.globalAlpha=alpha;
    const g=c.createRadialGradient(x,y,0,x,y,r*3.5);
    g.addColorStop(0,'rgba(255,255,244,1)');
    g.addColorStop(.22,'rgba(236,246,255,.92)');
    g.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,r*3.5,0,Math.PI*2);c.fill();
    c.fillStyle='#FFFDF1';c.beginPath();c.arc(x,y,Math.max(.6,r),0,Math.PI*2);c.fill();c.restore();
  }
  function constellation(c,x,y,scale,alpha,seed){
    const patterns=[
      [[0,18],[20,0],[37,27],[59,17],[79,43],[101,28]],
      [[0,7],[19,31],[42,18],[64,37],[84,12],[109,28],[126,4]],
      [[0,34],[21,12],[46,20],[69,0],[91,24],[116,17]]
    ],raw=patterns[Math.abs(seed)%patterns.length],
    pts=raw.map((p,i)=>[x+p[0]*scale+(hash(i,seed)-.5)*4,y+p[1]*scale+(hash(i,seed+31)-.5)*4]);
    c.save();c.globalAlpha=alpha*.16;c.strokeStyle='rgba(196,218,242,.38)';c.lineWidth=.45;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();c.restore();
    pts.forEach((p,i)=>starPoint(c,p[0],p[1],(.72+(i%3)*.23)*scale,alpha*(.72+(i%2)*.2)));
  }
  function stars(c,W,p,reduced){
    if(reduced||p.night<.08)return;
    const a=Math.min(1,p.night*1.15);
    for(let i=0;i<38;i++){
      const x=10+hash(i,401)*(W-20),y=8+hash(i,402)*126,r=.42+hash(i,403)*.72;
      starPoint(c,x,y,r,a*(.22+hash(i,404)*.54));
    }
    constellation(c,W*.10,26,.74,a,4);
    constellation(c,W*.45,55,.65,a*.92,9);
    constellation(c,W*.72,28,.78,a*.96,13);
  }

  class CoastLayer{
    constructor(){
      this.ready=false;
      this.image=null;
      if(typeof Image!=='undefined'){
        this.image=new Image();
        this.image.onload=()=>{this.ready=true;};
        this.image.onerror=()=>{this.ready=false;};
        this.image.src='/gameplay/art/city-montage.webp?v='+VERSION;
      }
    }
    label(world,reduced=false){
      const s=sceneState(world,reduced);
      return s.blend>.55?s.next.label:s.current.label;
    }
    drawFallback(c,W,p){
      const sky=c.createLinearGradient(0,0,0,HORIZON);
      sky.addColorStop(0,p.top);sky.addColorStop(1,p.horizon);
      c.fillStyle=sky;c.fillRect(0,0,W,HORIZON+4);
      c.fillStyle=p.night>.5?'#365364':'#648D84';
      c.beginPath();c.moveTo(0,HORIZON);c.bezierCurveTo(W*.22,145,W*.40,163,W*.58,138);
      c.bezierCurveTo(W*.73,118,W*.86,164,W,HORIZON);c.closePath();c.fill();
    }
    drawScene(c,scene,alpha,progress,W,H){
      if(!this.ready||!this.image||alpha<=0)return;
      const targetRatio=W/H,pan=(progress-.5)*18,src=sourceRect(scene,targetRatio,pan);
      c.save();c.globalAlpha=alpha;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      c.drawImage(this.image,src.x,src.y,src.w,src.h,0,0,W,H);c.restore();
    }
    draw(c,eng,p,reduced=false){
      const W=eng.width,H=320,state=sceneState(eng.world,reduced);
      c.save();c.beginPath();c.rect(0,0,W,HORIZON+4);c.clip();
      if(!this.ready)this.drawFallback(c,W,p);
      else{
        this.drawScene(c,state.current,1,state.progress,W,H);
        if(state.blend>0)this.drawScene(c,state.next,state.blend,0,W,H);
      }
      stars(c,W,p,reduced);
      // A subtle common veil reduces differences between source times of day; whole-scene
      // dusk/night lighting is still applied later by Renderer.environmentLight().
      if(p.warm>0){c.fillStyle='rgba(223,157,105,'+(p.warm*.045)+')';c.fillRect(0,0,W,HORIZON+4);}
      if(p.night>0){c.fillStyle='rgba(15,35,58,'+(p.night*.055)+')';c.fillRect(0,0,W,HORIZON+4);}
      c.restore();
    }
  }

  return Object.freeze({
    version:VERSION,CoastLayer,SCENES,SHEET,HORIZON,PARALLAX,ROUTE_SPAN,SEGMENT_SPAN,FADE_FRACTION,
    rawCamera,routeX,camera,sceneState,sourceRect
  });
});
