/**
 * Neon Sky Shooter - Level & Wave Management System
 * Handles Campaign Stages (1-3), Boss warnings, and infinite scaling Endless Mode.
 */

class LevelManager {
  constructor(game) {
    this.game = game;

    // Stage progression
    this.currentStage = 1;
    this.currentWave = 1;
    this.maxCampaignStages = 3;
    this.isEndless = false;
    this.endlessWave = 1;

    // State machine: 'IDLE', 'ANNOUNCING_STAGE', 'ANNOUNCING_WAVE', 'SPAWNING', 'IN_PROGRESS', 'BOSS_WARNING', 'BOSS_FIGHT', 'STAGE_CLEAR'
    this.state = 'IDLE';

    // Timers & Delays
    this.stateTimer = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveDelay = 2.2; // delay between waves
    this.waveClearTimer = 0;

    // Boss Warning system
    this.bossWarningDuration = 3.5;
    this.bossWarningTimer = 0;
    this.pendingBossType = null;

    // Announcement display
    this.announcement = {
      active: false,
      title: '',
      subtitle: '',
      color: '#00f3ff',
      timer: 0,
      duration: 3.0
    };

    // Stage Definitions
    this.stageConfigs = {
      1: {
        name: '小行星与前哨哨站',
        codeName: 'ASTEROID OUTPOST',
        themeColor: '#00f3ff',
        totalWaves: 4, // 4 regular waves + 1 Boss encounter
        description: '敌方前哨基地，侦察机与先锋巡洋舰拦截',
        bossType: 'VoidVanguardBoss',
        bossName: 'VOID VANGUARD · 虚空先锋',
        waves: [
          // Wave 1: Intro Scouts
          {
            delay: 1.0,
            spawns: [
              { type: 'ScoutEnemy', count: 6, interval: 0.6, pattern: 'V_FORMATION', startDelay: 0.5 },
              { type: 'ScoutEnemy', count: 4, interval: 0.5, pattern: 'SWARM_LEFT', startDelay: 3.0 }
            ]
          },
          // Wave 2: Scout wings + Cruisers
          {
            delay: 1.5,
            spawns: [
              { type: 'ScoutEnemy', count: 8, interval: 0.5, pattern: 'SWARM_RIGHT', startDelay: 0.5 },
              { type: 'CruiserEnemy', count: 2, interval: 1.5, pattern: 'DUAL_COLUMN', startDelay: 2.5 }
            ]
          },
          // Wave 3: Heavy Cruiser support + Rapid Scouts
          {
            delay: 1.5,
            spawns: [
              { type: 'ScoutEnemy', count: 10, interval: 0.4, pattern: 'CROSS_SWEEP', startDelay: 0.5 },
              { type: 'CruiserEnemy', count: 3, interval: 1.2, pattern: 'TRI_SPREAD', startDelay: 3.0 }
            ]
          },
          // Wave 4: Mini-boss Vanguard Escort
          {
            delay: 1.5,
            spawns: [
              { type: 'CruiserEnemy', count: 3, interval: 1.0, pattern: 'TRI_SPREAD', startDelay: 0.5 },
              { type: 'ScoutEnemy', count: 10, interval: 0.35, pattern: 'SWARM_LEFT', startDelay: 2.5 },
              { type: 'ScoutEnemy', count: 8, interval: 0.35, pattern: 'SWARM_RIGHT', startDelay: 4.5 }
            ]
          }
        ]
      },

      2: {
        name: '赛博先锋舰队',
        codeName: 'CYBER FLEET VANGUARD',
        themeColor: '#bd00ff',
        totalWaves: 4,
        description: '高能激光突击战舰与自爆无人机集群',
        bossType: 'ThunderTempestBoss',
        bossName: 'THUNDER TEMPEST · 雷霆风暴',
        waves: [
          // Wave 1: Fast Laser Assault introduction
          {
            delay: 1.0,
            spawns: [
              { type: 'LaserAssaultEnemy', count: 3, interval: 1.0, pattern: 'HORIZONTAL_LINE', startDelay: 0.5 },
              { type: 'ScoutEnemy', count: 8, interval: 0.4, pattern: 'V_FORMATION', startDelay: 2.5 }
            ]
          },
          // Wave 2: Kamikaze Swarm + Cruiser artillery
          {
            delay: 1.5,
            spawns: [
              { type: 'KamikazeEnemy', count: 8, interval: 0.35, pattern: 'DIVE_SWARM', startDelay: 0.5 },
              { type: 'CruiserEnemy', count: 3, interval: 1.0, pattern: 'TRI_SPREAD', startDelay: 2.5 }
            ]
          },
          // Wave 3: Laser Assault + Kamikaze mix
          {
            delay: 1.5,
            spawns: [
              { type: 'LaserAssaultEnemy', count: 4, interval: 0.8, pattern: 'CROSS_SWEEP', startDelay: 0.5 },
              { type: 'KamikazeEnemy', count: 8, interval: 0.35, pattern: 'DIVE_SWARM', startDelay: 2.0 },
              { type: 'CruiserEnemy', count: 2, interval: 1.2, pattern: 'DUAL_COLUMN', startDelay: 3.5 }
            ]
          },
          // Wave 4: Dual Cruisers + heavy assault
          {
            delay: 1.5,
            spawns: [
              { type: 'CruiserEnemy', count: 3, interval: 1.2, pattern: 'TRI_SPREAD', startDelay: 0.5 },
              { type: 'LaserAssaultEnemy', count: 3, interval: 1.0, pattern: 'HORIZONTAL_LINE', startDelay: 2.0 },
              { type: 'KamikazeEnemy', count: 10, interval: 0.3, pattern: 'DIVE_SWARM', startDelay: 4.0 }
            ]
          }
        ]
      },

      3: {
        name: '星际霸主母舰',
        codeName: 'MOTHERSHIP OVERLORD',
        themeColor: '#ff0055',
        totalWaves: 4,
        description: '决战核心！全域弹幕与终极主力母舰',
        bossType: 'MothershipOverlordBoss',
        bossName: 'MOTHERSHIP OVERLORD · 星际霸主',
        waves: [
          // Wave 1: Full spectrum assault
          {
            delay: 1.0,
            spawns: [
              { type: 'LaserAssaultEnemy', count: 4, interval: 0.7, pattern: 'CROSS_SWEEP', startDelay: 0.5 },
              { type: 'ScoutEnemy', count: 12, interval: 0.3, pattern: 'V_FORMATION', startDelay: 2.0 },
              { type: 'KamikazeEnemy', count: 6, interval: 0.4, pattern: 'DIVE_SWARM', startDelay: 4.0 }
            ]
          },
          // Wave 2: Heavy armada
          {
            delay: 1.5,
            spawns: [
              { type: 'CruiserEnemy', count: 4, interval: 0.8, pattern: 'TRI_SPREAD', startDelay: 0.5 },
              { type: 'LaserAssaultEnemy', count: 4, interval: 0.8, pattern: 'HORIZONTAL_LINE', startDelay: 2.5 },
              { type: 'KamikazeEnemy', count: 8, interval: 0.3, pattern: 'DIVE_SWARM', startDelay: 4.0 }
            ]
          },
          // Wave 3: Double Battle fleet
          {
            delay: 1.5,
            spawns: [
              { type: 'CruiserEnemy', count: 3, interval: 1.2, pattern: 'TRI_SPREAD', startDelay: 0.5 },
              { type: 'KamikazeEnemy', count: 12, interval: 0.25, pattern: 'DIVE_SWARM', startDelay: 2.5 },
              { type: 'ScoutEnemy', count: 10, interval: 0.3, pattern: 'CROSS_SWEEP', startDelay: 4.5 }
            ]
          },
          // Wave 4: Ultimate vanguard armada
          {
            delay: 1.5,
            spawns: [
              { type: 'CruiserEnemy', count: 4, interval: 1.0, pattern: 'TRI_SPREAD', startDelay: 0.5 },
              { type: 'LaserAssaultEnemy', count: 5, interval: 0.6, pattern: 'CROSS_SWEEP', startDelay: 2.0 },
              { type: 'KamikazeEnemy', count: 12, interval: 0.25, pattern: 'DIVE_SWARM', startDelay: 4.0 }
            ]
          }
        ]
      }
    };
  }

