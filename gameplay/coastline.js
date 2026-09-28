/* Continuous six-scene New Zealand panorama: Auckland → Queenstown → Milford Sound → Christchurch → Dunedin → Wellington. */
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
      draw(){
        super.draw();
        const el=document.getElementById('runnerLandmark');
        if(el&&this.coastLayer)el.textContent=this.coastLayer.label(this.eng.world,this.reduced);
      }
    };
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026.09.28-continuous-scroll.9';
  const HORIZON=178,PARALLAX=.035,SCENE_STEP=900,PLATE_WIDTH=1080,PLATE_HEIGHT=182,FEATHER=160,TAU=Math.PI*2;
  const SCENES=Object.freeze([
    Object.freeze({id:'auckland',label:'Auckland · Tāmaki Makaurau'}),
    Object.freeze({id:'queenstown',label:'Queenstown · Tāhuna'}),
    Object.freeze({id:'milford',label:'Milford Sound · Piopiotahi'}),
    Object.freeze({id:'christchurch',label:'Christchurch · Ōtautahi'}),
    Object.freeze({id:'dunedin',label:'Dunedin · Ōtepoti'}),
    Object.freeze({id:'wellington',label:'Wellington · Te Whanganui-a-Tara'})
  ]);
  const ROUTE_SPAN=SCENE_STEP*SCENES.length;
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function routeX(x){const n=Number.isFinite(x)?x:0;return ((n%ROUTE_SPAN)+ROUTE_SPAN)%ROUTE_SPAN;}
  function rawCamera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function camera(world,reduced=false){return reduced?0:routeX(rawCamera(world,false));}
  function sceneIndex(world,reduced=false){
    const scroll=camera(world,reduced);
    return Math.floor((scroll+SCENE_STEP*.5)/SCENE_STEP)%SCENES.length;
  }
  function scenePositions(world,width,reduced=false){
    const scroll=camera(world,reduced),out=[];
    for(let cycle=-1;cycle<=1;cycle++){
      const shift=cycle*ROUTE_SPAN;
      for(let i=0;i<SCENES.length;i++){
        const x=i*SCENE_STEP+shift-scroll;
        if(x+PLATE_WIDTH>-4&&x<width+4)out.push(Object.freeze({id:SCENES[i].id,index:i,x}));
      }
    }
    return out.sort((a,b)=>a.x-b.x);
  }
  function makeSurface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function starPoint(c,x,y,r,alpha,time,seed){
    const pulse=.58+.42*(.5+.5*Math.sin(time*3.1+seed*1.73));
    const a=alpha*pulse;
    c.save();c.globalAlpha=a;
    const g=c.createRadialGradient(x,y,0,x,y,r*3.8);
    g.addColorStop(0,'rgba(255,255,244,1)');g.addColorStop(.22,'rgba(239,247,255,.95)');g.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,r*3.8,0,TAU);c.fill();
    c.fillStyle='#FFFDF0';c.beginPath();c.arc(x,y,Math.max(.62,r),0,TAU);c.fill();
    if(pulse>.88&&r>.72){
      c.globalAlpha=a*.48;c.strokeStyle='#F8FBFF';c.lineWidth=.45;
      c.beginPath();c.moveTo(x-r*3.2,y);c.lineTo(x+r*3.2,y);c.moveTo(x,y-r*3.2);c.lineTo(x,y+r*3.2);c.stroke();
    }
    c.restore();
  }
  function starField(c,W,H,alpha,time){
    if(alpha<=0)return;
    for(let i=0;i<36;i++){
      const x=10+hash(i,401)*(W-20),y=8+hash(i,402)*(H-24),r=.42+hash(i,403)*.72;
      starPoint(c,x,y,r,alpha*(.22+hash(i,404)*.46),time,i+401);
    }
  }
  function constellation(c,x,y,scale,alpha,seed,time){
    const patterns=[
      [[0,20],[22,0],[34,28],[58,18],[76,45],[101,29]],
      [[0,8],[18,32],[42,18],[63,38],[82,12],[108,28],[126,5]],
      [[0,35],[21,12],[46,20],[68,0],[91,24],[116,17]]
    ],raw=patterns[Math.abs(seed)%patterns.length],
    pts=raw.map((p,i)=>[x+p[0]*scale+(hash(i,seed)-.5)*4*scale,y+p[1]*scale+(hash(i,seed+37)-.5)*4*scale]);
    c.save();c.globalAlpha=alpha*.10;c.strokeStyle='rgba(196,218,242,.34)';c.lineWidth=.4;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();c.restore();
    pts.forEach((p,i)=>starPoint(c,p[0],p[1],(.72+(i%3)*.26)*scale,alpha*(.72+(i%2)*.18),time,seed*19+i));
  }
  class CoastLayer{
    constructor(){this.plates={};this.sources={};}
    label(world,reduced=false){return SCENES[sceneIndex(world,reduced)].label;}
    prepare(images){
      if(!images)return false;
      let ready=true;
      for(const scene of SCENES){
        const img=images[scene.id];
        if(!img||!img.complete||!img.naturalWidth){ready=false;continue;}
        if(this.sources[scene.id]===img&&this.plates[scene.id])continue;
        const plate=makeSurface(PLATE_WIDTH,PLATE_HEIGHT),g=plate.getContext('2d');
        const ratio=img.naturalWidth/img.naturalHeight,drawW=PLATE_WIDTH,drawH=drawW/ratio,y=(PLATE_HEIGHT-drawH)*.5;
        g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,0,y,drawW,drawH);
        g.globalCompositeOperation='destination-in';
        const mask=g.createLinearGradient(0,0,PLATE_WIDTH,0);
        mask.addColorStop(0,'rgba(0,0,0,0)');
        mask.addColorStop(FEATHER/PLATE_WIDTH,'rgba(0,0,0,1)');
        mask.addColorStop(1-FEATHER/PLATE_WIDTH,'rgba(0,0,0,1)');
        mask.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=mask;g.fillRect(0,0,PLATE_WIDTH,PLATE_HEIGHT);
        g.globalCompositeOperation='source-over';
        this.sources[scene.id]=img;this.plates[scene.id]=plate;
      }
      return ready&&SCENES.every(s=>this.plates[s.id]);
    }
    draw(c,eng,p,images,ready,reduced=false){
      const W=eng.width,H=HORIZON+4,time=reduced?0:eng.time;
      c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
      const fallback=c.createLinearGradient(0,0,0,H);
      fallback.addColorStop(0,p.top);fallback.addColorStop(1,p.horizon);c.fillStyle=fallback;c.fillRect(0,0,W,H);
      if(ready&&this.prepare(images)){
        for(const pos of scenePositions(eng.world,W,reduced)){
          const plate=this.plates[pos.id];if(!plate)continue;
          c.drawImage(plate,pos.x,0,PLATE_WIDTH,PLATE_HEIGHT);
        }
      }
      if(p.night>.055&&!reduced){
        const appear=Math.min(1,(p.night-.055)/.28),alpha=appear*appear;
        starField(c,W,HORIZON-24,alpha*.74,time);
        constellation(c,W*.10,28,.75,alpha*.94,4,time);
        constellation(c,W*.44,64,.66,alpha*.84,9,time);
        constellation(c,W*.70,30,.82,alpha*.90,13,time);
      }
      const haze=c.createLinearGradient(0,HORIZON-14,0,HORIZON+4);
      haze.addColorStop(0,'rgba(220,238,239,0)');haze.addColorStop(1,'rgba(190,221,222,.11)');
      c.fillStyle=haze;c.fillRect(0,HORIZON-14,W,18);c.restore();
    }
  }
  return Object.freeze({version:VERSION,SCENES,ROUTE_SPAN,SCENE_STEP,PLATE_WIDTH,PLATE_HEIGHT,FEATHER,PARALLAX,routeX,rawCamera,camera,sceneIndex,scenePositions,CoastLayer});
});