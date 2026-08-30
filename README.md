# 🚀 霓虹空战 · NEON SKY SHOOTER

<p align="center">
  <strong>一款基于 HTML5 Canvas + Web Audio API 的现代赛博朋克风格纯前端太空弹幕射击游戏</strong>
  <br>
  <em>零依赖 · 纯原生 JavaScript 构建 · 100% 离线可用 · 极致 60FPS 霓虹视听盛宴</em>
</p>

---

## 📖 项目简介 (Overview)

《霓虹空战》（Neon Sky Shooter）是一款融合了经典街机纵卷轴飞行射击玩法与赛博朋克霓虹美学的高性能 Web 游戏。玩家将驾驶搭载最新等离子动力的矢量战机穿梭于深空战场，迎击多波次智能敌军编队，斩杀多阶段史诗级巨型关底 BOSS，并在无尽深空模式中挑战极限高分！

本项目采用**纯前端无外部依赖**技术架构，全部矢量图形、发光光晕、星云视差、爆炸粒子与 Web Audio 音频合成（包括音效与 8 小节 Synthwave BGM）均由原生代码实时演算生成，无需下载任何外部 MP3 音频或贴图图片文件。

---

## ✨ 核心游戏特色 (Features)

### 🎨 1. 极致赛博朋克视效与粒子引擎
- **多层视差深空背景**：由远景暗星、中景亮星、前景流光拖尾星、动态彩色星云气团与太空尘埃组成的沉浸式立体星空。
- **超空间光速跃迁 (Hyperdrive Warp)**：关卡切换时战机尾焰喷射，星空瞬间拉伸为超空间流光光柱。
- **高发光霓虹渲染**：采用 `globalCompositeOperation = 'lighter'` 加速的批量发光算法，战机矢量机体倾斜回正、尾部等离子焰流实时喷射。
- **震撼打击反馈**：全屏震颤 (Screen Shake)、受击红闪 (Hit Flash)、暴击/连击跳字 (Floating Damage Numbers) 与多层次火花冲击波。

### 🎵 2. 纯代码 Web Audio 动态音频合成引擎
- **无需外部音频文件**：使用浏览器原生 `AudioContext` 实时合成所有声音。
- **8 小节 Synthwave 电子 BGM**：内置和弦琶音、低音贝斯线与节奏鼓点，随游戏进程动态循环。
- **丰富音效库**：包含等离子发射、激光脉冲、跟踪导弹点火、护盾碰撞、EMP 核弹爆炸、升级拾取、BOSS 警报与机体坠毁等 10 余种专业音效。

### 🛸 3. 深度战斗与道具成长系统
- **1 ~ 5 阶主炮进化**：
  - **Lv 1 初始单发**：高频离子前射。
  - **Lv 2 双联并行**：双路重型等离子束。
  - **Lv 3 三向散射**：主炮 + 左右 15° 扇面清杂。
  - **Lv 4 五向重炮**：大范围扇形火力压制。
  - **Lv 5 超限过载 (OVERDRIVE)**：7 向狂暴弹幕 + 贯穿重型激光 + 周期性微型导弹齐射！
- **7 大战术强化道具（磁吸拾取）**：
  - `[P] 武器升级`：提升主炮武器阶级。
  - `[L] 高能激光`：持续 15 秒发射两道贯穿全屏的粉红毁灭光柱。
  - `[M] 跟踪飞弹`：持续 15 秒发射具备目标预测导引的微型追踪导弹群。
  - `[D] 护卫僚机`：召唤环绕战机飞行的自动索敌浮游炮（最多 2 架，可主动拦截敌方子弹）。
  - `[S] 等离子护盾`：激活吸收伤害的防御力场，优先抵御敌方弹幕。
  - `[B] 虚空核弹`：核弹库存 +1。
  - `[H] 纳米修复`：紧急回溯恢复 35% 机体生命值。

### 👾 4. 智能敌军与多阶段史诗关底 BOSS
- **4 类常规敌机**：
  - **侦察机 (Scout)**：S 型机动俯冲，瞄准射击。
  - **巡洋舰 (Cruiser)**：重甲战舰，交替发射 3 向散射与双联重离子炮。
  - **激光突击舰 (Laser Assault)**：蓄力红外瞄准线，发射高贯穿电磁轨道炮。
  - **自爆蜂 (Kamikaze)**：旋转三角利刃，极速自杀式撞击。
- **3 大战役关卡与多形态 BOSS**：
  - **Stage 1 BOSS · 虚空先锋 (VOID VANGUARD)**：双翼重机，2 阶段变身，释放环形弹幕与狂暴散射。
  - **Stage 2 BOSS · 雷霆风暴 (THUNDER TEMPEST)**：超重型堡垒，3 阶段蓄力引力雷暴与全屏能量风暴。
  - **Stage 3 BOSS · 母舰霸主 (MOTHERSHIP OVERLORD)**：终极太空母舰，召唤自爆护卫蜂群，释放全屏末日扫射。
- **无尽深空模式 (Endless Mode)**：通关战役后无缝开启，敌人血量与出怪频率随波次无限提升，挑战最高纪录！

