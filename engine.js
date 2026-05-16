// === PrismaX Runner Engine ===
const CFG={W:800,H:400,GROUND:80,GRAVITY:.65,JUMP:-13.5,DJUMP:-11,SPD:4.5,MAX_SPD:13,SPD_INC:.0004,OBS_GAP:280,COMBO_MS:2000};

// Sound
class SoundMgr{
  constructor(){this.ctx=null;this.on=true}
  init(){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){this.on=false}}
  resume(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()}
  _play(freq,end,dur,type='sine',vol=.15){
    if(!this.on||!this.ctx)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.connect(g);g.connect(this.ctx.destination);o.type=type;
    o.frequency.setValueAtTime(freq,this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(end,this.ctx.currentTime+dur);
    g.gain.setValueAtTime(vol,this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+dur);
    o.start();o.stop(this.ctx.currentTime+dur);
  }
  jump(){this._play(250,500,.12,'sine',.12)}
  djump(){this._play(400,800,.12,'sine',.12)}
  coin(){this._play(800,1200,.1,'square',.08);setTimeout(()=>this._play(1000,1400,.1,'square',.08),80)}
  hit(){this._play(200,80,.3,'sawtooth',.15)}
  combo(){this._play(600,1400,.15,'sine',.1)}
}

// Particles
class Particle{
  constructor(x,y,c,vx,vy,life,sz){Object.assign(this,{x,y,c,vx,vy,life,maxLife:life,sz,alive:true})}
  update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;this.vy+=20*dt;this.life-=dt;if(this.life<=0)this.alive=false}
  draw(ctx){if(!this.alive)return;const a=this.life/this.maxLife;ctx.globalAlpha=a;ctx.fillStyle=this.c;
    ctx.beginPath();ctx.arc(this.x,this.y,this.sz*a,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
}
class Particles{
  constructor(){this.p=[]}
  emit(x,y,c,n,spd,sz){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;
    this.p.push(new Particle(x,y,c,Math.cos(a)*spd*(0.5+Math.random()),Math.sin(a)*spd*(0.5+Math.random()),.4+Math.random()*.4,sz||3))}}
  update(dt){this.p=this.p.filter(p=>{p.update(dt);return p.alive})}
  draw(ctx){this.p.forEach(p=>p.draw(ctx))}
}

