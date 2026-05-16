// === PrismaX Runner - Game Logic ===
class Game{
  constructor(canvas){
    this.cv=canvas;this.ctx=canvas.getContext('2d');
    this.state='START';this.score=0;this.tokens=0;this.combo=0;this.bestCombo=0;
    this.highScore=parseInt(localStorage.getItem('pxRunnerHigh'))||0;
    this.speed=CFG.SPD;this.dist=0;this.lastObs=0;this.lastTok=0;
    this.obstacles=[];this.tokenList=[];this.particles=new Particles();
    this.sound=new SoundMgr();this.bg=null;this.robot=null;
    this.comboTimer=0;this.shakeT=0;this.diffTier=0;
    this.isMobile='ontouchstart'in window||navigator.maxTouchPoints>0;
    this._duckHeld=false;this.lastTime=0;
    this._initDOM();this._initInput();this._resize();
    window.addEventListener('resize',()=>this._resize());
    document.getElementById('highScoreStartValue').textContent=this.highScore;
  }

  _initDOM(){
    this.$start=document.getElementById('startScreen');
    this.$pause=document.getElementById('pauseScreen');
    this.$over=document.getElementById('gameOverScreen');
    this.$hud=document.getElementById('hud');
    this.$score=document.getElementById('scoreValue');
    this.$combo=document.getElementById('comboDisplay');
    this.$comboTxt=document.getElementById('comboText');
    this.$mobile=document.getElementById('mobileControls');
    document.getElementById('playBtn').onclick=()=>this.start();
    document.getElementById('resumeBtn').onclick=()=>this.resume();
    document.getElementById('restartFromPauseBtn').onclick=()=>{this._hide(this.$pause);this.start()};
    document.getElementById('retryBtn').onclick=()=>this.start();
    document.getElementById('menuBtn').onclick=()=>{this._hide(this.$over);this._show(this.$start);this.state='START'};
    document.getElementById('pauseBtn').onclick=()=>this.pause();
  }