  /**
   * Start Campaign mode at Stage 1
   */
  startCampaign() {
    this.isEndless = false;
    this.currentStage = 1;
    this.currentWave = 1;
    this.initStage(this.currentStage);
  }

  /**
   * Start Endless mode
   */
  startEndless() {
    this.isEndless = true;
    this.endlessWave = 1;
    this.currentStage = 'ENDLESS';
    this.currentWave = 1;
    this.initEndlessWave(1);
  }

  /**
   * Initialize a Campaign stage
   */
  initStage(stageNumber) {
    this.currentStage = stageNumber;
    this.currentWave = 1;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveClearTimer = 0;
    this.state = 'ANNOUNCING_STAGE';
    this.stateTimer = 0;

    const config = this.stageConfigs[stageNumber];
    if (!config) return;

    // Change Starfield palette / warp
    if (this.game.starfield && typeof this.game.starfield.setWarp === 'function') {
      this.game.starfield.setWarp(0.0);
    }

    // Play Stage BGM
    const sound = this.game.soundController || window.soundController || window.soundManager;
    if (sound) {
      if (typeof sound.playBGM === 'function') {
        sound.playBGM(`stage${stageNumber}`);
      } else if (typeof sound.startBGM === 'function') {
        sound.startBGM(stageNumber);
      }
    }

    this.showAnnouncement(
      `STAGE ${stageNumber}`,
      `${config.name} · ${config.codeName}`,
      config.themeColor,
      3.2
    );
  }

