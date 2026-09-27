/* Stylised non-repeating New Zealand coast: the previous scenic plate is retained as composition reference,
   but posterised into a softer hand-painted anime background. Named landmarks appear once per route. */
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
  const VERSION='2026.09.27-anime-coast.1',HORIZON=178,PARALLAX=.042;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function noise(x,seed){const i=Math.floor(x),f=smooth(x-i);return hash(i,seed)*(1-f)+hash(i+1,seed)*f;}
  function height(x,layer=0){return 3+noise(x/790,19+layer)*9+noise(x/257,41+layer)*7+noise(x/81,73+layer)*2;}
  function bell(x,center,radius,amp){const d=Math.abs(x-center)/radius;return d>=1?0:amp*(.5+.5*Math.cos(Math.PI*d));}
  const CONNECTORS=Object.freeze([
    Object.freeze({x:185,r:300,h:8.5}),Object.freeze({x:690,r:190,h:5}),
    Object.freeze({x:1450,r:260,h:6}),Object.freeze({x:2260,r:330,h:7}),
    Object.freeze({x:3200,r:320,h:7}),Object.freeze({x:4170,r:430,h:13}),
    Object.freeze({x:5250,r:380,h:8}),Object.freeze({x:6150,r:360,h:8}),
    Object.freeze({x:7160,r:520,h:15})
  ]);
  function connectedHeight(x,layer=0){
    let h=height(x,layer),weight=layer===0?1:layer===1?.24:0;
    if(weight)for(const a of CONNECTORS)h+=bell(x,a.x,a.r,a.h*weight);
    return h;
  }

  // First three use the previous Auckland scene as a composition reference.
  // The remaining distant silhouettes extend the route south without repeating a named landmark.
  const LANDMARKS=Object.freeze([
    Object.freeze({id:'city',label:'Sky Tower · Auckland waterfront',x:24,scale:1.22,rect:Object.freeze([0,78,343,104]),source:true}),
    Object.freeze({id:'bridge',label:'Harbour Bridge · Waitematā',x:650,scale:1.58,rect:Object.freeze([330,150,240,32]),source:true}),
    Object.freeze({id:'rangitoto',label:'Rangitoto · Hauraki Gulf',x:1370,scale:1.68,rect:Object.freeze([560,138,344,44]),source:true}),
    Object.freeze({id:'coromandel',label:'Coromandel · East coast',x:2200,width:510,height:92}),
    Object.freeze({id:'wellington',label:'Wellington · Te Whanganui-a-Tara',x:3120,width:520,height:112}),
    Object.freeze({id:'kaikoura',label:'Kaikōura · South Island',x:4020,width:630,height:142}),
    Object.freeze({id:'banks',label:'Banks Peninsula · Canterbury',x:5050,width:550,height:105}),
    Object.freeze({id:'otago',label:'Otago Harbour · Ōtepoti',x:5920,width:520,height:112}),
    Object.freeze({id:'fiordland',label:'Fiordland · southern coast',x:6880,width:680,height:158})
  ]);
  const RIDGES={
    city:[[0,160],[10,157],[13,148],[17,158],[26,160],[32,157],[37,149],[42,157],[52,162],[58,159],[66,153],[70,160],[88,162],[96,153],[102,155],[108,158],[111,144],[118,142],[124,145],[124,158],[131,151],[137,152],[139,146],[143,147],[144,157],[150,150],[155,148],[157,146],[162,146],[165,153],[165,161],[171,157],[175,157],[175,137],[181,134],[188,137],[190,156],[194,146],[200,146],[200,156],[206,158],[207,126],[205,121],[204,116],[207,113],[207,107],[209,102],[209,81],[210,101],[212,107],[212,113],[215,116],[214,120],[212,124],[212,157],[219,158],[220,151],[226,149],[232,151],[232,161],[237,158],[241,159],[243,154],[249,151],[253,156],[254,142],[259,139],[263,140],[265,144],[265,160],[271,162],[277,160],[285,158],[288,161],[290,155],[292,151],[297,152],[299,156],[302,157],[302,170],[310,164],[316,166],[321,165],[330,170],[343,174]],
    bridge:[[330,173],[350,172],[379,169],[391,168],[404,162],[416,158],[430,156],[442,156],[455,157],[468,159],[480,162],[490,166],[505,169],[528,170],[551,172],[570,174]],
    rangitoto:[[560,177],[580,174],[607,171],[638,168],[666,161],[695,156],[714,149],[730,147],[744,151],[754,149],[763,144],[770,143],[778,144],[786,149],[805,154],[830,160],[856,164],[878,166],[904,171]]
  };
  function camera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function layout(world,width,reduced=false){
    const scroll=camera(world,reduced);
    return LANDMARKS.map(o=>({...o,screenX:o.x-scroll,width:o.source?o.rect[2]*o.scale:o.width,height:o.source?o.rect[3]*o.scale:o.height}))
      .filter(o=>o.screenX+o.width>-4&&o.screenX<width+4);
  }
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function polygon(c,points,dx,dy,bottom){
    c.beginPath();points.forEach((p,i)=>c[i?'lineTo':'moveTo'](p[0]-dx,p[1]-dy));
    c.lineTo(points.at(-1)[0]-dx,bottom);c.lineTo(points[0][0]-dx,bottom);c.closePath();
  }
  function animePlate(image){
    const W=image.naturalWidth,H=image.naturalHeight,c=surface(W,H),g=c.getContext('2d',{willReadFrequently:true});
    g.filter='saturate(1.12) contrast(.92) brightness(1.055)';
    g.drawImage(image,0,0,W,H);g.filter='none';
    const im=g.getImageData(0,0,W,H),d=im.data;
    for(let i=0;i<d.length;i+=4){
      let r=d[i],gg=d[i+1],b=d[i+2],lum=.299*r+.587*gg+.114*b;
      const lift=10*(1-lum/255);
      r=clamp(r+lift+(r-lum)*.08,0,255);gg=clamp(gg+lift+(gg-lum)*.08,0,255);b=clamp(b+lift+(b-lum)*.08,0,255);
      const step=18;
      d[i]=Math.round(r/step)*step;d[i+1]=Math.round(gg/step)*step;d[i+2]=Math.round(b/step)*step;
    }
    g.putImageData(im,0,0);
    // A translucent cool wash unifies the photographed reference with the hand-drawn layers.
    g.globalCompositeOperation='screen';g.fillStyle='rgba(196,229,238,.10)';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    return c;
  }
  function rowBackdrop(image){
    const W=image.width||image.naturalWidth,H=image.height||image.naturalHeight,c=surface(W,H),g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(image,0,0);const d=g.getImageData(0,0,W,H).data,rows=[];
    for(let y=0;y<H;y++){const rs=[],gs=[],bs=[];for(let x=0;x<W;x+=8){const i=(y*W+x)*4;rs.push(d[i]);gs.push(d[i+1]);bs.push(d[i+2]);}rs.sort((a,b)=>a-b);gs.sort((a,b)=>a-b);bs.sort((a,b)=>a-b);const m=rs.length>>1;rows.push([rs[m],gs[m],bs[m]]);}
    return rows;
  }
  function bridgeMask(g,x,y,w,h){
    const upper=RIDGES.bridge.map(([px,py])=>[px-x,py-y]),lower=upper.map(([px,py])=>[px,Math.min(h-5,py+8)]);
    g.fillStyle='#000';g.strokeStyle='#000';g.lineJoin='round';g.lineCap='round';
    g.beginPath();upper.forEach((p,i)=>g[i?'lineTo':'moveTo'](...p));lower.slice().reverse().forEach(p=>g.lineTo(...p));g.closePath();g.fill();
    g.lineWidth=4.5;g.beginPath();g.moveTo(0,23.5);g.lineTo(w,24.5);g.stroke();
    for(const px of [20,65,167,220]){g.lineWidth=4;g.beginPath();g.moveTo(px,22);g.lineTo(px,h);g.stroke();}
    g.lineWidth=2.2;for(const px of [35,49,80,96,112,128,144,181,196,208]){g.beginPath();g.moveTo(px,20);g.lineTo(px,h-7);g.stroke();}
  }
  function extract(image,o,rows){
    const [x,y,w,h]=o.rect,c=surface(w,h),g=c.getContext('2d',{willReadFrequently:true});
    if(o.id==='bridge')bridgeMask(g,x,y,w,h);else{polygon(g,RIDGES[o.id],x,y,h);g.fill();}
    g.globalCompositeOperation='source-in';g.drawImage(image,x,y,w,h,0,0,w,h);
    const pixels=g.getImageData(0,0,w,h),d=pixels.data;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const i=(py*w+px)*4;if(!d[i+3])continue;
      const edge=smooth(Math.min(px,w-1-px)/(o.id==='rangitoto'?34:10));let alpha=d[i+3]/255*edge;
      if(o.id!=='bridge'&&rows){const bg=rows[Math.min(rows.length-1,y+py)]||[210,225,230],dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2],delta=Math.sqrt(dr*dr+dg*dg+db*db);alpha*=.04+.96*smooth((delta-4)/26);}
      if(py>h-7)alpha*=.72+.28*((h-1-py)/6);d[i+3]=Math.round(255*clamp(alpha,0,1));
    }
    g.putImageData(pixels,0,0);return c;
  }
  function inkColor(p,alpha=.48){return p.night>.45?'rgba(27,48,73,'+alpha+')':'rgba(49,82,94,'+alpha+')';}
  function fillColor(p,light=.42){return p.night>.45?'rgba(45,70,91,'+light+')':'rgba(86,132,137,'+light+')';}
  function longCloud(c,x,y,s,alpha,p){
    c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=alpha*(1-p.night*.72);
    const g=c.createLinearGradient(0,-18,0,30);g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(1,'rgba(226,241,244,.72)');c.fillStyle=g;
    c.beginPath();c.moveTo(-18,19);c.bezierCurveTo(12,1,45,5,69,10);c.bezierCurveTo(92,-17,133,-20,156,3);c.bezierCurveTo(189,-10,230,1,243,20);c.bezierCurveTo(224,34,178,34,139,30);c.bezierCurveTo(88,38,25,35,-18,26);c.closePath();c.fill();
    c.strokeStyle='rgba(123,163,178,.16)';c.lineWidth=1.4;c.stroke();c.restore();
  }
  function constellation(c,seed,x,y,scale,alpha){
    const pts=[];for(let i=0;i<5+(seed%3);i++)pts.push([x+i*25*scale+(hash(i,seed)*10-5),y+(hash(i,seed+17)*28-14)*scale]);
    c.save();c.globalAlpha=alpha;c.strokeStyle='rgba(220,235,255,.28)';c.lineWidth=.8;c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();
    c.fillStyle='#F7FBFF';for(const [px,py]of pts){c.beginPath();c.arc(px,py,1.05*scale,0,7);c.fill();}c.restore();
  }
  function drawnLandmark(c,o,p){
    const x=o.screenX,w=o.width,h=o.height,y=HORIZON+2;
    c.save();c.strokeStyle=inkColor(p,.42);c.fillStyle=fillColor(p,.38);c.lineWidth=1.7;c.lineJoin='round';
    if(o.id==='coromandel'){
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.12,y-18,x+w*.22,y-38,x+w*.36,y-29);c.bezierCurveTo(x+w*.52,y-15,x+w*.60,y-47,x+w*.73,y-35);c.bezierCurveTo(x+w*.85,y-21,x+w*.92,y-24,x+w,y-8);c.lineTo(x+w,y);c.closePath();c.fill();c.stroke();
    }else if(o.id==='wellington'){
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.2,y-35,x+w*.38,y-29,x+w*.54,y-17);c.bezierCurveTo(x+w*.72,y-48,x+w*.88,y-29,x+w,y-12);c.lineTo(x+w,y);c.closePath();c.fill();c.stroke();
      c.fillStyle=inkColor(p,.34);for(let i=0;i<8;i++){const bw=12+(i%3)*4,bh=18+(i*11)%36;c.fillRect(x+135+i*28,y-bh,bw,bh);}
      // A tiny Beehive-like civic silhouette.
      c.beginPath();c.ellipse(x+110,y-21,18,7,0,0,7);c.fill();c.fillRect(x+94,y-21,32,20);
    }else if(o.id==='kaikoura'||o.id==='fiordland'){
      const peaks=o.id==='fiordland'?[.08,.22,.36,.51,.68,.82,.95]:[.04,.18,.32,.48,.62,.78,.94];
      c.beginPath();c.moveTo(x,y);for(let i=0;i<peaks.length;i++){const px=x+w*peaks[i],peak=y-h*(.35+.55*hash(i,o.id.length));c.lineTo(px,peak);}c.lineTo(x+w,y);c.closePath();c.fill();c.stroke();
      c.globalAlpha=.28;c.fillStyle='#F3F8F4';for(let i=1;i<peaks.length-1;i+=2){const px=x+w*peaks[i],peak=y-h*(.35+.55*hash(i,o.id.length));c.beginPath();c.moveTo(px,peak);c.lineTo(px-18,peak+29);c.lineTo(px+13,peak+23);c.closePath();c.fill();}c.globalAlpha=1;
    }else if(o.id==='banks'){
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.1,y-42,x+w*.28,y-58,x+w*.42,y-34);c.bezierCurveTo(x+w*.58,y-12,x+w*.68,y-56,x+w*.84,y-39);c.bezierCurveTo(x+w*.92,y-26,x+w*.96,y-18,x+w,y-8);c.lineTo(x+w,y);c.closePath();c.fill();c.stroke();
    }else if(o.id==='otago'){
      c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.22,y-24,x+w*.43,y-41,x+w*.61,y-23);c.bezierCurveTo(x+w*.76,y-10,x+w*.87,y-32,x+w,y-13);c.lineTo(x+w,y);c.closePath();c.fill();c.stroke();
      c.fillStyle=inkColor(p,.38);c.fillRect(x+176,y-34,56,34);c.beginPath();c.moveTo(x+172,y-34);c.lineTo(x+204,y-56);c.lineTo(x+236,y-34);c.closePath();c.fill();c.fillRect(x+201,y-72,7,37);
    }
    c.restore();
  }
  class CoastLayer{
    constructor(){this.image=null;this.plate=null;this.sprites={};this.tinted={};this.rows=null;}
    prepare(image){
      if(!image||!image.complete||!image.naturalWidth||this.image===image)return;
      if(image.naturalWidth!==960||image.naturalHeight!==192)return;
      this.image=image;this.plate=animePlate(image);this.sprites={};this.tinted={};this.rows=rowBackdrop(this.plate);
      for(const o of LANDMARKS.filter(x=>x.source))this.sprites[o.id]=extract(this.plate,o,this.rows);
    }
    label(world,width,reduced){
      const visible=layout(world,width,reduced);
      if(!visible.length)return 'New Zealand coast · open water';
      return visible.reduce((a,b)=>Math.abs(a.screenX+a.width/2-width/2)<Math.abs(b.screenX+b.width/2-width/2)?a:b).label;
    }
    drawClouds(c,world,width,p,reduced){
      const scroll=camera(world,reduced)*.28,cell=530,start=Math.floor(scroll/cell)-1,end=Math.floor((scroll+width)/cell)+1;
      for(let i=start;i<=end;i++){const x=i*cell-scroll+hash(i,61)*115,y=13+hash(i,72)*48,s=.58+hash(i,83)*.52;longCloud(c,x,y,s,.54+hash(i,94)*.16,p);}
    }
    drawTerrain(c,world,width,p,reduced){
      const scroll=camera(world,reduced),layers=[
        {idx:2,depth:.46,color:p.night>.45?'#40576B':'#A7BCC1',alpha:.17,scale:.50},
        {idx:1,depth:.68,color:p.night>.45?'#354E63':'#7FA2A8',alpha:.25,scale:.69},
        {idx:0,depth:1,color:p.night>.45?'#2D465A':'#5F8990',alpha:.39,scale:.92}
      ];
      for(const L of layers){const cam=scroll*L.depth,start=Math.floor(cam/8)*8;c.save();c.fillStyle=L.color;c.globalAlpha=L.alpha;c.beginPath();for(let wx=start;wx<=cam+width+8;wx+=8){const base=L.idx===0?connectedHeight(wx,L.idx):height(wx,L.idx),yy=HORIZON-base*L.scale;c[wx===start?'moveTo':'lineTo'](wx-cam,yy);}c.lineTo(width+8,HORIZON+4);c.lineTo(-8,HORIZON+4);c.closePath();c.fill();c.restore();}
    }
    tintedSprite(id,p){
      const src=this.sprites[id],step=Math.round(clamp(p.night,0,1)*20);if(!src||step===0)return src;
      const key=id+':'+step;if(this.tinted[key])return this.tinted[key];
      const c=surface(src.width,src.height),g=c.getContext('2d');g.drawImage(src,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(23,43,70,'+(step/20*.56)+')';g.fillRect(0,0,c.width,c.height);return this.tinted[key]=c;
    }
    draw(c,eng,p,image,reduced=false){
      this.prepare(image);
      const W=eng.width,world=eng.world;c.save();c.beginPath();c.rect(0,0,W,HORIZON+4);c.clip();
      const sky=c.createLinearGradient(0,0,0,HORIZON);sky.addColorStop(0,p.top);sky.addColorStop(.74,p.horizon);sky.addColorStop(1,p.horizon);c.fillStyle=sky;c.fillRect(0,0,W,HORIZON+4);
      this.drawClouds(c,world,W,p,reduced);this.drawTerrain(c,world,W,p,reduced);
      for(const o of layout(world,W,reduced)){
        if(o.source){const sprite=this.tintedSprite(o.id,p);if(sprite){c.save();c.globalAlpha=.92;c.shadowColor=inkColor(p,.18);c.shadowBlur=1.5;c.drawImage(sprite,o.screenX,HORIZON-o.height+3,o.width,o.height);c.restore();}}
        else drawnLandmark(c,o,p);
      }
      if(p.night>.12&&!reduced){const a=p.night*.80;const scroll=camera(world,false)*.025;for(let k=-1;k<Math.ceil(W/260)+1;k++){const seed=k+Math.floor(scroll/260),x=k*260-(scroll%260)+hash(seed,28)*34,y=25+hash(seed,38)*48;constellation(c,seed,x,y,.75+hash(seed,48)*.38,a);}}
      const grounding=c.createLinearGradient(0,HORIZON-12,0,HORIZON+4);grounding.addColorStop(0,'rgba(197,222,224,0)');grounding.addColorStop(.72,'rgba(137,177,183,.07)');grounding.addColorStop(1,'rgba(80,130,141,.22)');c.fillStyle=grounding;c.fillRect(0,HORIZON-12,W,16);c.restore();
    }
  }
  return Object.freeze({version:VERSION,CoastLayer,LANDMARKS,layout,camera,height,connectedHeight,noise});
});
