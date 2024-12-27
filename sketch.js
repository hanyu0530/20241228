let player1, player2;
let p1Sprites = {};
let p2Sprites = {};
let bgImage;

// 在檔案開頭添加地面高度常數
const GROUND_Y = window.innerHeight / 1.25;
const SCALE_FACTOR = 1.8; // 從2.5改為1.8

// 在檔案開頭添加物理相關常數
const GRAVITY = 0.8;
const JUMP_FORCE = -20;
const MOVE_SPEED = 8;

// 添加新的常數
const MAX_HP = 100;
const SCREEN_PADDING = 50; // 螢幕邊界padding

// 在檔案開頭添加新常數
const PROJECTILE_SPEED = 15;
const PROJECTILE_DAMAGE = 10;

// 添加子彈相關常數
const BULLET_CONFIG = {
  player1: {
    width: 45,
    height: 30,
    offsetX: -40,  // 發射位置的X軸偏移
    offsetY: -30   // 發射位置的Y軸偏移
  },
  player2: {
    width: 45,
    height: 30,
    offsetX: 40,
    offsetY: -30
  }
};

// 角色類別
class Fighter {
  constructor(x, y, sprites, config, isPlayer1) {
    this.x = x;
    this.y = y;
    this.sprites = sprites;
    this.config = config;
    this.currentAnimation = 'idle';
    this.frame = 0;
    this.frameCounter = 0;
    this.direction = 1;
    this.scale = SCALE_FACTOR;
    
    // 添加物理相關屬性
    this.velocityY = 0;
    this.isJumping = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.hp = MAX_HP;
    this.isPlayer1 = isPlayer1;
    this.isAttacking = false;
    this.attackBox = {
      width: 60,
      height: 50
    };
    this.projectiles = [];
  }

  update() {
    // 處理跳躍物理
    if (this.isJumping) {
      this.velocityY += GRAVITY;
      this.y += this.velocityY;

      // 著地檢測
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.velocityY = 0;
        this.isJumping = false;
        if (!this.moveLeft && !this.moveRight) {
          this.currentAnimation = 'idle';
        }
      }
    }

    // 處理左右移動
    if (this.moveLeft) {
      const nextX = this.x - MOVE_SPEED;
      if (nextX > SCREEN_PADDING) {  // 檢查左邊界
        this.x = nextX;
      }
      this.direction = 1;
      if (!this.isJumping) this.currentAnimation = 'idle';
    }
    if (this.moveRight) {
      const nextX = this.x + MOVE_SPEED;
      if (nextX < windowWidth - SCREEN_PADDING) {  // 檢查右邊界
        this.x = nextX;
      }
      this.direction = -1;
      if (!this.isJumping) this.currentAnimation = 'idle';
    }

    // 檢查攻擊碰撞
    if (this.isAttacking) {
      this.checkAttackHit();
    }

    // 更新所有投射物
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update();
      
      // 檢查是否擊中對手
      const opponent = this.isPlayer1 ? player2 : player1;
      if (projectile.checkHit(opponent)) {
        opponent.takeDamage(PROJECTILE_DAMAGE);
        projectile.active = false;
        
        // 擊退效果
        const knockbackForce = 10;
        opponent.x += knockbackForce * projectile.direction;
        opponent.x = Math.max(SCREEN_PADDING, Math.min(windowWidth - SCREEN_PADDING, opponent.x));
      }
      
      // 移除無效的投射物
      if (!projectile.active) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  checkAttackHit() {
    const opponent = this.isPlayer1 ? player2 : player1;
    
    // 計算當前角色的碰撞箱
    const myBox = {
      x: this.x - (this.config[this.currentAnimation].width * this.scale) / 2,
      y: this.y - this.config[this.currentAnimation].height * this.scale,
      width: this.config[this.currentAnimation].width * this.scale,
      height: this.config[this.currentAnimation].height * this.scale
    };

    // 計算對手的碰撞箱
    const opponentBox = {
      x: opponent.x - (opponent.config[opponent.currentAnimation].width * opponent.scale) / 2,
      y: opponent.y - opponent.config[opponent.currentAnimation].height * opponent.scale,
      width: opponent.config[opponent.currentAnimation].width * opponent.scale,
      height: opponent.config[opponent.currentAnimation].height * opponent.scale
    };

    // 檢查碰撞
    if (this.checkCollision(myBox, opponentBox)) {
      if (!opponent.isHit && this.isAttacking) {
        opponent.takeDamage(10);
        opponent.isHit = true;
        
        // 擊退效果
        const knockbackForce = 20;
        const direction = this.direction;
        opponent.x += knockbackForce * direction;
        
        // 確保擊退不會超出螢幕邊界
        opponent.x = Math.max(SCREEN_PADDING, Math.min(windowWidth - SCREEN_PADDING, opponent.x));
      }
    }
  }

