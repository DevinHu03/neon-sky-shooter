/**
 * Neon Sky Shooter - Items & Power-Up System
 * Floating neon hexagonal power-up badges with magnetic attraction, 
 * glowing halo oscillation, particle pickups, and diverse ability buffs.
 */

const ITEM_TYPES = {
  power: {
    type: 'power',
    letter: 'P',
    label: 'WEAPON UPGRADE',
    color: '#00f0ff',
    glowColor: '#00aaff',
    bgFill: 'rgba(0, 35, 55, 0.9)',
    apply: (player) => {
      player.upgradeWeapon();
      return '+WEAPON UP!';
    }
  },
  laser: {
    type: 'laser',
    letter: 'L',
    label: 'LASER BEAM',
    color: '#ff00aa',
    glowColor: '#ff0066',
    bgFill: 'rgba(55, 0, 35, 0.9)',
    apply: (player) => {
      player.setWeaponMode('laser', 15);
      return '+LASER MODE!';
    }
  },
  missile: {
    type: 'missile',
    letter: 'M',
    label: 'MISSILE SWARM',
    color: '#ff8800',
    glowColor: '#ffaa00',
    bgFill: 'rgba(55, 25, 0, 0.9)',
    apply: (player) => {
      player.setWeaponMode('missile', 15);
      return '+MISSILE SWARM!';
    }
  },
  drone: {
    type: 'drone',
    letter: 'D',
    label: 'COMPANION DRONE',
    color: '#00ff88',
    glowColor: '#00cc66',
    bgFill: 'rgba(0, 45, 25, 0.9)',
    apply: (player) => {
      const added = player.addDrone();
      return added ? '+DRONE ONLINE!' : '+SHIELD RESTORED!';
    }
  },
  shield: {
    type: 'shield',
    letter: 'S',
    label: 'PLASMA SHIELD',
    color: '#00c8ff',
    glowColor: '#0088ff',
    bgFill: 'rgba(0, 30, 65, 0.9)',
    apply: (player) => {
      player.activateShield();
      return '+SHIELD ACTIVE!';
    }
  },
  bomb: {
    type: 'bomb',
    letter: 'B',
    label: 'VOID BOMB',
    color: '#ffea00',
    glowColor: '#ff9900',
    bgFill: 'rgba(55, 50, 0, 0.9)',
    apply: (player) => {
      player.addBomb();
      return '+VOID BOMB +1!';
    }
  },
  heal: {
    type: 'heal',
    letter: 'H',
    label: 'REPAIR NANITES',
    color: '#22ff55',
    glowColor: '#11bb33',
    bgFill: 'rgba(10, 50, 15, 0.9)',
    apply: (player) => {
      player.heal(35);
      return '+REPAIR +35%!';
    }
  }
};

class PowerUpItem {
  /**
   * @param {number} x - Spawn X
   * @param {number} y - Spawn Y
   * @param {string} type - 'power' | 'laser' | 'missile' | 'drone' | 'shield' | 'bomb' | 'heal'
   */
  constructor(x, y, type = 'power') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = ITEM_TYPES[type] || ITEM_TYPES.power;

    // Movement physics
    this.vx = (Math.random() - 0.5) * 80;
    this.vy = -60 - Math.random() * 40; // Initial upward pop
    this.baseSpeed = 75; // Downward drift speed
    this.radius = 16; // Hitbox radius
    this.magnetRadius = 160; // Attraction distance
    this.isMagnetized = false;

