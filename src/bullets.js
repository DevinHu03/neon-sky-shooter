/**
 * Neon Sky Shooter - Bullets, Particles & Screen VFX Engine
 * Contains Bullet, BulletManager, ParticleSystem, and ScreenEffects classes.
 */

// =============================================================================
// BULLET CLASS
// =============================================================================

class Bullet {
  /**
   * @param {Object} config - Bullet configuration
   */
  constructor(config = {}) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.prevX = this.x;
    this.prevY = this.y;

    this.radius = config.radius || 4;
    this.damage = config.damage || 10;
    this.color = config.color || '#00f3ff';
    this.glowColor = config.glowColor || config.color || '#00f3ff';
    this.isPlayer = config.isPlayer !== undefined ? config.isPlayer : (config.isPlayerBullet !== undefined ? config.isPlayerBullet : true);
    this.owner = config.owner || (this.isPlayer ? 'player' : 'enemy');

    // Bullet Type: 'laser', 'heavy', 'spread', 'missile', 'orb', 'beam', 'wave', 'drone_plasma', 'scatter'
    this.type = config.type || 'laser';
    this.isLaser = this.type === 'laser' || this.type === 'heavy' || config.isLaser || false;
    this.isMissile = this.type === 'missile' || config.isMissile || false;
    this.isOrb = this.type === 'orb' || config.isOrb || false;
    this.isBeam = this.type === 'beam' || config.isBeam || false;

    // Homing Missile attributes
    this.target = config.target || null;
    this.homingForce = config.homingForce || 900;
    this.speed = Math.hypot(this.vx, this.vy) || 500;
    this.missileEngineWarmup = 0.08;

    // Laser & Beam attributes
    this.length = config.length || (this.isLaser ? 24 : 12);
    this.width = config.width || (this.isLaser ? 5 : 8);
    this.angle = Math.atan2(this.vy, this.vx);

    // Active & Piercing state
    this.active = true;
    this.piercing = config.piercing !== undefined ? config.piercing : (config.pierce || 0); // Number of enemies it can pierce through
    this.piercedTargets = new Set();
    this.lifetime = config.lifetime || 5.0;
    this.maxLifetime = this.lifetime;

    // Trail history for smooth motion blur
    this.trail = [];
    this.maxTrailLength = this.isMissile ? 12 : (this.isLaser ? 6 : 4);
    this.smokeTimer = 0;

    // Wave / Sine motion
    this.isWave = config.isWave || false;
    this.waveAmp = config.waveAmp || 30;
    this.waveFreq = config.waveFreq || 14;
    this.waveTime = 0;
    this.baseAngle = Math.atan2(this.vy, this.vx);

