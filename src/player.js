/**
 * Neon Sky Shooter - Player & Drone Module
 * Ultra-sleek futuristic neon vector rendering, weapon level upgrades, 
 * special weapon modes (laser/missile), companion drones, shield & EMP bomb systems.
 */

class Drone {
  /**
   * @param {Player} player - The parent player instance
   * @param {number} index - Index among active drones (for orbit offset)
   */
  constructor(player, index = 0) {
    this.player = player;
    this.index = index;
    this.orbitAngle = (index * Math.PI); // Offset drones symmetrically
    this.orbitRadius = 52;
    this.orbitSpeed = 2.4;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.x = player.x;
    this.y = player.y;
    this.fireCooldown = 0;
    this.fireRate = 0.28; // ~3.5 shots/sec
    this.damage = 14;
    this.range = 950;
    this.target = null;
    this.color = '#00ffaa';
    this.glowColor = '#00ff88';
    this.corePulse = 0;
  }

  /**
   * Updates drone position, targeting, and auto-firing
   */
  update(dt, player, enemies, bulletManager, particleSystem, soundController) {
    this.player = player;
    this.hoverTime += dt * 4;
    this.corePulse += dt * 6;
    this.orbitAngle += this.orbitSpeed * dt;

    // Smooth elliptical orbit with vertical float oscillation
    const targetX = player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
    const targetY = player.y + Math.sin(this.orbitAngle) * (this.orbitRadius * 0.55) + Math.sin(this.hoverTime) * 5 - 10;

    // Smooth interpolation towards orbit position
    this.x += (targetX - this.x) * Math.min(1, dt * 15);
    this.y += (targetY - this.y) * Math.min(1, dt * 15);

    // Target nearest enemy
    this.target = this.findNearestEnemy(enemies);

    // Auto-fire logic
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && this.target && this.player.isAlive) {
      this.fire(bulletManager, particleSystem, soundController);
      this.fireCooldown = this.fireRate;
    }
  }

  /**
   * Finds the nearest enemy or boss within targeting range
   */
  findNearestEnemy(enemies) {
    let nearest = null;
    let minDist = this.range;

    const boss = (enemies && enemies.boss) || (window.game && window.game.enemyManager && window.game.enemyManager.boss) || (window.game && window.game.boss);
    const checkList = Array.isArray(enemies) ? enemies : ((enemies && enemies.enemies) || (window.game && window.game.enemyManager && window.game.enemyManager.enemies) || []);

    // Check boss first if active and alive
    if (boss && boss.isAlive && boss.y > -80) {
      const dx = boss.x - this.x;
      const dy = boss.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        nearest = boss;
        minDist = dist;
      }
    }

    // Check regular enemies
    for (let i = 0; i < checkList.length; i++) {
      const e = checkList[i];
      if (!e || !e.isAlive || e.y < -30) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }

    return nearest;
  }

  /**
   * Fires a targeted plasma shot towards the nearest enemy
   */
  fire(bulletManager, particleSystem, soundController) {
    if (!this.target || !bulletManager) return;

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const angle = Math.atan2(dy, dx);
    const speed = 720;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const bulletData = {
      x: this.x,
      y: this.y,
      vx: vx,
      vy: vy,
      damage: this.damage,
      radius: 4,
      color: this.color,
      glowColor: this.glowColor,
      type: 'drone_plasma',
      isPlayerBullet: true,
      owner: 'drone'
    };

    if (typeof bulletManager.addPlayerBullet === 'function') {
      bulletManager.addPlayerBullet(bulletData);
    } else if (typeof bulletManager.spawnPlayerBullet === 'function') {
      bulletManager.spawnPlayerBullet(bulletData);
    } else if (typeof bulletManager.add === 'function') {
      bulletManager.add(bulletData);
    } else if (typeof bulletManager.spawn === 'function') {
      bulletManager.spawn(bulletData);
    }

    // Particle muzzle flare
    if (particleSystem && typeof particleSystem.createSparks === 'function') {
      particleSystem.createSparks(this.x, this.y, this.glowColor, 3);
    }

    // Sound effect
    if (soundController && typeof soundController.play === 'function') {
      soundController.play('drone_shoot', 0.25);
    }
  }

  /**
   * Renders the companion drone with glowing vector geometry and tether line
   */
  draw(ctx) {
    ctx.save();

    // Semi-transparent tether energy line to player
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    ctx.translate(this.x, this.y);

    // Aim rotation if target exists, else face forward
    let rot = -Math.PI / 2;
    if (this.target && this.target.isAlive) {
      rot = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    }
    ctx.rotate(rot + Math.PI / 2);

    // Outer glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.glowColor;

    // Outer rotating triangular stabilizers
    const ringAngle = this.corePulse * 1.5;
    ctx.save();
    ctx.rotate(ringAngle);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const rx = Math.cos(a) * 11;
      const ry = Math.sin(a) * 11;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Central drone hull (futuristic diamond)
    ctx.fillStyle = '#061a12';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 3);
    ctx.lineTo(0, 8);
    ctx.lineTo(-7, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing core
    const coreGlow = 2.5 + Math.sin(this.corePulse * 2) * 1.2;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, coreGlow, 0, Math.PI * 2);
    ctx.fill();

    // Drone muzzle emitter tip
    ctx.fillStyle = this.glowColor;
    ctx.fillRect(-1.5, -11, 3, 3);

    ctx.restore();
  }
}

