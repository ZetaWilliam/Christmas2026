/* Non-repeating Auckland coast v2: clean keyed landmarks + continuous terrain. Water, rigs and physics stay inherited. */
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
  const VERSION='2026.09.24-coast.2',HORIZON=178,PARALLAX=.035;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function noise(x,seed){const i=Math.floor(x),f=smooth(x-i);return hash(i,seed)*(1-f)+hash(i+1,seed)*f;}
  function height(x,layer=0){return 3+noise(x/790,19+layer)*9+noise(x/257,41+layer)*7+noise(x/81,73+layer)*2;}
  function bell(x,center,radius,amp){const d=Math.abs(x-center)/radius;return d>=1?0:amp*(.5+.5*Math.cos(Math.PI*d));}
  const CONNECTORS=Object.freeze([
    Object.freeze({x:185,r:300,h:8.5}),
    Object.freeze({x:650,r:155,h:4.5}),
    Object.freeze({x:1000,r:155,h:4.5}),
    Object.freeze({x:1650,r:420,h:11})
  ]);
  function connectedHeight(x,layer=0){
    let h=height(x,layer);
    const weight=layer===0?1:layer===1?.24:0;
    if(weight)for(const a of CONNECTORS)h+=bell(x,a.x,a.r,a.h*weight);
    return h;
  }
  const LANDMARKS=Object.freeze([
    Object.freeze({id:'city',label:'Sky Tower · Auckland waterfront',x:24,scale:1.25,rect:Object.freeze([0,78,343,104])}),
    Object.freeze({id:'bridge',label:'Harbour Bridge · Waitematā',x:625,scale:1.65,rect:Object.freeze([330,150,240,32])}),
    Object.freeze({id:'rangitoto',label:'Rangitoto · Hauraki Gulf',x:1350,scale:1.75,rect:Object.freeze([560,138,344,44])})
  ]);
  const RIDGES={
    city:[[0,160],[10,157],[13,148],[17,158],[26,160],[32,157],[37,149],[42,157],[52,162],[58,159],[66,153],[70,160],[88,162],[96,153],[102,155],[108,158],[111,144],[118,142],[124,145],[124,158],[131,151],[137,152],[139,146],[143,147],[144,157],[150,150],[155,148],[157,146],[162,146],[165,153],[165,161],[171,157],[175,157],[175,137],[181,134],[188,137],[190,156],[194,146],[200,146],[200,156],[206,158],[207,126],[205,121],[204,116],[207,113],[207,107],[209,102],[209,81],[210,101],[212,107],[212,113],[215,116],[214,120],[212,124],[212,157],[219,158],[220,151],[226,149],[232,151],[232,161],[237,158],[241,159],[243,154],[249,151],[253,156],[254,142],[259,139],[263,140],[265,144],[265,160],[271,162],[277,160],[285,158],[288,161],[290,155],[292,151],[297,152],[299,156],[302,157],[302,170],[310,164],[316,166],[321,165],[330,170],[343,174]],
    bridge:[[330,173],[350,172],[379,169],[391,168],[404,162],[416,158],[430,156],[442,156],[455,157],[468,159],[480,162],[490,166],[505,169],[528,170],[551,172],[570,174]],
    rangitoto:[[560,177],[580,174],[607,171],[638,168],[666,161],[695,156],[714,149],[730,147],[744,151],[754,149],[763,144],[770,143],[778,144],[786,149],[805,154],[830,160],[856,164],[878,166],[904,171]]
  };
  function camera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function layout(world,width,reduced=false){
    const scroll=camera(world,reduced);
    return LANDMARKS.map(o=>({...o,screenX:o.x-scroll,width:o.rect[2]*o.scale,height:o.rect[3]*o.scale}))
      .filter(o=>o.screenX+o.width>-2&&o.screenX<width+2);
  }
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function polygon(c,points,dx,dy,bottom){
    c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p[0]-dx,p[1]-dy));
    c.lineTo(points.at(-1)[0]-dx,bottom);c.lineTo(points[0][0]-dx,bottom);c.closePath();
  }
  function rowBackdrop(image){
    const W=image.naturalWidth,H=image.naturalHeight,c=surface(W,H),g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(image,0,0);const d=g.getImageData(0,0,W,H).data,rows=[];
    for(let y=0;y<H;y++){
      const rs=[],gs=[],bs=[];
      for(let x=0;x<W;x+=8){const i=(y*W+x)*4;rs.push(d[i]);gs.push(d[i+1]);bs.push(d[i+2]);}
      rs.sort((a,b)=>a-b);gs.sort((a,b)=>a-b);bs.sort((a,b)=>a-b);
      const m=rs.length>>1;rows.push([rs[m],gs[m],bs[m]]);
    }
    return rows;
  }
  function bridgeMask(g,x,y,w,h){
    const upper=RIDGES.bridge.map(([px,py])=>[px-x,py-y]);
    const lower=upper.map(([px,py])=>[px,Math.min(h-5,py+8)]);
    g.fillStyle='#000';g.strokeStyle='#000';g.lineJoin='round';g.lineCap='round';
    g.beginPath();upper.forEach((p,i)=>g[i?'lineTo':'moveTo'](...p));lower.slice().reverse().forEach(p=>g.lineTo(...p));g.closePath();g.fill();
    g.lineWidth=4.5;g.beginPath();g.moveTo(0,23.5);g.lineTo(w,24.5);g.stroke();
    for(const px of [20,65,167,220]){g.lineWidth=4;g.beginPath();g.moveTo(px,22);g.lineTo(px,h);g.stroke();}
    g.lineWidth=2.2;
    for(const px of [35,49,80,96,112,128,144,181,196,208]){g.beginPath();g.moveTo(px,20);g.lineTo(px,h-7);g.stroke();}
  }
  function extract(image,o,rows){
    const [x,y,w,h]=o.rect,c=surface(w,h),g=c.getContext('2d',{willReadFrequently:true});
    if(o.id==='bridge')bridgeMask(g,x,y,w,h);else{polygon(g,RIDGES[o.id],x,y,h);g.fill();}
    g.globalCompositeOperation='source-in';g.drawImage(image,x,y,w,h,0,0,w,h);
    const pixels=g.getImageData(0,0,w,h),d=pixels.data;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const i=(py*w+px)*4;if(!d[i+3])continue;
      const edge=smooth(Math.min(px,w-1-px)/(o.id==='rangitoto'?34:10));
      let alpha=d[i+3]/255*edge;
      if(o.id!=='bridge'&&rows){
        const bg=rows[Math.min(rows.length-1,y+py)]||[210,225,230];
        const dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];
        const delta=Math.sqrt(dr*dr+dg*dg+db*db);
        const keep=smooth((delta-5)/28);
        alpha*=.025+.975*keep;
      }
      if(py>h-7)alpha*=.72+.28*((h-1-py)/6);
      d[i+3]=Math.round(255*clamp(alpha,0,1));
    }
    g.putImageData(pixels,0,0);return c;
  }
  class CoastLayer{
    constructor(){this.image=null;this.sprites={};this.tinted={};this.clouds=[];this.rows=null;}
    prepare(image){
      if(!image||!image.complete||!image.naturalWidth||this.image===image)return;
      if(image.naturalWidth!==960||image.naturalHeight!==192)return;
      this.image=image;this.sprites={};this.tinted={};this.rows=rowBackdrop(image);
      for(const o of LANDMARKS)this.sprites[o.id]=extract(image,o,this.rows);
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
      for(let i=Math.floor(scroll/cell)-1;i<=Math.floor((scroll+width)/cell)+1;i++){
        const im=this.clouds[(i%2+2)%2],x=i*cell+hash(i,98)*135-scroll,s=.65+hash(i,102)*.55;
        c.save();c.globalAlpha=(.30+hash(i,115)*.18)*(1-p.night*.82);c.drawImage(im,x,-9+hash(i,120)*19,im.width*s,im.height*s);c.restore();
      }
    }
    drawTerrain(c,world,width,p,reduced){
      const scroll=camera(world,reduced);
      const layers=[
        {idx:2,depth:.46,color:'#A9BBC3',alpha:.15,scale:.48},
        {idx:1,depth:.68,color:'#839FAA',alpha:.24,scale:.68},
        {idx:0,depth:1,color:'#5F858F',alpha:.43,scale:.92}
      ];
      for(const L of layers){
        const cam=scroll*L.depth,start=Math.floor(cam/8)*8;
        c.save();c.fillStyle=L.color;c.globalAlpha=L.alpha*(1-p.night*.16);c.beginPath();
        for(let wx=start;wx<=cam+width+8;wx+=8){
          const base=L.idx===0?connectedHeight(wx,L.idx):height(wx,L.idx);
          const y=HORIZON-base*L.scale;
          c[wx===start?'moveTo':'lineTo'](wx-cam,y);
        }
        c.lineTo(width+8,HORIZON+4);c.lineTo(-8,HORIZON+4);c.closePath();c.fill();c.restore();
      }
      const cam=scroll,start=Math.floor(cam/6)*6;
      c.save();c.fillStyle='rgba(63,108,118,.28)';c.beginPath();
      for(let wx=start;wx<=cam+width+6;wx+=6){
        const y=HORIZON-1-connectedHeight(wx,0)*.30;
        c[wx===start?'moveTo':'lineTo'](wx-cam,y);
      }
      c.lineTo(width+6,HORIZON+4);c.lineTo(-6,HORIZON+4);c.closePath();c.fill();
      c.strokeStyle='rgba(220,239,236,.24)';c.lineWidth=1;c.stroke();c.restore();
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
      c.save();c.beginPath();c.rect(0,0,W,HORIZON+4);c.clip();
      const sky=c.createLinearGradient(0,0,0,HORIZON);sky.addColorStop(0,p.top);sky.addColorStop(1,p.horizon);
      c.fillStyle=sky;c.fillRect(0,0,W,HORIZON+4);
      this.drawClouds(c,world,W,p,reduced);
      this.drawTerrain(c,world,W,p,reduced);
      for(const o of layout(world,W,reduced)){
        const sprite=this.tintedSprite(o.id,p);if(!sprite)continue;
        c.drawImage(sprite,o.screenX,HORIZON-o.height+3,o.width,o.height);
      }
      const grounding=c.createLinearGradient(0,HORIZON-10,0,HORIZON+4);
      grounding.addColorStop(0,'rgba(197,222,224,0)');
      grounding.addColorStop(.72,'rgba(137,177,183,.08)');
      grounding.addColorStop(1,'rgba(91,137,146,.24)');
      c.fillStyle=grounding;c.fillRect(0,HORIZON-10,W,14);
      if(p.night>.15&&!reduced){
        c.save();c.globalAlpha=p.night*.66;c.fillStyle='#FFF4DB';
        for(let i=0;i<22;i++){c.beginPath();c.arc((i*157+35)%W,18+(i*29)%85,.65+(i%3)*.23,0,7);c.fill();}
        c.beginPath();c.arc(W-78,46,12,0,7);c.fill();c.fillStyle=p.top;c.beginPath();c.arc(W-73,42,11,0,7);c.fill();c.restore();
      }
      c.restore();
    }
  }
  return Object.freeze({version:VERSION,CoastLayer,LANDMARKS,layout,camera,height,connectedHeight,noise});
});