  // 添加碰撞檢測輔助方法
  checkCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
  }

  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    
    // 受傷閃爍效果
    this.isHit = true;
    setTimeout(() => {
      this.isHit = false;
    }, 200);

    // 如果血量歸零
    if (this.hp <= 0) {
      this.handleDeath();
    }
  }

  attack() {
    if (!this.isAttacking) {
      this.currentAnimation = 'attack';
      this.isAttacking = true;
      this.frame = 0;
      
      const bulletConfig = this.isPlayer1 ? BULLET_CONFIG.player1 : BULLET_CONFIG.player2;
      const projectileX = this.x + bulletConfig.offsetX * this.direction;
      const projectileY = this.y + bulletConfig.offsetY;
      
      const bulletSprite = this.isPlayer1 ? p1Sprites.bullet : p2Sprites.bullet;
      this.projectiles.push(new Projectile(
        projectileX, 
        projectileY, 
        -this.direction, 
        this.isPlayer1,
        bulletSprite,
        bulletConfig
      ));
      
      // 重置攻擊狀態
      setTimeout(() => {
        this.isAttacking = false;
        if (!this.isJumping) {
          this.currentAnimation = 'idle';
        }
      }, 500);
    }
  }

  drawHP() {
    push();
    const hpBarWidth = 250;
    const hpBarHeight = 30;
    const x = this.isPlayer1 ? 50 : windowWidth - 300;
    const y = 30;
    
    // 玩家標籤背景
    const labelY = y - 35;
    const labelPadding = 10;
    const labelText = this.isPlayer1 ? 'PLAYER 1' : 'PLAYER 2';
    textSize(20);
    const labelWidth = textWidth(labelText) + labelPadding * 2;
    
    // 繪製標籤背景
    fill(0, 150);
    stroke(this.isPlayer1 ? color(255, 100, 100) : color(100, 100, 255));
    strokeWeight(2);
    rect(this.isPlayer1 ? x : x + hpBarWidth - labelWidth, labelY, labelWidth, 25, 5);
    
    // 血條外框漸層背景
    const bgGradient = drawingContext.createLinearGradient(x, y, x, y + hpBarHeight);
    bgGradient.addColorStop(0, 'rgba(40, 40, 40, 0.8)');
    bgGradient.addColorStop(1, 'rgba(20, 20, 20, 0.8)');
    drawingContext.fillStyle = bgGradient;
    
    // 血條外框
    strokeWeight(2);
    stroke(200, 100);
    rect(x, y, hpBarWidth, hpBarHeight, 8);
    
    // 血量
    noStroke();
    const hpWidth = (this.hp / MAX_HP) * (hpBarWidth - 6);
    const hpColor = this.hp > 70 ? color(50, 255, 50) :
                    this.hp > 30 ? color(255, 165, 0) :
                    color(255, 50, 50);
    
    // 血量條發光效果
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = color(hpColor);
    
    // 血量條漸層
    const hpGradient = drawingContext.createLinearGradient(x, y, x, y + hpBarHeight);
    hpGradient.addColorStop(0, color(255, 255, 255, 100));
    hpGradient.addColorStop(0.5, hpColor);
    hpGradient.addColorStop(1, color(0, 0, 0, 50));
    
    drawingContext.fillStyle = hpGradient;
    rect(x + 3, y + 3, hpWidth, hpBarHeight - 6, 5);
    
    // 血量數字
    drawingContext.shadowBlur = 5;
    drawingContext.shadowColor = 'black';
    fill(255);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(16);
    text(this.hp + '%', x + hpBarWidth/2, y + hpBarHeight/2);
    
    // 玩家標籤
    textAlign(this.isPlayer1 ? LEFT : RIGHT);
    textSize(20);
    fill(255);
    text(labelText, 
         this.isPlayer1 ? x + labelPadding : x + hpBarWidth - labelPadding, 
         labelY + 18);
    
    pop();
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = JUMP_FORCE;
      this.isJumping = true;
      this.currentAnimation = 'jump';
    }
  }

  animate() {
    const currentConfig = this.config[this.currentAnimation];
    this.frameCounter++;
    
    if (this.frameCounter >= currentConfig.frameDelay) {
      this.frame = (this.frame + 1) % currentConfig.frames;
      this.frameCounter = 0;
    }

    push();
    translate(this.x, this.y);
    
    // 修改受傷閃爍效果
    if (this.isHit) {
      // 改為暗紅色調
      tint(150, 50, 145, 200);  // RGB(139, 0, 0) 是暗紅色，200是透明度
    }
    
    scale(this.direction * this.scale, this.scale);
    
    const frameWidth = this.sprites[this.currentAnimation].width / currentConfig.frames;
    const offsetY = currentConfig.offsetY || 0;
    
    image(
      this.sprites[this.currentAnimation],
      -currentConfig.width/2,
      -currentConfig.height + offsetY,
      currentConfig.width,
      currentConfig.height,
      frameWidth * this.frame,
      0,
      frameWidth,
      this.sprites[this.currentAnimation].height
    );
    pop();

    // 繪製所有投射物
    this.projectiles.forEach(projectile => {
      projectile.draw();
    });
  }

  // 添加死亡處理方法
  handleDeath() {
    // 遊戲結束，顯示獲勝者
    const winner = this.isPlayer1 ? "Player 2" : "Player 1";
    this.showGameOver(winner);
  }

  // 添加遊戲結束顯示方法
  showGameOver(winner) {
    push();
    textAlign(CENTER, CENTER);
    textSize(64);
    fill(255);
    text(winner + " Wins!", windowWidth/2, windowHeight/2);
    
    textSize(32);
    text("Press R to restart", windowWidth/2, windowHeight/2 + 50);
    pop();
    
    noLoop(); // 停止遊戲循環
  }
}