  /**
   * Prepare an endless wave with procedural difficulty
   */
  initEndlessWave(waveNum) {
    this.endlessWave = waveNum;
    this.currentWave = waveNum;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveClearTimer = 0;

    const isBossWave = (waveNum % 5 === 0);

    if (isBossWave) {
      this.state = 'BOSS_WARNING';
      this.bossWarningTimer = 0;
      const bossTypes = ['VoidVanguardBoss', 'ThunderTempestBoss', 'MothershipOverlordBoss'];
      const index = Math.floor((waveNum / 5 - 1) % bossTypes.length);
      this.pendingBossType = bossTypes[index];

      const sound = this.game.soundController || window.soundController || window.soundManager;
      if (sound && typeof sound.play === 'function') {
        sound.play('boss_warning', 0.8);
      }

      this.showAnnouncement(
        `ENDLESS WAVE ${waveNum}`,
        `WARNING · BOSS ENCOUNTER INCOMING`,
        '#ff0055',
        3.0
      );
    } else {
      this.state = 'ANNOUNCING_WAVE';
      this.stateTimer = 0;

      this.showAnnouncement(
        `WAVE ${waveNum}`,
        `ENDLESS VOID · 难度系数 x${(1 + (waveNum - 1) * 0.15).toFixed(2)}`,
        '#00f3ff',
        2.0
      );

      this.buildEndlessWaveQueue(waveNum);
    }
  }

  /**
   * Procedural enemy generator for Endless mode
   */
  buildEndlessWaveQueue(waveNum) {
    this.spawnQueue = [];
    const scale = 1 + (waveNum - 1) * 0.15;
    const enemyTotal = Math.min(45, Math.floor(10 + waveNum * 2.5));

    let timeOffset = 1.0;
    const types = ['ScoutEnemy', 'CruiserEnemy', 'LaserAssaultEnemy', 'KamikazeEnemy'];

    let remaining = enemyTotal;
    while (remaining > 0) {
      const burstCount = Math.min(remaining, Math.floor(3 + Math.random() * 5));
      const chosenType = types[Math.floor(Math.random() * types.length)];
      const patterns = ['V_FORMATION', 'SWARM_LEFT', 'SWARM_RIGHT', 'CROSS_SWEEP', 'DUAL_COLUMN', 'DIVE_SWARM'];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      this.queueSpawnGroup({
        type: chosenType,
        count: burstCount,
        interval: 0.35 + Math.random() * 0.25,
        pattern: pattern,
        startDelay: timeOffset,
        statMultiplier: scale
      });

      timeOffset += burstCount * 0.4 + (1.2 + Math.random() * 1.5);
      remaining -= burstCount;
    }
  }