  _initInput(){
    this.keys={};
    document.addEventListener('keydown',e=>{
      if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();this._doJump()}
      if(e.code==='ArrowDown'){e.preventDefault();this._duckHeld=true;this.robot&&this.robot.duck(true);this.robot&&(this.robot._duckHeld=true)}
      if(e.code==='Escape'||e.code==='KeyP'){this.state==='PLAYING'?this.pause():this.state==='PAUSED'&&this.resume()}
      this.keys[e.code]=true;
    });
    document.addEventListener('keyup',e=>{
      if(e.code==='ArrowDown'){this._duckHeld=false;this.robot&&this.robot.duck(false);this.robot&&(this.robot._duckHeld=false)}
      this.keys[e.code]=false;
    });
    // Touch - canvas tap = jump
    this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._doJump()},{passive:false});
    // Mobile buttons
    const jb=document.getElementById('jumpBtn'),db=document.getElementById('duckBtn');
    jb.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();this._doJump()},{passive:false});
    db.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();this._duckHeld=true;this.robot&&this.robot.duck(true);this.robot&&(this.robot._duckHeld=true)},{passive:false});
    db.addEventListener('touchend',e=>{e.preventDefault();this._duckHeld=false;this.robot&&this.robot.duck(false);this.robot&&(this.robot._duckHeld=false)},{passive:false});
    // Mouse click on canvas = jump
    this.cv.addEventListener('mousedown',e=>{if(e.button===0)this._doJump()});
  }

  _doJump(){
    if(this.state!=='PLAYING')return;
    this.sound.resume();
    const j=this.robot.jump();
    if(j===1){this.sound.jump();this.particles.emit(this.robot.x+18,this.robot.y,'#A5D6A7',5,60,3)}
    else if(j===2){this.sound.djump();this.particles.emit(this.robot.x+18,this.robot.y-20,'#4DD0E1',6,50,2)}
  }

  _resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.cv.width=window.innerWidth*dpr;this.cv.height=window.innerHeight*dpr;
    this.cv.style.width=window.innerWidth+'px';this.cv.style.height=window.innerHeight+'px';
    this.scaleX=this.cv.width/CFG.W;this.scaleY=this.cv.height/CFG.H;
    this.scale=Math.min(this.scaleX,this.scaleY);
    this.offX=(this.cv.width-CFG.W*this.scale)/2;this.offY=(this.cv.height-CFG.H*this.scale)/2;
  }

  _show(el){el.classList.remove('hidden')}
  _hide(el){el.classList.add('hidden')}

  start(){
    this.sound.init();this.sound.resume();
    this.state='PLAYING';this.score=0;this.tokens=0;this.combo=0;this.bestCombo=0;
    this.speed=CFG.SPD;this.dist=0;this.lastObs=0;this.lastTok=0;this.diffTier=0;
    this.obstacles=[];this.tokenList=[];this.particles=new Particles();
    this.bg=new BG(CFG.W,CFG.H);
    const gy=CFG.H-CFG.GROUND;
    this.robot=new Robot(60,gy);
    this._hide(this.$start);this._hide(this.$over);this._hide(this.$pause);
    this._show(this.$hud);
    if(this.isMobile)this._show(this.$mobile);
    this.$score.textContent='0';this._hide(this.$combo);
    this.lastTime=performance.now();
    this.comboTimer=0;this.shakeT=0;
    requestAnimationFrame(t=>this._loop(t));
  }

  pause(){
    if(this.state!=='PLAYING')return;
    this.state='PAUSED';this._show(this.$pause);
  }

  resume(){
    if(this.state!=='PAUSED')return;
    this.state='PLAYING';this._hide(this.$pause);
    this.lastTime=performance.now();
    requestAnimationFrame(t=>this._loop(t));
  }

  gameOver(){
    this.state='OVER';this.robot.alive=false;this.sound.hit();
    this.shakeT=.3;
    // Save high score
    let isNew=false;
    if(this.score>this.highScore){this.highScore=this.score;localStorage.setItem('pxRunnerHigh',this.highScore);isNew=true}
    // Death particles
    this.particles.emit(this.robot.x+18,this.robot.y-24,'#FF5252',20,120,4);
    this.particles.emit(this.robot.x+18,this.robot.y-24,'#FFD740',10,80,3);
    // Show game over after delay
    setTimeout(()=>{
      this._hide(this.$hud);if(this.isMobile)this._hide(this.$mobile);
      document.getElementById('finalScore').textContent=this.score;
      document.getElementById('finalTokens').textContent=this.tokens;
      document.getElementById('finalCombo').textContent='x'+this.bestCombo;
      document.getElementById('finalHighScore').textContent=this.highScore;
      document.getElementById('highScoreStartValue').textContent=this.highScore;
      const nb=document.getElementById('newBestBadge');isNew?this._show(nb):this._hide(nb);
      this._show(this.$over);
    },800);
  }

  _spawnObstacle(){
    const gy=CFG.H-CFG.GROUND;
    const types=Object.keys(OBS_TYPES);
    // Difficulty tiers unlock more obstacle types
    let pool=['SPIKE','BOX','BARREL'];
    if(this.diffTier>=1)pool.push('BIRD','DOUBLE_SPIKE');
    if(this.diffTier>=2)pool.push('TALL_WALL','LOW_BAR');
    if(this.diffTier>=3)pool.push('STACK_BOX');
    const type=pool[Math.floor(Math.random()*pool.length)];
    this.obstacles.push(new Obstacle(type,CFG.W+20,gy));
  }

  _spawnToken(){
    const gy=CFG.H-CFG.GROUND;
    const heights=[gy-30,gy-60,gy-95,gy-130];
    const y=heights[Math.floor(Math.random()*heights.length)];
    // Sometimes spawn a line of tokens
    const count=Math.random()<.3?3:1;
    for(let i=0;i<count;i++){
      this.tokenList.push(new Token(CFG.W+20+i*30,y));
    }
  }

  _collides(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}

  _loop(time){
    if(this.state!=='PLAYING'&&this.state!=='OVER')return;
    const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;

    if(this.state==='PLAYING')this._update(dt);
    else if(this.state==='OVER'){
      // Continue rendering briefly for death animation
      this.particles.update(dt);if(this.shakeT>0)this.shakeT-=dt;
    }

    this._render();
    if(this.state==='PLAYING'||(this.state==='OVER'&&this.shakeT>0))
      requestAnimationFrame(t=>this._loop(t));
  }

  _update(dt){
    // Speed & difficulty
    this.speed=Math.min(this.speed+CFG.SPD_INC,CFG.MAX_SPD);
    this.dist+=this.speed;this.score=Math.floor(this.dist/8)+this.tokens*10;
    this.diffTier=Math.floor(this.dist/2000);
    this.$score.textContent=this.score;

    // Background
    this.bg.update(this.speed);

    // Robot
    this.robot.update(dt);

    // Combo timer
    if(this.comboTimer>0){this.comboTimer-=dt*1000;if(this.comboTimer<=0){this.combo=0;this._hide(this.$combo)}}

    // Spawn obstacles
    this.lastObs+=this.speed;
    const minGap=CFG.OBS_GAP-this.diffTier*15;
    if(this.lastObs>Math.max(minGap,160)+Math.random()*120){this._spawnObstacle();this.lastObs=0}

    // Spawn tokens
    this.lastTok+=this.speed;
    if(this.lastTok>200+Math.random()*150){this._spawnToken();this.lastTok=0}

    // Update obstacles
    this.obstacles.forEach(o=>o.update(this.speed,dt));
    this.obstacles=this.obstacles.filter(o=>o.alive);

    // Update tokens
    this.tokenList.forEach(t=>t.update(this.speed,dt));
    this.tokenList=this.tokenList.filter(t=>t.alive);

    // Particles
    this.particles.update(dt);

    // Collisions - tokens
    const rh=this.robot.hitbox;
    this.tokenList.forEach(t=>{
      if(!t.alive)return;
      if(this._collides(rh,t.hitbox)){
        t.alive=false;this.tokens++;this.combo++;this.comboTimer=CFG.COMBO_MS;
        if(this.combo>this.bestCombo)this.bestCombo=this.combo;
        this.sound.coin();
        this.particles.emit(t.x,t.y,'#FFD740',8,80,3);
        this.particles.emit(t.x,t.y,'#FFF176',5,60,2);
        // Combo display
        if(this.combo>=2){
          this._show(this.$combo);this.$comboTxt.textContent='x'+this.combo+' COMBO!';
          if(this.combo%5===0)this.sound.combo();
        }
      }
    });

    // Collisions - obstacles
    this.obstacles.forEach(o=>{
      if(!o.alive)return;
      if(this._collides(rh,o.hitbox)){
        this.gameOver();
      }
    });
  }

  _render(){
    const ctx=this.ctx;const w=this.cv.width,h=this.cv.height;
    ctx.clearRect(0,0,w,h);
    ctx.save();

    // Screen shake
    let sx=0,sy=0;
    if(this.shakeT>0){sx=(Math.random()-.5)*8;sy=(Math.random()-.5)*8}

    // Transform to virtual coords
    ctx.translate(this.offX+sx*this.scale,this.offY+sy*this.scale);
    ctx.scale(this.scale,this.scale);

    // Background
    if(this.bg)this.bg.draw(ctx);

    // Tokens
    this.tokenList.forEach(t=>t.draw(ctx));

    // Obstacles
    this.obstacles.forEach(o=>o.draw(ctx));

    // Robot
    if(this.robot)this.robot.draw(ctx);

    // Particles
    this.particles.draw(ctx);

    ctx.restore();
  }
}

// === Initialize ===
window.addEventListener('DOMContentLoaded',()=>{
  const cv=document.getElementById('gameCanvas');
  window.game=new Game(cv);
});
