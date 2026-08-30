/**
 * Neon Sky Shooter - Enemies & Epic Multi-Phase Bosses Module
 * High-performance vector rendering, diverse AI movement & attack routines,
 * telegraph warning systems, bullet barrage routines, and 3 epic multi-phase bosses.
 */

// ==========================================
// BASE ENEMY CLASS
// ==========================================
class Enemy {
  /**
   * @param {number} x - Initial X coordinate
   * @param {number} y - Initial Y coordinate
   * @param {number} hp - Initial Health Points
   * @param {number} radius - Collision radius
   */
  constructor(x, y, hp = 50, radius = 18) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = hp;
    this.maxHp = hp;
    this.radius = radius;
    this.isAlive = true;
    this.isBoss = false;
    this.type = 'enemy';

    this.scoreValue = 100;
    this.dropChance = 0.25;
    this.hitFlashTimer = 0;
    this.animTime = Math.random() * Math.PI * 2;
    this.shootTimer = Math.random() * 1.5;
    this.shootInterval = 2.0;

    this.primaryColor = '#00ffaa';
    this.glowColor = '#00cc66';
    this.bodyColor = '#0b1e15';
  }

  /**
   * Universal bullet spawner for enemy projectiles
   */
  spawnBullet(bulletManager, bulletData) {
    if (!bulletManager) return;
    bulletData.isPlayerBullet = false;
    bulletData.owner = 'enemy';

    if (typeof bulletManager.addEnemyBullet === 'function') {
      bulletManager.addEnemyBullet(bulletData);
    } else if (typeof bulletManager.spawnEnemyBullet === 'function') {
      bulletManager.spawnEnemyBullet(bulletData);
    } else if (typeof bulletManager.add === 'function') {
      bulletManager.add(bulletData);
    } else if (typeof bulletManager.spawn === 'function') {
      bulletManager.spawn(bulletData);
    }
  }

  /**
   * Base damage handler
   */
  takeDamage(amount, soundController, screenEffects, particleSystem, player = null) {
    if (!this.isAlive) return false;

    this.hp -= amount;
    this.hitFlashTimer = 0.08;

    // Sparks & damage text
    if (particleSystem) {
      if (typeof particleSystem.createSparks === 'function') {
        particleSystem.createSparks(this.x, this.y, '#ffffff', 4);
      }
      if (typeof particleSystem.createFloatingText === 'function') {
        particleSystem.createFloatingText(this.x, this.y - 10, `${Math.round(amount)}`, '#ffffaa');
      }
    }

    if (soundController && typeof soundController.play === 'function') {
      soundController.play('enemy_hit', 0.25);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      return true; // Died
    }

    return false;
  }

  /**
   * Destruction event handler
   */
  onDeath(particleSystem, soundController, screenEffects, itemManager, player) {
    // Add Score to player
    if (player && typeof player.score === 'number') {
      player.score += this.scoreValue;
    }

    // Explosion particles
    if (particleSystem && typeof particleSystem.createExplosion === 'function') {
      particleSystem.createExplosion(this.x, this.y, this.glowColor, 20, 240);
      particleSystem.createExplosion(this.x, this.y, '#ffffff', 10, 180);
    }

    // Drop power-up item
    if (itemManager && typeof itemManager.randomDrop === 'function') {
      itemManager.randomDrop(this.x, this.y, this.dropChance, this.type, player);
    }

    // Audio
    if (soundController && typeof soundController.play === 'function') {
      soundController.play('enemy_explosion', 0.45);
    }
  }

  /**
   * Updates base timers
   */
  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    this.animTime += dt * 4;
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
  }

  /**
   * Renders mini health bar above heavy enemies if damaged
   */
  drawHealthBar(ctx, width = 34, yOffset = -22) {
    if (this.hp >= this.maxHp || this.hp <= 0) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const h = 3;
    const x = this.x - width / 2;
    const y = this.y + yOffset;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - 1, y - 1, width + 2, h + 2);

    ctx.fillStyle = (ratio > 0.5) ? '#00ff88' : (ratio > 0.25 ? '#ffaa00' : '#ff3344');
    ctx.fillRect(x, y, width * ratio, h);
    ctx.restore();
  }
}