  /**
   * Start a regular wave in Campaign mode
   */
  startCampaignWave(waveNumber) {
    this.currentWave = waveNumber;
    const config = this.stageConfigs[this.currentStage];
    if (!config) return;

    if (waveNumber > config.totalWaves) {
      // Trigger Boss Phase!
      this.state = 'BOSS_WARNING';
      this.bossWarningTimer = 0;
      this.pendingBossType = config.bossType;

      const sound = this.game.soundController || window.soundController || window.soundManager;
      if (sound && typeof sound.play === 'function') {
        sound.play('boss_warning', 0.8);
      }

      this.showAnnouncement(
        'WARNING!',
        `BOSS APPROACHING: ${config.bossName}`,
        '#ff0055',
        3.5
      );
      return;
    }

    this.state = 'ANNOUNCING_WAVE';
    this.stateTimer = 0;

    this.showAnnouncement(
      `WAVE ${waveNumber} / ${config.totalWaves}`,
      `${config.name}`,
      config.themeColor,
      2.0
    );

    const waveData = config.waves[waveNumber - 1];
    this.spawnQueue = [];
    this.spawnTimer = 0;

    if (waveData && waveData.spawns) {
      waveData.spawns.forEach(spawnDef => {
        this.queueSpawnGroup(spawnDef);
      });
    }
  }

  /**
   * Convert spawn definition into individual queue items
   */
  queueSpawnGroup(spawnDef) {
    const { type, count, interval, pattern, startDelay, statMultiplier } = spawnDef;
    const canvasWidth = (this.game.canvas ? this.game.canvas.width : 720);

    for (let i = 0; i < count; i++) {
      const spawnTime = (startDelay || 0) + i * (interval || 0.5);
      const coords = this.calculatePatternCoordinates(pattern || 'RANDOM', i, count, canvasWidth);

      this.spawnQueue.push({
        type: type,
        time: spawnTime,
        x: coords.x,
        y: coords.y,
        statMultiplier: statMultiplier || 1.0,
        spawned: false
      });
    }

    this.spawnQueue.sort((a, b) => a.time - b.time);
  }

  /**
   * Pattern coordinates calculator
   */
  calculatePatternCoordinates(pattern, index, total, canvasWidth) {
    const margin = 70;
    const usableWidth = canvasWidth - margin * 2;
    let x = margin + Math.random() * usableWidth;
    let y = -50 - (index * 25);

    switch (pattern) {
      case 'V_FORMATION': {
        const mid = Math.floor(total / 2);
        const offset = Math.abs(index - mid);
        x = canvasWidth / 2 + (index - mid) * 65;
        y = -50 - offset * 45;
        break;
      }
      case 'SWARM_LEFT': {
        x = margin + (index / Math.max(1, total - 1)) * (usableWidth * 0.45);
        y = -40 - index * 30;
        break;
      }
      case 'SWARM_RIGHT': {
        x = canvasWidth - margin - (index / Math.max(1, total - 1)) * (usableWidth * 0.45);
        y = -40 - index * 30;
        break;
      }
      case 'CROSS_SWEEP': {
        const fromLeft = (index % 2 === 0);
        x = fromLeft ? -40 : canvasWidth + 40;
        y = 50 + index * 40;
        break;
      }
      case 'DUAL_COLUMN': {
        const isRight = (index % 2 === 1);
        x = isRight ? canvasWidth * 0.75 : canvasWidth * 0.25;
        y = -60 - Math.floor(index / 2) * 80;
        break;
      }
      case 'TRI_SPREAD': {
        const lane = index % 3;
        x = canvasWidth * 0.2 + lane * (canvasWidth * 0.3);
        y = -60 - Math.floor(index / 3) * 75;
        break;
      }
      case 'DIVE_SWARM': {
        x = margin + Math.random() * usableWidth;
        y = -60 - index * 35;
        break;
      }
      case 'HORIZONTAL_LINE': {
        x = margin + (index / Math.max(1, total - 1)) * usableWidth;
        y = -60;
        break;
      }
      case 'RANDOM':
      default: {
        x = margin + Math.random() * usableWidth;
        y = -50 - Math.random() * 80;
        break;
      }
    }

    return { x, y };
  }

