/**
 * Neon Sky Shooter - Core Game Engine
 * Coordinates subsystems, main loop, collision matrix, score/combo, and UI controller.
 */

class Game {
  constructor() {
    // Canvas & Context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // Virtual Internal Dimensions (Portrait Cyberpunk arcade aspect ratio)
    this.width = 720;
    this.height = 1080;
    if (typeof window !== 'undefined') {
      window.GAME_WIDTH = 720;
      window.GAME_HEIGHT = 1080;
    }
    this.dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;

    // Game States: 'MENU', 'PLAYING', 'PAUSED', 'STAGE_CLEAR', 'GAMEOVER', 'VICTORY'
    this.state = 'MENU';
    this.gameMode = 'CAMPAIGN'; // 'CAMPAIGN' or 'ENDLESS'

    // Timing & Engine
    this.lastTime = performance.now();
    this.timeScale = 1.0;
    this.slowMoTimer = 0;
    this.gameTime = 0;

    // Scoring, Record & Stats
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('neon_sky_shooter_highscore') || '0', 10);
    this.highestWave = parseInt(localStorage.getItem('neon_sky_shooter_highestwave') || '1', 10);
    this.enemiesKilled = 0;

    // Combo System
    this.combo = 0;
    this.maxCombo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.comboMaxDuration = 3.2;

    // Subsystems initialization
    this.initSubsystems();

    // Input Controller
    this.input = {
      keys: {},
      mouse: { x: this.width / 2, y: this.height * 0.8, isDown: false, isRightDown: false },
      touch: { active: false, x: this.width / 2, y: this.height * 0.8, lastX: 0, lastY: 0 },
      isFiring: true,
      bombRequested: false,
      left: false, right: false, up: false, down: false, fire: true, bomb: false
    };

    // Canvas scaling & resize handler
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Event bindings
    this.setupInputListeners();
    this.setupUIListeners();