class Projectile {
  constructor(x, y, direction, isPlayer1, sprite, config) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.width = config.width;
    this.height = config.height;
    this.isPlayer1 = isPlayer1;
    this.active = true;
    this.sprite = sprite;
    this.rotation = 0;
    this.rotationSpeed = 12;
  }

  update() {
    this.x += PROJECTILE_SPEED * this.direction;
    this.rotation += this.rotationSpeed; // 更新旋轉角度
    
    // 如果超出螢幕範圍則移除
    if (this.x < 0 || this.x > windowWidth) {
      this.active = false;
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(radians(this.rotation)); // 應用旋轉效果
    
    // 繪製子彈圖片
    imageMode(CENTER);
    image(this.sprite, 0, 0, this.width, this.height);
    
    // 添加發光效果
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = this.isPlayer1 ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,255,0.5)';
    
    pop();
  }

  checkHit(opponent) {
    if (!this.active) return false;
    
    // 計算對手的碰撞箱
    const opponentBox = {
      x: opponent.x - (opponent.config[opponent.currentAnimation].width * opponent.scale) / 2,
      y: opponent.y - opponent.config[opponent.currentAnimation].height * opponent.scale,
      width: opponent.config[opponent.currentAnimation].width * opponent.scale,
      height: opponent.config[opponent.currentAnimation].height * opponent.scale
    };

    // 檢查碰撞
    if (this.x + this.width/2 > opponentBox.x &&
        this.x - this.width/2 < opponentBox.x + opponentBox.width &&
        this.y + this.height/2 > opponentBox.y &&
        this.y - this.height/2 < opponentBox.y + opponentBox.height) {
      return true;
    }
    return false;
  }
}

// 角色動作配置
const player1Config = {
  idle: {
    frames: 8,
    frameDelay: 8,
    width: 45,         // 縮小寬度
    height: 45         // 縮小高度
  },
  attack: {
    frames: 9,
    frameDelay: 7,
    width: 50,
    height: 50,
  },
  jump: {
    frames: 5,
    frameDelay: 6,
    width: 50,
    height: 50
  }
};

const player2Config = {
  idle: {
    frames: 8,
    frameDelay: 8,
    width: 50,
    height: 50,
    offsetY: 0
  },
  attack: {
    frames: 6,
    frameDelay: 4,
    width: 50,
    height: 50,
    offsetY: 0
  },
  jump: {
    frames: 8,
    frameDelay: 6,
    width: 50,
    height: 50,
    offsetY: 0
  }
};

