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
  const VERSION='2026.09.28-seamless-route.6';
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
    Object.freeze({id:'porthills',label:'Port Hills · Ōtautahi Christchurch',x:6600,width:620,height:132}),
    Object.freeze({id:'moeraki',label:'Moeraki Boulders · Otago Coast',x:7350,width:590,height:118}),
    Object.freeze({id:'otago',label:'Otago Harbour · Dunedin',x:8100,width:650,height:150}),
    Object.freeze({id:'nugget',label:'Nugget Point · Catlins coast',x:8850,width:600,height:150}),
    Object.freeze({id:'fiordland',label:'Fiordland · Southern coast',x:9650,width:770,height:178}),
    Object.freeze({id:'bluff',label:'Motupōhue · Bluff',x:10400,width:610,height:142})
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
  function constellation(c,x,y,scale,alpha,seed){
    const pts=Array.from({length:5+(seed%3)},(_,i)=>[x+i*24*scale+(hash(i,seed)-.5)*15*scale,y+(hash(i,seed+20)-.5)*28*scale]);
    c.save();c.globalAlpha=alpha;c.strokeStyle='rgba(208,226,255,.34)';c.lineWidth=.65;
    c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...p));c.stroke();
    c.fillStyle='#F7FBFF';for(const [px,py]of pts){c.beginPath();c.arc(px,py,1.1*scale,0,7);c.fill();}c.restore();
  }
  function hill(c,x,y,w,h,front='#6F9E85',back='#8CB1A0'){
    const g=c.createLinearGradient(0,y-h,0,y);g.addColorStop(0,back);g.addColorStop(1,front);c.fillStyle=g;c.strokeStyle='rgba(47,91,91,.30)';c.lineWidth=1.2;
    c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+w*.20,y-h*.22,x+w*.28,y-h*.83,x+w*.48,y-h*.58);c.bezierCurveTo(x+w*.63,y-h*.93,x+w*.78,y-h*.24,x+w,y);c.closePath();c.fill();c.stroke();
  }
  function house(c,x,y,s,night){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle=night?'#667B84':'#F5E8D7';c.strokeStyle='rgba(57,75,83,.35)';c.lineWidth=1;c.fillRect(0,-12,18,12);c.strokeRect(0,-12,18,12);c.fillStyle=night?'#D8BD76':'#C65A48';c.beginPath();c.moveTo(-2,-12);c.lineTo(9,-21);c.lineTo(20,-12);c.closePath();c.fill();if(night){c.fillStyle='#F6D980';c.fillRect(4,-8,3,4);c.fillRect(11,-8,3,4);}c.restore();}
  function drawProcedural(c,o,p){
    const x=o.screenX,y=HORIZON+2,n=p.night;
    c.save();c.translate(x,0);c.globalAlpha=.78;
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
    }else if(o.id==='porthills'){
      hill(c,-10,y,o.width+20,o.height*.74,n>.5?'#405963':'#617E69',n>.5?'#657A82':'#8FA186');
      c.fillStyle=n>.5?'#596E77':'#D8D4C8';for(let i=0;i<8;i++){const xx=60+i*62,h=18+(i%3)*7;c.fillRect(xx,y-h,24,h);}
      c.strokeStyle=n>.5?'rgba(214,229,232,.28)':'rgba(244,248,242,.42)';c.lineWidth=1.2;c.beginPath();c.moveTo(12,y-3);c.quadraticCurveTo(180,y-17,315,y-5);c.quadraticCurveTo(470,y-18,610,y-3);c.stroke();
    }else if(o.id==='moeraki'){
      hill(c,-20,y,o.width+40,o.height*.32,n>.5?'#405962':'#617B69',n>.5?'#617780':'#8A9D82');
      c.fillStyle=n>.5?'#6E7779':'#9B998E';
      for(const q of [[90,20,18],[165,26,22],[250,18,16],[338,30,24],[430,22,18],[505,28,21]]){c.beginPath();c.ellipse(q[0],y-q[2]*.55,q[1],q[2],0,0,7);c.fill();}
      c.strokeStyle=n>.5?'rgba(210,231,237,.20)':'rgba(249,252,246,.38)';c.lineWidth=1.1;for(let i=0;i<4;i++){c.beginPath();c.moveTo(25+i*135,y-4);c.quadraticCurveTo(80+i*135,y-12,130+i*135,y-5);c.stroke();}
    }else if(o.id==='otago'){
      hill(c,-15,y,o.width+30,o.height*.66,n>.5?'#415A67':'#5D806A',n>.5?'#657A83':'#8AA28B');
      c.fillStyle=n>.5?'#657783':'#CBBEAA';c.strokeStyle='rgba(54,64,76,.45)';c.fillRect(250,y-58,150,58);c.strokeRect(250,y-58,150,58);
      c.fillStyle=n>.5?'#354B5A':'#5C5960';for(let i=0;i<4;i++){c.beginPath();c.moveTo(250+i*50,y-58);c.lineTo(275+i*50,y-88-(i%2)*12);c.lineTo(300+i*50,y-58);c.closePath();c.fill();}
      c.fillRect(322,y-112,6,54);c.beginPath();c.moveTo(318,y-112);c.lineTo(325,y-136);c.lineTo(332,y-112);c.closePath();c.fill();
    }else if(o.id==='nugget'){
      hill(c,0,y,o.width,o.height*.48,n>.5?'#425968':'#648275',n>.5?'#657985':'#8BA095');
      c.fillStyle=n>.5?'#2E4655':'#425F58';
      for(const q of [[92,-38,62],[182,-58,80],[292,-43,66],[410,-72,92]]){c.beginPath();c.moveTo(q[0]-q[2]*.55,y);c.quadraticCurveTo(q[0],y+q[1],q[0]+q[2]*.55,y);c.closePath();c.fill();}
      c.fillStyle=n>.5?'#D8D4C8':'#F0E7D3';c.fillRect(472,y-72,13,72);c.strokeStyle='rgba(55,69,75,.26)';c.strokeRect(472,y-72,13,72);
      c.beginPath();c.moveTo(466,y-72);c.lineTo(478.5,y-92);c.lineTo(491,y-72);c.closePath();c.fill();
      c.fillStyle='#A65A4E';c.fillRect(468,y-74,21,5);
      c.strokeStyle=n>.5?'rgba(211,231,237,.20)':'rgba(247,253,250,.32)';c.lineWidth=1.2;
      for(let i=0;i<5;i++){const xx=52+i*105;c.beginPath();c.moveTo(xx,y-3);c.quadraticCurveTo(xx+28,y-10,xx+62,y-4);c.stroke();}
    }else if(o.id==='fiordland'){
      const g=c.createLinearGradient(0,y-o.height,0,y);g.addColorStop(0,n>.5?'#344C64':'#577887');g.addColorStop(1,n>.5?'#273F4A':'#355E59');c.fillStyle=g;
      c.beginPath();c.moveTo(0,y);c.lineTo(110,y-76);c.lineTo(185,y-55);c.lineTo(270,y-154);c.lineTo(355,y-72);c.lineTo(430,y-138);c.lineTo(540,y-62);c.lineTo(650,y-124);c.lineTo(770,y);c.closePath();c.fill();
      c.strokeStyle=n>.5?'rgba(209,226,234,.18)':'rgba(239,247,243,.28)';c.lineWidth=1.2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(120+i*190,y-5);c.quadraticCurveTo(190+i*190,y-17,265+i*190,y-6);c.stroke();}
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
      if(p.night>.16&&!reduced){
        constellation(c,W*.12,42,.82,p.night*.52,4);
        constellation(c,W*.48,73,.68,p.night*.42,9);
        constellation(c,W*.71,36,.9,p.night*.48,13);
        c.save();c.globalAlpha=p.night*.66;c.fillStyle='#FFF5D8';c.beginPath();c.arc(W-72,44,13,0,7);c.fill();c.fillStyle=p.top;c.beginPath();c.arc(W-66,39,12,0,7);c.fill();c.restore();
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
      if(p.night>.02){c.fillStyle='rgba(20,42,67,'+(p.night*.28)+')';c.fillRect(0,0,W,HORIZON+4);}

      const haze=c.createLinearGradient(0,HORIZON-14,0,HORIZON+4);
      haze.addColorStop(0,'rgba(220,238,239,0)');
      haze.addColorStop(1,p.night>.5?'rgba(66,91,109,.11)':'rgba(190,221,222,.14)');
      c.fillStyle=haze;c.fillRect(0,HORIZON-14,W,18);
      c.restore();
    }
  }
  return Object.freeze({version:VERSION,CoastLayer,LANDMARKS,layout,camera,rawCamera,routeX,ROUTE_SPAN,LOOP_BLEND,PARALLAX,panoramaPlacement,panoramaPlacements,PANORAMA,height,connectedHeight,noise,animePlate,longCloud,constellation,bridgeMask,rowBackdrop});
});