// Cloud
class Cloud{
  constructor(w){this.x=w+Math.random()*200;this.y=20+Math.random()*100;this.w=60+Math.random()*80;this.h=25+Math.random()*20;this.spd=.2+Math.random()*.3;this.a=.4+Math.random()*.4}
  update(s,w){this.x-=this.spd*s;if(this.x<-this.w){this.x=w+Math.random()*100;this.y=20+Math.random()*100;this.w=60+Math.random()*80}}
  draw(ctx){ctx.globalAlpha=this.a;ctx.fillStyle='#fff';const cx=this.x,cy=this.y,w=this.w,h=this.h;
    ctx.beginPath();ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx-w*.25,cy+h*.15,w*.3,h*.35,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(cx+w*.25,cy+h*.1,w*.25,h*.3,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
}

// Background
class BG{
  constructor(w,h){
    this.w=w;this.h=h;this.clouds=[];this.hillOff=0;this.hillOff2=0;this.grassOff=0;
    for(let i=0;i<7;i++)this.clouds.push(new Cloud(w));
  }
  update(spd){
    this.clouds.forEach(c=>c.update(spd,this.w));
    this.hillOff=(this.hillOff+spd*.3)%this.w;
    this.hillOff2=(this.hillOff2+spd*.5)%this.w;
    this.grassOff=(this.grassOff+spd*.2)%40;
  }
  draw(ctx){
    const w=this.w,h=this.h,gy=h-CFG.GROUND;
    // Sky
    const sg=ctx.createLinearGradient(0,0,0,h);
    sg.addColorStop(0,'#5BC8F5');sg.addColorStop(.55,'#87CEEB');sg.addColorStop(.85,'#C8E6C9');sg.addColorStop(1,'#81C784');
    ctx.fillStyle=sg;ctx.fillRect(0,0,w,h);
    // Clouds
    this.clouds.forEach(c=>c.draw(ctx));
    // Far hills
    ctx.fillStyle='#A5D6A7';ctx.beginPath();ctx.moveTo(0,gy);
    for(let x=0;x<=w;x+=2){const y=gy-25-Math.sin((x+this.hillOff)*.008)*30-Math.sin((x+this.hillOff)*.015)*15;ctx.lineTo(x,y)}
    ctx.lineTo(w,gy);ctx.closePath();ctx.fill();
    // Near hills
    ctx.fillStyle='#81C784';ctx.beginPath();ctx.moveTo(0,gy);
    for(let x=0;x<=w;x+=2){const y=gy-10-Math.sin((x+this.hillOff2)*.012)*20-Math.cos((x+this.hillOff2)*.02)*10;ctx.lineTo(x,y)}
    ctx.lineTo(w,gy);ctx.closePath();ctx.fill();
    // Ground
    ctx.fillStyle='#4CAF50';ctx.fillRect(0,gy,w,8);
    ctx.fillStyle='#795548';ctx.fillRect(0,gy+8,w,CFG.GROUND-8);
    ctx.fillStyle='#6D4C41';ctx.fillRect(0,gy+8,w,3);
    // Grass tufts
    ctx.strokeStyle='#66BB6A';ctx.lineWidth=2;
    for(let x=-40+this.grassOff%40;x<w;x+=40){
      ctx.beginPath();ctx.moveTo(x,gy);ctx.lineTo(x-4,gy-8);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+2,gy);ctx.lineTo(x+6,gy-7);ctx.stroke();
    }
  }
}

// Robot
class Robot{
  constructor(x,groundY){
    this.x=x;this.groundY=groundY;this.y=groundY;this.w=36;this.h=48;this.duckH=28;
    this.vy=0;this.grounded=true;this.jumps=0;this.maxJumps=2;this.ducking=false;
    this.frame=0;this.frameT=0;this.alive=true;this.invT=0;
  }
  get hitbox(){const h=this.ducking?this.duckH:this.h;return{x:this.x+4,y:this.y-h+4,w:this.w-8,h:h-8}}
  jump(){
    if(!this.alive)return;
    if(this.ducking){this.ducking=false;return}
    if(this.jumps<this.maxJumps){
      this.vy=this.jumps===0?CFG.JUMP:CFG.DJUMP;
      this.grounded=false;this.jumps++;return this.jumps;
    }return 0;
  }
  duck(v){if(!this.alive)return;this.ducking=v&&this.grounded}
  update(dt){
    this.vy+=CFG.GRAVITY;this.y+=this.vy;
    if(this.y>=this.groundY){this.y=this.groundY;this.vy=0;this.grounded=true;this.jumps=0;if(this.ducking&&!this._duckHeld)this.ducking=false}
    else this.grounded=false;
    this.frameT+=dt;if(this.frameT>.08){this.frame=(this.frame+1)%6;this.frameT=0}
    if(this.invT>0)this.invT-=dt;
  }
  draw(ctx){
    if(this.invT>0&&Math.floor(this.invT*10)%2)return;
    const h=this.ducking?this.duckH:this.h;
    const bx=this.x, by=this.y-h;
    ctx.save();
    
    // Shadow
    ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();
    ctx.ellipse(bx+this.w/2,this.groundY+2,this.w/2+4,4,0,0,Math.PI*2);ctx.fill();

    ctx.translate(bx + this.w/2, this.y);

    const cWhite = "#f0f4f8";
    const cBlue = "#4FC3F7";
    const cDark = "#2c3e50";
    const cBlack = "#111";

    let state = 'run';
    let runPhase = 0;
    if (!this.grounded) state = 'jump';
    else if (this.ducking) state = 'duck';
    else runPhase = (this.frame + this.frameT / 0.08) * (Math.PI / 3);

    let headY = -38;
    let bodyY = -24;
    let legS = 0;
    let armS = 0;
    let bodyTilt = 0;

    if (state === 'run') {
      legS = Math.sin(runPhase);
      armS = Math.cos(runPhase);
      bodyY += Math.abs(Math.sin(runPhase*2)) * 2;
      headY += Math.abs(Math.sin(runPhase*2)) * 2;
      bodyTilt = 0.1;
    } else if (state === 'jump') {
      headY = -42;
      bodyY = -28;
      legS = -1.5;
      armS = -1.5;
    } else if (state === 'duck') {
      headY = -22;
      bodyY = -12;
      ctx.scale(1, 0.6);
    }

    ctx.rotate(bodyTilt);

    const drawLeg = (isBack) => {
      const phase = isBack ? -legS : legS;
      const lx = isBack ? -6 : 6;
      ctx.save();
      ctx.translate(lx, bodyY + 12);
      if (state === 'jump') ctx.rotate(isBack ? -0.5 : -0.8);
      else ctx.rotate(phase * 0.6);
      ctx.fillStyle = cBlue; this._rrect(ctx, -3, 0, 6, 10, 2);
      ctx.fillStyle = cWhite; this._rrect(ctx, -2.5, 8, 5, 8, 1);
      ctx.fillStyle = cBlue; this._rrect(ctx, -3, 14, 6, 4, 1);
      ctx.fillStyle = cDark;
      if (state === 'duck') this._rrect(ctx, -6, 18, 12, 4, 2);
      else this._rrect(ctx, -5, 16, 12, 6, 2);
      ctx.restore();
    };

    const drawArm = (isBack) => {
      const phase = isBack ? -armS : armS;
      const ax = isBack ? -14 : 14;
      ctx.save();
      ctx.translate(ax, bodyY - 10);
      if (state === 'jump') ctx.rotate(isBack ? -2.5 : 2.5);
      else ctx.rotate(phase * 0.8);
      ctx.fillStyle = cBlue; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = cWhite; this._rrect(ctx, -3, 2, 6, 10, 2);
      ctx.fillStyle = cBlue; this._rrect(ctx, -3.5, 10, 7, 8, 2);
      ctx.fillStyle = cDark; ctx.beginPath(); ctx.arc(0, 18, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    };

    drawArm(true);
    drawLeg(true);

    ctx.save();
    ctx.translate(0, bodyY);
    ctx.fillStyle = cWhite; this._rrect(ctx, -12, -14, 24, 28, 8);
    ctx.fillStyle = cBlue;
    ctx.beginPath(); ctx.rect(-8, -14, 4, 28); ctx.fill();
    ctx.beginPath(); ctx.rect(4, -14, 4, 28); ctx.fill();
    ctx.fillStyle = cDark; this._rrect(ctx, -6, 2, 12, 8, 2);
    ctx.fillStyle = "#f1c40f"; ctx.beginPath(); ctx.arc(-2, 6, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.arc(2, 6, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = cDark; ctx.fillRect(-3, bodyY - 16, 6, 6);

    ctx.save();
    ctx.translate(0, headY);
    ctx.fillStyle = cWhite; this._rrect(ctx, -18, -12, 36, 24, 8);
    ctx.fillStyle = cBlack;
    ctx.beginPath(); ctx.arc(-7, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 0, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cWhite;
    ctx.beginPath(); ctx.arc(-8, -2, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -2, 2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = cBlue;
    this._rrect(ctx, -20, -4, 3, 8, 1);
    this._rrect(ctx, 17, -4, 3, 8, 1);
    ctx.restore();

    drawLeg(false);
    drawArm(false);

    ctx.restore();
  }
  _rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.fill()}
}

// Token
class Token{
  constructor(x,y){this.x=x;this.y=y;this.r=12;this.rot=0;this.bobT=Math.random()*Math.PI*2;this.alive=true}
  get hitbox(){return{x:this.x-this.r,y:this.y-this.r,w:this.r*2,h:this.r*2}}
  update(spd,dt){this.x-=spd;this.rot+=dt*3;this.bobT+=dt*4;if(this.x<-30)this.alive=false}
  draw(ctx){
    if(!this.alive)return;const bob=Math.sin(this.bobT)*4;const y=this.y+bob;
    ctx.save();ctx.translate(this.x,y);
    
    const outR=16;
    const inR=11.5;
    
    const sx=Math.cos(this.rot);
    const edgeOffset = Math.sin(this.rot) * 6;
    
    const drawFace = (t) => {
      ctx.save();
      ctx.translate(edgeOffset * t, 0);
      ctx.scale(sx,1);
      ctx.fillStyle='#E8C382';
      ctx.beginPath();ctx.arc(0,0,outR,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#3E2723';ctx.lineWidth=1.5;
      ctx.stroke(); 
      ctx.beginPath();ctx.arc(0,0,inR,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){
        const a=(i*Math.PI/4)+(Math.PI/8);
        ctx.beginPath();ctx.moveTo(Math.cos(a)*inR,Math.sin(a)*inR);
        ctx.lineTo(Math.cos(a)*outR,Math.sin(a)*outR);ctx.stroke();
      }
      ctx.fillStyle='#FDF6E3';
      ctx.beginPath();ctx.arc(0,0,inR-0.75,0,Math.PI*2);ctx.fill();
      
      if(Math.abs(sx)>.2){
        ctx.save();
        ctx.scale(Math.sign(sx) || 1, 1);
        ctx.fillStyle='#5D4037';
        ctx.strokeStyle='#3E2723';
        ctx.lineWidth=0.5;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold 17px Georgia, serif';
        ctx.fillText('P',-4,1);ctx.strokeText('P',-4,1);
        ctx.font='bold 10px Georgia, serif';
        ctx.fillText('(x)',7,4);ctx.strokeText('(x)',7,4);
        ctx.restore();
      }
      ctx.restore();
    };

    const drawEdgeLayer = (t) => {
      ctx.save();
      ctx.translate(edgeOffset * t, 0);
      ctx.scale(sx, 1);
      ctx.fillStyle = '#C89B3C';
      ctx.beginPath();ctx.arc(0,0,outR,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#3E2723';ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
    };

    const layers = 6;
    if (Math.sin(this.rot) > 0) {
      ctx.shadowColor='rgba(0,0,0,.2)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
      drawFace(1);
      ctx.shadowColor='transparent';
      for(let i=layers-1; i>=1; i--) drawEdgeLayer(i/layers);
      drawFace(0);
    } else {
      ctx.shadowColor='rgba(0,0,0,.2)';ctx.shadowBlur=4;ctx.shadowOffsetY=2;
      drawFace(0);
      ctx.shadowColor='transparent';
      for(let i=1; i<=layers-1; i++) drawEdgeLayer(i/layers);
      drawFace(1);
    }
    
    ctx.restore();
  }
}

// Obstacles
const OBS_TYPES={
  SPIKE:{w:26,h:30,ground:true},BOX:{w:36,h:36,ground:true},BARREL:{w:32,h:32,ground:true},
  BIRD:{w:34,h:22,ground:false},TALL_WALL:{w:24,h:68,ground:true},LOW_BAR:{w:56,h:22,ground:true},
  DOUBLE_SPIKE:{w:52,h:30,ground:true},STACK_BOX:{w:36,h:72,ground:true}
};
class Obstacle{
  constructor(type,x,groundY){
    const t=OBS_TYPES[type];this.type=type;this.x=x;this.w=t.w;this.h=t.h;
    this.y=t.ground?groundY-t.h:groundY-70-Math.random()*40;
    this.alive=true;this.frame=0;this.frameT=0;
  }
  get hitbox(){return{x:this.x+3,y:this.y+3,w:this.w-6,h:this.h-6}}
  update(spd,dt){this.x-=spd;this.frameT+=dt;if(this.frameT>.15){this.frame=(this.frame+1)%4;this.frameT=0}if(this.x<-this.w-20)this.alive=false}
  draw(ctx){
    if(!this.alive)return;
    ctx.save();
    switch(this.type){
      case'SPIKE':this._spike(ctx);break;case'BOX':this._box(ctx);break;case'BARREL':this._barrel(ctx);break;
      case'BIRD':this._bird(ctx);break;case'TALL_WALL':this._wall(ctx);break;case'LOW_BAR':this._lowbar(ctx);break;
      case'DOUBLE_SPIKE':this._dspike(ctx);break;case'STACK_BOX':this._sbox(ctx);break;
    }
    ctx.restore();
  }
  _spike(ctx){
    ctx.fillStyle='#EF5350';ctx.beginPath();ctx.moveTo(this.x,this.y+this.h);ctx.lineTo(this.x+this.w/2,this.y);
    ctx.lineTo(this.x+this.w,this.y+this.h);ctx.closePath();ctx.fill();
    ctx.fillStyle='#F44336';ctx.beginPath();ctx.moveTo(this.x+this.w/2,this.y);ctx.lineTo(this.x+this.w,this.y+this.h);
    ctx.lineTo(this.x+this.w/2,this.y+this.h*.6);ctx.closePath();ctx.fill();
  }
  _box(ctx){
    ctx.fillStyle='#8D6E63';ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.fillStyle='#A1887F';ctx.fillRect(this.x,this.y,this.w,4);
    ctx.strokeStyle='#6D4C41';ctx.lineWidth=1;ctx.strokeRect(this.x,this.y,this.w,this.h);
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x+this.w,this.y+this.h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(this.x+this.w,this.y);ctx.lineTo(this.x,this.y+this.h);ctx.stroke();
  }
  _barrel(ctx){
    const cx=this.x+this.w/2,cy=this.y+this.h/2;
    ctx.fillStyle='#8D6E63';ctx.beginPath();ctx.ellipse(cx,cy,this.w/2,this.h/2,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#6D4C41';ctx.beginPath();ctx.ellipse(cx,cy,this.w/2-3,this.h/2-3,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#A1887F';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,this.w/2-1,this.h/2-1,0,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#795548';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(this.x+4,cy);ctx.lineTo(this.x+this.w-4,cy);ctx.stroke();
  }
  _bird(ctx){
    const cx=this.x+this.w/2,cy=this.y+this.h/2;const wing=Math.sin(this.frame*1.5)*8;
    ctx.fillStyle='#7E57C2';ctx.beginPath();ctx.ellipse(cx,cy,this.w/2,this.h/3,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#9575CD';
    ctx.beginPath();ctx.moveTo(cx-4,cy);ctx.lineTo(cx-this.w/2-4,cy-wing-8);ctx.lineTo(cx-8,cy);ctx.fill();
    ctx.beginPath();ctx.moveTo(cx+4,cy);ctx.lineTo(cx+this.w/2+4,cy+wing-8);ctx.lineTo(cx+8,cy);ctx.fill();
    // Eye
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx+8,cy-2,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1a1a2e';ctx.beginPath();ctx.arc(cx+9,cy-1,1.5,0,Math.PI*2);ctx.fill();
    // Beak
    ctx.fillStyle='#FFA726';ctx.beginPath();ctx.moveTo(cx+this.w/2,cy);ctx.lineTo(cx+this.w/2+6,cy+2);ctx.lineTo(cx+this.w/2,cy+4);ctx.fill();
  }
  _wall(ctx){
    ctx.fillStyle='#BDBDBD';ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.fillStyle='#9E9E9E';
    for(let r=0;r<this.h;r+=12){const off=r%24?6:0;
      for(let c=-6+off;c<this.w;c+=12){ctx.fillRect(this.x+Math.max(0,c),this.y+r,11,11)}}
    ctx.strokeStyle='#757575';ctx.lineWidth=1;ctx.strokeRect(this.x,this.y,this.w,this.h);
  }
  _lowbar(ctx){
    ctx.fillStyle='#FF7043';ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.fillStyle='#FF5722';ctx.fillRect(this.x,this.y,this.w,4);
    ctx.fillStyle='#FFAB91';ctx.fillRect(this.x+4,this.y+8,this.w-8,this.h-12);
    // Stripes
    ctx.fillStyle='#E64A19';
    for(let i=0;i<this.w;i+=12)ctx.fillRect(this.x+i,this.y,6,this.h);
  }
  _dspike(ctx){
    ctx.fillStyle='#EF5350';
    ctx.beginPath();ctx.moveTo(this.x,this.y+this.h);ctx.lineTo(this.x+13,this.y);ctx.lineTo(this.x+26,this.y+this.h);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(this.x+26,this.y+this.h);ctx.lineTo(this.x+39,this.y+4);ctx.lineTo(this.x+52,this.y+this.h);ctx.closePath();ctx.fill();
    ctx.fillStyle='#C62828';
    ctx.beginPath();ctx.moveTo(this.x+13,this.y);ctx.lineTo(this.x+26,this.y+this.h);ctx.lineTo(this.x+13,this.y+this.h*.6);ctx.closePath();ctx.fill();
  }
  _sbox(ctx){
    ctx.fillStyle='#8D6E63';ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.strokeStyle='#6D4C41';ctx.lineWidth=1;ctx.strokeRect(this.x,this.y,this.w,this.h);
    ctx.strokeRect(this.x,this.y,this.w,this.h/2);
    ctx.fillStyle='#A1887F';ctx.fillRect(this.x,this.y,this.w,4);ctx.fillRect(this.x,this.y+this.h/2,this.w,4);
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x+this.w,this.y+this.h/2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(this.x+this.w,this.y+this.h/2);ctx.lineTo(this.x,this.y+this.h);ctx.stroke();
  }
}