class Player {
  /**
   * @param {number} x - Initial X coordinate
   * @param {number} y - Initial Y coordinate
   */
  constructor(x = 300, y = 650) {
    // Spatial properties
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 44;
    this.height = 48;
    this.radius = 18; // Collision radius
    this.speed = 450;
    this.rollAngle = 0; // Jet tilt banking angle [-0.35, 0.35]

    // Vital stats
    this.hp = 100;
    this.maxHp = 100;
    this.shield = 50;
    this.maxShield = 50;
    this.shieldActive = false;
    this.energy = 100;
    this.maxEnergy = 100;
    this.energyRegenRate = 12; // Per second

    // Combat & Upgrades
    this.weaponLevel = 1; // 1 to 5
    this.weaponMode = 'standard'; // 'standard' | 'laser' | 'missile'
    this.weaponModeTimer = 0;
    this.weaponModeMaxTime = 15;
    this.shootCooldown = 0;
    this.shotCounter = 0; // For alternating weapon patterns

    // Bombs & Drones
    this.bombs = 2;
    this.maxBombs = 5;
    this.drones = [];
    this.maxDrones = 2;

    // States & Timers
    this.isAlive = true;
    this.invulnerableTimer = 0;
    this.invulnerableDuration = 1.2;
    this.thrusterAnimTime = 0;
    this.shieldPulseTime = 0;
    this.trailTimer = 0;
    this.overdrivePulse = 0;
    this.score = 0;

    // Colors
    this.primaryColor = '#00f0ff';
    this.glowColor = '#00aaff';
    this.accentColor = '#ffffff';
    this.cockpitColor = '#70f0ff';
  }