    // Visual animation phase
    this.pulseTimer = Math.random() * Math.PI * 2;
    this.scale = config.scale || 1.0;
  }

  get dead() {
    return !this.active;
  }

  set dead(val) {
    this.active = !val;
  }

  /**
   * Update bullet movement, homing guidance, and trail history.
   * @param {number} dt 
   * @param {Array} potentialTargets - Array of enemies or player to home toward
   * @param {ParticleSystem} [particleSystem]
   */
  update(dt, potentialTargets = [], particleSystem = null) {
    if (!this.active) return false;

    this.prevX = this.x;
    this.prevY = this.y;
    this.pulseTimer += dt * 8;
    this.waveTime += dt;
    this.lifetime -= dt;

    if (this.lifetime <= 0) {
      this.active = false;
      return false;
    }

    // 1. Homing Missile Physics
    if (this.isMissile) {
      this.missileEngineWarmup -= dt;

      // Find or acquire nearest active target if current target is invalid
      if ((!this.target || this.target.dead || !this.target.active || this.target.isDead) && potentialTargets && potentialTargets.length > 0) {
        let closestDist = Infinity;
        let bestTarget = null;
        for (let i = 0; i < potentialTargets.length; i++) {
          const t = potentialTargets[i];
          if (!t || t.dead || t.active === false || t.isDead) continue;
          const d = Math.hypot(t.x - this.x, t.y - this.y);
          if (d < closestDist) {
            closestDist = d;
            bestTarget = t;
          }
        }
        this.target = bestTarget;
      }

      // Steer towards target
      if (this.target && !this.target.dead && !this.target.isDead && this.missileEngineWarmup <= 0) {
        const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        let currentAngle = Math.atan2(this.vy, this.vx);

        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurn = (this.homingForce * (Math.PI / 180)) * dt * 0.15;
        const turn = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        currentAngle += turn;

        // Accelerate missile
        this.speed = Math.min(850, this.speed + 400 * dt);
        this.vx = Math.cos(currentAngle) * this.speed;
        this.vy = Math.sin(currentAngle) * this.speed;
        this.angle = currentAngle;
      } else {
        this.angle = Math.atan2(this.vy, this.vx);
      }

      // Emit smoke puffs from engine
      if (particleSystem && typeof particleSystem.createSmokeTrail === 'function') {
        this.smokeTimer -= dt;
        if (this.smokeTimer <= 0) {
          const exhaustX = this.x - Math.cos(this.angle) * 12;
          const exhaustY = this.y - Math.sin(this.angle) * 12;
          particleSystem.createSmokeTrail(exhaustX, exhaustY, 'rgba(255, 140, 0, 0.75)', 4.5);
          this.smokeTimer = 0.035;
        }
      }
    } else if (this.isWave) {
      // Wave / Zigzag motion
      const perpAngle = this.baseAngle + Math.PI / 2;
      this.vx = Math.cos(this.baseAngle) * this.speed + Math.cos(perpAngle) * Math.cos(this.waveTime * this.waveFreq) * this.waveAmp * this.waveFreq;
      this.vy = Math.sin(this.baseAngle) * this.speed + Math.sin(perpAngle) * Math.cos(this.waveTime * this.waveFreq) * this.waveAmp * this.waveFreq;
      this.angle = Math.atan2(this.vy, this.vx);
    } else {
      this.angle = Math.atan2(this.vy, this.vx);
    }

    // Apply Velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Record trail positions
    this.trail.unshift({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1.0 - (i / this.trail.length);
    }

    return true;
  }

  /**
   * Render the bullet with vibrant neon glows and tailored shapes.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!this.active || !ctx) return;
    ctx.save();

    // 1. Draw Bullet Trail / Motion Blur
    if (this.trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < this.trail.length; i++) {
        const p1 = this.trail[i - 1];
        const p2 = this.trail[i];
        const alpha = p2.alpha * 0.45;
        const trailWidth = Math.max(1, (this.radius * 1.5) * (1.0 - i / this.trail.length));

        ctx.strokeStyle = this.glowColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = trailWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Specific Rendering per Bullet Type
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.isMissile) {
      this._drawMissile(ctx);
    } else if (this.type === 'heavy') {
      this._drawHeavyLaser(ctx);
    } else if (this.isLaser || this.type === 'spread' || this.type === 'drone_plasma') {
      this._drawLaserBolt(ctx);
    } else if (this.isOrb) {
      this._drawEnergyOrb(ctx);
    } else {
      this._drawDefaultBolt(ctx);
    }

    ctx.restore();
  }

  /**
   * Draw sci-fi missile with rocket fins and glowing thruster.
   */
  _drawMissile(ctx) {
    ctx.save();
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = 10;

    // Thruster engine flame
    const flameLen = 8 + Math.random() * 6;
    const flameGrad = ctx.createLinearGradient(0, 0, -flameLen, 0);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffcc00');
    flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-6, -2.5);
    ctx.lineTo(-6 - flameLen, 0);
    ctx.lineTo(-6, 2.5);
    ctx.closePath();
    ctx.fill();

    // Rocket Body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(10, 0);       // Nose cone
    ctx.lineTo(2, 3.5);
    ctx.lineTo(-6, 3.5);
    ctx.lineTo(-8, 6);       // Fin
    ctx.lineTo(-7, 2);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-8, -6);      // Fin
    ctx.lineTo(-6, -3.5);
    ctx.lineTo(2, -3.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon warhead glow
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(4, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw heavy energy piercing laser rod.
   */
  _drawHeavyLaser(ctx) {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 16;

    const len = this.length * 1.5;
    const w = this.width * 1.6;

    // Outer plasma sheath
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2, w / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Intense inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, (len / 2) * 0.7, (w / 2) * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw crisp glowing plasma laser bolt.
   */
  _drawLaserBolt(ctx) {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 10;

    const halfLen = this.length / 2;
    const halfWidth = this.radius;

    // Outer Neon Glow Capsule
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-halfLen, -halfWidth);
    ctx.lineTo(halfLen - halfWidth, -halfWidth);
    ctx.arc(halfLen - halfWidth, 0, halfWidth, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-halfLen, halfWidth);
    ctx.arc(-halfLen, 0, halfWidth, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    // Bright White Core
    ctx.fillStyle = '#ffffff';
    const coreWidth = halfWidth * 0.55;
    const coreLen = halfLen * 0.75;
    ctx.beginPath();
    ctx.ellipse(0, 0, coreLen, coreWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw pulsating enemy energy orb.
   */
  _drawEnergyOrb(ctx) {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 12;

    const pulse = 1.0 + Math.sin(this.pulseTimer) * 0.2;
    const r = this.radius * pulse;

    // Outer corona glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, 'rgba(255, 0, 100, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Solid core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Default circular glowing bolt.
   */
  _drawDefaultBolt(ctx) {
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 8;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// =============================================================================
// BULLET MANAGER CLASS
// =============================================================================

class BulletManager {
  /**
   * @param {Object} [game] - Optional game engine reference
   */
  constructor(game = null) {
    this.game = game;
    this.playerBullets = [];
    this.enemyBullets = [];
    this.bounds = { minX: -60, maxX: 1200, minY: -80, maxY: 1400 };
  }

  /**
   * Set screen bounds for bullet culling.
   */
  setBounds(w, h, margin = 60) {
    this.bounds = {
      minX: -margin,
      maxX: w + margin,
      minY: -margin,
      maxY: h + margin
    };
  }

  /**
   * Add bullet fired by player. Supports object config or positional args.
   * @param {Object|number} xOrConfig 
   * @param {number} [y] 
   * @param {number} [vx] 
   * @param {number} [vy] 
   * @param {string} [type='laser'] 
   * @param {number} [damage=10] 
   * @param {string} [color='#00f3ff'] 
   * @param {Object} [options={}] 
   * @returns {Bullet}
   */
  addPlayerBullet(xOrConfig, y, vx, vy, type = 'laser', damage = 10, color = '#00f3ff', options = {}) {
    let config = {};
    if (typeof xOrConfig === 'object' && xOrConfig !== null) {
      config = { ...xOrConfig };
      config.isPlayer = true;
    } else {
      config = {
        x: xOrConfig,
        y, vx, vy,
        type,
        damage,
        color,
        glowColor: options.glowColor || color,
        isPlayer: true,
        radius: options.radius || (type === 'heavy' ? 7 : (type === 'missile' ? 5 : 4)),
        piercing: options.piercing || 0,
        target: options.target || null,
        homingForce: options.homingForce || 900,
        lifetime: options.lifetime || 4.0,
        isWave: options.isWave || false,
        waveAmp: options.waveAmp || 25,
        waveFreq: options.waveFreq || 12,
        ...options
      };
    }

    const bullet = new Bullet(config);
    this.playerBullets.push(bullet);
    return bullet;
  }

  // Aliases for compatibility
  spawnPlayerBullet(config) {
    return this.addPlayerBullet(config);
  }

  add(config) {
    if (config && config.isPlayer === false) {
      return this.addEnemyBullet(config);
    }
    return this.addPlayerBullet(config);
  }

  spawn(config) {
    return this.add(config);
  }

  /**
   * Add projectile fired by enemy / boss.
   * @param {Object|number} xOrConfig 
   * @param {number} [y] 
   * @param {number} [vx] 
   * @param {number} [vy] 
   * @param {string} [type='orb'] 
   * @param {number} [damage=10] 
   * @param {string} [color='#ff3366'] 
   * @param {Object} [options={}] 
   * @returns {Bullet}
   */
  addEnemyBullet(xOrConfig, y, vx, vy, type = 'orb', damage = 10, color = '#ff3366', options = {}) {
    let config = {};
    if (typeof xOrConfig === 'object' && xOrConfig !== null) {
      config = { ...xOrConfig };
      config.isPlayer = false;
    } else {
      config = {
        x: xOrConfig,
        y, vx, vy,
        type,
        damage,
        color,
        glowColor: options.glowColor || color,
        isPlayer: false,
        radius: options.radius || 4.5,
        lifetime: options.lifetime || 6.0,
        target: options.target || null,
        ...options
      };
    }

    const bullet = new Bullet(config);
    this.enemyBullets.push(bullet);
    return bullet;
  }

  spawnEnemyBullet(config) {
    return this.addEnemyBullet(config);
  }

  /**
   * Create radial ring / starburst of bullets (Boss bullet hell attacks).
   */
  createRadialBurst(x, y, count = 12, speed = 220, type = 'orb', damage = 10, color = '#ff3366', options = {}) {
    const bullets = [];
    const baseOffset = options.startAngle || 0;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = baseOffset + i * step;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      bullets.push(this.addEnemyBullet(x, y, vx, vy, type, damage, color, options));
    }
    return bullets;
  }

  /**
   * Create spread cone of bullets.
   */
  createSpread(x, y, baseAngle, spreadAngle, count, speed, type, damage, color, options = {}, isPlayer = false) {
    const bullets = [];
    const startAngle = baseAngle - spreadAngle / 2;
    const step = count > 1 ? spreadAngle / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * step;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      if (isPlayer) {
        bullets.push(this.addPlayerBullet(x, y, vx, vy, type, damage, color, options));
      } else {
        bullets.push(this.addEnemyBullet(x, y, vx, vy, type, damage, color, options));
      }
    }
    return bullets;
  }

  /**
   * Update all active bullets, apply culling, and update trails.
   * Supports both `(dt, enemies, player, particleSystem)` and `(dt, width, height)`.
   * @param {number} dt 
   * @param {Array|number} [enemiesOrWidth] 
   * @param {Object|number} [playerOrHeight] 
   * @param {ParticleSystem} [particleSystem]
   */
  update(dt, enemiesOrWidth = [], playerOrHeight = null, particleSystem = null) {
    let enemies = [];
    let player = null;
    let particles = particleSystem;

    if (typeof enemiesOrWidth === 'number' && typeof playerOrHeight === 'number') {
      this.setBounds(enemiesOrWidth, playerOrHeight);
      enemies = this.game ? (this.game.enemies || []) : [];
      player = this.game ? this.game.player : null;
      particles = this.game ? (this.game.particleSystem || this.game) : null;
    } else {
      enemies = Array.isArray(enemiesOrWidth) ? enemiesOrWidth : (this.game ? this.game.enemies || [] : []);
      player = playerOrHeight || (this.game ? this.game.player : null);
      particles = particleSystem || (this.game ? this.game.particleSystem : null);
    }

    // 1. Update Player Bullets (homing missiles search for enemies)
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      const active = b.update(dt, enemies, particles);

      // Cull out of bounds or inactive
      if (!active || !b.active ||
          b.x < this.bounds.minX || b.x > this.bounds.maxX ||
          b.y < this.bounds.minY || b.y > this.bounds.maxY) {
        this.playerBullets.splice(i, 1);
      }
    }

    // 2. Update Enemy Bullets (homing missiles search for player)
    const playerTargetList = player && !player.isDead && !player.dead ? [player] : [];
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      const active = b.update(dt, playerTargetList, particles);

      if (!active || !b.active ||
          b.x < this.bounds.minX || b.x > this.bounds.maxX ||
          b.y < this.bounds.minY || b.y > this.bounds.maxY) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  /**
   * Draw all bullets with batch glow optimizations.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!ctx) return;

    // Draw Enemy Bullets
    for (let i = 0; i < this.enemyBullets.length; i++) {
      this.enemyBullets[i].draw(ctx);
    }

    // Draw Player Bullets
    for (let i = 0; i < this.playerBullets.length; i++) {
      this.playerBullets[i].draw(ctx);
    }
  }

  /**
   * Clear all enemy bullets and convert to sparks/score orbs (e.g. EMP Bomb or Boss Death).
   * @param {boolean} spawnSparks 
   * @param {ParticleSystem} [particleSystem] 
   * @returns {number} Number of bullets cleared
   */
  clearEnemyBullets(spawnSparks = true, particleSystem = null) {
    const count = this.enemyBullets.length;
    const ps = particleSystem || (this.game ? this.game.particleSystem : null);

    if (spawnSparks && ps && typeof ps.createSparks === 'function') {
      for (let i = 0; i < this.enemyBullets.length; i++) {
        const b = this.enemyBullets[i];
        ps.createSparks(b.x, b.y, '#00ffcc', 6, 80);
      }
    }
    this.enemyBullets = [];
    return count;
  }

  /**
   * Reset and remove all bullets.
   */
  reset() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }
}

// =============================================================================
// PARTICLE SYSTEM CLASS
// =============================================================================

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.shockwaves = [];
    this.damageTexts = [];
    this.maxParticles = 800;
  }

  /**
   * Trigger full multi-layered explosion blast.
   * @param {number} x 
   * @param {number} y 
   * @param {string} [color='#ff3366'] 
   * @param {number} [count=25] 
   * @param {number} [speed=180] 
   * @param {number} [size=4] 
   */
  createExplosion(x, y, color = '#ff3366', count = 25, speed = 180, size = 4) {
    // 1. Shockwave Ring
    this.createShockwave(x, y, 70 + count * 1.5, color, 0.45);

    // 2. High-speed Spark Embers
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.3 + Math.random() * 0.9);
      const life = 0.4 + Math.random() * 0.4;

      this._addParticle({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: size * (0.5 + Math.random() * 0.8),
        color: Math.random() > 0.3 ? color : '#ffffff',
        glowColor: color,
        life,
        maxLife: life,
        drag: 0.94,
        type: 'spark'
      });
    }

    // 3. Fiery Expanding Smoke Puffs
    const smokeCount = Math.floor(count * 0.4);
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * 0.25 * Math.random();
      const life = 0.5 + Math.random() * 0.35;

      this._addParticle({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: size * 1.5,
        maxRadius: size * 4.5,
        color: '#ffaa00',
        endColor: '#332222',
        life,
        maxLife: life,
        drag: 0.92,
        type: 'smoke'
      });
    }

    // 4. Debris / Shards
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.6 + Math.random() * 0.6);
      const life = 0.6 + Math.random() * 0.5;

      this._addParticle({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 15,
        size: 3 + Math.random() * 4,
        color,
        life,
        maxLife: life,
        drag: 0.96,
        type: 'shard'
      });
    }
  }

  // Alias
  spawnExplosion(x, y, color, count, speed, size) {
    this.createExplosion(x, y, color, count, speed, size);
  }

  /**
   * Fast sparks on projectile hit / shield deflection.
   */
  createSparks(x, y, color = '#00f3ff', count = 12, speed = 140) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      const life = 0.2 + Math.random() * 0.25;

      this._addParticle({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: 1.5 + Math.random() * 2.0,
        color: Math.random() > 0.2 ? color : '#ffffff',
        glowColor: color,
        life,
        maxLife: life,
        drag: 0.92,
        type: 'spark'
      });
    }
  }

  // Alias
  spawnHitSparks(x, y, color, count = 8) {
    this.createSparks(x, y, color, count);
  }

  /**
   * Expanding neon shockwave ring.
   */
  createShockwave(x, y, maxRadius = 80, color = '#00f3ff', duration = 0.4, lineWidth = 4) {
    this.shockwaves.push({
      x, y,
      radius: 4,
      maxRadius,
      color,
      lineWidth,
      duration,
      life: duration
    });
  }

  /**
   * Soft expanding smoke puff for missile wakes.
   */
  createSmokeTrail(x, y, color = 'rgba(255, 150, 50, 0.7)', size = 4.5) {
    this._addParticle({
      x, y,
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15 + 10,
      radius: size,
      maxRadius: size * 2.2,
      color,
      life: 0.25,
      maxLife: 0.25,
      drag: 0.95,
      type: 'smoke'
    });
  }

  /**
   * Sparkly aura fountain when picking up upgrades.
   */
  createPowerupAura(x, y, color = '#00ffcc') {
    this.createShockwave(x, y, 60, color, 0.35, 3);
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 100;
      const life = 0.4 + Math.random() * 0.3;

      this._addParticle({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 40,
        radius: 2 + Math.random() * 2,
        color,
        glowColor: color,
        life,
        maxLife: life,
        drag: 0.93,
        type: 'spark'
      });
    }
  }

  /**
   * Add floating arcade damage text indicator.
   */
  addDamageText(x, y, text, color = '#ffffff', isCrit = false) {
    this.damageTexts.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 8,
      text: isCrit ? `${text}!` : `${text}`,
      color: isCrit ? '#ffd700' : color,
      isCrit,
      scale: isCrit ? 1.5 : 1.1,
      alpha: 1.0,
      vy: isCrit ? -75 : -55,
      life: 0.65,
      maxLife: 0.65
    });
  }

  // Aliases for floating texts
  createFloatingText(x, y, text, color = '#ffffff', isCrit = false) {
    this.addDamageText(x, y, text, color, isCrit);
  }

  spawnFloatingText(text, x, y, color, isCrit = false) {
    this.addDamageText(x, y, text, color, isCrit);
  }

  /**
   * Internal helper to insert particle and respect cap.
   */
  _addParticle(p) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  /**
   * Update particle kinematics, alpha fades, and text float.
   * @param {number} dt 
   */
  update(dt) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.drag) {
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
      }

      if (p.rotation !== undefined && p.rotSpeed) {
        p.rotation += p.rotSpeed * dt;
      }
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1.0 - (sw.life / sw.duration);
      sw.radius = sw.maxRadius * Math.sin((progress * Math.PI) / 2);
    }

    // 3. Update Damage Texts
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.life -= dt;
      if (dtObj.life <= 0) {
        this.damageTexts.splice(i, 1);
        continue;
      }
      dtObj.y += dtObj.vy * dt;
      dtObj.alpha = Math.min(1.0, (dtObj.life / dtObj.maxLife) * 1.5);
    }
  }

  /**
   * Render all particles, shockwaves, and floating numbers.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!ctx) return;
    ctx.save();

    // 1. Draw Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const alpha = (sw.life / sw.duration);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = sw.color;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 10;
      ctx.lineWidth = Math.max(1, sw.lineWidth * alpha);
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Particles (Optimized batch rendering for dGPU/iGPU)
    const gpuSettings = (typeof window !== 'undefined' && window.gpuManager) ? window.gpuManager.getQualitySettings() : { enableComplexGlow: true, shadowBlurFactor: 1.0 };
    const useGlow = gpuSettings.enableComplexGlow;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.type === 'spark') {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (useGlow) {
          ctx.shadowColor = p.glowColor || p.color;
          ctx.shadowBlur = 6 * gpuSettings.shadowBlurFactor;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.radius * alpha), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        const progress = 1.0 - alpha;
        const currentRadius = p.radius + (p.maxRadius - p.radius) * progress;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shard') {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (useGlow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 4 * gpuSettings.shadowBlurFactor;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size / 2);
        ctx.lineTo(p.size, -p.size / 2);
        ctx.lineTo(0, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // 3. Draw Damage Numbers
    for (let i = 0; i < this.damageTexts.length; i++) {
      const dtObj = this.damageTexts[i];
      ctx.save();
      ctx.globalAlpha = dtObj.alpha;
      ctx.font = `900 ${Math.floor(14 * dtObj.scale)}px 'Segoe UI', 'Impact', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow / Shadow outline
      ctx.shadowColor = dtObj.isCrit ? '#ffd700' : '#000000';
      ctx.shadowBlur = dtObj.isCrit ? 10 : 4;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(dtObj.text, dtObj.x, dtObj.y);

      ctx.fillStyle = dtObj.color;
      ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Clear all active particles.
   */
  reset() {
    this.particles = [];
    this.shockwaves = [];
    this.damageTexts = [];
  }
}

