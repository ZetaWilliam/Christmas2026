/* Six illustrated New Zealand panoramas: Auckland → Queenstown → Milford Sound → Christchurch → Dunedin → Wellington. */
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
  const VERSION='2026.09.28-six-panorama.8';
  const HORIZON=178,PARALLAX=.105,ROUTE_SPAN=11200,BLEND_FRACTION=.24,TAU=Math.PI*2;
  const SCENES=Object.freeze([
    Object.freeze({id:'auckland',label:'Auckland · Tāmaki Makaurau'}),
    Object.freeze({id:'queenstown',label:'Queenstown · Tāhuna'}),
    Object.freeze({id:'milford',label:'Milford Sound · Piopiotahi'}),
    Object.freeze({id:'christchurch',label:'Christchurch · Ōtautahi'}),
    Object.freeze({id:'dunedin',label:'Dunedin · Ōtepoti'}),
    Object.freeze({id:'wellington',label:'Wellington · Te Whanganui-a-Tara'})
  ]);
  const SEGMENT=ROUTE_SPAN/SCENES.length;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function routeX(x){const n=Number.isFinite(x)?x:0;return ((n%ROUTE_SPAN)+ROUTE_SPAN)%ROUTE_SPAN;}
  function rawCamera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function camera(world,reduced=false){return reduced?0:routeX(rawCamera(world,false));}
  function sceneState(world,reduced=false){
    const x=camera(world,reduced),pos=x/SEGMENT,index=Math.min(SCENES.length-1,Math.floor(pos)),local=pos-index;
    const blend=reduced?0:smooth((local-(1-BLEND_FRACTION))/BLEND_FRACTION);
    return Object.freeze({index,next:(index+1)%SCENES.length,local,blend,current:SCENES[index],nextScene:SCENES[(index+1)%SCENES.length]});
  }
  function starPoint(c,x,y,r,alpha){
    c.save();c.globalAlpha=alpha;
    const g=c.createRadialGradient(x,y,0,x,y,r*3.6);
    g.addColorStop(0,'rgba(255,255,244,1)');g.addColorStop(.2,'rgba(239,247,255,.92)');g.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,r*3.6,0,TAU);c.fill();
    c.fillStyle='#FFFDF0';c.beginPath();c.arc(x,y,Math.max(.62,r),0,TAU);c.fill();c.restore();
  }
  function starField(c,W,H,alpha){
    if(alpha<=0)return;
    for(let i=0;i<46;i++){
      const x=10+hash(i,401)*(W-20),y=8+hash(i,402)*(H-24),r=.42+hash(i,403)*.72;
      starPoint(c,x,y,r,alpha*(.25+hash(i,404)*.55));
    }
  }
  function constellation(c,x,y,scale,alpha,seed){
    const patterns=[
      [[0,20],[22,0],[34,28],[58,18],[76,45],[101,29]],
      [[0,8],[18,32],[42,18],[63,38],[82,12],[108,28],[126,5]],
      [[0,35],[21,12],[46,20],[68,0],[91,24],[116,17]]
    ],raw=patterns[Math.abs(seed)%patterns.length],
    pts=raw.map((p,i)=>[x+p[0]*scale+(hash(i,seed)-.5)*4*scale,y+p[1]*scale+(hash(i,seed+37)-.5)*4*scale]);
    c.save();c.globalAlpha=alpha*.18;c.strokeStyle='rgba(196,218,242,.36)';c.lineWidth=.42;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();c.restore();
    pts.forEach((p,i)=>starPoint(c,p[0],p[1],(.70+(i%3)*.25)*scale,alpha*(.70+(i%2)*.2)));
  }
  class CoastLayer{
    label(world,reduced=false){return sceneState(world,reduced).current.label;}
    drawScene(c,img,W,H,local,alpha,entering=false){
      if(!img||!img.complete||!img.naturalWidth)return;
      const ratio=img.naturalWidth/img.naturalHeight,drawH=H+7,drawW=drawH*ratio,travel=Math.max(0,drawW-W);
      const pan=entering?Math.max(0,1-local):Math.min(1,local),x=-travel*pan;
      c.save();c.globalAlpha=alpha;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(img,x,-4,drawW,drawH);c.restore();
    }
    draw(c,eng,p,images,ready,reduced=false){
      const W=eng.width,H=HORIZON+4,state=sceneState(eng.world,reduced);
      c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
      const fallback=c.createLinearGradient(0,0,0,H);
      fallback.addColorStop(0,p.top);fallback.addColorStop(1,p.horizon);c.fillStyle=fallback;c.fillRect(0,0,W,H);
      if(ready){
        const a=images?.[state.current.id],b=images?.[state.nextScene.id];
        this.drawScene(c,a,W,H,state.local,1,false);
        if(state.blend>0)this.drawScene(c,b,W,H,1-state.local,state.blend,true);
      }
      if(p.night>.10&&!reduced){
        starField(c,W,HORIZON-24,p.night*.84);
        constellation(c,W*.10,28,.75,p.night*.88,4);
        constellation(c,W*.44,64,.66,p.night*.78,9);
        constellation(c,W*.70,30,.82,p.night*.84,13);
      }
      const haze=c.createLinearGradient(0,HORIZON-14,0,HORIZON+4);
      haze.addColorStop(0,'rgba(220,238,239,0)');haze.addColorStop(1,'rgba(190,221,222,.12)');
      c.fillStyle=haze;c.fillRect(0,HORIZON-14,W,18);c.restore();
    }
  }
  return Object.freeze({version:VERSION,SCENES,ROUTE_SPAN,SEGMENT,BLEND_FRACTION,PARALLAX,routeX,rawCamera,camera,sceneState,CoastLayer});
});