// ==========================================
// 1. SCOUT ENEMY (Fast Agile Diamond Interceptor)
// ==========================================
class ScoutEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 45, 16);
    this.type = 'scout';
    this.startX = x;
    this.flightTime = 0;
    this.speedY = 175;
    this.scoreValue = 100;
    this.dropChance = 0.25;
    this.shootInterval = 1.6;
    this.shootTimer = 0.6 + Math.random() * 0.8;

    this.primaryColor = '#00ffcc';
    this.glowColor = '#00e5ff';
    this.bodyColor = '#041f1e';
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

    this.flightTime += dt * 2.8;

    // Smooth sine-wave swoop
    this.x = this.startX + Math.sin(this.flightTime) * 55;
    this.y += this.speedY * dt;

    // Aimed plasma shot at player
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && player && player.isAlive && this.y > 20 && this.y < 700) {
      this.fire(player, bulletManager, soundController);
      this.shootTimer = this.shootInterval + Math.random() * 0.4;
    }
  }

  fire(player, bulletManager, soundController) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const angle = Math.atan2(dy, dx);
    const speed = 400;

    this.spawnBullet(bulletManager, {
      x: this.x,
      y: this.y + 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: 12,
      radius: 4.5,
      color: '#ff3366',
      glowColor: '#ff0044',
      type: 'plasma_dot'
    });

    if (soundController && soundController.play) soundController.play('enemy_shoot', 0.2);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 1.8;

    // Sleek Diamond Hull
    ctx.beginPath();
    ctx.moveTo(0, 16); // Forward nose pointing down
    ctx.lineTo(14, -2);
    ctx.lineTo(8, -14);
    ctx.lineTo(0, -10);
    ctx.lineTo(-8, -14);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eye Turret Core
    ctx.fillStyle = '#00ffea';
    ctx.beginPath();
    ctx.arc(0, 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Engine Exhaust
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.lineTo(4, -10);
    ctx.lineTo(0, -16 - Math.sin(this.flightTime * 5) * 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// 2. CRUISER ENEMY (Heavy Armored Delta Battleship)
// ==========================================
class CruiserEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 260, 26);
    this.type = 'cruiser';
    this.scoreValue = 350;
    this.dropChance = 0.45;
    this.speedY = 85;
    this.targetY = 140 + Math.random() * 60;
    this.reachedCombatZone = false;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.hoverSpeedX = 50;
    this.hoverDir = Math.random() > 0.5 ? 1 : -1;
    this.shootInterval = 2.0;
    this.shootTimer = 1.0;
    this.attackMode = 0; // Alternates between 3-way spread & twin heavy plasma

    this.primaryColor = '#ff9900';
    this.glowColor = '#ff6600';
    this.bodyColor = '#241300';
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

    this.hoverTime += dt * 2;

    // Movement: Move down into combat zone, then hover side-to-side
    if (!this.reachedCombatZone) {
      this.y += this.speedY * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.reachedCombatZone = true;
      }
    } else {
      this.y = this.targetY + Math.sin(this.hoverTime) * 15;
      this.x += this.hoverDir * this.hoverSpeedX * dt;

      const canvasW = (typeof window !== 'undefined' && window.GAME_WIDTH) ? window.GAME_WIDTH : 720;
      if (this.x < 50) {
        this.x = 50;
        this.hoverDir = 1;
      } else if (this.x > canvasW - 50) {
        this.x = canvasW - 50;
        this.hoverDir = -1;
      }
    }

    // Attack Routine
    this.shootTimer -= dt;
    if (this.shootTimer <= 0 && player && player.isAlive) {
      this.fire(player, bulletManager, soundController);
      this.shootTimer = this.shootInterval;
      this.attackMode = (this.attackMode + 1) % 2;
    }
  }

  fire(player, bulletManager, soundController) {
    if (this.attackMode === 0) {
      // 3-Way Fan Spread
      const speed = 360;
      const baseAngle = Math.PI / 2; // Straight down
      const spread = [-0.28, 0, 0.28];

      for (const ang of spread) {
        const a = baseAngle + ang;
        this.spawnBullet(bulletManager, {
          x: this.x,
          y: this.y + 20,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          damage: 15,
          radius: 5,
          color: '#ff9900',
          glowColor: '#ff5500',
          type: 'plasma_orb'
        });
      }
    } else {
      // Dual Heavy Wing Cannons
      const speed = 420;
      for (const off of [-18, 18]) {
        this.spawnBullet(bulletManager, {
          x: this.x + off,
          y: this.y + 16,
          vx: 0,
          vy: speed,
          damage: 18,
          radius: 6,
          color: '#ff3300',
          glowColor: '#ffaa00',
          type: 'heavy_plasma'
        });
      }
    }

    if (soundController && soundController.play) soundController.play('enemy_shoot_heavy', 0.35);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 14;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 2.2;

    // Heavy Delta Hull
    ctx.beginPath();
    ctx.moveTo(0, 24); // Front ramming beak
    ctx.lineTo(16, 12);
    ctx.lineTo(26, -6);
    ctx.lineTo(22, -18);
    ctx.lineTo(10, -14);
    ctx.lineTo(0, -20);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-22, -18);
    ctx.lineTo(-26, -6);
    ctx.lineTo(-16, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Internal Armor Plates & Glowing Channels
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(0, 10);
    ctx.lineTo(12, -4);
    ctx.stroke();

    // Glowing Engine Nozzles
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(-14, -18, 6, 4);
    ctx.fillRect(8, -18, 6, 4);

    ctx.restore();

    // Health Bar
    this.drawHealthBar(ctx, 42, -26);
  }
}