  /**
   * Reset player to initial state (e.g. for game restart)
   */
  reset(x = 300, y = 650) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.shield = 50;
    this.shieldActive = false;
    this.energy = this.maxEnergy;
    this.weaponLevel = 1;
    this.weaponMode = 'standard';
    this.weaponModeTimer = 0;
    this.bombs = 2;
    this.drones = [];
    this.isAlive = true;
    this.invulnerableTimer = 1.5;
    this.shootCooldown = 0;
    this.rollAngle = 0;
  }

  /**
   * Updates player position, input processing, shooting, timers, and drones
   */
  update(dt, input, bulletManager, particleSystem, soundController, enemies, screenEffects) {
    if (!this.isAlive) return;

    // Timers
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
    if (this.shootCooldown > 0) {
      this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    }
    if (this.weaponModeTimer > 0) {
      this.weaponModeTimer -= dt;
      if (this.weaponModeTimer <= 0) {
        this.weaponMode = 'standard';
        this.weaponModeTimer = 0;
      }
    }

    // Energy regeneration
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * dt);
    }

    this.thrusterAnimTime += dt * 25;
    this.shieldPulseTime += dt * 3;
    this.overdrivePulse += dt * 8;

    // Movement calculation
    this.handleMovement(dt, input);

    // Thruster engine particle trails
    this.emitThrusterParticles(dt, particleSystem);

    // Shooting
    this.handleShooting(dt, input, bulletManager, particleSystem, soundController, enemies);

    // Bomb / Ultimate trigger
    this.handleBombInput(input, enemies, bulletManager, particleSystem, soundController, screenEffects);

    // Update companion drones
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].index = i;
      this.drones[i].update(dt, this, enemies, bulletManager, particleSystem, soundController);
    }
  }

  /**
   * Processes keyboard, mouse, and touch input for movement
   */
  handleMovement(dt, input) {
    let moveX = 0;
    let moveY = 0;

    // 1. Check Keyboard Inputs (WASD / Arrow Keys)
    const keyLeft = !!(input?.left || input?.keys?.['ArrowLeft'] || input?.keys?.['KeyA'] || (input?.isDown && (input.isDown('ArrowLeft') || input.isDown('KeyA'))));
    const keyRight = !!(input?.right || input?.keys?.['ArrowRight'] || input?.keys?.['KeyD'] || (input?.isDown && (input.isDown('ArrowRight') || input.isDown('KeyD'))));
    const keyUp = !!(input?.up || input?.keys?.['ArrowUp'] || input?.keys?.['KeyW'] || (input?.isDown && (input.isDown('ArrowUp') || input.isDown('KeyW'))));
    const keyDown = !!(input?.down || input?.keys?.['ArrowDown'] || input?.keys?.['KeyS'] || (input?.isDown && (input.isDown('ArrowDown') || input.isDown('KeyS'))));

    if (keyLeft) moveX -= 1;
    if (keyRight) moveX += 1;
    if (keyUp) moveY -= 1;
    if (keyDown) moveY += 1;

    if (moveX !== 0 || moveY !== 0) {
      // Keyboard Active: direct velocity movement
      if (moveX !== 0 && moveY !== 0) {
        moveX *= 1 / Math.SQRT2;
        moveY *= 1 / Math.SQRT2;
      }
      this.vx = moveX * this.speed;
      this.vy = moveY * this.speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.targetX = this.x;
      this.targetY = this.y;

      const targetRoll = (this.vx / this.speed) * 0.35;
      this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, dt * 15);
      this.clampBounds();
      return;
    }

    // 2. Mouse / Touch Position Follow Mode
    let tx = this.targetX;
    let ty = this.targetY;
    if (input) {
      if (input.mouse && typeof input.mouse.x === 'number') {
        tx = input.mouse.x;
        ty = input.mouse.y;
      } else if (input.touch && input.touch.active && typeof input.touch.x === 'number') {
        tx = input.touch.x;
        ty = input.touch.y;
      } else if (typeof input.mouseX === 'number') {
        tx = input.mouseX;
        ty = input.mouseY;
      }
    }

    if (typeof tx === 'number' && typeof ty === 'number') {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 1.0) {
        // Snappy, ultra-smooth direct follow response (zero lag)
        const lerpFactor = Math.min(1.0, dt * 28);
        this.vx = (dx / Math.max(0.001, dt)) * lerpFactor;
        this.vy = (dy / Math.max(0.001, dt)) * lerpFactor;
        this.x += dx * lerpFactor;
        this.y += dy * lerpFactor;

        const targetRoll = Math.max(-0.4, Math.min(0.4, (dx / 50)));
        this.rollAngle += (targetRoll - this.rollAngle) * Math.min(1, dt * 18);
      } else {
        this.x = tx;
        this.y = ty;
        this.vx = 0;
        this.vy = 0;
        this.rollAngle += (0 - this.rollAngle) * Math.min(1, dt * 12);
      }
    }

    this.clampBounds();
  }

  /**
   * Clamps player coordinates within the virtual 720x1080 canvas bounds
   */
  clampBounds() {
    const minX = this.radius + 6;
    const maxX = 720 - this.radius - 6;
    const minY = this.radius + 20;
    const maxY = 1080 - this.radius - 24;

    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }

  /**
   * Emits glowing plasma particles from dual jet engine thrusters
   */
  emitThrusterParticles(dt, particleSystem) {
    this.trailTimer += dt;
    if (this.trailTimer < 0.035 || !particleSystem) return;
    this.trailTimer = 0;

    const leftEngineX = this.x - 12;
    const rightEngineX = this.x + 12;
    const engineY = this.y + 22;

    const color = (this.weaponMode === 'laser') ? '#ff00aa' : 
                  (this.weaponMode === 'missile') ? '#ff8800' : 
                  (this.weaponLevel >= 5) ? '#00ffff' : '#00aaff';

    if (typeof particleSystem.createTrail === 'function') {
      particleSystem.createTrail(leftEngineX, engineY, color, 3);
      particleSystem.createTrail(rightEngineX, engineY, color, 3);
    } else if (typeof particleSystem.createSparks === 'function') {
      particleSystem.createSparks(leftEngineX, engineY, color, 1);
      particleSystem.createSparks(rightEngineX, engineY, color, 1);
    }
  }

  /**
   * Handles weapon firing across all 5 upgrade levels and special modes
   */
  handleShooting(dt, input, bulletManager, particleSystem, soundController, enemies) {
    if (!bulletManager || !this.isAlive) return;

    // Auto-fire by default in airplane games, or when key/mouse is active
    const isShooting = (
      input === undefined ||
      input.isFiring !== false ||
      input.fire !== false ||
      input.autoFire !== false ||
      (input.keys && (input.keys['Space'] || input.keys['KeyJ'])) ||
      (input.mouse && input.mouse.isDown) ||
      (input.touch && input.touch.active) ||
      (input.isDown && (input.isDown('Space') || input.isDown('KeyJ')))
    );

    if (!isShooting || this.shootCooldown > 0) return;

    this.shotCounter++;

    // Base fire rate intervals based on mode & level
    let cooldown = 0.12; // Base ~8.3 shots/sec
    if (this.weaponMode === 'laser') cooldown = 0.06; // Hyper continuous stream
    else if (this.weaponMode === 'missile') cooldown = 0.16;
    else if (this.weaponLevel === 5) cooldown = 0.085; // Overdrive speed
    this.shootCooldown = cooldown;

    // 1. Special Weapon Modes
    if (this.weaponMode === 'laser') {
      this.fireLaserMode(bulletManager, particleSystem, soundController);
      return;
    }

    if (this.weaponMode === 'missile') {
      this.fireMissileMode(bulletManager, particleSystem, soundController, enemies);
      return;
    }

    // 2. Standard Upgraded Weapon Modes (Levels 1 - 5)
    switch (this.weaponLevel) {
      case 1:
        this.fireLevel1(bulletManager, soundController);
        break;
      case 2:
        this.fireLevel2(bulletManager, soundController);
        break;
      case 3:
        this.fireLevel3(bulletManager, soundController);
        break;
      case 4:
        this.fireLevel4(bulletManager, particleSystem, soundController, enemies);
        break;
      case 5:
      default:
        this.fireLevel5(bulletManager, particleSystem, soundController, enemies);
        break;
    }

    // Muzzle flash particle
    if (particleSystem && typeof particleSystem.createSparks === 'function') {
      particleSystem.createSparks(this.x, this.y - 20, '#00ffff', 2);
    }
  }

  // --- WEAPON LEVEL FIRING PATTERNS ---

  /** Level 1: Single powerful center laser */
  fireLevel1(bulletManager, soundController) {
    this.spawnBullet(bulletManager, {
      x: this.x,
      y: this.y - 22,
      vx: 0,
      vy: -850,
      damage: 22,
      radius: 4.5,
      color: '#00f0ff',
      glowColor: '#00aaff',
      type: 'laser_bolt'
    });
    if (soundController && soundController.play) soundController.play('shoot', 0.3);
  }

  /** Level 2: Dual parallel heavy lasers */
  fireLevel2(bulletManager, soundController) {
    const offsets = [-11, 11];
    for (const off of offsets) {
      this.spawnBullet(bulletManager, {
        x: this.x + off,
        y: this.y - 18,
        vx: 0,
        vy: -880,
        damage: 18,
        radius: 4,
        color: '#00f0ff',
        glowColor: '#0088ff',
        type: 'laser_bolt'
      });
    }
    if (soundController && soundController.play) soundController.play('shoot', 0.35);
  }

  /** Level 3: Triple spread (center + 14deg diagonals) */
  fireLevel3(bulletManager, soundController) {
    const speed = 900;
    const angles = [0, -0.14, 0.14]; // radians (~8 degrees)
    for (const rad of angles) {
      this.spawnBullet(bulletManager, {
        x: this.x + Math.sin(rad) * 10,
        y: this.y - 20,
        vx: Math.sin(rad) * speed,
        vy: -Math.cos(rad) * speed,
        damage: 16,
        radius: 4,
        color: '#00f0ff',
        glowColor: '#00ccff',
        type: 'laser_bolt'
      });
    }
    if (soundController && soundController.play) soundController.play('shoot_triple', 0.4);
  }

  /** Level 4: 5-way fan spread + micro tracking missiles */
  fireLevel4(bulletManager, particleSystem, soundController, enemies) {
    const speed = 920;
    const angles = [-0.26, -0.13, 0, 0.13, 0.26];
    for (let i = 0; i < angles.length; i++) {
      const rad = angles[i];
      this.spawnBullet(bulletManager, {
        x: this.x + Math.sin(rad) * 14,
        y: this.y - 20,
        vx: Math.sin(rad) * speed,
        vy: -Math.cos(rad) * speed,
        damage: 14,
        radius: 3.8,
        color: '#33ffff',
        glowColor: '#0099ff',
        type: 'laser_bolt'
      });
    }

    // Launch micro-missile every 3rd shot
    if (this.shotCounter % 3 === 0) {
      this.launchMicroMissiles(bulletManager, enemies, 2);
    }

    if (soundController && soundController.play) soundController.play('shoot_spread', 0.45);
  }

  /** Level 5: Maximum Overdrive - 7-way hyper barrage + twin continuous piercing lasers + homing missiles */
  fireLevel5(bulletManager, particleSystem, soundController, enemies) {
    const speed = 980;
    // 7-way fan spread
    const angles = [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36];
    for (let i = 0; i < angles.length; i++) {
      const rad = angles[i];
      this.spawnBullet(bulletManager, {
        x: this.x + Math.sin(rad) * 18,
        y: this.y - 22,
        vx: Math.sin(rad) * speed,
        vy: -Math.cos(rad) * speed,
        damage: 16,
        radius: 4,
        color: '#ffffff',
        glowColor: '#00ffff',
        type: 'hyper_bolt'
      });
    }

    // Twin heavy piercing columns
    this.spawnBullet(bulletManager, {
      x: this.x - 7,
      y: this.y - 26,
      vx: 0,
      vy: -1100,
      damage: 24,
      radius: 6,
      pierce: 3,
      color: '#00ffff',
      glowColor: '#ffffff',
      type: 'piercing_laser'
    });
    this.spawnBullet(bulletManager, {
      x: this.x + 7,
      y: this.y - 26,
      vx: 0,
      vy: -1100,
      damage: 24,
      radius: 6,
      pierce: 3,
      color: '#00ffff',
      glowColor: '#ffffff',
      type: 'piercing_laser'
    });

    // Dual homing missiles every 2nd shot
    if (this.shotCounter % 2 === 0) {
      this.launchMicroMissiles(bulletManager, enemies, 2);
    }

    if (soundController && soundController.play) soundController.play('shoot_overdrive', 0.5);
  }

  /** Special Mode: High-Energy Continuous Laser Beam Mode */
  fireLaserMode(bulletManager, particleSystem, soundController) {
    // Twin intense piercing laser stream
    const leftX = this.x - 9;
    const rightX = this.x + 9;

    this.spawnBullet(bulletManager, {
      x: leftX,
      y: this.y - 24,
      vx: 0,
      vy: -1200,
      damage: 28,
      radius: 7,
      pierce: 99,
      color: '#ff00aa',
      glowColor: '#ff66cc',
      type: 'laser_beam'
    });

    this.spawnBullet(bulletManager, {
      x: rightX,
      y: this.y - 24,
      vx: 0,
      vy: -1200,
      damage: 28,
      radius: 7,
      pierce: 99,
      color: '#ff00aa',
      glowColor: '#ff66cc',
      type: 'laser_beam'
    });

    if (soundController && soundController.play) soundController.play('laser_beam', 0.25);
  }

  /** Special Mode: Swarm Homing Missiles Mode */
  fireMissileMode(bulletManager, particleSystem, soundController, enemies) {
    // Launch 4 swarm missiles per burst with divergent angles
    const count = 4;
    const enemyList = this.getEnemyList(enemies);

    for (let i = 0; i < count; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const initialAngle = -Math.PI / 2 + (side * (0.4 + (i * 0.15)));
      const startX = this.x + (side * (16 + i * 4));
      const startY = this.y - 10;
      const target = (enemyList.length > 0) ? enemyList[i % enemyList.length] : null;

      this.spawnBullet(bulletManager, {
        x: startX,
        y: startY,
        vx: Math.cos(initialAngle) * 350,
        vy: Math.sin(initialAngle) * 350,
        speed: 650,
        damage: 42,
        radius: 6,
        homing: true,
        homingTurnRate: 7.5,
        target: target,
        color: '#ff8800',
        glowColor: '#ffaa00',
        type: 'homing_missile'
      });
    }

    if (soundController && soundController.play) soundController.play('missile_launch', 0.4);
  }

  /** Helper to launch micro homing missiles */
  launchMicroMissiles(bulletManager, enemies, count = 2) {
    const enemyList = this.getEnemyList(enemies);
    for (let i = 0; i < count; i++) {
      const side = (i === 0) ? -1 : 1;
      const startX = this.x + side * 18;
      const startY = this.y - 12;
      const target = (enemyList.length > 0) ? enemyList[i % enemyList.length] : null;

      this.spawnBullet(bulletManager, {
        x: startX,
        y: startY,
        vx: side * 180,
        vy: -320,
        speed: 580,
        damage: 30,
        radius: 5,
        homing: true,
        homingTurnRate: 6.0,
        target: target,
        color: '#ffaa00',
        glowColor: '#ff6600',
        type: 'micro_missile'
      });
    }
  }

  /** Helper to get flat array of active enemies */
  getEnemyList(enemies) {
    const list = [];
    const boss = (enemies && enemies.boss) || (window.game && window.game.enemyManager && window.game.enemyManager.boss) || (window.game && window.game.boss);
    if (boss && boss.isAlive && boss.y > -80) list.push(boss);

    const raw = Array.isArray(enemies) ? enemies : ((enemies && enemies.enemies) || (window.game && window.game.enemyManager && window.game.enemyManager.enemies) || []);
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] && raw[i].isAlive && raw[i].y > -10) list.push(raw[i]);
    }
    return list;
  }

  /** Universal bullet spawner supporting all bullet manager variations */
  spawnBullet(bulletManager, bulletData) {
    bulletData.isPlayerBullet = true;
    bulletData.owner = 'player';

    if (typeof bulletManager.addPlayerBullet === 'function') {
      bulletManager.addPlayerBullet(bulletData);
    } else if (typeof bulletManager.spawnPlayerBullet === 'function') {
      bulletManager.spawnPlayerBullet(bulletData);
    } else if (typeof bulletManager.add === 'function') {
      bulletManager.add(bulletData);
    } else if (typeof bulletManager.spawn === 'function') {
      bulletManager.spawn(bulletData);
    }
  }

  /**
   * Checks bomb / ultimate input and triggers screen-clearing EMP Shockwave
   */
  handleBombInput(input, enemies, bulletManager, particleSystem, soundController, screenEffects) {
    if (!input) return;
    const bombPressed = (
      (input.isDown && (input.isDown('KeyB') || input.isDown('KeyK') || input.isDown('KeyX'))) ||
      input.bombTriggered || input.triggerBomb
    );

    if (bombPressed) {
      if (input.consumeBombTrigger) input.consumeBombTrigger();
      this.triggerBomb(enemies, bulletManager, particleSystem, soundController, screenEffects);
    }
  }

  /**
   * EMP Bomb Ultimate: Clears bullets, deals 800 massive damage, full-screen shockwave
   */
  triggerBomb(enemies, bulletManager, particleSystem, soundController, screenEffects) {
    if (this.bombs <= 0 || !this.isAlive) return false;

    this.bombs--;

    // Grant 2.5s invulnerability during bomb explosion
    this.invulnerableTimer = 2.5;

    // 1. Clear all enemy bullets
    if (bulletManager) {
      if (typeof bulletManager.clearEnemyBullets === 'function') {
        bulletManager.clearEnemyBullets();
      } else if (typeof bulletManager.clearEnemy === 'function') {
        bulletManager.clearEnemy();
      }
    }

    // 2. Deal 800 massive damage to all enemies & boss
    if (enemies) {
      if (typeof enemies.damageAll === 'function') {
        enemies.damageAll(800, particleSystem, soundController);
      } else if (Array.isArray(enemies)) {
        for (const e of enemies) {
          if (e && e.takeDamage) e.takeDamage(800, soundController, screenEffects, particleSystem);
        }
      }
    }

    // 3. Audio visual screen effects
    if (screenEffects) {
      if (typeof screenEffects.shake === 'function') screenEffects.shake(22, 0.75);
      if (typeof screenEffects.flash === 'function') screenEffects.flash('#00f0ff', 0.45);
      if (typeof screenEffects.ripple === 'function') screenEffects.ripple(this.x, this.y);
    }

    if (particleSystem) {
      if (typeof particleSystem.createShockwave === 'function') {
        particleSystem.createShockwave(this.x, this.y, 600, '#00f0ff');
      }
      if (typeof particleSystem.createExplosion === 'function') {
        particleSystem.createExplosion(this.x, this.y, '#00ffff', 40, 400);
      }
      if (typeof particleSystem.createFloatingText === 'function') {
        particleSystem.createFloatingText(this.x, this.y - 40, '⚡ EMP BOMB CLEARED! ⚡', '#00ffff');
      }
    }

    if (soundController && soundController.play) {
      soundController.play('emp_bomb', 0.8);
      soundController.play('explosion_huge', 0.8);
    }

    return true;
  }

  /**
   * Handles player damage, shield absorption, invulnerability frames, and death
   */
  takeDamage(amount, soundController, screenEffects, particleSystem) {
    if (!this.isAlive || this.invulnerableTimer > 0) return false;

    // Shield absorption: absorbs 100% of damage while shield > 0
    if (this.shieldActive && this.shield > 0) {
      this.shield -= amount;
      if (this.shield <= 0) {
        this.shield = 0;
        this.shieldActive = false;
        // Shield break effects
        if (particleSystem && typeof particleSystem.createExplosion === 'function') {
          particleSystem.createExplosion(this.x, this.y, '#00aaff', 16, 220);
        }
        if (soundController && soundController.play) soundController.play('shield_down', 0.6);
      } else {
        if (soundController && soundController.play) soundController.play('shield_hit', 0.4);
      }

      if (screenEffects && typeof screenEffects.shake === 'function') {
        screenEffects.shake(6, 0.18);
      }
      return true;
    }

    // Direct HP damage
    this.hp -= amount;
    this.invulnerableTimer = this.invulnerableDuration;

    // Screen Shake & Red Flash
    if (screenEffects) {
      if (typeof screenEffects.shake === 'function') screenEffects.shake(14, 0.35);
      if (typeof screenEffects.flash === 'function') screenEffects.flash('rgba(255, 30, 30, 0.45)', 0.25);
    }

    // Sparks and impact particles
    if (particleSystem) {
      if (typeof particleSystem.createSparks === 'function') {
        particleSystem.createSparks(this.x, this.y, '#ff3344', 18);
      }
      if (typeof particleSystem.createFloatingText === 'function') {
        particleSystem.createFloatingText(this.x, this.y - 20, `-${Math.round(amount)}`, '#ff3344');
      }
    }

    if (soundController && soundController.play) {
      soundController.play('player_hit', 0.6);
    }

    // Death check
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      this.onDeath(soundController, screenEffects, particleSystem);
    }

    return true;
  }

  /**
   * Player destruction animation & effects
   */
  onDeath(soundController, screenEffects, particleSystem) {
    if (screenEffects && screenEffects.shake) screenEffects.shake(25, 0.8);
    if (particleSystem && particleSystem.createExplosion) {
      particleSystem.createExplosion(this.x, this.y, '#00ffff', 45, 350);
      particleSystem.createExplosion(this.x, this.y, '#ff3300', 35, 280);
    }
    if (soundController && soundController.play) {
      soundController.play('player_death', 0.9);
    }
  }

  /**
   * Upgrades weapon level by 1 (up to level 5)
   */
  upgradeWeapon() {
    if (this.weaponLevel < 5) {
      this.weaponLevel++;
    }
  }

  /**
   * Sets a temporary special weapon mode (e.g. 'laser' or 'missile')
   */
  setWeaponMode(mode, duration = 15) {
    this.weaponMode = mode;
    this.weaponModeTimer = duration;
    this.weaponModeMaxTime = duration;
  }

  /**
   * Adds a companion drone up to max capacity
   */
  addDrone() {
    if (this.drones.length < this.maxDrones) {
      const drone = new Drone(this, this.drones.length);
      this.drones.push(drone);
      return true;
    }
    return false;
  }

  /**
   * Restores & activates plasma shield
   */
  activateShield() {
    this.shield = this.maxShield;
    this.shieldActive = true;
  }

  /**
   * Adds a void bomb
   */
  addBomb() {
    if (this.bombs < this.maxBombs) {
      this.bombs++;
      return true;
    }
    return false;
  }

  /**
   * Heals player HP
   */
  heal(amount = 35) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /**
   * Main rendering method for the player jet, shield, and drones
   */
  draw(ctx) {
    if (!this.isAlive) return;

    // Draw companion drones first
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].draw(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Dynamic horizontal roll rotation
    ctx.rotate(this.rollAngle);

    // Invulnerability blink effect (rapid oscillation)
    if (this.invulnerableTimer > 0) {
      const blink = Math.sin(this.invulnerableTimer * 28);
      if (blink > 0.1) {
        ctx.globalAlpha = 0.45;
      }
    }

    // 1. Draw Animated Thruster Plumes
    this.drawThrusters(ctx);

    // 2. Draw Futuristic Jet Fighter Geometry
    this.drawJetBody(ctx);

    // 3. Draw Cockpit Canopy with Neon Glint
    this.drawCockpit(ctx);

    ctx.restore();

    // 4. Draw Plasma Shield Bubble (if active)
    if (this.shieldActive && this.shield > 0) {
      this.drawShieldBubble(ctx);
    }

    // 5. Draw Mini Status Info (Level / Special Mode Bar)
    this.drawMiniIndicators(ctx);
  }

  /**
   * Renders animated dual plasma thruster flames
   */
  drawThrusters(ctx) {
    const leftX = -12;
    const rightX = 12;
    const flameBaseY = 18;
    const flameLen = 14 + Math.sin(this.thrusterAnimTime) * 6 + (Math.abs(this.vy) > 50 ? 6 : 0);

    const flameColor = (this.weaponMode === 'laser') ? '#ff00aa' : 
                       (this.weaponMode === 'missile') ? '#ff8800' : 
                       (this.weaponLevel >= 5) ? '#00ffff' : '#00aaff';

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = flameColor;

    // Left & Right Exhaust Plumes
    for (const ex of [leftX, rightX]) {
      // Outer colored flame
      ctx.fillStyle = flameColor;
      ctx.beginPath();
      ctx.moveTo(ex - 4, flameBaseY);
      ctx.lineTo(ex + 4, flameBaseY);
      ctx.lineTo(ex, flameBaseY + flameLen);
      ctx.closePath();
      ctx.fill();

      // Inner white core flame
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(ex - 2, flameBaseY);
      ctx.lineTo(ex + 2, flameBaseY);
      ctx.lineTo(ex, flameBaseY + flameLen * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renders the sleek neon vector fighter geometry
   */
  drawJetBody(ctx) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = (this.weaponLevel >= 5) ? '#00ffff' : this.glowColor;

    // Compress wings horizontally based on roll angle for 3D pseudo-banking
    const rollScaleX = Math.cos(this.rollAngle);

    // Main Body Hull (Dark futuristic armor with glowing neon borders)
    ctx.fillStyle = '#061320';
    ctx.strokeStyle = (this.weaponLevel >= 5) ? '#00ffff' : this.primaryColor;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    // Nose tip
    ctx.moveTo(0, -24);
    // Right forward canard
    ctx.lineTo(6 * rollScaleX, -10);
    // Right wing root
    ctx.lineTo(14 * rollScaleX, -2);
    // Right wing tip (swept forward)
    ctx.lineTo(24 * rollScaleX, 10);
    // Right wing trailing edge
    ctx.lineTo(16 * rollScaleX, 16);
    // Right engine nozzle
    ctx.lineTo(8 * rollScaleX, 18);
    // Center tail gap
    ctx.lineTo(0, 14);
    // Left engine nozzle
    ctx.lineTo(-8 * rollScaleX, 18);
    // Left wing trailing edge
    ctx.lineTo(-16 * rollScaleX, 16);
    // Left wing tip
    ctx.lineTo(-24 * rollScaleX, 10);
    // Left wing root
    ctx.lineTo(-14 * rollScaleX, -2);
    // Left forward canard
    ctx.lineTo(-6 * rollScaleX, -10);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Internal Neon Circuit Lines & Energy Channels
    ctx.strokeStyle = (this.weaponLevel >= 4) ? '#70ffff' : 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = 1.4;

    // Wing energy channels
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12 * rollScaleX, 6);
    ctx.lineTo(18 * rollScaleX, 10);

    ctx.moveTo(0, -16);
    ctx.lineTo(-12 * rollScaleX, 6);
    ctx.lineTo(-18 * rollScaleX, 10);
    ctx.stroke();

    // Wingtip Strobe lights
    const strobe = (Date.now() % 400 < 200);
    ctx.fillStyle = strobe ? '#00ffff' : '#ff0055';
    ctx.fillRect(22 * rollScaleX - 1.5, 9, 3, 3);
    ctx.fillRect(-22 * rollScaleX - 1.5, 9, 3, 3);

    // Overdrive Level 5 extra energy wings
    if (this.weaponLevel >= 5) {
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 + Math.sin(this.overdrivePulse) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24 * rollScaleX, 10);
      ctx.lineTo(-32 * rollScaleX, 16);
      ctx.moveTo(24 * rollScaleX, 10);
      ctx.lineTo(32 * rollScaleX, 16);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renders the glass cockpit canopy with gradient glint
   */
  drawCockpit(ctx) {
    ctx.save();
    const rollScaleX = Math.cos(this.rollAngle);

    // Cockpit outer rim
    ctx.fillStyle = '#002b4d';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f0ff';

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(4.5 * rollScaleX, -4);
    ctx.lineTo(3.5 * rollScaleX, 4);
    ctx.lineTo(0, 7);
    ctx.lineTo(-3.5 * rollScaleX, 4);
    ctx.lineTo(-4.5 * rollScaleX, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing pilot canopy core / HUD reflection
    ctx.fillStyle = '#a6f8ff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(2.5 * rollScaleX, -4);
    ctx.lineTo(0, 3);
    ctx.lineTo(-2.5 * rollScaleX, -4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders the glowing hexagonal / circular plasma shield bubble
   */
  drawShieldBubble(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const shieldRatio = this.shield / this.maxShield;
    const pulse = Math.sin(this.shieldPulseTime) * 2;
    const shieldRadius = this.radius + 14 + pulse;

    // Glowing Aura
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00aaff';
    ctx.strokeStyle = `rgba(0, 180, 255, ${0.45 + shieldRatio * 0.4})`;
    ctx.lineWidth = 2.5;

    // Outer Circle Bubble
    ctx.beginPath();
    ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating Hexagonal Energy Grid
    ctx.save();
    ctx.rotate(this.shieldPulseTime * 0.8);
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 * shieldRatio})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = Math.cos(a) * (shieldRadius - 2);
      const hy = Math.sin(a) * (shieldRadius - 2);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Renders mini indicator bars for special weapon modes and shield status
   */
  drawMiniIndicators(ctx) {
    // If temporary weapon mode is active, draw a stylish timer arc or bar under player
    if (this.weaponModeTimer > 0 && this.weaponMode !== 'standard') {
      ctx.save();
      const barW = 36;
      const barH = 3.5;
      const barX = this.x - barW / 2;
      const barY = this.y + 32;
      const ratio = this.weaponModeTimer / this.weaponModeMaxTime;
      const modeColor = (this.weaponMode === 'laser') ? '#ff00aa' : '#ff8800';

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

      ctx.fillStyle = modeColor;
      ctx.shadowBlur = 6;
      ctx.shadowColor = modeColor;
      ctx.fillRect(barX, barY, barW * ratio, barH);
      ctx.restore();
    }
  }
}

// Attach to window object for global availability
if (typeof window !== 'undefined') {
  window.Drone = Drone;
  window.Player = Player;
}
