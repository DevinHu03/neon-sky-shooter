/**
 * Neon Sky Shooter - Parallax Starfield, Nebulae & Warp FX Engine
 * Features multi-layer parallax stars, procedural drifting nebulae clouds,
 * glowing space dust, shooting stars, and hyper-speed warp streak animations.
 */

class Starfield {
  /**
   * @param {HTMLCanvasElement|number} widthOrCanvas - Canvas element or width
   * @param {number} [height] - Canvas height
   */
  constructor(widthOrCanvas = 800, height = 900) {
    if (typeof widthOrCanvas === 'object' && widthOrCanvas !== null) {
      this.canvas = widthOrCanvas;
      this.width = widthOrCanvas.width || 800;
      this.height = widthOrCanvas.height || 900;
    } else {
      this.canvas = null;
      this.width = widthOrCanvas || 800;
      this.height = height || 900;
    }

    // Star layers
    this.layer1 = []; // Distant dim stars (slow)
    this.layer2 = []; // Mid-speed bright stars (moderate)
    this.layer3 = []; // Fast neon streak stars (foreground)

    // Cosmic atmospheric elements
    this.nebulae = [];
    this.dustParticles = [];
    this.shootingStars = [];
    this.shootingStarTimer = 0;

    // Warp & Speed FX state
    this.warpFactor = 0.0;       // 0.0 = normal, 1.0 = max warp
    this.targetWarp = 0.0;
    this.warpTimer = 0.0;
    this.warpDuration = 0.0;
    this.baseSpeed = 1.0;

    // Color palettes
    this.starColors = [
      '#ffffff', // Pure white
      '#e0f7ff', // Soft cyan
      '#00f3ff', // Neon cyan
      '#ffe0f0', // Soft pink
      '#ff007f', // Neon magenta
      '#ffd700', // Electric gold
      '#b388ff'  // Radiant violet
    ];

    this.init();
  }

