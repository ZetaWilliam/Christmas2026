/* Cinematic seven-scene New Zealand panoramas: Auckland → Queenstown → Milford Sound → Christchurch → Dunedin → Wellington → Cape Reinga. */
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
        this.coastLayer.draw(this.ctx,this.eng,p,this.sceneImages,this.sceneReady,this.reduced);
      }
      fallback(p){this.landscape(p);}
      nightSkyHighlights(p){
        if(!this.coastLayer)this.coastLayer=new api.CoastLayer();
        this.coastLayer.drawNightSky(this.ctx,this.eng,p,this.reduced);
      }
      draw(){
        super.draw();
        const el=document.getElementById('runnerLandmark');
        if(el&&this.coastLayer)el.textContent=this.coastLayer.label(this.eng.world,this.reduced);
      }
    };
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026.09.30-cape-reinga.15';
  const HORIZON=178,SCENE_DISTANCE=900,DISSOLVE_FRACTION=.28,PAN_FRACTION=.065,CHRISTCHURCH_FOCUS_Y=0,DUNEDIN_REPAIR_X=400/768,DUNEDIN_REPAIR_Y=70/360,DUNEDIN_REPAIR_W=368/768,DUNEDIN_REPAIR_H=200/360,WELLINGTON_WATER_EXTENSION=26,TAU=Math.PI*2;
  const SCENES=Object.freeze([
    Object.freeze({id:'auckland',label:'Auckland · Tāmaki Makaurau'}),
    Object.freeze({id:'queenstown',label:'Queenstown · Tāhuna'}),
    Object.freeze({id:'milford',label:'Milford Sound · Piopiotahi'}),
    Object.freeze({id:'christchurch',label:'Christchurch · Ōtautahi'}),
    Object.freeze({id:'dunedin',label:'Dunedin · Ōtepoti'}),
    Object.freeze({id:'wellington',label:'Wellington · Te Whanganui-a-Tara'}),
    Object.freeze({id:'capereinga',label:'Cape Reinga · Te Rerenga Wairua'})
  ]);
  const ROUTE_DISTANCE=SCENE_DISTANCE*SCENES.length;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smoother=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function routeDistance(world,reduced=false){
    if(reduced)return 0;
    const d=Math.max(0,Number.isFinite(world)?world:0)/10;
    return ((d%ROUTE_DISTANCE)+ROUTE_DISTANCE)%ROUTE_DISTANCE;
  }
  function sceneState(world,reduced=false){
    if(reduced)return Object.freeze({index:0,next:1,local:0,dissolve:0,current:SCENES[0],nextScene:SCENES[1]});
    const route=routeDistance(world,false),pos=route/SCENE_DISTANCE,index=Math.min(SCENES.length-1,Math.floor(pos)),local=pos-index;
    const dissolve=smoother((local-(1-DISSOLVE_FRACTION))/DISSOLVE_FRACTION);
    return Object.freeze({index,next:(index+1)%SCENES.length,local,dissolve,current:SCENES[index],nextScene:SCENES[(index+1)%SCENES.length]});
  }
  function sceneIndex(world,reduced=false){
    const s=sceneState(world,reduced);
    return s.dissolve>=.5?s.next:s.index;
  }
  function makeSurface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function starPoint(c,x,y,r,alpha,time,seed){
    const pulse=.54+.46*(.5+.5*Math.sin(time*2.45+seed*1.61));
    const a=alpha*pulse;
    c.save();c.globalAlpha=a;
    const g=c.createRadialGradient(x,y,0,x,y,r*4);
    g.addColorStop(0,'rgba(255,255,242,1)');g.addColorStop(.20,'rgba(239,247,255,.96)');g.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,r*4,0,TAU);c.fill();
    c.fillStyle='#FFFDF1';c.beginPath();c.arc(x,y,Math.max(.62,r),0,TAU);c.fill();
    if(pulse>.90&&r>.72){
      c.globalAlpha=a*.42;c.strokeStyle='rgba(249,252,255,.92)';c.lineWidth=.45;
      c.beginPath();c.moveTo(x-r*3.0,y);c.lineTo(x+r*3.0,y);c.moveTo(x,y-r*3.0);c.lineTo(x,y+r*3.0);c.stroke();
    }
    c.restore();
  }
  function constellation(c,x,y,scale,alpha,seed,time){
    const patterns=[
      [[0,20],[22,0],[34,28],[58,18],[76,45],[101,29]],
      [[0,8],[18,32],[42,18],[63,38],[82,12],[108,28],[126,5]],
      [[0,35],[21,12],[46,20],[68,0],[91,24],[116,17]]
    ],raw=patterns[Math.abs(seed)%patterns.length],
    pts=raw.map((p,i)=>[x+p[0]*scale+(hash(i,seed)-.5)*4*scale,y+p[1]*scale+(hash(i,seed+37)-.5)*4*scale]);
    c.save();c.globalAlpha=alpha*.09;c.strokeStyle='rgba(196,218,242,.36)';c.lineWidth=.42;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();c.restore();
    pts.forEach((p,i)=>starPoint(c,p[0],p[1],(.74+(i%3)*.25)*scale,alpha*(.76+(i%2)*.18),time,seed*23+i));
  }
  function field(c,W,H,alpha,time){
    for(let i=0;i<28;i++){
      const x=12+hash(i,401)*(W-24),y=8+hash(i,402)*(H-22),r=.40+hash(i,403)*.62;
      starPoint(c,x,y,r,alpha*(.18+hash(i,404)*.32),time,i+401);
    }
  }
  function drawChristchurchSpire(g,img,sx,sy,sw,sh,targetW,H){
    const sourceX=img.naturalWidth*.7215,baseSourceY=img.naturalHeight*.365,shoulderSourceY=img.naturalHeight*.285,tipSourceY=img.naturalHeight*.105;
    const mapX=x=>(x-sx)/sw*targetW,mapY=y=>(y-sy)/sh*H;
    const cx=mapX(sourceX),baseY=mapY(baseSourceY),shoulderY=mapY(shoulderSourceY),tipY=mapY(tipSourceY);
    if(cx<-20||cx>targetW+20||baseY<0||tipY>H)return;
    const halfW=Math.max(3.2,(img.naturalWidth*.009/sw)*targetW);
    g.save();
    const fill=g.createLinearGradient(cx-halfW,tipY,cx+halfW,baseY);
    fill.addColorStop(0,'#59616A');fill.addColorStop(.46,'#73777B');fill.addColorStop(1,'#4A535C');
    g.fillStyle=fill;g.strokeStyle='rgba(57,64,70,.62)';g.lineWidth=Math.max(.65,H/260);
    g.beginPath();
    g.moveTo(cx,tipY);
    g.lineTo(cx+halfW*.38,shoulderY);
    g.lineTo(cx+halfW,baseY);
    g.lineTo(cx-halfW,baseY);
    g.lineTo(cx-halfW*.38,shoulderY);
    g.closePath();g.fill();g.stroke();
    g.strokeStyle='rgba(214,215,207,.46)';g.lineWidth=Math.max(.5,H/330);
    g.beginPath();g.moveTo(cx-.6,tipY+2);g.lineTo(cx-.9,baseY-1);g.stroke();
    g.fillStyle='#545C62';g.beginPath();g.arc(cx,tipY-1.4,Math.max(.65,H/230),0,TAU);g.fill();
    g.restore();
  }
  class CoastLayer{
    constructor(){this.cache={};this.cacheKey='';this.dunedinRepairCanvas=null;this.dunedinRepairSource=null;}
    prepareDunedinRepair(images){
      const img=images?.dunedinRepair;
      if(!img||!img.complete||!img.naturalWidth)return null;
      if(this.dunedinRepairSource===img&&this.dunedinRepairCanvas)return this.dunedinRepairCanvas;
      const plate=makeSurface(img.naturalWidth,img.naturalHeight),g=plate.getContext('2d');
      g.drawImage(img,0,0);
      g.globalCompositeOperation='destination-in';
      const edge=.08,h=g.createLinearGradient(0,0,plate.width,0);
      h.addColorStop(0,'rgba(0,0,0,0)');h.addColorStop(edge,'rgba(0,0,0,1)');h.addColorStop(1-edge,'rgba(0,0,0,1)');h.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=h;g.fillRect(0,0,plate.width,plate.height);
      const v=g.createLinearGradient(0,0,0,plate.height);
      v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(edge,'rgba(0,0,0,1)');v.addColorStop(1-edge,'rgba(0,0,0,1)');v.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=v;g.fillRect(0,0,plate.width,plate.height);
      g.globalCompositeOperation='source-over';
      this.dunedinRepairSource=img;this.dunedinRepairCanvas=plate;return plate;
    }
    label(world,reduced=false){
      const s=sceneState(world,reduced);
      return (s.dissolve>=.5?s.nextScene:s.current).label;
    }
    prepare(images,W,H){
      if(!images)return false;
      const pan=Math.max(28,Math.min(72,W*PAN_FRACTION)),key=W+'x'+H+'@'+pan;
      if(this.cacheKey===key&&SCENES.every(s=>this.cache[s.id]))return true;
      const next={};
      for(const scene of SCENES){
        const img=images[scene.id];
        if(!img||!img.complete||!img.naturalWidth)return false;
        const targetW=Math.ceil(W+pan),extraH=scene.id==='wellington'?WELLINGTON_WATER_EXTENSION:0,targetH=H+extraH,plate=makeSurface(targetW,targetH),g=plate.getContext('2d');
        const srcRatio=img.naturalWidth/img.naturalHeight,targetRatio=targetW/H;
        let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
        if(srcRatio>targetRatio){sw=sh*targetRatio;sx=(img.naturalWidth-sw)/2;}
        else{
          sh=sw/targetRatio;
          const focusY=scene.id==='christchurch'?CHRISTCHURCH_FOCUS_Y:.5;
          sy=(img.naturalHeight-sh)*focusY;
        }
        g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
        g.drawImage(img,sx,sy,sw,sh,0,0,targetW,H);
        if(scene.id==='christchurch')drawChristchurchSpire(g,img,sx,sy,sw,sh,targetW,H);
        if(scene.id==='dunedin'){
          const repair=this.prepareDunedinRepair(images);
          if(repair){
            const rx=img.naturalWidth*DUNEDIN_REPAIR_X,ry=img.naturalHeight*DUNEDIN_REPAIR_Y,rw=img.naturalWidth*DUNEDIN_REPAIR_W,rh=img.naturalHeight*DUNEDIN_REPAIR_H;
            const dx=(rx-sx)/sw*targetW,dy=(ry-sy)/sh*H,dw=rw/sw*targetW,dh=rh/sh*H;
            g.drawImage(repair,dx,dy,dw,dh);
          }
        }
        if(scene.id==='wellington'&&extraH){
          const waterSlice=sh*.10;
          g.globalAlpha=.96;
          g.drawImage(img,sx,sy+sh-waterSlice,sw,waterSlice,0,H-1,targetW,extraH+1);
          g.globalAlpha=1;
        }
        next[scene.id]=Object.freeze({canvas:plate,travel:targetW-W});
      }
      this.cache=next;this.cacheKey=key;return true;
    }
    drawPlate(c,item,W,H,progress,alpha){
      if(!item||alpha<=0)return;
      const x=-item.travel*clamp(progress,0,1);
      c.save();c.globalAlpha=alpha;c.drawImage(item.canvas,x,0);c.restore();
    }
    draw(c,eng,p,images,ready,reduced=false){
      const W=eng.width,H=HORIZON+4,state=sceneState(eng.world,reduced),clipH=H+WELLINGTON_WATER_EXTENSION;
      c.save();c.beginPath();c.rect(0,0,W,clipH);c.clip();
      const fallback=c.createLinearGradient(0,0,0,H);
      fallback.addColorStop(0,p.top);fallback.addColorStop(1,p.horizon);c.fillStyle=fallback;c.fillRect(0,0,W,clipH);
      if(ready&&this.prepare(images,W,H)){
        const current=this.cache[state.current.id],incoming=this.cache[state.nextScene.id],d=state.dissolve;
        this.drawPlate(c,current,W,H,state.local,1-d);
        if(d>0)this.drawPlate(c,incoming,W,H,0,d);
        if(d>0&&d<1){
          const mist=Math.sin(Math.PI*d)*.10;
          c.fillStyle='rgba(222,235,234,'+mist+')';c.fillRect(0,0,W,H);
        }
      }
      const haze=c.createLinearGradient(0,HORIZON-14,0,HORIZON+4);
      haze.addColorStop(0,'rgba(220,238,239,0)');haze.addColorStop(1,'rgba(190,221,222,.10)');
      c.fillStyle=haze;c.fillRect(0,HORIZON-14,W,18);c.restore();
    }
    drawNightSky(c,eng,p,reduced=false){
      if(reduced||p.night<=.06)return;
      const W=eng.width,H=HORIZON-24,time=eng.time,appear=smoother((p.night-.06)/.34);
      c.save();c.beginPath();c.rect(0,0,W,HORIZON-5);c.clip();
      field(c,W,H,appear*.62,time);
      constellation(c,W*.10,27,.76,appear*.96,4,time);
      constellation(c,W*.43,62,.67,appear*.86,9,time);
      constellation(c,W*.69,28,.83,appear*.92,13,time);
      if(p.night>.42){
        const moon=(p.night-.42)/.58;
        c.globalAlpha=moon*.56;c.fillStyle='#FFF4D9';c.beginPath();c.arc(W-70,43,11,0,TAU);c.fill();
        c.fillStyle='rgba(25,46,75,.92)';c.beginPath();c.arc(W-65,39,10,0,TAU);c.fill();
      }
      c.restore();
    }
  }
  return Object.freeze({version:VERSION,SCENES,SCENE_DISTANCE,ROUTE_DISTANCE,DISSOLVE_FRACTION,PAN_FRACTION,CHRISTCHURCH_FOCUS_Y,DUNEDIN_REPAIR_X,DUNEDIN_REPAIR_Y,DUNEDIN_REPAIR_W,DUNEDIN_REPAIR_H,WELLINGTON_WATER_EXTENSION,routeDistance,sceneState,sceneIndex,CoastLayer});
});