// ==========================================
// 3. LASER ASSAULT ENEMY (Sleek Railgun Sniper)
// ==========================================
class LaserAssaultEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 160, 18);
    this.type = 'laser';
    this.scoreValue = 260;
    this.dropChance = 0.35;
    this.targetY = 120 + Math.random() * 40;
    this.state = 'tracking'; // 'tracking' | 'charging' | 'firing' | 'cooldown'
    this.stateTimer = 1.8;
    this.lockedX = x;

    this.primaryColor = '#ff00aa';
    this.glowColor = '#ff0066';
    this.bodyColor = '#240018';
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

    // Initial descent
    if (this.y < this.targetY) {
      this.y += 120 * dt;
    }

    this.stateTimer -= dt;

    switch (this.state) {
      case 'tracking':
        // Smoothly track player X coordinate
        if (player && player.isAlive) {
          const dx = player.x - this.x;
          this.x += dx * Math.min(1, dt * 3.5);
        }
        if (this.stateTimer <= 0) {
          this.state = 'charging';
          this.stateTimer = 0.95; // 0.95s telegraph warning
          this.lockedX = this.x;
          if (soundController && soundController.play) soundController.play('laser_charge', 0.3);
        }
        break;

      case 'charging':
        // Locked in place, telegraph charging
        if (particleSystem && typeof particleSystem.createSparks === 'function' && Math.random() < 0.4) {
          particleSystem.createSparks(this.x, this.y + 22, '#ff00aa', 2);
        }
        if (this.stateTimer <= 0) {
          this.state = 'firing';
          this.stateTimer = 0.4;
          this.fireRailgunBeam(bulletManager, particleSystem, soundController, screenEffects);
        }
        break;

      case 'firing':
        if (this.stateTimer <= 0) {
          this.state = 'cooldown';
          this.stateTimer = 1.5;
        }
        break;

      case 'cooldown':
        // Gentle strafing drift
        this.x += Math.sin(this.animTime * 2) * 40 * dt;
        if (this.stateTimer <= 0) {
          this.state = 'tracking';
          this.stateTimer = 2.0;
        }
        break;
    }
  }

  fireRailgunBeam(bulletManager, particleSystem, soundController, screenEffects) {
    // Blasts high-speed piercing energy beam
    this.spawnBullet(bulletManager, {
      x: this.x,
      y: this.y + 24,
      vx: 0,
      vy: 1100,
      damage: 28,
      radius: 6.5,
      pierce: 99,
      color: '#ff00aa',
      glowColor: '#ffffff',
      type: 'railgun_beam'
    });

    if (screenEffects && screenEffects.shake) screenEffects.shake(8, 0.2);
    if (particleSystem && particleSystem.createSparks) {
      particleSystem.createSparks(this.x, this.y + 24, '#ffffff', 8);
    }
    if (soundController && soundController.play) soundController.play('laser_fire', 0.45);
  }

  draw(ctx) {
    // 1. Draw Telegraph Line when Charging
    if (this.state === 'charging') {
      ctx.save();
      const chargeRatio = 1 - (this.stateTimer / 0.95);
      ctx.strokeStyle = `rgba(255, 0, 170, ${0.3 + chargeRatio * 0.6})`;
      ctx.lineWidth = 1.5 + chargeRatio * 2.5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 20);
      ctx.lineTo(this.x, (typeof window !== 'undefined' && window.GAME_HEIGHT) ? window.GAME_HEIGHT : 800);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 14;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 2.0;

    // Needle Railgun Body
    ctx.beginPath();
    ctx.moveTo(0, 24); // Railgun barrel tip
    ctx.lineTo(6, 6);
    ctx.lineTo(18, -4);
    ctx.lineTo(12, -18);
    ctx.lineTo(4, -12);
    ctx.lineTo(0, -16);
    ctx.lineTo(-4, -12);
    ctx.lineTo(-12, -18);
    ctx.lineTo(-18, -4);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Barrel Capacitor Glow
    if (this.state === 'charging' || this.state === 'firing') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff00aa';
      ctx.beginPath();
      ctx.arc(0, 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    this.drawHealthBar(ctx, 36, -24);
  }
}