function preload() {
  // 載入背景圖片
  bgImage = loadImage('bg.png');
  
  // 載入角色1的圖片
  p1Sprites = {
    idle: loadImage('run1.png'),      // 水平排列的精靈圖
    attack: loadImage('attack1.png'),  // 水平排列的精靈圖
    jump: loadImage('jump1.png'),       // 水平排列的精靈圖
    bullet: loadImage('bullet1.png')
  };
  
  // 載入角色2的圖片
  p2Sprites = {
    idle: loadImage('run2.png'),    // 水平排列的精靈圖
    attack: loadImage('attack2.png'), // 水平排列的精靈圖
    jump: loadImage('jump2.png'),     // 水平排列的精靈圖
    bullet: loadImage('bullet2.png')
  };
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 創建兩個角色實例，加入 isPlayer1 參數
  player1 = new Fighter(windowWidth * 0.3, GROUND_Y, p1Sprites, player1Config, true);
  player2 = new Fighter(windowWidth * 0.7, GROUND_Y, p2Sprites, player2Config, false);
}

function draw() {
  image(bgImage, 0, 0, windowWidth, windowHeight);
  
  // 繪製操作說明
  drawControls();
  
  // 更新和繪製角色
  player1.update();
  player2.update();
  player1.animate();
  player2.animate();
  
  // 繪製血條
  player1.drawHP();
  player2.drawHP();
  
  // 添加常駐字幕
  drawTitle();
}

// 修改 drawTitle 函數
function drawTitle() {
  push();
  const title = 'TKUET';
  textAlign(CENTER, TOP);
  textStyle(BOLD);
  textSize(48);  // 加大字體
  
  // 更炫的外發光效果
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = 'rgba(0, 255, 255, 0.9)';
  
  // 主標題背景
  const gradient = drawingContext.createLinearGradient(
    windowWidth/2 - 200, 0,
    windowWidth/2 + 200, 45
  );
  gradient.addColorStop(0, 'rgba(0, 40, 80, 0.9)');
  gradient.addColorStop(0.5, 'rgba(0, 100, 200, 0.9)');
  gradient.addColorStop(1, 'rgba(0, 40, 80, 0.9)');
  
  // 炫光邊框效果
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(0, 255, 255, 0.8)';
  stroke(0, 255, 255);
  strokeWeight(3);
  rect(windowWidth/2 - 200, 5, 400, 55, 15);
  
  drawingContext.fillStyle = gradient;
  rect(windowWidth/2 - 200, 5, 400, 55, 15);
  
  // 主標題
  fill(255, 255, 255);
  stroke(0, 200, 255);
  strokeWeight(2);
  textFont('Arial Black');
  text(title, windowWidth/2, 12);
  
  // 副標題
  textSize(24);
  textFont('微軟正黑體');
  noStroke();
  
  // 副標題裝飾
  const subTitle = '教育科技學系';
  const decorWidth = 80;
  const subTitleY = 75;
  
  // 更炫的裝飾線漸層
  const lineGradient = drawingContext.createLinearGradient(
    windowWidth/2 - decorWidth, subTitleY,
    windowWidth/2 + decorWidth, subTitleY
  );
  lineGradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
  lineGradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.8)');
  lineGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
  
  drawingContext.strokeStyle = lineGradient;
  strokeWeight(3);
  line(windowWidth/2 - decorWidth, subTitleY,
       windowWidth/2 + decorWidth, subTitleY);
       
  fill(180, 255, 255);
  text(subTitle, windowWidth/2, subTitleY - 8);
  pop();
}

// 修改 drawControls 函數中的控制說明文字
function drawControls() {
  push();
  const padding = 15;
  const boxWidth = 200;  // 加寬一點以容納中文
  const boxHeight = 130;
  
  // Player 1 控制說明
  drawControlBox(50, 70, boxWidth, boxHeight, 
                '玩家一 控制', 
                [
                  'A / D - 左右移動',
                  'W - 跳躍',
                  'F - 攻擊'
                ],
                color(255, 100, 100, 50));
  
  // Player 2 控制說明
  drawControlBox(windowWidth - 50 - boxWidth, 70, boxWidth, boxHeight,
                '玩家二 控制',
                [
                  '←/→ - 左右移動',
                  '↑ - 跳躍',
                  '/ - 攻擊'
                ],
                color(100, 100, 255, 50));
  pop();
}