### ⚡ 5. 显卡硬件探测与优先渲染加速 (GPU Acceleration Hub)
- **独显优先请求**：通过 WebGL2 / WebGPU 声明 `powerPreference: 'high-performance'`，引导操作系统与浏览器优先绑定独立显卡（NVIDIA / AMD）。
- **实时显卡硬件解密**：通过 `WEBGL_debug_renderer_info` 拓展精准识别当前运行的物理显卡型号。
- **画质三档自适应调节**：
  - 🟣 **极致独显 (ULTRA)**：450+ 粒子上限、高发光光晕、全密度星空星云与流光拖尾。
  - 🔵 **标准高性能 (HIGH)**：260 粒子上限、平衡发光与能耗。
  - 🟢 **核显节能流畅 (ECO)**：轻量化纯净粒子、零阴影开销，专为低功耗笔记本与核显防过载设计。

---

## 🎮 操作指南 (Controls)

| 控制方式 | 操作按键 | 功能描述 |
| :--- | :--- | :--- |
| **鼠标 / 触控** | 移动光标 / 触屏拖拽 | 战机精准平滑跟随，全自动连续开火 |
| **键盘移动** | `W` / `A` / `S` / `D` 或 `方向键` | 全向操控战机飞行移动 |
| **EMP 毁灭核弹** | `Space` 空格键 或 `K` 键 / 鼠标右键 | 引爆全屏 EMP，清空所有敌方子弹并造成 900 点范围伤害 |
| **游戏暂停** | `P` 或 `Esc` 键 | 暂停 / 继续当前战局 |
| **音效开关** | `M` 键 | 快速静音 / 开启音效与 BGM |

---

## 🚀 快速开始 (Quick Start)

### 方式 1：一键极速启动（推荐，无浏览器沙盒限制）
直接双击运行项目根目录下的启动脚本：
```bash
start_game.bat
```
> 脚本将自动启动本地极速 HTTP 服务并在浏览器中打开 `http://localhost:8080/index.html`，享受最纯净的 WebGPU/WebGL 硬件加速体验！

### 方式 2：直接浏览器打开
直接在任意现代浏览器（Chrome、Edge、Firefox、Brave、Safari）中双击打开：
```text
index.html
```

---

## 📁 项目目录结构 (Project Structure)

```text
neon-sky-shooter/
├── index.html            # 游戏 HTML 入口（Canvas、HUD 抬头显示、全套 Cyberpunk UI 弹窗）
├── style.css             # 赛博朋克发光样式、CRT 扫描线、毛玻璃面板与响应式布局
├── start_game.bat        # Windows 本地一键启动脚本
├── README.md             # 项目完整开发与使用文档
└── src/
    ├── gpu.js            # 显卡硬件探测器、独显调度保活与画质分级管理
    ├── audio.js          # Web Audio API 动态音频合成引擎与 Synthwave BGM 编排
    ├── starfield.js      # 多层视差星空、动态星云气团与超空间跃迁特效
    ├── bullets.js        # 发光弹幕、激光柱、追踪导弹、火花粒子与屏幕震颤控制器
    ├── player.js         # 玩家矢量战机、1-5级武器升级、伴飞浮游僚机与等离子护盾
    ├── items.js          # 7 种发光补给道具与磁吸拾取机制
    ├── enemies.js        # 4 种常规敌机与 3 大关底多阶段史诗 BOSS 行为树
    ├── levels.js         # 3 大战役关卡波次编排、BOSS 警报切入与无尽深空模式
    └── game.js           # 核心游戏循环、全矩阵连续碰撞检测、连击倍率与最高分持久化
```

---

## 🛠️ 笔记本双显卡设置（如何强制浏览器使用独立显卡）

若您的设备为双显卡笔记本（Intel/AMD 核显 + NVIDIA/AMD 独显），默认情况下 Windows 可能会将浏览器分配至核显。如需释放独显全部性能，请按以下步骤设置：

1. 按键盘快捷键 **`Win + S`** 搜索并打开 **【图形设置】**（或进入 Windows 设置 -> 系统 -> 屏幕 -> 图形设置）。
2. 在应用列表中找到 **Google Chrome** 或 **Microsoft Edge**（若列表中无浏览器，可点击“浏览”添加安装路径下的 `.exe` 文件）。
3. 点击浏览器项下的 **【选项】**。
4. 将首选项由“让 Windows 决定”改为 **【高性能 (如 NVIDIA GeForce RTX / AMD Radeon)】** 并点击保存。
5. **完全关闭并重启浏览器**，重新打开游戏即可看到主菜单点亮 **`🎮 独显加速: NVIDIA / AMD`**！

---

## 💻 技术栈 (Tech Stack)

- **渲染核心**：HTML5 Canvas 2D API (High DPI Retina Scaling, Desynchronized Swapchain)
- **图形加速**：WebGL 2.0 / WebGPU (Direct3D 11/12 ANGLE Hardware Acceleration)
- **音频引擎**：Web Audio API (OscillatorNode, BiquadFilterNode, GainNode, DynamicsCompressorNode)
- **样式与排版**：Vanilla CSS3 (CSS Variables, Flexbox, Glassmorphism, Neon Drop Shadows)
- **运行环境**：Chrome 90+、Edge 90+、Firefox 90+、Safari 15+ 现代浏览器