// ==========================================
// 4. KAMIKAZE SWARM ENEMY (Spinning Tri-Blade Bomb)
// ==========================================
class KamikazeEnemy extends Enemy {
  constructor(x, y) {
    super(x, y, 40, 14);
    this.type = 'kamikaze';
    this.scoreValue = 150;
    this.dropChance = 0.15;
    this.speed = 460;
    this.rotation = 0;
    this.targetLocked = false;
    this.targetX = x;
    this.targetY = y + 800;

    this.primaryColor = '#ff2244';
    this.glowColor = '#ff0022';
    this.bodyColor = '#240004';
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

    this.rotation += dt * 14; // Rapid spin

    if (player && player.isAlive && !this.targetLocked) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const angle = Math.atan2(dy, dx);
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;

      // Lock trajectory once close
      if (this.y > player.y - 140) {
        this.targetLocked = true;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Direct collision check with player
    if (player && player.isAlive) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < (player.radius + this.radius + 4)) {
        player.takeDamage(32, soundController, screenEffects, particleSystem);
        this.isAlive = false;
        this.onDeath(particleSystem, soundController, screenEffects, null, player);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 14;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 2.0;

    // Spinning Tri-Blade Shuriken
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const x1 = Math.cos(a) * 16;
      const y1 = Math.sin(a) * 16;
      const a2 = a + 0.45;
      const x2 = Math.cos(a2) * 6;
      const y2 = Math.sin(a2) * 6;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pulsing Hazard Core
    ctx.fillStyle = '#ff0033';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// BASE BOSS CLASS
// ==========================================
class Boss extends Enemy {
  constructor(x, y, hp, width, height, name, stage = 1) {
    super(x, y, hp, Math.max(width, height) * 0.45);
    this.isBoss = true;
    this.name = name;
    this.stage = stage;
    this.width = width;
    this.height = height;
    this.phase = 1;
    this.maxPhases = 2;
    this.displayHp = hp; // Trailing health bar
    this.scoreValue = 5000 * stage;
    this.dropChance = 1.0; // Guaranteed multi drops
    this.entryDone = false;
    this.targetY = 140;
    this.attackTimer = 0;
    this.attackPhaseTimer = 0;
    this.attackStep = 0;
  }

  takeDamage(amount, soundController, screenEffects, particleSystem, player = null) {
    const dead = super.takeDamage(amount, soundController, screenEffects, particleSystem, player);
    if (dead) return true;

    // Check phase transitions
    this.checkPhaseTransition(particleSystem, soundController, screenEffects);
    return false;
  }

  checkPhaseTransition(particleSystem, soundController, screenEffects) {
    // Override in subclasses
  }

  onDeath(particleSystem, soundController, screenEffects, itemManager, player) {
    if (player && typeof player.score === 'number') {
      player.score += this.scoreValue;
    }

    // Epic multi-stage explosion finale
    if (screenEffects && screenEffects.shake) screenEffects.shake(30, 1.2);
    if (screenEffects && screenEffects.flash) screenEffects.flash('#ffffff', 0.6);

    if (particleSystem) {
      if (typeof particleSystem.createShockwave === 'function') {
        particleSystem.createShockwave(this.x, this.y, 800, this.glowColor);
      }
      if (typeof particleSystem.createExplosion === 'function') {
        for (let i = 0; i < 8; i++) {
          const ox = (Math.random() - 0.5) * this.width;
          const oy = (Math.random() - 0.5) * this.height;
          particleSystem.createExplosion(this.x + ox, this.y + oy, this.glowColor, 35, 320);
        }
      }
      if (typeof particleSystem.createFloatingText === 'function') {
        particleSystem.createFloatingText(this.x, this.y - 60, `★ ${this.name} DESTROYED! ★`, '#ffff00');
      }
    }

    // Multi-drop rewards
    if (itemManager) {
      itemManager.spawn(this.x - 40, this.y, 'power');
      itemManager.spawn(this.x, this.y, 'bomb');
      itemManager.spawn(this.x + 40, this.y, 'shield');
      itemManager.randomDrop(this.x, this.y - 30, 1.0, 'boss', player);
    }

    if (soundController && soundController.play) {
      soundController.play('boss_death', 0.9);
      soundController.play('explosion_huge', 0.9);
    }
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

    // Trailing smooth HP animation
    if (this.displayHp > this.hp) {
      this.displayHp -= (this.displayHp - this.hp) * Math.min(1, dt * 5);
    }

    // Initial Boss Entry Fly-in
    if (!this.entryDone) {
      this.y += 90 * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.entryDone = true;
        if (screenEffects && screenEffects.shake) screenEffects.shake(12, 0.4);
        if (soundController && soundController.play) soundController.play('boss_entry', 0.7);
      }
    }
  }
}

// ==========================================
// 5. BOSS 1: VOID VANGUARD (Stage 1 Dreadnought)
// ==========================================
class VoidVanguardBoss extends Boss {
  constructor(x = 300, y = -100) {
    super(x, y, 3200, 190, 115, 'VOID VANGUARD', 1);
    this.maxPhases = 2;
    this.primaryColor = '#00f0ff';
    this.glowColor = '#00aaff';
    this.bodyColor = '#05131d';
    this.spiralAngle = 0;
    this.isRamming = false;
    this.ramPhase = 0;
    this.ramTimer = 0;
  }

  checkPhaseTransition(particleSystem, soundController, screenEffects) {
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2;
      this.primaryColor = '#ff0055';
      this.glowColor = '#ff0033';
      this.bodyColor = '#20050c';

      if (screenEffects && screenEffects.shake) screenEffects.shake(18, 0.6);
      if (screenEffects && screenEffects.flash) screenEffects.flash('#ff0055', 0.4);
      if (particleSystem && particleSystem.createShockwave) {
        particleSystem.createShockwave(this.x, this.y, 400, '#ff0055');
      }
      if (soundController && soundController.play) soundController.play('boss_phase', 0.7);
    }
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);
    if (!this.entryDone || !this.isAlive) return;

    this.attackTimer += dt;
    this.spiralAngle += dt * (this.phase === 2 ? 3.8 : 2.2);

    if (this.phase === 1) {
      // Phase 1 Movement: Smooth figure-8
      this.x = 300 + Math.sin(this.animTime * 0.8) * 140;
      this.y = this.targetY + Math.cos(this.animTime * 1.6) * 20;

      // Routine: Dual wing vulcan cannons + 12-way ring nova
      if (this.attackTimer > 0.18 && this.attackStep < 8) {
        this.fireVulcanCannons(bulletManager, soundController);
        this.attackStep++;
        this.attackTimer = 0;
      } else if (this.attackTimer > 2.4) {
        this.fireRingNova(bulletManager, 12, soundController);
        this.attackStep = 0;
        this.attackTimer = 0;
      }
    } else {
      // Phase 2 (Enraged): Swirling Spiral Storm + Ramming Rush
      if (!this.isRamming) {
        this.x = 300 + Math.sin(this.animTime * 1.4) * 170;
        this.y = this.targetY + Math.sin(this.animTime * 2.8) * 28;

        // Continuous Spiral Bullets
        if (this.attackTimer > 0.12) {
          this.fireSpiralBarrage(bulletManager);
          this.attackTimer = 0;
          this.attackStep++;
        }

        // Trigger Ramming every 25 shots
        if (this.attackStep > 25) {
          this.isRamming = true;
          this.ramPhase = 0;
          this.ramTimer = 0.8; // Telegraph time
          this.attackStep = 0;
          if (soundController && soundController.play) soundController.play('boss_charge', 0.6);
        }
      } else {
        // Ramming State Machine
        this.ramTimer -= dt;
        if (this.ramPhase === 0) {
          // Warning charge
          if (this.ramTimer <= 0) {
            this.ramPhase = 1;
            this.ramTimer = 1.0;
          }
        } else if (this.ramPhase === 1) {
          // Rush down
          this.y += 650 * dt;
          if (this.y > 600 || this.ramTimer <= 0) {
            this.ramPhase = 2;
          }
        } else if (this.ramPhase === 2) {
          // Return up
          this.y -= 380 * dt;
          if (this.y <= this.targetY) {
            this.y = this.targetY;
            this.isRamming = false;
            this.attackTimer = 0;
          }
        }
      }
    }
  }

