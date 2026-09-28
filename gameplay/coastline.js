/* Long-form New Zealand summer panorama. Auckland source art is posterised into an anime plate; named landmarks appear once before the route opens into distant coast. */
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
  const VERSION='2026.09.28-south-island.7';
  const HORIZON=178,PARALLAX=.105,ROUTE_SPAN=11200,LOOP_BLEND=700,PANORAMA_FEATHER=.22;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const hash=(i,s=0)=>{let x=Math.imul(i|0,374761393)^Math.imul(s|0,668265263);x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
  function noise(x,seed){const i=Math.floor(x),f=smooth(x-i);return hash(i,seed)*(1-f)+hash(i+1,seed)*f;}
  const tau=Math.PI*2;
  function routeX(x){const n=Number.isFinite(x)?x:0;return ((n%ROUTE_SPAN)+ROUTE_SPAN)%ROUTE_SPAN;}
  function height(x,layer=0){
    const u=routeX(x)/ROUTE_SPAN*tau,phase=layer*.83;
    return 5.5
      +(Math.sin(u+phase)+1)*3.1
      +(Math.sin(5*u+1.2+phase*.7)+1)*2.15
      +(Math.sin(11*u+2.7-phase*.4)+1)*1.25
      +(Math.sin(23*u+.35+phase*.2)+1)*.62;
  }
  function circularDelta(x,center){
    let d=routeX(x)-routeX(center);
    if(d>ROUTE_SPAN/2)d-=ROUTE_SPAN;
    if(d<-ROUTE_SPAN/2)d+=ROUTE_SPAN;
    return d;
  }
  function bell(x,center,radius,amp){const d=Math.abs(circularDelta(x,center))/radius;return d>=1?0:amp*(.5+.5*Math.cos(Math.PI*d));}
  const LANDMARKS=Object.freeze([
    Object.freeze({id:'city',label:'Sky Tower · Auckland waterfront',x:40,width:455,height:142,source:true}),
    Object.freeze({id:'bridge',label:'Harbour Bridge · Waitematā',x:620,width:500,height:90,source:true}),
    Object.freeze({id:'rangitoto',label:'Rangitoto · Hauraki Gulf',x:1250,width:560,height:108,source:true}),
    Object.freeze({id:'coromandel',label:'Mauao · Bay of Plenty',x:1950,width:610,height:124}),
    Object.freeze({id:'taranaki',label:'Mount Taranaki · West Coast',x:2750,width:650,height:166}),
    Object.freeze({id:'wellington',label:'Wellington Harbour · Te Whanganui-a-Tara',x:3550,width:650,height:146}),
    Object.freeze({id:'palliser',label:'Cape Palliser · Wairarapa',x:4300,width:590,height:136}),
    Object.freeze({id:'kaikoura',label:'Kaikōura Coast · South Island',x:5050,width:720,height:166}),
    Object.freeze({id:'banks',label:'Banks Peninsula · Canterbury',x:5850,width:660,height:144}),
    Object.freeze({id:'aoraki',label:'Aoraki / Mount Cook · Southern Alps',x:6600,width:700,height:178}),
    Object.freeze({id:'queenstown',label:'Queenstown · Lake Wakatipu',x:7420,width:700,height:156}),
    Object.freeze({id:'wanaka',label:'Wānaka · Southern Lakes',x:8200,width:650,height:148}),
    Object.freeze({id:'milford',label:'Piopiotahi / Milford Sound · Fiordland',x:8950,width:720,height:184}),
    Object.freeze({id:'doubtful',label:'Patea / Doubtful Sound · Fiordland',x:9800,width:720,height:176}),
    Object.freeze({id:'bluff',label:'Motupōhue · Bluff',x:10520,width:610,height:142})
  ]);
  const CONNECTORS=Object.freeze(LANDMARKS.map((o,i)=>Object.freeze({x:o.x+o.width*.42,r:Math.max(180,o.width*.58),h:7+(i%3)*2.2})));
  function connectedHeight(x,layer=0){
    let h=height(x,layer);
    const weight=layer===0?1:layer===1?.25:0;
    if(weight)for(const a of CONNECTORS)h+=bell(x,a.x,a.r,a.h*weight);
    return h;
  }
  function rawCamera(world,reduced=false){return reduced?0:Math.max(0,Number.isFinite(world)?world:0)*PARALLAX;}
  function camera(world,reduced=false){return reduced?0:routeX(rawCamera(world,false));}
  const PANORAMA=Object.freeze({sourceWidth:1080,sourceHeight:360,waterlineY:272,width:1050,startX:-45,depth:.36});
  function panoramaPlacement(world,reduced=false,cycleOffset=0){
    const scale=PANORAMA.width/PANORAMA.sourceWidth;
    const height=PANORAMA.sourceHeight*scale;
    const y=HORIZON-PANORAMA.waterlineY*scale;
    const local=camera(world,reduced);
    const x=PANORAMA.startX+(cycleOffset*ROUTE_SPAN-local)*PANORAMA.depth;
    return Object.freeze({x,y,width:PANORAMA.width,height,scale});
  }
  function panoramaPlacements(world,width,reduced=false){
    const local=camera(world,reduced),out=[],primary=panoramaPlacement(world,reduced,0);
    if(primary.x+primary.width>-4&&primary.x<width+4)out.push({...primary,alpha:1});
    if(!reduced&&local>ROUTE_SPAN-LOOP_BLEND){
      const t=smooth((local-(ROUTE_SPAN-LOOP_BLEND))/LOOP_BLEND);
      const base=panoramaPlacement(0,true,0);
      out.push({...base,x:width+(PANORAMA.startX-width)*t,alpha:t});
    }
    return out;
  }
  function layout(world,width,reduced=false){
    const scroll=camera(world,reduced),out=[],offsets=[0];
    if(!reduced&&scroll>ROUTE_SPAN-LOOP_BLEND)offsets.push(1);
    for(const o of LANDMARKS){
      for(const cycleOffset of offsets){
        const screenX=o.x+cycleOffset*ROUTE_SPAN-scroll;
        if(screenX+o.width>-2&&screenX<width+2)out.push({...o,screenX});
      }
    }
    return out.sort((a,b)=>a.screenX-b.screenX);
  }
  function surface(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function sourceSize(image){
    const W=Number(image?.naturalWidth||image?.width||0),H=Number(image?.naturalHeight||image?.height||0);
    if(!Number.isFinite(W)||!Number.isFinite(H)||W<=0||H<=0)throw Error('Invalid panorama source dimensions');
    return [W,H];
  }
  function rowBackdrop(image){
    const [W,H]=sourceSize(image),c=surface(W,H),g=c.getContext('2d',{willReadFrequently:true});
    g.drawImage(image,0,0);const d=g.getImageData(0,0,W,H).data,rows=[];
    for(let y=0;y<H;y++){
      const rs=[],gs=[],bs=[];
      for(let x=0;x<W;x+=8){const i=(y*W+x)*4;rs.push(d[i]);gs.push(d[i+1]);bs.push(d[i+2]);}
      rs.sort((a,b)=>a-b);gs.sort((a,b)=>a-b);bs.sort((a,b)=>a-b);const m=rs.length>>1;
      rows.push([rs[m],gs[m],bs[m]]);
    }
    return rows;
  }
  function animePlate(image){
    const [W,H]=sourceSize(image),c=surface(W,H),g=c.getContext('2d',{willReadFrequently:true});
    g.filter='saturate(.92) contrast(.96) brightness(1.04)';g.drawImage(image,0,0);g.filter='none';
    const im=g.getImageData(0,0,W,H),d=im.data;
    for(let i=0;i<d.length;i+=4){
      const lum=(d[i]+d[i+1]+d[i+2])/3;
      const q=lum>205?18:lum>145?22:26;
      d[i]=Math.round(d[i]/q)*q;d[i+1]=Math.round(d[i+1]/q)*q;d[i+2]=Math.round(d[i+2]/q)*q;
      d[i]=Math.round(d[i]*.96+10);d[i+1]=Math.round(d[i+1]*.98+8);d[i+2]=Math.min(255,Math.round(d[i+2]*1.025+6));
    }
    g.putImageData(im,0,0);
    g.globalCompositeOperation='soft-light';g.fillStyle='rgba(155,213,236,.14)';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';
    return c;
  }
  function polygon(g,points,dx,dy,bottom){
    g.beginPath();points.forEach((p,i)=>g[i?'lineTo':'moveTo'](p[0]-dx,p[1]-dy));
    g.lineTo(points.at(-1)[0]-dx,bottom);g.lineTo(points[0][0]-dx,bottom);g.closePath();
  }
  const RIDGES={
    city:[[0,160],[18,155],[40,159],[64,151],[88,162],[111,144],[124,158],[144,157],[165,161],[175,137],[190,156],[207,126],[204,116],[209,102],[210,81],[212,107],[214,120],[212,157],[232,161],[254,142],[265,160],[285,158],[302,170],[321,165],[343,174]],
    bridge:[[330,173],[350,172],[379,169],[404,162],[430,156],[455,157],[480,162],[505,169],[551,172],[570,174]],
    rangitoto:[[560,177],[607,171],[666,161],[714,149],[744,151],[770,143],[786,149],[830,160],[878,166],[904,171]]
  };
  function bridgeMask(g,x,y,w,h){
    const upper=RIDGES.bridge.map(([px,py])=>[px-x,py-y]),lower=upper.map(([px,py])=>[px,Math.min(h-4,py+8)]);
    g.fillStyle='#000';g.strokeStyle='#000';g.lineCap='round';g.lineJoin='round';
    g.beginPath();upper.forEach((p,i)=>g[i?'lineTo':'moveTo'](...p));lower.slice().reverse().forEach(p=>g.lineTo(...p));g.closePath();g.fill();
    g.lineWidth=4;g.beginPath();g.moveTo(0,25);g.lineTo(w,25);g.stroke();
    for(const px of [20,65,167,220]){g.lineWidth=3.6;g.beginPath();g.moveTo(px,20);g.lineTo(px,h);g.stroke();}
    g.lineWidth=1.7;for(const px of [35,49,80,96,112,128,144,181,196,208]){g.beginPath();g.moveTo(px,19);g.lineTo(px,h-6);g.stroke();}
  }
  function extract(image,o,rows){
    const [x,y,w,h]=o.rect,c=surface(w,h),g=c.getContext('2d',{willReadFrequently:true});
    if(o.id==='bridge')bridgeMask(g,x,y,w,h);else{polygon(g,RIDGES[o.id],x,y,h);g.fill();}
    g.globalCompositeOperation='source-in';g.drawImage(image,x,y,w,h,0,0,w,h);
    const im=g.getImageData(0,0,w,h),d=im.data;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const i=(py*w+px)*4;if(!d[i+3])continue;
      let a=d[i+3]/255*smooth(Math.min(px,w-1-px)/(o.id==='rangitoto'?32:10));
      if(o.id!=='bridge'&&rows){
        const bg=rows[Math.min(rows.length-1,y+py)]||[210,225,230],dr=d[i]-bg[0],dg=d[i+1]-bg[1],db=d[i+2]-bg[2];
        a*=.03+.97*smooth((Math.sqrt(dr*dr+dg*dg+db*db)-5)/29);
      }
      if(py>h-7)a*=.72+.28*((h-1-py)/6);
      d[i+3]=Math.round(255*clamp(a,0,1));
    }
    g.putImageData(im,0,0);return c;
  }
  function longCloud(c,x,y,w,h,alpha=.7,warm=0){
    c.save();c.translate(x,y);c.globalAlpha=alpha;
    c.shadowColor=warm?'rgba(184,135,112,.10)':'rgba(82,139,168,.10)';c.shadowBlur=8;
    const grad=c.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,warm?'rgba(255,247,232,.96)':'rgba(255,255,255,.95)');
    grad.addColorStop(.62,warm?'rgba(250,226,207,.86)':'rgba(238,247,250,.84)');
    grad.addColorStop(1,warm?'rgba(238,203,185,.38)':'rgba(218,235,242,.28)');
    c.fillStyle=grad;
    c.beginPath();c.moveTo(-w*.04,h*.66);
    c.bezierCurveTo(w*.08,h*.52,w*.12,h*.55,w*.23,h*.49);
    c.bezierCurveTo(w*.30,h*.18,w*.43,h*.17,w*.50,h*.43);
    c.bezierCurveTo(w*.58,h*.22,w*.69,h*.26,w*.75,h*.49);
    c.bezierCurveTo(w*.85,h*.40,w*.96,h*.49,w*1.06,h*.61);
    c.bezierCurveTo(w*.90,h*.75,w*.15,h*.78,-w*.04,h*.66);c.closePath();c.fill();
    c.shadowBlur=0;
    for(const band of [
      {yy:h*.28,ww:.78,a:.22,off:.08},
      {yy:h*.48,ww:.94,a:.16,off:.02},
      {yy:h*.68,ww:.70,a:.12,off:.18}
    ]){
      c.globalAlpha=alpha*band.a;c.strokeStyle=warm?'rgba(255,239,220,.95)':'rgba(255,255,255,.96)';
      c.lineWidth=Math.max(1.2,h*.045);c.lineCap='round';c.beginPath();
      c.moveTo(w*band.off,band.yy);
      c.bezierCurveTo(w*(band.off+.18),band.yy-h*.12,w*(band.off+.42),band.yy+h*.06,w*(band.off+band.ww),band.yy-h*.04);
      c.stroke();
    }
    c.restore();
  }
  function starPoint(c,x,y,r,alpha){
    c.save();c.globalAlpha=alpha;
    const g=c.createRadialGradient(x,y,0,x,y,r*3.8);
    g.addColorStop(0,'rgba(255,255,244,1)');g.addColorStop(.2,'rgba(238,247,255,.92)');g.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=g;c.beginPath();c.arc(x,y,r*3.8,0,7);c.fill();
    c.fillStyle='#FFFDF0';c.beginPath();c.arc(x,y,Math.max(.65,r),0,7);c.fill();c.restore();
  }
  function constellation(c,x,y,scale,alpha,seed){
    const patterns=[
      [[0,20],[22,0],[34,28],[58,18],[76,45],[101,29]],
      [[0,8],[18,32],[42,18],[63,38],[82,12],[108,28],[126,5]],
      [[0,35],[21,12],[46,20],[68,0],[91,24],[116,17]]
    ],raw=patterns[Math.abs(seed)%patterns.length],
    pts=raw.map((p,i)=>[x+p[0]*scale+(hash(i,seed)-.5)*4*scale,y+p[1]*scale+(hash(i,seed+37)-.5)*4*scale]);
    c.save();c.globalAlpha=alpha*.22;c.strokeStyle='rgba(196,218,242,.42)';c.lineWidth=.45;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();c.restore();
    pts.forEach((p,i)=>starPoint(c,p[0],p[1],(.72+(i%3)*.28)*scale,alpha*(.72+(i%2)*.2)));
  }
  function starField(c,W,H,alpha){
    if(alpha<=0)return;
    for(let i=0;i<42;i++){
      const x=10+hash(i,401)*(W-20),y=8+hash(i,402)*(H-26),r=.45+hash(i,403)*.75;
      starPoint(c,x,y,r,alpha*(.26+hash(i,404)*.54));
    }
  }
  function hill(c,x,y,w,h,front='#6F9E85',back='#8CB1A0'){
    const g=c.createLinearGradient(0,y-h,0,y);g.addColorStop(0,back);g.addColorStop(1,front);c.fillStyle=g;c.strokeStyle='rgba(47,91,91,.30)';c.lineWidth=1.2;
    c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.20,y-h*.22,x+w*.28,y-h*.83,x+w*.48,y-h*.58);c.bezierCurveTo(x+w*.63,y-h*.93,x+w*.78,y-h*.24,x+w,y);c.closePath();c.fill();c.stroke();
  }
  function house(c,x,y,s,night){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=night?'#667B84':'#F5E8D7';c.strokeStyle='rgba(57,75,83,.35)';c.lineWidth=1;c.fillRect(0,-12,18,12);c.strokeRect(0,-12,18,12);c.fillStyle=night?'#D8BD76':'#C65A48';c.beginPath();c.moveTo(-2,-12);c.lineTo(9,-21);c.lineTo(20,-12);c.closePath();c.fill();if(night){c.fillStyle='#F6D980';c.fillRect(4,-8,3,4);c.fillRect(11,-8,3,4);}c.restore();}
  function alpineRange(c,y,w,h,night,seed=0){
    const back=night?'#53677B':'#8CA8B6',mid=night?'#3E556B':'#66899A',front=night?'#2C4758':'#496F69';
    c.fillStyle=back;c.beginPath();c.moveTo(0,y);
    for(let i=0;i<=8;i++){const x=i*w/8,peak=(.28+.58*hash(i,seed))*h;c.lineTo(x,y-peak);}
    c.lineTo(w,y);c.closePath();c.fill();
    c.fillStyle=mid;c.beginPath();c.moveTo(0,y);
    for(let i=0;i<=7;i++){const x=i*w/7,peak=(.20+.54*hash(i,seed+20))*h*.82;c.lineTo(x,y-peak);}
    c.lineTo(w,y);c.closePath();c.fill();
    c.fillStyle=front;c.beginPath();c.moveTo(0,y);
    for(let i=0;i<=6;i++){const x=i*w/6,peak=(.12+.28*hash(i,seed+50))*h;c.lineTo(x,y-peak);}
    c.lineTo(w,y);c.closePath();c.fill();
  }
  function snowCap(c,px,py,w,h,night){
    c.fillStyle=night?'#CAD4DC':'#F5F7F3';c.beginPath();
    c.moveTo(px-w*.52,py+h*.55);c.lineTo(px,py);c.lineTo(px+w*.52,py+h*.55);
    c.lineTo(px+w*.22,py+h*.40);c.lineTo(px+w*.08,py+h*.49);c.lineTo(px-w*.06,py+h*.34);c.lineTo(px-w*.20,py+h*.44);c.closePath();c.fill();
  }
  function mistBand(c,y,w,night,seed=0){
    c.save();c.globalAlpha=night?.13:.22;c.fillStyle=night?'#AAB8C2':'#EAF2EE';
    for(let i=0;i<5;i++){const x=(i*.23+hash(i,seed)*.13)*w,ww=w*(.18+hash(i,seed+1)*.18);c.beginPath();c.ellipse(x,y+(i%2)*5,ww,10+(i%3)*3,0,0,7);c.fill();}
    c.restore();
  }
  function pineLine(c,y,w,night,seed=0){
    c.fillStyle=night?'#223D43':'#355E50';
    for(let i=0;i<18;i++){const x=(i+.35)*w/18,h=13+hash(i,seed)*26;c.beginPath();c.moveTo(x,y-h);c.lineTo(x-6,y);c.lineTo(x+6,y);c.closePath();c.fill();}
  }
  function townLights(c,y,w,night,seed=0){
    for(let i=0;i<11;i++){
      const x=22+i*(w-44)/10,h=12+(i%4)*6;house(c,x,y,.58+(i%3)*.07,night);
      if(night){c.fillStyle='rgba(255,219,124,.72)';c.fillRect(x+3,y-h*.34,2.4,2.4);}
    }
  }
  function waterfall(c,x,y,h,night){
    const g=c.createLinearGradient(x-3,0,x+5,0);g.addColorStop(0,'rgba(230,245,248,0)');g.addColorStop(.45,night?'rgba(190,218,231,.64)':'rgba(239,252,251,.78)');g.addColorStop(1,'rgba(230,245,248,0)');
    c.strokeStyle=g;c.lineWidth=4;c.beginPath();c.moveTo(x,y-h);c.bezierCurveTo(x-3,y-h*.65,x+4,y-h*.34,x,y);c.stroke();
  }
  function drawProcedural(c,o,p){
    const x=o.screenX,y=HORIZON+2,n=p.night;
    c.save();c.translate(x,0);c.globalAlpha=.91;
    if(o.id==='coromandel'){
      hill(c,0,y,o.width,o.height*.74,n>.5?'#496374':'#638E72',n>.5?'#63798A':'#83AB83');
      c.fillStyle=n>.5?'#334D5E':'#4E7B65';c.beginPath();c.moveTo(90,y);c.quadraticCurveTo(220,y-110,360,y-30);c.quadraticCurveTo(470,y-88,610,y);c.closePath();c.fill();
      for(let i=0;i<8;i++)house(c,50+i*66,y-4,0.65,n>.45);
    }else if(o.id==='taranaki'){
      hill(c,-20,y,o.width+40,o.height*.42,n>.5?'#405968':'#6D8E7D',n>.5?'#617582':'#94AB91');
      c.fillStyle=n>.5?'#50677A':'#718DA0';c.beginPath();c.moveTo(105,y);c.lineTo(315,y-o.height);c.lineTo(535,y);c.closePath();c.fill();
      c.fillStyle=n>.5?'#C5D0D8':'#F2F4F0';c.beginPath();c.moveTo(245,y-o.height*.58);c.lineTo(315,y-o.height);c.lineTo(382,y-o.height*.58);c.lineTo(338,y-o.height*.69);c.lineTo(314,y-o.height*.61);c.lineTo(287,y-o.height*.70);c.closePath();c.fill();
      c.fillStyle=n>.5?'#2F5056':'#4F7564';c.fillRect(0,y-18,o.width,18);
    }else if(o.id==='wellington'){
      hill(c,-20,y,o.width+40,o.height*.66,n>.5?'#4C6171':'#72957E',n>.5?'#647A88':'#91B093');
      c.fillStyle=n>.5?'#576C78':'#E8DDD0';c.strokeStyle='rgba(54,71,82,.35)';
      for(let i=0;i<13;i++){const w=18+(i%3)*5,h=24+(i*17)%53;c.fillRect(55+i*44,y-h,w,h);c.strokeRect(55+i*44,y-h,w,h);}
      c.fillStyle=n>.5?'#7E8D94':'#D7D0C6';for(let i=0;i<5;i++){c.beginPath();c.ellipse(375,y-18-i*8,28-i*3,7,0,0,7);c.fill();}
      c.fillRect(365,y-55,20,55);
    }else if(o.id==='palliser'){
      hill(c,-20,y,o.width+40,o.height*.48,n>.5?'#445963':'#6C806D',n>.5?'#687983':'#91A187');
      c.fillStyle=n>.5?'#D6D4CC':'#F1E8D8';c.fillRect(430,y-88,15,88);
      c.fillStyle='#B84B43';for(let i=0;i<4;i++)c.fillRect(430,y-88+i*20,15,8);
      c.fillStyle=n>.5?'#D9D5C9':'#EFE6D3';c.beginPath();c.moveTo(423,y-88);c.lineTo(437.5,y-108);c.lineTo(452,y-88);c.closePath();c.fill();
      c.fillStyle=n>.5?'#344B55':'#506960';for(const q of [[65,26],[142,34],[228,24],[320,30]]){c.beginPath();c.ellipse(q[0],y-5,q[1],12,0,0,7);c.fill();}
    }else if(o.id==='kaikoura'){
      const peaks=[[0,0],[100,-52],[175,-120],[240,-76],[330,-154],[405,-90],[505,-132],[585,-62],[720,0]];
      c.fillStyle=n>.5?'#4B6078':'#708AA2';c.beginPath();peaks.forEach((q,i)=>c[i?'lineTo':'moveTo'](q[0],y+q[1]));c.lineTo(o.width,y);c.closePath();c.fill();
      c.fillStyle=n>.5?'#8EA0B3':'#F1F4F3';for(const [px,py]of [[175,-120],[330,-154],[505,-132]]){c.beginPath();c.moveTo(px-55,y+py+45);c.lineTo(px,y+py);c.lineTo(px+58,y+py+48);c.lineTo(px+20,y+py+35);c.lineTo(px,y+py+44);c.lineTo(px-18,y+py+31);c.closePath();c.fill();}
      hill(c,0,y,o.width,55,n>.5?'#3F5D62':'#577B63',n>.5?'#5D7377':'#7F9F7B');
    }else if(o.id==='banks'){
      hill(c,0,y,o.width,o.height*.82,n>.5?'#405D68':'#527D65',n>.5?'#61787D':'#82A27A');
      c.fillStyle=n>.5?'#6F7D83':'#DED8C9';c.fillRect(385,y-66,50,66);c.strokeStyle='rgba(55,71,76,.35)';c.strokeRect(385,y-66,50,66);
      c.beginPath();c.moveTo(378,y-66);c.lineTo(410,y-105);c.lineTo(442,y-66);c.closePath();c.fill();c.fillRect(407,y-126,6,31);
      for(let i=0;i<7;i++)house(c,72+i*65,y-3,.62,n>.45);
    }else if(o.id==='aoraki'){
      alpineRange(c,y,o.width,o.height*.92,n>.5,120);
      c.fillStyle=n>.5?'#41566B':'#6E8A9D';c.beginPath();c.moveTo(120,y);c.lineTo(344,y-o.height);c.lineTo(572,y);c.closePath();c.fill();
      snowCap(c,344,y-o.height,172,116,n>.5);
      c.fillStyle=n>.5?'#243F48':'#3F6659';c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(170,y-30,330,y-15);c.quadraticCurveTo(520,y-42,700,y);c.closePath();c.fill();
      mistBand(c,y-34,o.width,n>.5,131);pineLine(c,y,o.width,n>.5,132);
    }else if(o.id==='queenstown'){
      alpineRange(c,y,o.width,o.height*.82,n>.5,210);
      c.fillStyle=n>.5?'#334D5E':'#58758A';c.beginPath();c.moveTo(330,y);c.lineTo(530,y-145);c.lineTo(700,y);c.closePath();c.fill();
      snowCap(c,530,y-145,110,72,n>.5);
      hill(c,-25,y,o.width*.72,62,n>.5?'#2D4A4F':'#436A59',n>.5?'#4F6973':'#6E8C74');
      townLights(c,y-2,360,n>.48,240);
      c.strokeStyle=n>.5?'rgba(213,227,235,.44)':'rgba(86,104,109,.48)';c.lineWidth=1;c.beginPath();c.moveTo(130,y-122);c.lineTo(315,y-74);c.stroke();
      for(const q of [[178,-110],[238,-93],[296,-78]]){c.fillStyle=n>.5?'#D7B86D':'#6D3D32';c.fillRect(q[0]-4,y+q[1]-3,8,6);}
      mistBand(c,y-42,o.width,n>.5,242);
    }else if(o.id==='wanaka'){
      alpineRange(c,y,o.width,o.height*.72,n>.5,310);
      hill(c,0,y,o.width,48,n>.5?'#2C494F':'#4A705D',n>.5?'#536A72':'#77927A');
      mistBand(c,y-34,o.width,n>.5,312);
      c.strokeStyle=n>.5?'#1E3538':'#3C5145';c.lineWidth=4;c.beginPath();c.moveTo(325,y);c.bezierCurveTo(320,y-34,335,y-58,350,y-78);c.stroke();
      c.lineWidth=2;for(const q of [[350,-78,322,-101],[350,-76,378,-96],[343,-62,310,-76],[355,-56,391,-68]]){c.beginPath();c.moveTo(q[0],y+q[1]);c.lineTo(q[2],y+q[3]);c.stroke();}
      c.fillStyle=n>.5?'#27443F':'#4D6C56';for(const q of [[316,-101],[382,-96],[306,-76],[395,-68]]){c.beginPath();c.arc(q[0],y+q[1],9,0,7);c.fill();}
      townLights(c,y-3,250,n>.48,318);
    }else if(o.id==='milford'){
      const sky=c.createLinearGradient(0,y-o.height,0,y);sky.addColorStop(0,n>.5?'#40566C':'#7E9BA9');sky.addColorStop(1,n>.5?'#233C49':'#527769');c.fillStyle=sky;c.fillRect(0,y-o.height,o.width,o.height);
      c.fillStyle=n>.5?'#243D49':'#385D54';c.beginPath();c.moveTo(0,y);c.lineTo(80,y-128);c.lineTo(150,y-92);c.lineTo(238,y-174);c.lineTo(320,y-104);c.lineTo(380,y);c.closePath();c.fill();
      c.fillStyle=n>.5?'#294550':'#41695E';c.beginPath();c.moveTo(o.width,y);c.lineTo(650,y-122);c.lineTo(590,y-90);c.lineTo(520,y-156);c.lineTo(445,y-86);c.lineTo(390,y);c.closePath();c.fill();
      snowCap(c,238,y-174,70,46,n>.5);mistBand(c,y-86,o.width,n>.5,410);mistBand(c,y-45,o.width,n>.5,411);
      waterfall(c,112,y-6,84,n>.5);waterfall(c,612,y-5,70,n>.5);
      c.fillStyle=n>.5?'rgba(19,52,65,.52)':'rgba(45,106,112,.35)';c.beginPath();c.moveTo(300,y);c.lineTo(382,y-62);c.lineTo(466,y);c.closePath();c.fill();
    }else if(o.id==='doubtful'){
      const g=c.createLinearGradient(0,y-o.height,0,y);g.addColorStop(0,n>.5?'#3B5265':'#6F8E9A');g.addColorStop(1,n>.5?'#203944':'#41685B');c.fillStyle=g;c.fillRect(0,y-o.height,o.width,o.height);
      c.fillStyle=n>.5?'#27414A':'#3B6255';c.beginPath();c.moveTo(0,y);c.lineTo(92,y-118);c.lineTo(178,y-152);c.lineTo(270,y-96);c.lineTo(348,y);c.closePath();c.fill();
      c.fillStyle=n>.5?'#2C4650':'#466D5E';c.beginPath();c.moveTo(o.width,y);c.lineTo(625,y-136);c.lineTo(550,y-164);c.lineTo(472,y-92);c.lineTo(385,y);c.closePath();c.fill();
      mistBand(c,y-112,o.width,n>.5,510);mistBand(c,y-70,o.width,n>.5,511);mistBand(c,y-34,o.width,n>.5,512);
      waterfall(c,160,y-4,104,n>.5);waterfall(c,575,y-7,95,n>.5);pineLine(c,y,o.width,n>.5,513);
    }else if(o.id==='bluff'){
      hill(c,-10,y,o.width+20,o.height*.62,n>.5?'#3C5861':'#587966',n>.5?'#61777E':'#849B82');
      c.strokeStyle=n>.5?'#D2D7D2':'#E9E3D7';c.lineWidth=3;c.beginPath();c.moveTo(420,y-8);c.lineTo(420,y-92);c.stroke();
      c.fillStyle=n>.5?'#C8C8BE':'#E8DDC9';for(const q of [[420,-78,55],[420,-58,-62],[420,-38,50]]){c.save();c.translate(q[0],y+q[1]);c.rotate(q[2]>0?-.12:.12);c.fillRect(q[2]>0?0:q[2],-5,Math.abs(q[2]),10);c.restore();}
      c.fillStyle=n>.5?'#314A52':'#486B5A';for(const xx of [55,130,205,280]){c.beginPath();c.ellipse(xx,y-6,34,12,0,0,7);c.fill();}
    }
    c.restore();
  }
  class CoastLayer{
    constructor(){this.image=null;this.plate=null;}
    prepare(image){
      if(!image||!image.complete||!image.naturalWidth)return false;
      if(this.image!==image){
        this.image=image;
        const [W,H]=sourceSize(image),plate=surface(W,H),g=plate.getContext('2d');
        g.drawImage(image,0,0);
        g.globalCompositeOperation='destination-in';
        const mask=g.createLinearGradient(0,0,W,0);
        mask.addColorStop(0,'rgba(0,0,0,0)');
        mask.addColorStop(.055,'rgba(0,0,0,1)');
        mask.addColorStop(1-PANORAMA_FEATHER,'rgba(0,0,0,1)');
        mask.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=mask;g.fillRect(0,0,W,H);
        g.globalCompositeOperation='source-over';
        this.plate=plate;
      }
      return true;
    }
    label(world,width,reduced=false){
      const visible=layout(world,width,reduced);
      if(!visible.length)return 'New Zealand summer coast';
      return visible.reduce((a,b)=>Math.abs(a.screenX+a.width/2-width/2)<Math.abs(b.screenX+b.width/2-width/2)?a:b).label;
    }
    drawSky(c,eng,p,reduced){
      const W=eng.width,scroll=camera(eng.world,reduced);
      if(p.night<.72){
        const warm=Math.max(0,.65-p.night),skySpan=ROUTE_SPAN*.18,skyScroll=scroll*.18,count=12;
        for(let i=0;i<count;i++){
          const base=i*(skySpan/count)+hash(i,93)*72;
          const y=18+hash(i,94)*44,w=310+hash(i,95)*300,h=36+hash(i,96)*30;
          for(const offset of [-1,0,1]){
            const x=base+offset*skySpan-skyScroll;
            if(x+w<-80||x>W+80)continue;
            longCloud(c,x,y,w,h,(.22+hash(i,97)*.18)*(1-p.night*.88),warm>.4&&hash(i,98)>.78);
          }
        }
      }
      if(p.night>.10&&!reduced){
        starField(c,W,HORIZON-24,p.night*.88);
        constellation(c,W*.10,28,.76,p.night*.92,4);
        constellation(c,W*.44,66,.66,p.night*.82,9);
        constellation(c,W*.70,30,.82,p.night*.88,13);
        c.save();c.globalAlpha=p.night*.78;c.fillStyle='#FFF5D8';c.beginPath();c.arc(W-72,44,12,0,7);c.fill();c.fillStyle=p.top;c.beginPath();c.arc(W-67,39,11,0,7);c.fill();c.restore();
      }
    }
    drawTerrain(c,world,width,p,reduced){
      const scroll=camera(world,reduced),layers=[
        {idx:2,depth:.34,color:p.night>.5?'#586B7A':'#B8CBC8',alpha:.11,scale:.40},
        {idx:1,depth:.58,color:p.night>.5?'#4A6070':'#91AEA4',alpha:.17,scale:.61},
        {idx:0,depth:.86,color:p.night>.5?'#3D5664':'#6F9180',alpha:.24,scale:.84}
      ];
      for(const L of layers){
        const cam=scroll*L.depth,start=Math.floor(cam/8)*8;c.save();c.fillStyle=L.color;c.globalAlpha=L.alpha;c.beginPath();
        for(let wx=start;wx<=cam+width+8;wx+=8){const y=HORIZON-connectedHeight(wx,L.idx)*L.scale;c[wx===start?'moveTo':'lineTo'](wx-cam,y);}
        c.lineTo(width+8,HORIZON+5);c.lineTo(-8,HORIZON+5);c.closePath();c.fill();c.restore();
      }
    }
    draw(c,eng,p,image,reduced=false){
      const W=eng.width,scroll=camera(eng.world,reduced);
      c.save();c.beginPath();c.rect(0,0,W,HORIZON+4);c.clip();

      // Continuous procedural base remains underneath so the Auckland plate can leave the frame without a seam.
      const sky=c.createLinearGradient(0,0,0,HORIZON);sky.addColorStop(0,p.top);sky.addColorStop(1,p.horizon);c.fillStyle=sky;c.fillRect(0,0,W,HORIZON+4);
      this.drawSky(c,eng,p,reduced);this.drawTerrain(c,eng.world,W,p,reduced);

      // Approved Auckland panorama repeats only once per full scenic circuit and has
      // feathered edges, so there is never a hard vertical boundary against the procedural coast.
      if(this.prepare(image)){
        for(const plate of panoramaPlacements(eng.world,W,reduced)){
          c.save();c.globalAlpha=plate.alpha??1;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
          c.drawImage(this.plate,plate.x,plate.y,plate.width,plate.height);c.restore();
        }
      }

      // Named destinations wrap as one long 11,200px scenic circuit. The first Auckland
      // landmarks enter before the final Bluff scenery leaves, so the 10k+ repeat is continuous.
      for(const o of layout(eng.world,W,reduced))if(!o.source)drawProcedural(c,o,p);

      // One atmosphere layer over every scenic source keeps blue-hour colour continuous.
      if(p.night>.02){c.fillStyle='rgba(20,42,67,'+(p.night*.10)+')';c.fillRect(0,0,W,HORIZON+4);}

      const haze=c.createLinearGradient(0,HORIZON-14,0,HORIZON+4);
      haze.addColorStop(0,'rgba(220,238,239,0)');
      haze.addColorStop(1,p.night>.5?'rgba(66,91,109,.11)':'rgba(190,221,222,.14)');
      c.fillStyle=haze;c.fillRect(0,HORIZON-14,W,18);
      c.restore();
    }
  }
  return Object.freeze({version:VERSION,CoastLayer,LANDMARKS,layout,camera,rawCamera,routeX,ROUTE_SPAN,LOOP_BLEND,PARALLAX,panoramaPlacement,panoramaPlacements,PANORAMA,height,connectedHeight,noise,animePlate,longCloud,constellation,starField,bridgeMask,rowBackdrop});
});