// =============================================================================
// SCREEN EFFECTS CLASS
// =============================================================================

class ScreenEffects {
  constructor() {
    // Screen Shake
    this.trauma = 0.0;
    this.maxShakeOffset = 18;
    this.offsetX = 0;
    this.offsetY = 0;

    // Screen Flash
    this.flashColor = '#ffffff';
    this.flashAlpha = 0.0;
    this.flashDuration = 0.15;
    this.flashTimer = 0.0;

    // Hit-stop / Frame freeze
    this.hitStopTimer = 0.0;

    // Glitch scanline effect
    this.glitchIntensity = 0.0;
    this.glitchTimer = 0.0;
  }

  /**
   * Trigger screen vibration.
   * @param {number} intensity - Amplitude in pixels (e.g. 5-20)
   * @param {number} duration - Duration in seconds (e.g. 0.2-0.5)
   */
  shake(intensity = 10, duration = 0.3) {
    this.trauma = Math.min(1.0, this.trauma + (intensity / this.maxShakeOffset));
    this.shakeDuration = duration;
  }

  /**
   * Fullscreen flash (for hits, bombs, boss deaths).
   * @param {string} color 
   * @param {number} duration 
   * @param {number} maxAlpha 
   */
  flash(color = '#ffffff', duration = 0.15, maxAlpha = 0.6) {
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashTimer = duration;
    this.flashAlpha = maxAlpha;
  }