  fireVulcanCannons(bulletManager, soundController) {
    const speed = 460;
    const offsets = [-45, 45];
    for (const off of offsets) {
      this.spawnBullet(bulletManager, {
        x: this.x + off,
        y: this.y + 35,
        vx: (Math.random() - 0.5) * 60,
        vy: speed,
        damage: 12,
        radius: 4.5,
        color: '#00f0ff',
        glowColor: '#0088ff',
        type: 'vulcan'
      });
    }
    if (soundController && soundController.play) soundController.play('enemy_shoot', 0.2);
  }

  fireRingNova(bulletManager, count = 12, soundController) {
    const speed = 340;
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: 14,
        radius: 5.5,
        color: '#ff00aa',
        glowColor: '#ff0055',
        type: 'ring_bullet'
      });
    }
    if (soundController && soundController.play) soundController.play('enemy_shoot_heavy', 0.4);
  }

  fireSpiralBarrage(bulletManager) {
    const speed = 360;
    const arms = 4;
    for (let i = 0; i < arms; i++) {
      const a = this.spiralAngle + (i * Math.PI * 2) / arms;
      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 20,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: 13,
        radius: 5,
        color: '#ff3344',
        glowColor: '#ff0022',
        type: 'spiral_orb'
      });
    }
  }

  draw(ctx) {
    // Ramming telegraph warning
    if (this.isRamming && this.ramPhase === 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 50, 0.15)';
      ctx.fillRect(this.x - 70, this.y, 140, 700);
      ctx.strokeStyle = '#ff0044';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(this.x - 70, this.y, 140, 700);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 18;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 2.8;

    // Dreadnought Stealth Hull
    ctx.beginPath();
    ctx.moveTo(0, 45); // Heavy forward ram
    ctx.lineTo(35, 25);
    ctx.lineTo(85, 10);
    ctx.lineTo(95, -20);
    ctx.lineTo(70, -35);
    ctx.lineTo(30, -25);
    ctx.lineTo(0, -40);
    ctx.lineTo(-30, -25);
    ctx.lineTo(-70, -35);
    ctx.lineTo(-95, -20);
    ctx.lineTo(-85, 10);
    ctx.lineTo(-35, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Reactor Core
    const coreGlow = Math.sin(this.animTime * 4) * 2;
    ctx.fillStyle = this.phase === 2 ? '#ff0033' : '#00ffff';
    ctx.shadowBlur = 24;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(0, 5, 12 + coreGlow, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Wing Cannons
    ctx.fillStyle = this.primaryColor;
    ctx.fillRect(-50, 20, 10, 22);
    ctx.fillRect(40, 20, 10, 22);

    ctx.restore();
  }
}

// ==========================================
// 6. BOSS 2: THUNDER TEMPEST (Stage 2 Lightning Fortress)
// ==========================================
class ThunderTempestBoss extends Boss {
  constructor(x = 300, y = -120) {
    super(x, y, 5500, 230, 135, 'THUNDER TEMPEST', 2);
    this.maxPhases = 3;
    this.primaryColor = '#ffea00';
    this.glowColor = '#ffaa00';
    this.bodyColor = '#1f1a02';
    this.podAngle = 0;
    this.sweepAngle = 0;
    this.missileTimer = 0;
  }

  checkPhaseTransition(particleSystem, soundController, screenEffects) {
    const p2Threshold = this.maxHp * 0.66;
    const p3Threshold = this.maxHp * 0.33;

    if (this.phase === 1 && this.hp <= p2Threshold) {
      this.phase = 2;
      this.primaryColor = '#00ffff';
      this.glowColor = '#0088ff';
      this.bodyColor = '#021820';
      if (screenEffects && screenEffects.shake) screenEffects.shake(20, 0.7);
      if (soundController && soundController.play) soundController.play('boss_phase', 0.8);
    } else if (this.phase === 2 && this.hp <= p3Threshold) {
      this.phase = 3; // OVERCHARGE
      this.primaryColor = '#ff00dd';
      this.glowColor = '#ff0088';
      this.bodyColor = '#24001a';
      if (screenEffects && screenEffects.shake) screenEffects.shake(25, 0.9);
      if (screenEffects && screenEffects.flash) screenEffects.flash('#ff00dd', 0.5);
      if (soundController && soundController.play) soundController.play('boss_phase', 0.9);
    }
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);
    if (!this.entryDone || !this.isAlive) return;

    this.attackTimer += dt;
    this.missileTimer += dt;
    this.podAngle += dt * (1.8 + this.phase * 0.6);
    this.sweepAngle += dt * 1.5;

    // Movement: Floating hovering fortress
    this.x = 300 + Math.sin(this.animTime * 0.7) * 150;
    this.y = this.targetY + Math.cos(this.animTime * 1.2) * 22;

    // Phase 1: Quad satellite rotating electric spokes
    if (this.phase === 1) {
      if (this.attackTimer > 0.22) {
        this.fireElectricSpokes(bulletManager);
        this.attackTimer = 0;
      }
    } else if (this.phase === 2) {
      // Phase 2: Rotating spokes + Homing electric missile volleys
      if (this.attackTimer > 0.18) {
        this.fireElectricSpokes(bulletManager);
        this.attackTimer = 0;
      }
      if (this.missileTimer > 3.2 && player && player.isAlive) {
        this.fireHomingMissiles(bulletManager, player, soundController);
        this.missileTimer = 0;
      }
    } else {
      // Phase 3 (Overcharge): Full-screen thunderstorm bullet storm + sweeping beams
      if (this.attackTimer > 0.10) {
        this.fireOverchargeStorm(bulletManager);
        this.attackTimer = 0;
      }
      if (this.missileTimer > 2.2 && player && player.isAlive) {
        this.fireHomingMissiles(bulletManager, player, soundController);
        this.missileTimer = 0;
      }
    }
  }

  fireElectricSpokes(bulletManager) {
    const speed = 350;
    for (let i = 0; i < 4; i++) {
      const a = this.podAngle + (i * Math.PI / 2);
      this.spawnBullet(bulletManager, {
        x: this.x + Math.cos(a) * 75,
        y: this.y + Math.sin(a) * 55,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: 14,
        radius: 5,
        color: this.primaryColor,
        glowColor: this.glowColor,
        type: 'electric_spark'
      });
    }
  }

  fireHomingMissiles(bulletManager, player, soundController) {
    for (let i = 0; i < 4; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const angle = Math.PI / 2 + (side * (0.3 + i * 0.15));
      this.spawnBullet(bulletManager, {
        x: this.x + side * (50 + i * 15),
        y: this.y + 30,
        vx: Math.cos(angle) * 280,
        vy: Math.sin(angle) * 280,
        speed: 420,
        damage: 22,
        radius: 6,
        homing: true,
        homingTurnRate: 4.5,
        target: player,
        color: '#ffaa00',
        glowColor: '#ff5500',
        type: 'enemy_missile'
      });
    }
    if (soundController && soundController.play) soundController.play('missile_launch', 0.45);
  }

  fireOverchargeStorm(bulletManager) {
    const speed = 380;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = this.podAngle * 1.5 + (i * Math.PI * 2) / count;
      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 15,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: 16,
        radius: 6,
        color: '#ff00dd',
        glowColor: '#ff0088',
        type: 'plasma_orb'
      });
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Rotating 4 Satellite Pods with Lightning Arcs
    for (let i = 0; i < 4; i++) {
      const a = this.podAngle + (i * Math.PI / 2);
      const px = Math.cos(a) * 85;
      const py = Math.sin(a) * 60;

      // Crackling Lightning Arcs to Core
      ctx.save();
      ctx.strokeStyle = `rgba(${this.phase === 3 ? '255, 0, 220' : '255, 234, 0'}, ${0.4 + Math.random() * 0.4})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const midX = px * 0.5 + (Math.random() - 0.5) * 16;
      const midY = py * 0.5 + (Math.random() - 0.5) * 16;
      ctx.lineTo(midX, midY);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();

      // Satellite Pod Geometry
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.glowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 3;

    // Hexagonal Fortress Main Frame
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = Math.cos(a) * 68;
      const hy = Math.sin(a) * 48;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central Tesla Energy Sphere
    ctx.fillStyle = (this.phase === 3) ? '#ffffff' : this.primaryColor;
    ctx.shadowBlur = 26;
    ctx.shadowColor = this.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// 7. BOSS 3: MOTHERSHIP OVERLORD (Final Cosmic Entity)
// ==========================================
class MothershipOverlordBoss extends Boss {
  constructor(x = 300, y = -150) {
    super(x, y, 9000, 280, 160, 'MOTHERSHIP OVERLORD', 3);
    this.maxPhases = 3;
    this.primaryColor = '#e040fb';
    this.glowColor = '#00e5ff';
    this.bodyColor = '#150324';
    this.curtainAngle = 0;
    this.deathRayState = 0; // 0: Idle, 1: Charging, 2: Firing
    this.deathRayTimer = 0;
  }

  checkPhaseTransition(particleSystem, soundController, screenEffects) {
    const p2Threshold = this.maxHp * 0.66;
    const p3Threshold = this.maxHp * 0.33;

    if (this.phase === 1 && this.hp <= p2Threshold) {
      this.phase = 2;
      this.primaryColor = '#00e5ff';
      this.glowColor = '#0088ff';
      if (screenEffects && screenEffects.shake) screenEffects.shake(22, 0.8);
      if (soundController && soundController.play) soundController.play('boss_phase', 0.85);
    } else if (this.phase === 2 && this.hp <= p3Threshold) {
      this.phase = 3; // CORE APOCALYPSE
      this.primaryColor = '#ff0055';
      this.glowColor = '#ffd700';
      if (screenEffects && screenEffects.shake) screenEffects.shake(30, 1.2);
      if (screenEffects && screenEffects.flash) screenEffects.flash('#ffd700', 0.6);
      if (soundController && soundController.play) soundController.play('boss_phase', 1.0);
    }
  }

  update(dt, player, bulletManager, particleSystem, soundController, screenEffects) {
    super.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);
    if (!this.entryDone || !this.isAlive) return;

    this.attackTimer += dt;
    this.curtainAngle += dt * 1.8;

    // Movement: Majestic slow drift
    this.x = 300 + Math.sin(this.animTime * 0.5) * 160;
    this.y = this.targetY + Math.sin(this.animTime * 1.0) * 18;

    if (this.phase === 1) {
      // Phase 1: 16-way Kaleidoscope Bullet Curtain
      if (this.attackTimer > 0.24) {
        this.fireKaleidoscopeCurtain(bulletManager);
        this.attackTimer = 0;
      }
    } else if (this.phase === 2) {
      // Phase 2: Dual Energy Blades + Gravity Cluster Bombs
      if (this.attackTimer > 0.16) {
        this.fireKaleidoscopeCurtain(bulletManager);
        this.attackTimer = 0;
      }
    } else {
      // Phase 3 (CORE APOCALYPSE): Ultimate Death Ray + Bullet Hell Fireworks
      if (this.deathRayState === 0) {
        // Idle between rays
        if (this.attackTimer > 0.09) {
          this.fireApocalypseFireworks(bulletManager);
          this.attackTimer = 0;
          this.attackStep++;
        }
        if (this.attackStep > 35) {
          this.deathRayState = 1; // Charging
          this.deathRayTimer = 1.8;
          this.attackStep = 0;
          if (soundController && soundController.play) soundController.play('boss_laser_charge', 0.7);
        }
      } else if (this.deathRayState === 1) {
        // Charging Death Ray
        this.deathRayTimer -= dt;
        if (particleSystem && particleSystem.createSparks) {
          particleSystem.createSparks(this.x, this.y + 40, '#ffd700', 4);
        }
        if (this.deathRayTimer <= 0) {
          this.deathRayState = 2; // Firing
          this.deathRayTimer = 1.4;
          if (screenEffects && screenEffects.shake) screenEffects.shake(25, 1.4);
          if (soundController && soundController.play) soundController.play('boss_laser_fire', 0.9);
        }
      } else if (this.deathRayState === 2) {
        // Firing Death Ray Column
        this.deathRayTimer -= dt;
        this.fireDeathRayStream(bulletManager);
        if (this.deathRayTimer <= 0) {
          this.deathRayState = 0;
          this.attackTimer = 0;
        }
      }
    }
  }

  fireKaleidoscopeCurtain(bulletManager) {
    const count = 16;
    const speed = 320;
    for (let i = 0; i < count; i++) {
      const a1 = this.curtainAngle + (i * Math.PI * 2) / count;
      const a2 = -this.curtainAngle + (i * Math.PI * 2) / count;

      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 35,
        vx: Math.cos(a1) * speed,
        vy: Math.sin(a1) * speed,
        damage: 15,
        radius: 5,
        color: '#e040fb',
        glowColor: '#00e5ff',
        type: 'kaleido_1'
      });

      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 35,
        vx: Math.cos(a2) * (speed * 0.8),
        vy: Math.sin(a2) * (speed * 0.8),
        damage: 15,
        radius: 4.5,
        color: '#00e5ff',
        glowColor: '#e040fb',
        type: 'kaleido_2'
      });
    }
  }

  fireApocalypseFireworks(bulletManager) {
    const count = 8;
    const speed = 400;
    for (let i = 0; i < count; i++) {
      const a = (this.curtainAngle * 2) + (i * Math.PI * 2) / count;
      this.spawnBullet(bulletManager, {
        x: this.x,
        y: this.y + 40,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        damage: 18,
        radius: 6,
        color: '#ffd700',
        glowColor: '#ff0055',
        type: 'apocalypse_orb'
      });
    }
  }

  fireDeathRayStream(bulletManager) {
    this.spawnBullet(bulletManager, {
      x: this.x + (Math.random() - 0.5) * 16,
      y: this.y + 40,
      vx: 0,
      vy: 1200,
      damage: 35,
      radius: 18,
      pierce: 99,
      color: '#ffffff',
      glowColor: '#ffd700',
      type: 'death_ray'
    });
  }

  draw(ctx) {
    // 1. Draw Death Ray Warning or Beam
    if (this.deathRayState === 1) {
      // Telegraph warning
      ctx.save();
      const chargeRatio = 1 - (this.deathRayTimer / 1.8);
      ctx.fillStyle = `rgba(255, 215, 0, ${0.15 + chargeRatio * 0.25})`;
      ctx.fillRect(this.x - 30, this.y + 40, 60, 800);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2 + chargeRatio * 3;
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(this.x - 30, this.y + 40, 60, 800);
      ctx.restore();
    } else if (this.deathRayState === 2) {
      // Massive Beam Visual
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 35;
      ctx.shadowColor = '#ffd700';
      ctx.fillRect(this.x - 35, this.y + 40, 70, 800);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.bodyColor;
      ctx.strokeStyle = this.primaryColor;
    }

    ctx.shadowBlur = 24;
    ctx.shadowColor = this.glowColor;
    ctx.lineWidth = 3.2;

    // Colossal Mothership Hull
    ctx.beginPath();
    ctx.moveTo(0, 60); // Central Core Peak
    ctx.lineTo(45, 45);
    ctx.lineTo(110, 25);
    ctx.lineTo(140, -10);
    ctx.lineTo(125, -45);
    ctx.lineTo(60, -35);
    ctx.lineTo(0, -55);
    ctx.lineTo(-60, -35);
    ctx.lineTo(-125, -45);
    ctx.lineTo(-140, -10);
    ctx.lineTo(-110, 25);
    ctx.lineTo(-45, 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Alien Hieroglyphic Channels
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-90, 0);
    ctx.lineTo(-40, 20);
    ctx.lineTo(0, 30);
    ctx.lineTo(40, 20);
    ctx.lineTo(90, 0);
    ctx.stroke();

    // Singularity Core
    const corePulse = Math.sin(this.animTime * 5) * 4;
    ctx.fillStyle = this.phase === 3 ? '#ffffff' : '#ffd700';
    ctx.shadowBlur = 30;
    ctx.shadowColor = this.glowColor;
    ctx.beginPath();
    ctx.arc(0, 10, 22 + corePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ==========================================
// 8. ENEMY MANAGER
// ==========================================
class EnemyManager {
  constructor() {
    this.enemies = [];
    this.boss = null;
  }

  spawnScout(x, y) {
    const scout = new ScoutEnemy(x, y);
    this.enemies.push(scout);
    return scout;
  }

  spawnCruiser(x, y) {
    const cruiser = new CruiserEnemy(x, y);
    this.enemies.push(cruiser);
    return cruiser;
  }

  spawnLaserAssault(x, y) {
    const laser = new LaserAssaultEnemy(x, y);
    this.enemies.push(laser);
    return laser;
  }

  spawnKamikaze(x, y) {
    const kamikaze = new KamikazeEnemy(x, y);
    this.enemies.push(kamikaze);
    return kamikaze;
  }

  spawnBoss(stageNumber = 1) {
    let b = null;
    if (stageNumber === 1) b = new VoidVanguardBoss(300, -120);
    else if (stageNumber === 2) b = new ThunderTempestBoss(300, -140);
    else b = new MothershipOverlordBoss(300, -160);

    this.boss = b;
    return b;
  }

  /**
   * Clears screen / deals damage to all active enemies (used by EMP Bomb)
   */
  damageAll(amount, particleSystem, soundController) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e && e.isAlive) {
        e.takeDamage(amount, soundController, null, particleSystem);
      }
    }
    if (this.boss && this.boss.isAlive) {
      this.boss.takeDamage(amount, soundController, null, particleSystem);
    }
  }

  /**
   * Updates all active enemies & boss
   */
  update(dt, player, bulletManager, particleSystem, soundController, screenEffects, itemManager) {
    const canvasH = (typeof window !== 'undefined' && window.GAME_HEIGHT) ? window.GAME_HEIGHT : 800;

    // Update regular enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

      // Check death
      if (!e.isAlive) {
        e.onDeath(particleSystem, soundController, screenEffects, itemManager, player);
        this.enemies.splice(i, 1);
        continue;
      }

      // Check out of bounds (bottom)
      if (e.y > canvasH + 60) {
        this.enemies.splice(i, 1);
      }
    }

    // Update Boss
    if (this.boss) {
      this.boss.update(dt, player, bulletManager, particleSystem, soundController, screenEffects);

      if (!this.boss.isAlive) {
        this.boss.onDeath(particleSystem, soundController, screenEffects, itemManager, player);
        this.boss = null;
      }
    }
  }

  /**
   * Renders all active enemies, boss, telegraphs, and Boss HUD
   */
  draw(ctx) {
    // 1. Draw regular enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].draw(ctx);
    }

    // 2. Draw Boss
    if (this.boss && this.boss.isAlive) {
      this.boss.draw(ctx);
      this.drawBossHUD(ctx, this.boss);
    }
  }

  /**
   * Renders epic Boss Health Bar HUD at top of screen
   */
  drawBossHUD(ctx, boss) {
    const canvasW = (typeof window !== 'undefined' && window.GAME_WIDTH) ? window.GAME_WIDTH : (ctx.canvas ? ctx.canvas.width : 600);
    const barW = Math.min(480, canvasW - 80);
    const barH = 14;
    const barX = (canvasW - barW) / 2;
    const barY = 32;

    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    const trailingRatio = Math.max(0, boss.displayHp / boss.maxHp);

    ctx.save();

    // 1. Boss Name & Phase Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowBlur = 8;
    ctx.shadowColor = boss.glowColor;
    ctx.fillText(`⚡ WARNING: ${boss.name}`, barX, barY - 8);

    ctx.textAlign = 'right';
    ctx.fillStyle = boss.primaryColor;
    ctx.fillText(`PHASE ${boss.phase}/${boss.maxPhases}`, barX + barW, barY - 8);

    // 2. Health Bar Background Frame
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.strokeStyle = boss.primaryColor;
    ctx.lineWidth = 1.8;
    ctx.shadowBlur = 12;
    ctx.shadowColor = boss.glowColor;
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillRect(barX, barY, barW, barH);

    // 3. Trailing Damage Bar (White/Amber)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(barX, barY, barW * trailingRatio, barH);

    // 4. Active Health Bar Fill
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, boss.primaryColor);
    grad.addColorStop(1, boss.glowColor);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  /**
   * Clears all active enemies & boss
   */
  clear() {
    this.enemies = [];
    this.boss = null;
  }
}

// Attach to window object for global availability
if (typeof window !== 'undefined') {
  window.Enemy = Enemy;
  window.ScoutEnemy = ScoutEnemy;
  window.CruiserEnemy = CruiserEnemy;
  window.LaserAssaultEnemy = LaserAssaultEnemy;
  window.KamikazeEnemy = KamikazeEnemy;
  window.Boss = Boss;
  window.VoidVanguardBoss = VoidVanguardBoss;
  window.ThunderTempestBoss = ThunderTempestBoss;
  window.MothershipOverlordBoss = MothershipOverlordBoss;
  window.EnemyManager = EnemyManager;
}