    // Visual animations
    this.animTime = Math.random() * Math.PI * 2;
    this.rotation = 0;
    this.haloPulse = 0;
    this.lifeTime = 0;
    this.maxLifeTime = 16; // Auto despawn after 16s
    this.isCollected = false;
    this.isDead = false;
  }

  /**
   * Updates item physics, floating oscillation, and magnetic pull towards player
   */
  update(dt, player, particleSystem, soundController) {
    this.lifeTime += dt;
    this.animTime += dt * 3.5;
    this.haloPulse += dt * 5;
    this.rotation += dt * 1.8;

    if (this.lifeTime > this.maxLifeTime) {
      this.isDead = true;
      return;
    }

    if (!player || !player.isAlive) {
      // Natural floating downwards
      this.vy += 80 * dt;
      this.vy = Math.min(this.vy, this.baseSpeed);
      this.x += this.vx * dt + Math.sin(this.animTime) * 0.4;
      this.y += this.vy * dt;
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 1. Check Pickup Collision
    if (dist < (player.radius + this.radius + 6)) {
      this.collect(player, particleSystem, soundController);
      return;
    }

    // 2. Magnetic Attraction
    if (dist < this.magnetRadius) {
      this.isMagnetized = true;
      const pullFactor = 1 - (dist / this.magnetRadius);
      const pullSpeed = 380 + pullFactor * 450;
      this.vx = (dx / dist) * pullSpeed;
      this.vy = (dy / dist) * pullSpeed;
    } else {
      this.isMagnetized = false;
      // Gravity & gentle drift
      if (this.vy < this.baseSpeed) {
        this.vy += 120 * dt;
      } else {
        this.vy = this.baseSpeed;
      }
      this.vx *= Math.max(0, 1 - dt * 2);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary bounce
    const canvasW = (typeof window !== 'undefined' && window.GAME_WIDTH) ? window.GAME_WIDTH : (window.innerWidth || 600);
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx) * 0.8;
    } else if (this.x > canvasW - this.radius) {
      this.x = canvasW - this.radius;
      this.vx = -Math.abs(this.vx) * 0.8;
    }

    // Despawn off bottom screen
    const canvasH = (typeof window !== 'undefined' && window.GAME_HEIGHT) ? window.GAME_HEIGHT : (window.innerHeight || 800);
    if (this.y > canvasH + 40) {
      this.isDead = true;
    }
  }

  /**
   * Applies power-up effect to player and triggers celebration particles & audio
   */
  collect(player, particleSystem, soundController) {
    if (this.isCollected) return;
    this.isCollected = true;
    this.isDead = true;

    // Apply buff
    const floatingMsg = this.config.apply(player);

    // Particle Burst Effects
    if (particleSystem) {
      if (typeof particleSystem.createExplosion === 'function') {
        particleSystem.createExplosion(this.x, this.y, this.config.color, 16, 200);
      }
      if (typeof particleSystem.createSparks === 'function') {
        particleSystem.createSparks(this.x, this.y, '#ffffff', 10);
      }
      if (typeof particleSystem.createFloatingText === 'function') {
        particleSystem.createFloatingText(this.x, this.y - 20, floatingMsg, this.config.color);
      }
      if (typeof particleSystem.createShockwave === 'function') {
        particleSystem.createShockwave(this.x, this.y, 80, this.config.glowColor);
      }
    }

    // Audio Playback
    if (soundController && typeof soundController.play === 'function') {
      soundController.play('powerup', 0.55);
      if (this.type === 'bomb') soundController.play('bomb_pickup', 0.6);
      else if (this.type === 'shield') soundController.play('shield_up', 0.6);
    }
  }

  /**
   * Renders the glowing hexagonal badge with letter insignia and pulsating outer halo
   */
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Blinking when about to expire (< 3.5s remaining)
    if (this.lifeTime > this.maxLifeTime - 3.5) {
      const blink = Math.sin(this.lifeTime * 20);
      if (blink < -0.2) {
        ctx.restore();
        return;
      }
    }

    const { color, glowColor, bgFill, letter } = this.config;
    const pulse = Math.sin(this.haloPulse) * 3;
    const badgeRadius = 15;

    // 1. Outer Pulsating Neon Halo Ring
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = `rgba(${this.hexToRgb(color)}, ${0.35 + Math.sin(this.haloPulse) * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, badgeRadius + 5 + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Rotating Outer Geometric Ticks
    ctx.save();
    ctx.rotate(this.rotation);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const tx = Math.cos(a) * (badgeRadius + 4);
      const ty = Math.sin(a) * (badgeRadius + 4);
      ctx.beginPath();
      ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();

    // 3. Hexagonal Badge Body
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = bgFill;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const hx = Math.cos(a) * badgeRadius;
      const hy = Math.sin(a) * badgeRadius;
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 4. Center Letter Insignia
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffffff';
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 0, 0.5);

    ctx.restore();
  }

  /**
   * Helper to convert HEX colors to RGB string for alpha blending
   */
  hexToRgb(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }
}

class ItemManager {
  constructor() {
    this.items = [];
  }

  /**
   * Direct spawn of a specific power-up type
   */
  spawn(x, y, type) {
    const item = new PowerUpItem(x, y, type);
    this.items.push(item);
    return item;
  }

  /**
   * Smart weighted random item drop upon enemy defeat
   * @param {number} x - Drop X
   * @param {number} y - Drop Y
   * @param {number} chance - Base drop chance (0.0 to 1.0)
   * @param {string} enemyType - 'scout' | 'cruiser' | 'laser' | 'kamikaze' | 'boss'
   * @param {Player} player - Current player reference for adaptive drops
   */
  randomDrop(x, y, chance = 0.25, enemyType = 'scout', player = null) {
    if (Math.random() > chance) return null;

    // Drop pools with adaptive weights
    const weights = {
      power: 30,
      laser: 16,
      missile: 16,
      drone: 12,
      shield: 14,
      bomb: 8,
      heal: 10
    };

    // Adaptive weighting based on player situation
    if (player) {
      if (player.hp < 40) weights.heal += 25; // Emergency heal
      if (player.bombs === 0) weights.bomb += 15; // Low bombs
      if (player.drones.length === 0) weights.drone += 12; // Drone buff
      if (!player.shieldActive || player.shield <= 10) weights.shield += 16;
      if (player.weaponLevel < 3) weights.power += 20;
    }

    // Heavy enemies and bosses drop better loot
    if (enemyType === 'boss') {
      weights.power += 20;
      weights.bomb += 25;
      weights.shield += 25;
    }

    // Weighted selection
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
    let randomVal = Math.random() * totalWeight;

    let chosenType = 'power';
    for (const [type, weight] of entries) {
      if (randomVal < weight) {
        chosenType = type;
        break;
      }
      randomVal -= weight;
    }

    return this.spawn(x, y, chosenType);
  }

  /**
   * Updates all active power-up items
   */
  update(dt, player, particleSystem, soundController) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(dt, player, particleSystem, soundController);

      if (item.isDead) {
        this.items.splice(i, 1);
      }
    }
  }

  /**
   * Renders all active power-up items
   */
  draw(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].draw(ctx);
    }
  }

  /**
   * Clears all active power-ups
   */
  clear() {
    this.items = [];
  }
}

// Attach to window object for global availability
if (typeof window !== 'undefined') {
  window.PowerUpItem = PowerUpItem;
  window.ItemManager = ItemManager;
  window.ITEM_TYPES = ITEM_TYPES;
}