  /**
   * Initialize all star layers and cosmic objects.
   */
  init() {
    this.layer1 = [];
    this.layer2 = [];
    this.layer3 = [];
    this.dustParticles = [];
    this.nebulae = [];

    // 1. Distant Dim Stars (Layer 1: ~140 stars)
    const multiplier = (typeof window !== 'undefined' && window.gpuManager) ? window.gpuManager.getQualitySettings().starCountMultiplier : 1.0;
    const count1 = Math.floor(((this.width * this.height) / 5000) * multiplier);
    for (let i = 0; i < count1; i++) {
      this.layer1.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.6 + Math.random() * 0.8,
        speed: 20 + Math.random() * 15,
        alpha: 0.2 + Math.random() * 0.5,
        twinkleSpeed: 1.0 + Math.random() * 2.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: this.starColors[Math.floor(Math.random() * this.starColors.length)]
      });
    }

    // 2. Mid-Speed Bright Stars (Layer 2: ~75 stars)
    const count2 = Math.floor((this.width * this.height) / 9500);
    for (let i = 0; i < count2; i++) {
      this.layer2.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1.4 + Math.random() * 1.0,
        speed: 55 + Math.random() * 30,
        alpha: 0.5 + Math.random() * 0.4,
        twinkleSpeed: 2.0 + Math.random() * 3.0,
        twinklePhase: Math.random() * Math.PI * 2,
        color: this.starColors[Math.floor(Math.random() * this.starColors.length)],
        hasGlow: Math.random() > 0.4
      });
    }

    // 3. Fast Foreground Neon Streak Stars (Layer 3: ~30 stars)
    const count3 = Math.floor((this.width * this.height) / 22000);
    for (let i = 0; i < count3; i++) {
      this.layer3.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2.0 + Math.random() * 1.5,
        speed: 130 + Math.random() * 60,
        alpha: 0.7 + Math.random() * 0.3,
        color: this.starColors[Math.floor(Math.random() * this.starColors.length)],
        trailLength: 6 + Math.random() * 12
      });
    }

    // 4. Space Dust Motes (~35 glowing particles)
    for (let i = 0; i < 35; i++) {
      this.dustParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.0 + Math.random() * 2.0,
        speedY: 15 + Math.random() * 20,
        driftSpeedX: (Math.random() - 0.5) * 8,
        swayPhase: Math.random() * Math.PI * 2,
        swayFreq: 0.8 + Math.random() * 1.2,
        alpha: 0.15 + Math.random() * 0.25,
        color: Math.random() > 0.5 ? '#00f3ff' : '#ff00aa'
      });
    }

    // 5. Procedural Nebulae Clouds (4 large drifting gas clouds)
    const nebulaColors = [
      { r: 0, g: 243, b: 255, alpha: 0.07 },   // Cyan
      { r: 138, g: 43, b: 226, alpha: 0.08 },  // Deep Purple
      { r: 255, g: 0, b: 128, alpha: 0.06 },   // Magenta
      { r: 0, g: 110, b: 255, alpha: 0.08 }    // Electric Blue
    ];

    for (let i = 0; i < nebulaColors.length; i++) {
      this.nebulae.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 220 + Math.random() * 180,
        speedY: 8 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 4,
        pulseSpeed: 0.4 + Math.random() * 0.4,
        pulsePhase: Math.random() * Math.PI * 2,
        color: nebulaColors[i]
      });
    }
  }

  /**
   * Handle canvas resize.
   * @param {number} w 
   * @param {number} h 
   */
  resize(w, h) {
    this.width = w;
    this.height = h;
    this.init();
  }

  /**
   * Activate or deactivate warp speed effect.
   * @param {boolean} active 
   * @param {number} [duration] - Duration in seconds (auto-resets if > 0)
   */
  setWarp(active, duration = 0) {
    this.targetWarp = active ? 1.0 : 0.0;
    if (duration > 0) {
      this.warpDuration = duration;
      this.warpTimer = duration;
    }
  }

  /**
   * Trigger temporary hyperdrive warp rush (e.g. stage transition, bomb).
   * @param {number} duration 
   */
  triggerHyperdrive(duration = 2.0) {
    this.setWarp(true, duration);
  }

  /**
   * Spawn a dramatic diagonal shooting star across space.
   */
  addShootingStar() {
    const startX = Math.random() * this.width * 0.9;
    const startY = Math.random() * (this.height * 0.3);
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3; // ~45 deg downward
    const speed = 650 + Math.random() * 400;

    this.shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 60 + Math.random() * 80,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 0.6 + Math.random() * 0.4,
      color: Math.random() > 0.4 ? '#00f3ff' : '#ffd700'
    });
  }

  /**
   * Update all star positions and warp interpolations.
   * @param {number} dt - Delta time in seconds
   * @param {number} [speedBoost=1.0] - Multiplier from player thrusters or game speed
   */
  update(dt, speedBoost = 1.0) {
    // Dynamic sync canvas dimensions if canvas reference exists
    if (this.canvas && (this.width !== this.canvas.width || this.height !== this.canvas.height)) {
      this.width = this.canvas.width;
      this.height = this.canvas.height;
    }

    // Warp timer countdown
    if (this.warpTimer > 0) {
      this.warpTimer -= dt;
      if (this.warpTimer <= 0) {
        this.targetWarp = 0.0;
      }
    }

    // Smooth warp factor interpolation
    const lerpSpeed = this.targetWarp > this.warpFactor ? 3.5 : 2.0;
    this.warpFactor += (this.targetWarp - this.warpFactor) * Math.min(1.0, dt * lerpSpeed);

    // Calculate effective speed multiplier (scales up to 10x during warp)
    const effectiveSpeedMult = (this.baseSpeed + (speedBoost - 1.0) * 0.5) * (1.0 + this.warpFactor * 9.0);

    // 1. Update Layer 1 (Distant Stars)
    for (let i = 0; i < this.layer1.length; i++) {
      const s = this.layer1[i];
      s.y += s.speed * effectiveSpeedMult * dt;
      s.twinklePhase += s.twinkleSpeed * dt;
      if (s.y > this.height) {
        s.y = -s.size;
        s.x = Math.random() * this.width;
      }
    }

    // 2. Update Layer 2 (Mid Stars)
    for (let i = 0; i < this.layer2.length; i++) {
      const s = this.layer2[i];
      s.y += s.speed * effectiveSpeedMult * dt;
      s.twinklePhase += s.twinkleSpeed * dt;
      if (s.y > this.height) {
        s.y = -s.size;
        s.x = Math.random() * this.width;
      }
    }

    // 3. Update Layer 3 (Foreground Streak Stars)
    for (let i = 0; i < this.layer3.length; i++) {
      const s = this.layer3[i];
      s.y += s.speed * effectiveSpeedMult * dt;
      if (s.y > this.height + 50) {
        s.y = -20;
        s.x = Math.random() * this.width;
      }
    }

    // 4. Update Space Dust
    for (let i = 0; i < this.dustParticles.length; i++) {
      const d = this.dustParticles[i];
      d.swayPhase += d.swayFreq * dt;
      d.x += (Math.sin(d.swayPhase) * 12 + d.driftSpeedX) * dt;
      d.y += d.speedY * effectiveSpeedMult * 0.6 * dt;

      if (d.y > this.height + 10) {
        d.y = -10;
        d.x = Math.random() * this.width;
      }
      if (d.x < -20) d.x = this.width + 20;
      if (d.x > this.width + 20) d.x = -20;
    }

    // 5. Update Nebulae
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      n.pulsePhase += n.pulseSpeed * dt;
      n.y += n.speedY * (1.0 + this.warpFactor * 2.0) * dt;
      n.x += n.speedX * dt;

      if (n.y - n.radius > this.height) {
        n.y = -n.radius;
        n.x = Math.random() * this.width;
      }
      if (n.x + n.radius < 0) n.x = this.width + n.radius;
      if (n.x - n.radius > this.width) n.x = -n.radius;
    }

    // 6. Shooting Stars update & random spawning
    this.shootingStarTimer -= dt;
    if (this.shootingStarTimer <= 0 && this.warpFactor < 0.2) {
      if (Math.random() < 0.7) {
        this.addShootingStar();
      }
      this.shootingStarTimer = 3.5 + Math.random() * 5.0;
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      ss.life -= dt;
      if (ss.life <= 0 || ss.x > this.width + 100 || ss.y > this.height + 100) {
        this.shootingStars.splice(i, 1);
      }
    }
  }

  /**
   * Render the complete cosmic background to canvas.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!ctx) return;
    ctx.save();

    // Deep space background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#04020c');
    bgGrad.addColorStop(0.5, '#070518');
    bgGrad.addColorStop(1, '#020108');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Draw Nebulae Clouds (Screen blend mode for vibrant glow)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < this.nebulae.length; i++) {
      const n = this.nebulae[i];
      const pulse = 1.0 + Math.sin(n.pulsePhase) * 0.15;
      const currentRadius = n.radius * pulse * (1.0 + this.warpFactor * 0.3);
      const currentAlpha = n.color.alpha * (1.0 + this.warpFactor * 0.5);

      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, currentRadius);
      grad.addColorStop(0, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${currentAlpha})`);
      grad.addColorStop(0.4, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${currentAlpha * 0.5})`);
      grad.addColorStop(1, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Draw Distant Stars (Layer 1)
    for (let i = 0; i < this.layer1.length; i++) {
      const s = this.layer1[i];
      const twinkle = 0.7 + Math.sin(s.twinklePhase) * 0.3;
      const alpha = s.alpha * twinkle;

      if (this.warpFactor > 0.05) {
        // Warp streak
        const streakLen = 4 + this.warpFactor * 25;
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.min(1.0, alpha + this.warpFactor * 0.3);
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y - streakLen);
        ctx.stroke();
      } else {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
    }

    // 3. Draw Mid-Speed Stars (Layer 2)
    for (let i = 0; i < this.layer2.length; i++) {
      const s = this.layer2[i];
      const twinkle = 0.8 + Math.sin(s.twinklePhase) * 0.2;
      const alpha = Math.min(1.0, s.alpha * twinkle);

      if (this.warpFactor > 0.05) {
        const streakLen = 12 + this.warpFactor * 80;
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = Math.min(1.0, alpha + this.warpFactor * 0.4);
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y - streakLen);
        ctx.stroke();
      } else {
        ctx.globalAlpha = alpha;

        // Subtle glow halo for bright stars
        if (s.hasGlow) {
          ctx.save();
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 4. Draw Space Dust
    if (this.warpFactor < 0.6) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.dustParticles.length; i++) {
        const d = this.dustParticles[i];
        const dustAlpha = d.alpha * (1.0 - this.warpFactor * 1.5);
        if (dustAlpha <= 0) continue;

        ctx.globalAlpha = dustAlpha;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Draw Fast Foreground Streak Stars (Layer 3)
    for (let i = 0; i < this.layer3.length; i++) {
      const s = this.layer3[i];
      const warpMult = 1.0 + this.warpFactor * 10.0;
      const length = (s.trailLength + 8) * warpMult;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8 + this.warpFactor * 10;

      // Draw glowing streak line with gradient
      const grad = ctx.createLinearGradient(s.x, s.y, s.x, s.y - length);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, s.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = s.size + (this.warpFactor * 1.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y - length);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Shooting Stars
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.shootingStars.length; i++) {
      const ss = this.shootingStars[i];
      const progress = ss.life / ss.maxLife;
      const alpha = Math.sin(progress * Math.PI);

      const angle = Math.atan2(ss.vy, ss.vx);
      const tailX = ss.x - Math.cos(angle) * ss.length;
      const tailY = ss.y - Math.sin(angle) * ss.length;

      const grad = ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, ss.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = ss.color;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Full Warp Hyper-Tunnel Overlay
    if (this.warpFactor > 0.15) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = this.warpFactor * 0.45;

      const centerX = this.width / 2;
      const centerY = this.height / 2;
      const maxDim = Math.max(this.width, this.height);

      const tunnelGrad = ctx.createRadialGradient(
        centerX, centerY, 50,
        centerX, centerY, maxDim * 0.7
      );
      tunnelGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
      tunnelGrad.addColorStop(0.7, 'rgba(0, 243, 255, 0.15)');
      tunnelGrad.addColorStop(1, 'rgba(255, 0, 128, 0.25)');

      ctx.fillStyle = tunnelGrad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    ctx.restore();
  }
}

// Attach to window
if (typeof window !== 'undefined') {
  window.Starfield = Starfield;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Starfield };
}