  /**
   * Main Level update loop
   */
  update(dt) {
    if (this.announcement.active) {
      this.announcement.timer += dt;
      if (this.announcement.timer >= this.announcement.duration) {
        this.announcement.active = false;
      }
    }

    switch (this.state) {
      case 'ANNOUNCING_STAGE': {
        this.stateTimer += dt;
        if (this.stateTimer >= 2.5) {
          this.startCampaignWave(1);
        }
        break;
      }

      case 'ANNOUNCING_WAVE': {
        this.stateTimer += dt;
        if (this.stateTimer >= 1.5) {
          this.state = 'IN_PROGRESS';
          this.spawnTimer = 0;
        }
        break;
      }

      case 'IN_PROGRESS': {
        this.spawnTimer += dt;

        for (let i = 0; i < this.spawnQueue.length; i++) {
          const item = this.spawnQueue[i];
          if (!item.spawned && this.spawnTimer >= item.time) {
            this.spawnEnemy(item);
            item.spawned = true;
          }
        }

        const allSpawned = this.spawnQueue.every(item => item.spawned);
        const enemiesList = this.game.enemyManager ? this.game.enemyManager.enemies : (this.game.enemies || []);
        const noActiveEnemies = (enemiesList.length === 0);

        if (allSpawned && noActiveEnemies) {
          this.waveClearTimer += dt;
          if (this.waveClearTimer >= this.waveDelay) {
            this.onWaveCleared();
          }
        } else {
          this.waveClearTimer = 0;
        }
        break;
      }

      case 'BOSS_WARNING': {
        this.bossWarningTimer += dt;

        if (this.game.screenEffects && typeof this.game.screenEffects.shake === 'function') {
          this.game.screenEffects.shake(8, 0.2);
        }

        if (this.bossWarningTimer >= this.bossWarningDuration) {
          this.spawnBoss();
        }
        break;
      }

      case 'BOSS_FIGHT': {
        const boss = this.game.enemyManager ? this.game.enemyManager.boss : this.game.boss;
        if (!boss || !boss.isAlive) {
          this.onBossDefeated();
        }
        break;
      }

      case 'STAGE_CLEAR': {
        break;
      }
    }
  }

  /**
   * Spawn enemy instance
   */
  spawnEnemy(item) {
    if (!this.game) return;
    const { type, x, y, statMultiplier } = item;

    let enemyInstance = null;
    if (window[type] && typeof window[type] === 'function') {
      enemyInstance = new window[type](x, y);
      if (statMultiplier && statMultiplier > 1.0) {
        enemyInstance.hp = Math.round(enemyInstance.hp * statMultiplier);
        enemyInstance.maxHp = enemyInstance.hp;
      }
    }

    if (enemyInstance) {
      if (this.game.enemyManager && this.game.enemyManager.enemies) {
        this.game.enemyManager.enemies.push(enemyInstance);
      } else if (this.game.enemies) {
        this.game.enemies.push(enemyInstance);
      }
    }
  }

  /**
   * Spawn Boss
   */
  spawnBoss() {
    this.state = 'BOSS_FIGHT';
    const bossType = this.pendingBossType || 'VoidVanguardBoss';
    const canvasWidth = this.game.canvas ? this.game.canvas.width : 720;
    const startX = canvasWidth / 2;
    const startY = -140;

    let bossInstance = null;
    if (window[bossType] && typeof window[bossType] === 'function') {
      bossInstance = new window[bossType](startX, startY);
      if (this.isEndless) {
        const scale = 1.0 + (this.endlessWave - 1) * 0.2;
        bossInstance.hp = Math.round(bossInstance.hp * scale);
        bossInstance.maxHp = bossInstance.hp;
      }
    }

    if (bossInstance) {
      if (this.game.enemyManager) {
        this.game.enemyManager.boss = bossInstance;
      }
      this.game.boss = bossInstance;
    }
  }

  /**
   * Wave Cleared
   */
  onWaveCleared() {
    if (this.isEndless) {
      this.initEndlessWave(this.endlessWave + 1);
    } else {
      this.startCampaignWave(this.currentWave + 1);
    }
  }

