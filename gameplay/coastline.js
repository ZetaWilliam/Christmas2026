/* Non-repeating distant coast. Reuses the existing coast painting; no changes to water, rigs or physics. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {
    root.HarbourCoastline=api;
    const Base=root.HarbourRenderer;
    if(!Base)return;
    root.HarbourRenderer=class extends Base {
      landscape(p){
        if(!this.coastLayer)this.coastLayer=new api.CoastLayer();
        this.coastLayer.draw(this.ctx,this.eng,p,this.sceneReady?this.scene:null,this.reduced);
      }
      fallback(p){this.landscape(p);}
      draw(){
        super.draw();
        const el=document.getElementById('runnerLandmark');
        if(el&&this.coastLayer)el.textContent=this.coastLayer.label(this.eng.world,this.eng.width,this.reduced);
      }
    };
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2026.09.24-coast.1',HORIZON=178,PARALLAX=.035;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function noise(x,seed){const i=Math.floor(x),f=smooth(x-i);return hash(i,seed)*(1-f)+hash(i+1,seed)*f;}
  // No modulo/cycle reset: the terrain is sampled in continuous world coordinates.
  function height(x,layer=0){return 3+noise(x/790,19+layer)*9+noise(x/257,41+layer)*7+noise(x/81,73+layer)*2;}
  const LANDMARKS=Object.freeze([
    Object.freeze({id:'city',label:'Sky Tower · Auckland waterfront',x:24,scale:1.25,rect:Object.freeze([0,78,343,104])}),
    Object.freeze({id:'bridge',label:'Harbour Bridge · Waitematā',x:625,scale:1.65,rect:Object.freeze([330,150,240,32])}),
    Object.freeze({id:'rangitoto',label:'Rangitoto · Hauraki Gulf',x:1350,scale:1.75,rect:Object.freeze([560,138,344,44])})
  ]);
  // Trace the upper silhouettes in the original 960 × 192 painting. Sky/water stay separate.
  const RIDGES={
    city:[[0,160],[10,157],[13,148],[17,158],[26,160],[32,157],[37,149],[42,157],[52,162],[58,159],[66,153],[70,160],[88,162],[96,153],[102,155],[108,158],[111,144],[118,142],[124,145],[124,158],[131,151],[137,152],[139,146],[143,147],[144,157],[150,150],[155,148],[157,146],[162,146],[165,153],[165,161],[171,157],[175,157],[175,137],[181,134],[188,137],[190,156],[194,146],[200,146],[200,156],[206,158],[207,126],[205,121],[204,116],[207,113],[207,107],[209,102],[209,81],[210,101],[212,107],[212,113],[215,116],[214,120],[212,124],[212,157],[219,158],[220,151],[226,149],[232,151],[232,161],[237,158],[241,159],[243,154],[249,151],[253,156],[254,142],[259,139],[263,140],[265,144],[265,160],[271,162],[277,160],[285,158],[288,161],[290,155],[292,151],[297,152],[299,156],[302,157],[302,170],[310,164],[316,166],[321,165],[330,170],[343,174]],
    bridge:[[330,173],[350,172],[379,169],[391,168],[404,162],[416,158],[430,156],[442,156],[455,157],[468,159],[480,162],[490,166],[505,169],[528,170],[551,172],[570,174]],
    rangitoto:[[560,177],[580,174],[607,171],[638,168],[666,161],[695,156],[714,149],[730,147],[744,151],[754,149],[763,144],[770,143],[778,144],[786,149],[805,154],[830,160],[856,164],[878,166],[904,171]]
  };
  function camera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function layout(world,width,reduced=false){
    const scroll=camera(world,reduced);
    return LANDMARKS.map(o=>({...o,screenX:o.x-scroll,width:o.rect[2]*o.scale,height:o.rect[3]*o.scale}))
      .filter(o=>o.screenX+o.width> -2&&o.screenX<width+2);
  }
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function polygon(c,points,dx,dy,bottom){
    c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p[0]-dx,p[1]-dy));
    c.lineTo(points.at(-1)[0]-dx,bottom);c.lineTo(points[0][0]-dx,bottom);c.closePath();
  }
  function extract(image,o){
    const [x,y,w,h]=o.rect,c=surface(w,h),g=c.getContext('2d',{willReadFrequently:true});
    polygon(g,RIDGES[o.id],x,y,h);g.fill();
    if(o.id==='bridge'){
      // Clear the sky beneath the arch without erasing its deck or support pillars.
      g.globalCompositeOperation='destination-out';g.beginPath();g.moveTo(408-x,179-y);
      g.bezierCurveTo(429-x,164-y,464-x,164-y,484-x,179-y);g.closePath();g.fill();
    }
    g.globalCompositeOperation='source-in';g.drawImage(image,x,y,w,h,0,0,w,h);
    const pixels=g.getImageData(0,0,w,h),d=pixels.data;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const edge=smooth(Math.min(px,w-1-px)/(o.id==='rangitoto'?42:12))*smooth((h-1-py)/4);
      d[(py*w+px)*4+3]*=edge;
    }
    g.putImageData(pixels,0,0);return c;
  }
  class CoastLayer {
    constructor(){this.image=null;this.sprites={};this.tinted={};this.clouds=[];}
    prepare(image){
      if(!image||!image.complete||!image.naturalWidth||this.image===image)return;
      if(image.naturalWidth!==960||image.naturalHeight!==192)return;
      this.image=image;this.sprites={};this.tinted={};
      for(const o of LANDMARKS)this.sprites[o.id]=extract(image,o);
      // Preserve painted cloud texture, but remove the blue background and all land.
      this.clouds=[[0,0,460,132],[735,0,225,132]].map(([x,y,w,h])=>{
        const c=surface(w,h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,x,y,w,h,0,0,w,h);
        const im=g.getImageData(0,0,w,h),d=im.data;
        for(let py=0;py<h;py++)for(let px=0;px<w;px++){
          const i=(py*w+px)*4,cloud=smooth((Math.min(d[i],d[i+1])-d[i+2]*.78+7)/47);
          d[i+3]=Math.round(255*cloud*smooth(Math.min(px,w-1-px)/22)*smooth((h-1-py)/12));
        }
        g.putImageData(im,0,0);return c;
      });
    }
    label(world,width,reduced){
      const visible=layout(world,width,reduced);
      if(!visible.length)return 'Hauraki Gulf · Distant coast';
      return visible.reduce((a,b)=>Math.abs(a.screenX+a.width/2-width/2)<Math.abs(b.screenX+b.width/2-width/2)?a:b).label;
    }
    drawClouds(c,world,width,p,reduced){
      if(!this.clouds.length)return;
      const scroll=camera(world,reduced)*.35,cell=680;
      // Clouds may reuse texture; named coasts and buildings never do.
      for(let i=Math.floor(scroll/cell)-1;i<=Math.floor((scroll+width)/cell)+1;i++){
        const im=this.clouds[(i%2+2)%2],x=i*cell+hash(i,98)*135-scroll,s=.65+hash(i,102)*.55;
        c.save();c.globalAlpha=(.34+hash(i,115)*.20)*(1-p.night*.8);
        c.drawImage(im,x,-9+hash(i,120)*19,im.width*s,im.height*s);c.restore();
      }
    }
    drawTerrain(c,world,width,p,reduced){
      const scroll=camera(world,reduced);
      for(const layer of [1,0]){
        const depth=layer? .66:1,cam=scroll*depth;
        c.save();c.fillStyle=layer?'#90ABB8':'#678D9D';c.globalAlpha=layer?.20:.28;
        c.beginPath();
        // Align samples to world-space grid points, not the left edge of the viewport.
        const start=Math.floor(cam/8)*8;
        for(let wx=start;wx<=cam+width+8;wx+=8){
          const y=HORIZON-height(wx,layer)*(layer?.63:.84);
          c[wx===start?'moveTo':'lineTo'](wx-cam,y);
        }
        c.lineTo(width+8,HORIZON+3);c.lineTo(-8,HORIZON+3);c.closePath();c.fill();c.restore();
      }
    }
    tintedSprite(id,p){
      const src=this.sprites[id],step=Math.round(clamp(p.night,0,1)*24);
      if(!src||step===0)return src;
      const key=id+':'+step;if(this.tinted[key])return this.tinted[key];
      const c=surface(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);
      g.globalCompositeOperation='source-atop';g.fillStyle='rgba(20,40,70,'+(step/24*.62)+')';g.fillRect(0,0,c.width,c.height);
      return this.tinted[key]=c;
    }
    draw(c,eng,p,image,reduced=false){
      this.prepare(image);
      const W=eng.width,world=eng.world;
      c.save();c.beginPath();c.rect(0,0,W,HORIZON+3);c.clip();
      const sky=c.createLinearGradient(0,0,0,HORIZON);sky.addColorStop(0,p.top);sky.addColorStop(1,p.horizon);
      c.fillStyle=sky;c.fillRect(0,0,W,HORIZON+3);
      this.drawClouds(c,world,W,p,reduced);
      this.drawTerrain(c,world,W,p,reduced);
      for(const o of layout(world,W,reduced)){
        const sprite=this.tintedSprite(o.id,p);if(!sprite)continue;
        c.drawImage(sprite,o.screenX,HORIZON-o.height+3,o.width,o.height);
      }
      // Atmospheric haze blends distant shoreline bases into the retained ocean.
      const mist=c.createLinearGradient(0,HORIZON-12,0,HORIZON+3);
      mist.addColorStop(0,'rgba(211,233,232,0)');mist.addColorStop(1,'rgba(183,211,218,.14)');
      c.fillStyle=mist;c.fillRect(0,HORIZON-12,W,15);
      if(p.night>.15&&!reduced){
        c.save();c.globalAlpha=p.night*.66;c.fillStyle='#FFF4DB';
        for(let i=0;i<22;i++){c.beginPath();c.arc((i*157+35)%W,18+(i*29)%85,.65+(i%3)*.23,0,7);c.fill();}
        c.beginPath();c.arc(W-78,46,12,0,7);c.fill();c.fillStyle=p.top;c.beginPath();c.arc(W-73,42,11,0,7);c.fill();c.restore();
      }
      c.restore();
    }
  }
  return Object.freeze({version:VERSION,CoastLayer,LANDMARKS,layout,camera,height,noise});
});