// 修改 drawControlBox 函數，增加更炫的效果
function drawControlBox(x, y, width, height, title, controls, boxColor) {
  push();
  // 外框發光效果
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = color(boxColor);
  
  // 更炫的背景漸層
  const gradient = drawingContext.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, color(red(boxColor), green(boxColor), blue(boxColor), 200));
  gradient.addColorStop(0.5, color(red(boxColor)/1.5, green(boxColor)/1.5, blue(boxColor)/1.5, 150));
  gradient.addColorStop(1, color(red(boxColor)/2, green(boxColor)/2, blue(boxColor)/2, 100));
  
  // 繪製主要背景
  drawingContext.fillStyle = gradient;
  stroke(255, 200);
  strokeWeight(2);
  rect(x, y, width, height, 15);
  
  // 繪製炫光邊框
  noFill();
  stroke(255, 150);
  strokeWeight(1);
  rect(x + 3, y + 3, width - 6, height - 6, 12);
  
  // 標題使用中文字體
  textFont('微軟正黑體');
  fill(255);
  noStroke();
  textSize(24);
  textStyle(BOLD);
  textAlign(LEFT);
  text(title, x + 20, y + 35);
  
  // 更炫的分隔線
  const lineGradient = drawingContext.createLinearGradient(x + 20, y + 50, x + width - 20, y + 50);
  lineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  lineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
  lineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  drawingContext.strokeStyle = lineGradient;
  strokeWeight(2);
  line(x + 20, y + 50, x + width - 20, y + 50);
  
  // 控制說明使用中文字體
  textFont('微軟正黑體');
  textSize(16);
  textStyle(NORMAL);
  controls.forEach((control, index) => {
    // 更炫的箭頭圖標
    fill(255, 200);
    text('❯', x + 20, y + 80 + index * 25);
    fill(255);
    text(control, x + 45, y + 80 + index * 25);
  });
  pop();
}

// 修改按鍵控制
function keyPressed() {
  // 角色1控制
  switch (keyCode) {
    case 65: // A
      player1.moveLeft = true;
      break;
    case 68: // D
      player1.moveRight = true;
      break;
    case 87: // W
      player1.jump();
      break;
    case 70: // F
      player1.attack();
      break;
  }
  
  // 角色2控制
  switch (keyCode) {
    case LEFT_ARROW:
      player2.moveLeft = true;
      break;
    case RIGHT_ARROW:
      player2.moveRight = true;
      break;
    case UP_ARROW:
      player2.jump();
      break;
    case 191: // /
      player2.attack();
      break;
  }

  // 重新開始遊戲
  if (keyCode === 82) { // R鍵
    resetGame();
  }
}

function keyReleased() {
  // 角色1控制
  switch (keyCode) {
    case 65: // A
      player1.moveLeft = false;
      if (!player1.moveRight && !player1.isJumping) player1.currentAnimation = 'idle';
      break;
    case 68: // D
      player1.moveRight = false;
      if (!player1.moveLeft && !player1.isJumping) player1.currentAnimation = 'idle';
      break;
    case 70: // F
      if (!player1.isJumping) player1.currentAnimation = 'idle';
      break;
  }
  
  // 角色2控制
  switch (keyCode) {
    case LEFT_ARROW:
      player2.moveLeft = false;
      if (!player2.moveRight && !player2.isJumping) player2.currentAnimation = 'idle';
      break;
    case RIGHT_ARROW:
      player2.moveRight = false;
      if (!player2.moveLeft && !player2.isJumping) player2.currentAnimation = 'idle';
      break;
    case 191: // /
      if (!player2.isJumping) player2.currentAnimation = 'idle';
      break;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // 更新地面高度
  GROUND_Y = window.innerHeight / 1;
  // 更新角色位置
  player1.y = GROUND_Y;
  player2.y = GROUND_Y;
}

// 添加重置遊戲函數
function resetGame() {
  player1 = new Fighter(windowWidth * 0.3, GROUND_Y, p1Sprites, player1Config, true);
  player2 = new Fighter(windowWidth * 0.7, GROUND_Y, p2Sprites, player2Config, false);
  loop(); // 重新開始遊戲循環
}