  /**
   * Boss Defeated
   */
  onBossDefeated() {
    this.state = 'STAGE_CLEAR';

    if (this.game.bulletManager && typeof this.game.bulletManager.clearEnemyBullets === 'function') {
      this.game.bulletManager.clearEnemyBullets(true);
    }

    if (this.game.starfield && typeof this.game.starfield.triggerWarpBurst === 'function') {
      this.game.starfield.triggerWarpBurst(4.0);
    }

    const sound = this.game.soundController || window.soundController || window.soundManager;
    if (sound && typeof sound.play === 'function') {
      sound.play('stage_clear', 0.8);
    }

    const isCampaignVictory = (!this.isEndless && this.currentStage >= this.maxCampaignStages);

    setTimeout(() => {
      if (this.game && typeof this.game.onStageCompleted === 'function') {
        this.game.onStageCompleted({
          stage: this.currentStage,
          wave: this.currentWave,
          isCampaignVictory: isCampaignVictory,
          isEndless: this.isEndless
        });
      }
    }, 2400);
  }

  /**
   * Advance to next stage or endless
   */
  nextStage() {
    if (this.isEndless) {
      this.initEndlessWave(this.endlessWave + 1);
    } else {
      const next = this.currentStage + 1;
      if (next <= this.maxCampaignStages) {
        this.initStage(next);
      } else {
        this.startEndless();
      }
    }
  }

  /**
   * Show banner notification in HUD and screen center
   */
  showAnnouncement(title, subtitle, color = '#00f3ff', duration = 3.0) {
    this.announcement.active = true;
    this.announcement.title = title;
    this.announcement.subtitle = subtitle;
    this.announcement.color = color;
    this.announcement.duration = duration;
    this.announcement.timer = 0;

    const el = document.getElementById('wave-announcement');
    if (el && typeof el.querySelector === 'function') {
      const titleEl = el.querySelector('.announcement-title');
      const subEl = el.querySelector('.announcement-sub');
      if (titleEl) {
        titleEl.textContent = title;
        titleEl.style.color = color;
        titleEl.style.textShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
      }
      if (subEl) {
        subEl.textContent = subtitle;
      }
      el.classList.remove('hidden');
      el.classList.add('show-anim');

      setTimeout(() => {
        el.classList.remove('show-anim');
        el.classList.add('hidden');
      }, duration * 1000);
    }
  }

  getHudProgress() {
    if (this.isEndless) {
      return {
        stageText: 'ENDLESS VOID · 无尽深空',
        waveText: `WAVE ${this.endlessWave}`,
        isBoss: (this.state === 'BOSS_FIGHT' || this.state === 'BOSS_WARNING')
      };
    }

    const config = this.stageConfigs[this.currentStage] || { name: 'STAGE', totalWaves: 4 };
    const waveDisplay = (this.currentWave > config.totalWaves) ? 'BOSS BATTLE' : `WAVE ${this.currentWave} / ${config.totalWaves}`;

    return {
      stageText: `STAGE ${this.currentStage} · ${config.name}`,
      waveText: waveDisplay,
      isBoss: (this.state === 'BOSS_FIGHT' || this.state === 'BOSS_WARNING')
    };
  }

  draw(ctx) {
    if (this.state === 'BOSS_WARNING') {
      this.drawBossWarningOverlay(ctx);
    }
  }

  drawBossWarningOverlay(ctx) {
    const width = this.game.canvas.width;
    const height = this.game.canvas.height;
    const alpha = (Math.sin(this.bossWarningTimer * 12) + 1) * 0.35 + 0.1;

    ctx.save();
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.3,
      width / 2, height / 2, width * 0.8
    );
    grad.addColorStop(0, 'rgba(255, 0, 85, 0)');
    grad.addColorStop(1, `rgba(255, 0, 50, ${alpha * 0.8})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const stripeHeight = 24;
    this.drawHazardStripes(ctx, 0, 0, width, stripeHeight, alpha);
    this.drawHazardStripes(ctx, 0, height - stripeHeight, width, stripeHeight, alpha);
    ctx.restore();
  }

  drawHazardStripes(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = `rgba(255, 0, 80, ${alpha * 0.8})`;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = `rgba(255, 220, 0, ${alpha * 0.9})`;
    const stripeWidth = 20;
    const offset = (Date.now() / 25) % (stripeWidth * 2);

    for (let px = -stripeWidth * 2 + offset; px < w + stripeWidth * 2; px += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + stripeWidth, y);
      ctx.lineTo(px + stripeWidth - 15, y + h);
      ctx.lineTo(px - 15, y + h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

window.LevelManager = LevelManager;