    // Start Engine Loop
    requestAnimationFrame((timestamp) => this.mainLoop(timestamp));
  }

  /**
   * Subsystems Initialization
   */
  initSubsystems() {
    // Sound Controller
    this.soundController = window.soundController || window.soundManager;

    // Screen Effects & Screen Shake
    if (window.ScreenEffects) {
      this.screenEffects = new window.ScreenEffects();
    } else {
      this.screenEffects = {
        shake: () => {},
        flash: () => {},
        glitch: () => {},
        hitStop: () => {},
        isHitStopped: () => false,
        update: () => {},
        apply: () => {},
        restore: () => {},
        drawOverlays: () => {},
        reset: () => {}
      };
    }

    // Particle VFX System
    if (window.ParticleSystem) {
      this.particleSystem = new window.ParticleSystem();
    } else {
      this.particleSystem = {
        update: () => {},
        draw: () => {},
        createExplosion: () => {},
        createShockwave: () => {},
        createSparks: () => {},
        createFloatingText: () => {},
        clear: () => {}
      };
    }

    // Parallax Starfield Background
    if (window.Starfield) {
      this.starfield = new window.Starfield(this.canvas || this.width, this.height);
    } else {
      this.starfield = {
        update: () => {},
        draw: () => {},
        setWarp: () => {},
        triggerWarpBurst: () => {}
      };
    }

    // Bullet Manager
    if (window.BulletManager) {
      this.bulletManager = new window.BulletManager(this);
    } else {
      this.bulletManager = {
        playerBullets: [],
        enemyBullets: [],
        update: () => {},
        draw: () => {},
        clearEnemyBullets: () => 0,
        clear: () => {}
      };
    }

    // Item / Powerup Manager
    if (window.ItemManager) {
      this.itemManager = new window.ItemManager();
    } else {
      this.itemManager = {
        items: [],
        update: () => {},
        draw: () => {},
        spawn: () => {},
        randomDrop: () => {},
        clear: () => {}
      };
    }

    // Enemy Manager
    if (window.EnemyManager) {
      this.enemyManager = new window.EnemyManager();
    } else {
      this.enemyManager = {
        enemies: [],
        boss: null,
        update: () => {},
        draw: () => {},
        damageAll: () => {},
        clear: () => {}
      };
    }

    // Player Jet
    if (window.Player) {
      this.player = new window.Player(this.width / 2, this.height * 0.82);
    } else {
      this.player = {
        x: this.width / 2,
        y: this.height * 0.82,
        hp: 100, maxHp: 100,
        shield: 50, maxShield: 50,
        bombs: 2, maxBombs: 5,
        weaponLevel: 1, weaponMode: 'standard',
        drones: [],
        isAlive: true,
        update: () => {},
        draw: () => {},
        reset: () => {},
        takeDamage: () => {}
      };
    }

    // Level & Wave Manager
    if (window.LevelManager) {
      this.levelManager = new window.LevelManager(this);
    }

    // Aliases for convenience
    this.enemies = this.enemyManager.enemies;
    this.boss = this.enemyManager.boss;
  }

  /**
   * Adjust canvas resolution and layout
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const container = document.getElementById('game-container') || document.body;
    const rect = container.getBoundingClientRect();

    this.width = 720;
    this.height = 1080;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.resetTransform?.();
      this.ctx.scale(this.dpr, this.dpr);
      this.ctx.imageSmoothingEnabled = true;
    }

    if (this.bulletManager && typeof this.bulletManager.setBounds === 'function') {
      this.bulletManager.setBounds(this.width, this.height, 80);
    }
  }

  /**
   * Input Controllers
   */
  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      // Directions
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = true;

      // Space / KeyK for Bomb
      if ((e.code === 'Space' || e.code === 'KeyK') && this.state === 'PLAYING') {
        e.preventDefault();
        this.triggerPlayerBomb();
      }

      // Pause toggle
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
      }

      // Audio Mute toggle
      if (e.code === 'KeyM') {
        this.toggleAudioMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.input.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.input.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.input.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') this.input.down = false;
    });

    const getCanvasPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    window.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        const pos = getCanvasPos(e.clientX, e.clientY);
        this.input.mouse.x = pos.x;
        this.input.mouse.y = pos.y;
        if (this.player && this.player.isAlive) {
          this.player.targetX = pos.x;
          this.player.targetY = pos.y;
        }
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.mouse.isDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.input.mouse.isRightDown = true;
        if (this.state === 'PLAYING') this.triggerPlayerBomb();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.mouse.isDown = false;
      if (e.button === 2) this.input.mouse.isRightDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mobile Touch Drag
    if (this.canvas) {
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const pos = getCanvasPos(touch.clientX, touch.clientY);
          this.input.touch.active = true;
          this.input.touch.x = pos.x;
          this.input.touch.y = pos.y;
          this.input.touch.lastX = pos.x;
          this.input.touch.lastY = pos.y;

          if (this.player && this.player.isAlive) {
            this.player.targetX = pos.x;
            this.player.targetY = pos.y;
          }
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0 && this.state === 'PLAYING') {
          const touch = e.touches[0];
          const pos = getCanvasPos(touch.clientX, touch.clientY);

          const deltaX = pos.x - this.input.touch.lastX;
          const deltaY = pos.y - this.input.touch.lastY;

          if (this.player && this.player.isAlive) {
            this.player.x = Math.max(25, Math.min(this.width - 25, this.player.x + deltaX * 1.15));
            this.player.y = Math.max(40, Math.min(this.height - 40, this.player.y + deltaY * 1.15));
            this.player.targetX = this.player.x;
            this.player.targetY = this.player.y;
          }

          this.input.touch.lastX = pos.x;
          this.input.touch.lastY = pos.y;
          this.input.touch.x = pos.x;
          this.input.touch.y = pos.y;
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', () => {
        this.input.touch.active = false;
      }, { passive: true });
    }
  }

  /**
   * UI Modals & Buttons Binding
   */
  setupUIListeners() {
    const btnCampaign = document.getElementById('btn-start-campaign');
    if (btnCampaign) btnCampaign.addEventListener('click', () => this.startNewGame('CAMPAIGN'));

    const btnEndless = document.getElementById('btn-start-endless');
    if (btnEndless) btnEndless.addEventListener('click', () => this.startNewGame('ENDLESS'));

    const btnHowToPlay = document.getElementById('btn-how-to-play');
    const modalHowToPlay = document.getElementById('modal-how-to-play');
    const btnCloseHowToPlay = document.getElementById('btn-close-how-to-play');
    if (btnHowToPlay && modalHowToPlay) {
      btnHowToPlay.addEventListener('click', () => modalHowToPlay.classList.remove('hidden'));
    }
    if (btnCloseHowToPlay && modalHowToPlay) {
      btnCloseHowToPlay.addEventListener('click', () => modalHowToPlay.classList.add('hidden'));
    }

    const btnResume = document.getElementById('btn-resume');
    if (btnResume) btnResume.addEventListener('click', () => this.togglePause());

    const btnTouchPause = document.getElementById('btn-touch-pause');
    if (btnTouchPause) btnTouchPause.addEventListener('click', () => this.togglePause());

    const btnTouchBomb = document.getElementById('btn-touch-bomb');
    if (btnTouchBomb) {
      btnTouchBomb.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerPlayerBomb();
      });
      btnTouchBomb.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.triggerPlayerBomb();
      }, { passive: false });
    }

    const btnRestartPause = document.getElementById('btn-restart-pause');
    const btnRestartGameOver = document.getElementById('btn-restart-gameover');
    if (btnRestartPause) btnRestartPause.addEventListener('click', () => this.startNewGame(this.gameMode));
    if (btnRestartGameOver) btnRestartGameOver.addEventListener('click', () => this.startNewGame(this.gameMode));

    const btnMainMenuPause = document.getElementById('btn-main-menu-pause');
    const btnMainMenuGameOver = document.getElementById('btn-main-menu-gameover');
    const btnMainMenuVictory = document.getElementById('btn-main-menu-victory');
    const returnToMenu = () => this.showMenu();
    if (btnMainMenuPause) btnMainMenuPause.addEventListener('click', returnToMenu);
    if (btnMainMenuGameOver) btnMainMenuGameOver.addEventListener('click', returnToMenu);
    if (btnMainMenuVictory) btnMainMenuVictory.addEventListener('click', returnToMenu);

    const btnNextStage = document.getElementById('btn-next-stage');
    if (btnNextStage) {
      btnNextStage.addEventListener('click', () => {
        this.hideAllModals();
        this.state = 'PLAYING';
        if (this.levelManager) this.levelManager.nextStage();
      });
    }

    const btnAudioToggle = document.getElementById('btn-audio-toggle');
    const btnAudioPauseToggle = document.getElementById('btn-audio-pause-toggle');
    if (btnAudioToggle) btnAudioToggle.addEventListener('click', () => this.toggleAudioMute());
    if (btnAudioPauseToggle) btnAudioPauseToggle.addEventListener('click', () => this.toggleAudioMute());

    // GPU Quality Preset Toggle Button
    const btnQuality = document.getElementById('btn-toggle-gpu-quality');
    if (btnQuality) {
      btnQuality.addEventListener('click', () => {
        const gpu = window.gpuManager;
        if (gpu) {
          const current = gpu.qualityMode;
          const next = (current === 'ULTRA') ? 'HIGH' : (current === 'HIGH' ? 'ECO' : 'ULTRA');
          gpu.setQuality(next);
          this.updateGpuDisplay();
        }
      });
    }

    // GPU Setup Guide Modal Listeners
    const gpuBadge = document.getElementById('gpu-info-badge');
    const modalGpu = document.getElementById('modal-gpu-setup');
    const btnCloseGpu = document.getElementById('btn-close-gpu-setup');
    const btnCloseGpuBottom = document.getElementById('btn-close-gpu-bottom');
    const btnRefreshGpu = document.getElementById('btn-refresh-gpu');

    if (gpuBadge && modalGpu) {
      gpuBadge.addEventListener('click', () => {
        this.updateGpuDisplay();
        modalGpu.classList.remove('hidden');
      });
    }
    if (btnCloseGpu && modalGpu) {
      btnCloseGpu.addEventListener('click', () => modalGpu.classList.add('hidden'));
    }
    if (btnCloseGpuBottom && modalGpu) {
      btnCloseGpuBottom.addEventListener('click', () => modalGpu.classList.add('hidden'));
    }
    if (btnRefreshGpu) {
      btnRefreshGpu.addEventListener('click', () => {
        if (window.gpuManager) {
          window.gpuManager.init();
          this.updateGpuDisplay();
        }
      });
    }

    this.updateHighScoreDisplay();
    this.updateGpuDisplay();
  }

  /**
   * Update GPU hardware badge and quality mode label in the UI
   */
  updateGpuDisplay() {
    const gpu = window.gpuManager;
    if (!gpu) return;

    const gpuNameEl = document.getElementById('gpu-name-text');
    const gpuBadgeEl = document.getElementById('gpu-info-badge');
    const qualityLabelEl = document.getElementById('btn-quality-label');

    // Modal Inspector Elements
    const inspectorNameEl = document.getElementById('inspector-gpu-name');
    const inspectorTypeEl = document.getElementById('inspector-gpu-type');
    const inspectorApiEl = document.getElementById('inspector-gpu-api');

    const gpuName = gpu.getGpuDisplayName();
    const isDiscrete = gpu.gpuInfo.isDiscrete;
    const settings = gpu.getQualitySettings();

    if (gpuNameEl) {
      if (isDiscrete) {
        gpuNameEl.textContent = `🎮 独显加速: ${gpuName}`;
      } else {
        gpuNameEl.textContent = `⚡ 节能核显模式: ${gpuName}`;
      }
    }

    if (gpuBadgeEl) {
      gpuBadgeEl.classList.remove('discrete-gpu', 'integrated-gpu');
      if (isDiscrete) {
        gpuBadgeEl.classList.add('discrete-gpu');
        gpuBadgeEl.title = '已识别独立显卡，开启高性能硬件渲染与超清粒子光效 (点击查看设置)';
      } else {
        gpuBadgeEl.classList.add('integrated-gpu');
        gpuBadgeEl.title = '已识别集成显卡 (点击查看 Windows 独显强制开启指南)';
      }
    }

    if (qualityLabelEl) {
      qualityLabelEl.textContent = `⚡ 渲染画质: ${settings.label}`;
    }

    if (inspectorNameEl) {
      inspectorNameEl.textContent = gpuName;
    }

    if (inspectorTypeEl) {
      if (isDiscrete) {
        inspectorTypeEl.textContent = '🟢 独立显卡加速 (Discrete GPU)';
        inspectorTypeEl.className = 'inspector-val neon-green';
      } else {
        inspectorTypeEl.textContent = '🟡 集成核显驱动 (Integrated iGPU)';
        inspectorTypeEl.className = 'inspector-val neon-gold';
      }
    }

    if (inspectorApiEl) {
      const apiName = gpu.gpuInfo.webgpuActive ? 'WebGPU Direct3D 12 (高性能)' : `WebGL ${gpu.gpuInfo.webglVersion}.0 硬件加速`;
      inspectorApiEl.textContent = apiName;
    }
  }

  /**
   * Start a brand new game session
   */
  startNewGame(mode = 'CAMPAIGN') {
    this.gameMode = mode;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.enemiesKilled = 0;
    this.gameTime = 0;

    // Reset Managers
    if (this.bulletManager && typeof this.bulletManager.clear === 'function') this.bulletManager.clear();
    if (this.itemManager && typeof this.itemManager.clear === 'function') this.itemManager.clear();
    if (this.enemyManager && typeof this.enemyManager.clear === 'function') this.enemyManager.clear();
    if (this.particleSystem && typeof this.particleSystem.clear === 'function') this.particleSystem.clear();
    if (this.screenEffects && typeof this.screenEffects.reset === 'function') this.screenEffects.reset();

    if (this.player && typeof this.player.reset === 'function') {
      this.player.reset(this.width / 2, this.height * 0.82);
    }

    this.hideAllModals();
    this.state = 'PLAYING';

    if (this.levelManager) {
      if (mode === 'ENDLESS') {
        this.levelManager.startEndless();
      } else {
        this.levelManager.startCampaign();
      }
    }

    const sound = this.soundController || window.soundController || window.soundManager;
    if (sound && typeof sound.play === 'function') {
      sound.play('powerup', 0.5);
    }

    this.updateHUD();
  }

  /**
   * Return to Main Menu
   */
  showMenu() {
    this.state = 'MENU';
    this.hideAllModals();
    const startMenu = document.getElementById('start-menu');
    if (startMenu) startMenu.classList.remove('hidden');

    this.updateHighScoreDisplay();

    const sound = this.soundController || window.soundController || window.soundManager;
    if (sound) {
      if (typeof sound.playBGM === 'function') sound.playBGM('menu');
      else if (typeof sound.startBGM === 'function') sound.startBGM(1);
    }
  }

  /**
   * Toggle Pause
   */
  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      const pauseModal = document.getElementById('pause-menu');
      if (pauseModal) pauseModal.classList.remove('hidden');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      const pauseModal = document.getElementById('pause-menu');
      if (pauseModal) pauseModal.classList.add('hidden');
      this.lastTime = performance.now();
    }
  }

  /**
   * Toggle Audio Mute
   */
  toggleAudioMute() {
    const sound = this.soundController || window.soundController || window.soundManager;
    if (sound && typeof sound.toggleMute === 'function') {
      const isMuted = sound.toggleMute();
      const icons = document.querySelectorAll('.audio-icon');
      icons.forEach(icon => {
        icon.textContent = isMuted ? '🔇' : '🔊';
      });
    }
  }

  hideAllModals() {
    const modals = document.querySelectorAll('.game-modal');
    modals.forEach(m => m.classList.add('hidden'));
  }

  /**
   * Main Engine Loop
   */
  mainLoop(timestamp) {
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    // Slow motion handler
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      dt *= this.timeScale;
    } else {
      this.timeScale = 1.0;
    }

    // State based update
    if (this.state === 'PLAYING' || this.state === 'STAGE_CLEAR') {
      this.update(dt);
    } else if (this.state === 'MENU') {
      if (this.starfield) this.starfield.update(dt * 0.4);
    }

    // Render
    this.render();

    requestAnimationFrame((t) => this.mainLoop(t));
  }

  /**
   * Update all active entities and managers
   */
  update(dt) {
    this.gameTime += dt;

    // 1. Update Screen Effects
    if (this.screenEffects) this.screenEffects.update(dt);

    // 2. Update Starfield
    if (this.starfield) this.starfield.update(dt);

    // 3. Update Player Jet
    if (this.player && this.player.isAlive) {
      this.player.update(
        dt,
        this.input,
        this.bulletManager,
        this.particleSystem,
        this.soundController,
        this.enemyManager,
        this.screenEffects
      );
    }

    // 4. Update Enemy Manager
    if (this.enemyManager) {
      this.enemyManager.update(
        dt,
        this.player,
        this.bulletManager,
        this.particleSystem,
        this.soundController,
        this.screenEffects,
        this.itemManager
      );
    }

    // 5. Update Bullets & VFX
    if (this.bulletManager) {
      this.bulletManager.update(
        dt,
        this.player,
        this.enemyManager ? this.enemyManager.enemies : this.enemies,
        this.enemyManager ? this.enemyManager.boss : this.boss,
        this.particleSystem,
        this.screenEffects,
        this.soundController
      );
    }

    // 6. Update Items
    if (this.itemManager) {
      this.itemManager.update(dt, this.player, this.particleSystem, this.soundController);
    }

    // 7. Full Collision Detection Pipeline (Player bullets vs Enemies, Enemy bullets vs Player/Shield/Drones, Ramming)
    this.checkCollisions();

    // 8. Update Particle System
    if (this.particleSystem) {
      this.particleSystem.update(dt);
    }

    // 9. Update Level Progression
    if (this.levelManager) {
      this.levelManager.update(dt);
    }

    // 10. Update Combo Counter
    this.updateCombo(dt);

    // 11. Check Player Defeat
    if (this.player && !this.player.isAlive && this.state === 'PLAYING') {
      this.onPlayerDeath();
    }

    // Sync HUD Elements
    this.updateHUD();
  }

  /**
   * Complete Collision Detection Pipeline:
   * 1. Player bullets vs Enemies & Boss
   * 2. Enemy bullets vs Companion Drones
   * 3. Enemy bullets vs Player Jet (with shield absorption)
   * 4. Player Ship vs Enemies / Boss (Ramming collision)
   */
  checkCollisions() {
    if (this.state !== 'PLAYING') return;

    const enemies = (this.enemyManager && this.enemyManager.enemies) ? this.enemyManager.enemies : (this.enemies || []);
    const boss = (this.enemyManager && this.enemyManager.boss) ? this.enemyManager.boss : this.boss;
    const playerBullets = this.bulletManager ? this.bulletManager.playerBullets : [];
    const enemyBullets = this.bulletManager ? this.bulletManager.enemyBullets : [];
    const player = this.player;

    // Helper: Distance squared from point (px, py) to line segment (x1, y1) -> (x2, y2)
    const pointToSegmentDistSq = (px, py, x1, y1, x2, y2) => {
      const segDx = x2 - x1;
      const segDy = y2 - y1;
      const lenSq = segDx * segDx + segDy * segDy;
      if (lenSq === 0) {
        const ddx = px - x1;
        const ddy = py - y1;
        return ddx * ddx + ddy * ddy;
      }
      let t = ((px - x1) * segDx + (py - y1) * segDy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = x1 + t * segDx;
      const projY = y1 + t * segDy;
      const ddx = px - projX;
      const ddy = py - projY;
      return ddx * ddx + ddy * ddy;
    };

    // -------------------------------------------------------------
    // 1. Player Bullets vs Normal Enemies & Boss
    // -------------------------------------------------------------
    for (let i = playerBullets.length - 1; i >= 0; i--) {
      const b = playerBullets[i];
      if (!b || !b.active || b.dead) continue;
      const prevX = (typeof b.prevX === 'number') ? b.prevX : b.x;
      const prevY = (typeof b.prevY === 'number') ? b.prevY : b.y;

      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!e || !e.isAlive || e.y < -30) continue;

        // Piercing targets check
        if (b.piercedTargets && b.piercedTargets.has(e)) continue;

        const hitRadius = (b.radius || 5) + (e.radius || 18) + 10;
        const distSq = pointToSegmentDistSq(e.x, e.y, prevX, prevY, b.x, b.y);

        if (distSq < hitRadius * hitRadius) {
          // Bullet Hit!
          const dmg = b.damage || 20;
          const killed = e.takeDamage(dmg, this.soundController, this.screenEffects, this.particleSystem, player);

          // Sparks and sound
          if (this.particleSystem && typeof this.particleSystem.createSparks === 'function') {
            this.particleSystem.createSparks(b.x, b.y, b.glowColor || '#00ffff', 5);
          }
          if (this.soundController && typeof this.soundController.play === 'function') {
            this.soundController.play('hit', 0.25);
          }

          if (b.piercing > 0) {
            b.piercing--;
            if (b.piercedTargets) b.piercedTargets.add(e);
          } else {
            b.active = false;
            break; // Stop checking more enemies for this non-piercing bullet
          }

          if (killed) {
            this.incrementCombo();
            this.enemiesKilled++;
            const points = (e.scoreValue || 100) * this.comboMultiplier;
            this.addScore(points);
            if (this.itemManager && typeof this.itemManager.randomDrop === 'function') {
              this.itemManager.randomDrop(e.x, e.y, e.dropChance || 0.3, e.type, player);
            }
          }
        }
      }

      // Check bullet vs Boss
      if (b.active && !b.dead && boss && boss.isAlive && boss.y > -80) {
        if (!b.piercedTargets || !b.piercedTargets.has(boss)) {
          const bossHitRadius = (b.radius || 5) + (boss.radius || 45) + 16;
          const distSq = pointToSegmentDistSq(boss.x, boss.y, prevX, prevY, b.x, b.y);

          if (distSq < bossHitRadius * bossHitRadius) {
            const dmg = b.damage || 20;
            const killed = boss.takeDamage(dmg, this.soundController, this.screenEffects, this.particleSystem, player);

            if (this.particleSystem && typeof this.particleSystem.createSparks === 'function') {
              this.particleSystem.createSparks(b.x, b.y, '#ffffff', 6);
            }
            if (this.soundController && typeof this.soundController.play === 'function') {
              this.soundController.play('hit', 0.3);
            }

            if (b.piercing > 0) {
              b.piercing--;
              if (b.piercedTargets) b.piercedTargets.add(boss);
            } else {
              b.active = false;
            }

            if (killed) {
              this.incrementCombo();
              this.enemiesKilled++;
              const points = (boss.scoreValue || 5000) * this.comboMultiplier;
              this.addScore(points);
              if (this.itemManager && typeof this.itemManager.randomDrop === 'function') {
                this.itemManager.randomDrop(boss.x, boss.y, 1.0, 'boss', player);
              }
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Enemy Bullets vs Companion Drones
    // -------------------------------------------------------------
    if (player && player.isAlive && player.drones && player.drones.length > 0) {
      for (let i = 0; i < player.drones.length; i++) {
        const d = player.drones[i];
        if (!d) continue;
        for (let j = enemyBullets.length - 1; j >= 0; j--) {
          const b = enemyBullets[j];
          if (!b || !b.active || b.dead) continue;
          const dist = (b.radius || 4) + 14;
          const dx = b.x - d.x;
          const dy = b.y - d.y;
          if (dx * dx + dy * dy < dist * dist) {
            b.active = false;
            if (this.particleSystem && typeof this.particleSystem.createSparks === 'function') {
              this.particleSystem.createSparks(d.x, d.y, '#00ff88', 6);
            }
            if (this.soundController && typeof this.soundController.play === 'function') {
              this.soundController.play('shield_hit', 0.2);
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 3. Enemy Bullets vs Player Jet
    // -------------------------------------------------------------
    if (player && player.isAlive && player.invulnerableTimer <= 0) {
      const pRadius = (player.shieldActive && player.shield > 0) ? player.radius + 16 : player.radius;
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        if (!b || !b.active || b.dead) continue;
        const hitDist = (b.radius || 4) + pRadius;
        const dx = b.x - player.x;
        const dy = b.y - player.y;
        if (dx * dx + dy * dy < hitDist * hitDist) {
          b.active = false;
          player.takeDamage(b.damage || 15, this.soundController, this.screenEffects, this.particleSystem);
        }
      }
    }

    // -------------------------------------------------------------
    // 4. Player Ship vs Enemy Ships (Ramming Collision)
    // -------------------------------------------------------------
    if (player && player.isAlive && player.invulnerableTimer <= 0) {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e || !e.isAlive || e.y < -10) continue;
        const hitDist = player.radius + (e.radius || 18);
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        if (dx * dx + dy * dy < hitDist * hitDist) {
          e.takeDamage(150, this.soundController, this.screenEffects, this.particleSystem, player);
          player.takeDamage(20, this.soundController, this.screenEffects, this.particleSystem);
        }
      }

      if (boss && boss.isAlive && boss.y > -20) {
        const hitDist = player.radius + (boss.radius || 45);
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        if (dx * dx + dy * dy < hitDist * hitDist) {
          player.takeDamage(30, this.soundController, this.screenEffects, this.particleSystem);
        }
      }
    }
  }

  /**
   * Trigger EMP Bomb
   */
  triggerPlayerBomb() {
    if (!this.player || this.player.bombs <= 0 || !this.player.isAlive) return;

    this.player.bombs--;

    // Visual shockwaves & screen flash
    if (this.particleSystem && typeof this.particleSystem.createShockwave === 'function') {
      this.particleSystem.createShockwave(this.player.x, this.player.y, 900, '#ff007f');
    }
    if (this.screenEffects) {
      if (typeof this.screenEffects.flash === 'function') this.screenEffects.flash('#ff007f', 0.45);
      if (typeof this.screenEffects.shake === 'function') this.screenEffects.shake(25, 0.8);
    }

    // Slow motion pulse
    this.slowMoTimer = 0.5;
    this.timeScale = 0.3;

    // Clear all enemy bullets
    if (this.bulletManager && typeof this.bulletManager.clearEnemyBullets === 'function') {
      const cleared = this.bulletManager.clearEnemyBullets(true);
      if (cleared > 0) this.addScore(cleared * 60);
    }

    // Heavy damage to all active enemies
    if (this.enemyManager && typeof this.enemyManager.damageAll === 'function') {
      this.enemyManager.damageAll(900, this.particleSystem, this.soundController);
    }

    // Floating text
    if (this.particleSystem && typeof this.particleSystem.createFloatingText === 'function') {
      this.particleSystem.createFloatingText(this.player.x, this.player.y - 50, '💥 EMP DISRUPTION DETONATED!', '#ff007f');
    }

    const sound = this.soundController || window.soundController || window.soundManager;
    if (sound && typeof sound.play === 'function') {
      sound.play('bomb', 0.85);
    }
  }

  /**
   * Increment Combo Counter
   */
  incrementCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    this.comboMultiplier = Math.min(10, 1 + Math.floor(this.combo / 5));
    this.comboTimer = this.comboMaxDuration;

    if (this.combo % 5 === 0 && this.combo > 0 && this.particleSystem) {
      this.particleSystem.createFloatingText(this.width / 2, this.height * 0.38, `🔥 COMBO x${this.comboMultiplier}!`, '#ffd700');
    }
  }

  updateCombo(dt) {
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimer = 0;
      }
    }
  }

  /**
   * Score Tracking & High Score Persistence
   */
  addScore(pts) {
    this.score += pts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('neon_sky_shooter_highscore', this.highScore.toString());
    }
  }

  updateHighScoreDisplay() {
    const el = document.getElementById('menu-highscore');
    if (el) el.textContent = this.highScore.toLocaleString();
  }

  /**
   * Player Defeat
   */
  onPlayerDeath() {
    this.state = 'GAMEOVER';

    if (this.screenEffects && typeof this.screenEffects.shake === 'function') {
      this.screenEffects.shake(25, 1.2);
    }

    const sound = this.soundController || window.soundController || window.soundManager;
    if (sound && typeof sound.play === 'function') {
      sound.play('game_over', 0.9);
    }

    setTimeout(() => {
      this.showGameOverModal();
    }, 1600);
  }

  showGameOverModal() {
    this.hideAllModals();
    const modal = document.getElementById('gameover-menu');
    if (modal) {
      modal.classList.remove('hidden');

      const finalScoreEl = document.getElementById('go-final-score');
      const highScoreEl = document.getElementById('go-high-score');
      const killsEl = document.getElementById('go-kills');
      const maxComboEl = document.getElementById('go-max-combo');
      const newRecordBadge = document.getElementById('go-new-record-badge');

      const totalScore = (this.player && this.player.score) ? Math.max(this.score, this.player.score) : this.score;
      if (finalScoreEl) finalScoreEl.textContent = totalScore.toLocaleString();
      if (highScoreEl) highScoreEl.textContent = this.highScore.toLocaleString();
      if (killsEl) killsEl.textContent = this.enemiesKilled.toString();
      if (maxComboEl) maxComboEl.textContent = `x${this.maxCombo}`;

      if (newRecordBadge) {
        if (totalScore >= this.highScore && totalScore > 0) {
          newRecordBadge.classList.remove('hidden');
        } else {
          newRecordBadge.classList.add('hidden');
        }
      }
    }
  }

  /**
   * Stage Completed Callback
   */
  onStageCompleted(stageStats) {
    this.hideAllModals();

    const currentTotalScore = (this.player && this.player.score) ? Math.max(this.score, this.player.score) : this.score;

    if (stageStats.isCampaignVictory) {
      this.state = 'VICTORY';
      const victoryModal = document.getElementById('victory-menu');
      if (victoryModal) {
        victoryModal.classList.remove('hidden');
        const scoreEl = document.getElementById('victory-score');
        if (scoreEl) scoreEl.textContent = currentTotalScore.toLocaleString();
      }
    } else {
      this.state = 'STAGE_CLEAR';
      const stageModal = document.getElementById('stage-clear-menu');
      if (stageModal) {
        stageModal.classList.remove('hidden');
        const titleEl = document.getElementById('stage-clear-title');
        const scoreEl = document.getElementById('stage-clear-score');
        if (titleEl) titleEl.textContent = `STAGE ${stageStats.stage} CLEARED!`;
        if (scoreEl) scoreEl.textContent = currentTotalScore.toLocaleString();
      }
    }
  }

  /**
   * Synchronize DOM HUD elements with internal states
   */
  updateHUD() {
    const currentTotalScore = (this.player && this.player.score) ? Math.max(this.score, this.player.score) : this.score;
    const scoreEl = document.getElementById('hud-score');
    if (scoreEl) scoreEl.textContent = currentTotalScore.toLocaleString();

    const hiScoreEl = document.getElementById('hud-highscore');
    if (hiScoreEl) hiScoreEl.textContent = this.highScore.toLocaleString();

    // Stage / Wave
    if (this.levelManager) {
      const progress = this.levelManager.getHudProgress();
      const stageEl = document.getElementById('hud-stage-name');
      const waveEl = document.getElementById('hud-wave-count');
      if (stageEl) stageEl.textContent = progress.stageText;
      if (waveEl) waveEl.textContent = progress.waveText;
    }

    // Combo Meter
    const comboBar = document.getElementById('hud-combo-bar');
    const comboBadge = document.getElementById('hud-combo-badge');
    const comboContainer = document.getElementById('hud-combo-container');
    if (comboBar && comboBadge && comboContainer) {
      if (this.combo > 0) {
        comboContainer.classList.remove('opacity-0');
        const pct = (this.comboTimer / this.comboMaxDuration) * 100;
        comboBar.style.width = `${pct}%`;
        comboBadge.textContent = `x${this.comboMultiplier}`;
      } else {
        comboContainer.classList.add('opacity-0');
      }
    }

    // Player HP & Shield
    if (this.player) {
      const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
      const shieldPct = Math.max(0, (this.player.shield / this.player.maxShield) * 100);

      const hpBar = document.getElementById('hud-hp-bar');
      const hpText = document.getElementById('hud-hp-text');
      const shieldBar = document.getElementById('hud-shield-bar');
      const shieldText = document.getElementById('hud-shield-text');

      if (hpBar) hpBar.style.width = `${hpPct}%`;
      if (hpText) hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

      if (shieldBar) shieldBar.style.width = `${shieldPct}%`;
      if (shieldText) shieldText.textContent = `${Math.ceil(this.player.shield)} / ${this.player.maxShield}`;

      // Bombs Count
      const bombContainer = document.getElementById('hud-bomb-icons');
      if (bombContainer) {
        bombContainer.innerHTML = '';
        for (let i = 0; i < this.player.bombs; i++) {
          const icon = document.createElement('span');
          icon.className = 'bomb-icon-glow';
          icon.textContent = '💣';
          bombContainer.appendChild(icon);
        }
      }

      // Weapon Level Badge
      const weaponBadge = document.getElementById('hud-weapon-badge');
      if (weaponBadge) {
        const mode = (this.player.weaponMode || 'STANDARD').toUpperCase();
        weaponBadge.textContent = `LVL ${this.player.weaponLevel || 1} ${mode}`;
      }
    }

    // Boss HUD
    const boss = this.enemyManager ? this.enemyManager.boss : this.boss;
    const bossHud = document.getElementById('hud-boss-container');
    if (bossHud) {
      if (boss && boss.isAlive) {
        bossHud.classList.remove('hidden');
        const bossNameEl = document.getElementById('hud-boss-name');
        const bossBar = document.getElementById('hud-boss-hp-bar');
        const bossText = document.getElementById('hud-boss-hp-text');

        if (bossNameEl) bossNameEl.textContent = boss.name || 'ENEMY OVERLORD';
        const bossPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        if (bossBar) bossBar.style.width = `${bossPct}%`;
        if (bossText) bossText.textContent = `${Math.ceil(boss.hp)} / ${boss.maxHp}`;
      } else {
        bossHud.classList.add('hidden');
      }
    }
  }

  /**
   * Render Canvas Frame
   */
  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();

    // 1. Apply Screen Effects (e.g. Trauma Shake)
    if (this.screenEffects && typeof this.screenEffects.apply === 'function') {
      this.screenEffects.apply(ctx);
    }

    // 2. Clear Canvas
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Draw Starfield Background
    if (this.starfield && typeof this.starfield.draw === 'function') {
      this.starfield.draw(ctx);
    }

    // 4. Draw Items
    if (this.itemManager && typeof this.itemManager.draw === 'function') {
      this.itemManager.draw(ctx);
    }

    // 5. Draw Enemies & Boss
    if (this.enemyManager && typeof this.enemyManager.draw === 'function') {
      this.enemyManager.draw(ctx);
    }

    // 6. Draw Player
    if (this.player && this.player.isAlive && typeof this.player.draw === 'function') {
      this.player.draw(ctx);
    }

    // 7. Draw Bullets & Lasers
    if (this.bulletManager && typeof this.bulletManager.draw === 'function') {
      this.bulletManager.draw(ctx);
    }

    // 8. Draw Particle System & Shockwaves & Damage Text
    if (this.particleSystem && typeof this.particleSystem.draw === 'function') {
      this.particleSystem.draw(ctx);
    }

    // 9. Level Hazard / Warning overlays
    if (this.levelManager && typeof this.levelManager.draw === 'function') {
      this.levelManager.draw(ctx);
    }

    // 10. Draw Screen VFX Overlays (Flashes & Glitch)
    if (this.screenEffects && typeof this.screenEffects.drawOverlays === 'function') {
      this.screenEffects.drawOverlays(ctx, this.width, this.height);
      this.screenEffects.restore(ctx);
    }

    ctx.restore();
  }
}

// Global Export & Auto Instantiate
window.Game = Game;
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