  /**
   * Freeze-frame micro pause on big hits.
   * @param {number} [durationSeconds=0.05] 
   */
  hitStop(durationSeconds = 0.05) {
    this.hitStopTimer = Math.max(this.hitStopTimer, durationSeconds);
  }

  /**
   * Cyberpunk chromatic glitch effect.
   * @param {number} intensity 
   * @param {number} duration 
   */
  glitch(intensity = 0.5, duration = 0.2) {
    this.glitchIntensity = intensity;
    this.glitchTimer = duration;
  }

  /**
   * Check if currently in hitStop frame freeze.
   */
  isHitStopped() {
    return this.hitStopTimer > 0;
  }

  /**
   * Update effect timers and compute shake offset.
   * @param {number} dt 
   */
  update(dt) {
    // 1. Hit-stop countdown
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
    }

    // 2. Shake decay & offset calculation
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
      const shakeAmount = Math.pow(this.trauma, 2) * this.maxShakeOffset;
      const angle = Math.random() * Math.PI * 2;
      this.offsetX = Math.cos(angle) * shakeAmount;
      this.offsetY = Math.sin(angle) * shakeAmount;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    // 3. Flash fadeout
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.flashAlpha = Math.max(0, (this.flashTimer / this.flashDuration) * 0.6);
    } else {
      this.flashAlpha = 0.0;
    }

    // 4. Glitch decay
    if (this.glitchTimer > 0) {
      this.glitchTimer -= dt;
      if (this.glitchTimer <= 0) {
        this.glitchIntensity = 0.0;
      }
    }
  }

  /**
   * Pre-render canvas transform offset (shake).
   * @param {CanvasRenderingContext2D} ctx 
   */
  apply(ctx) {
    if (!ctx) return;
    ctx.save();
    if (this.offsetX !== 0 || this.offsetY !== 0) {
      ctx.translate(Math.round(this.offsetX), Math.round(this.offsetY));
    }
  }

  /**
   * Post-render canvas restore.
   * @param {CanvasRenderingContext2D} ctx 
   */
  restore(ctx) {
    if (!ctx) return;
    ctx.restore();
  }

  /**
   * Render screen flash and glitch overlays.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} width 
   * @param {number} height 
   */
  drawOverlays(ctx, width, height) {
    if (!ctx) return;

    // 1. Flash Overlay
    if (this.flashAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2. Glitch Scanlines & Slice Offset
    if (this.glitchIntensity > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const slices = 5;
      for (let i = 0; i < slices; i++) {
        const sliceY = Math.random() * height;
        const sliceH = 8 + Math.random() * 25;
        const shiftX = (Math.random() - 0.5) * 30 * this.glitchIntensity;

        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 0, 128, 0.15)';
        ctx.fillRect(shiftX, sliceY, width, sliceH);
      }
      ctx.restore();
    }
  }

  /**
   * Reset all screen effects.
   */
  reset() {
    this.trauma = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.flashAlpha = 0;
    this.flashTimer = 0;
    this.hitStopTimer = 0;
    this.glitchIntensity = 0;
    this.glitchTimer = 0;
  }
}

// Attach all classes to window
if (typeof window !== 'undefined') {
  window.Bullet = Bullet;
  window.BulletManager = BulletManager;
  window.ParticleSystem = ParticleSystem;
  window.ScreenEffects = ScreenEffects;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Bullet, BulletManager, ParticleSystem, ScreenEffects };
}
