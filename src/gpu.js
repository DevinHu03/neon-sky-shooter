/**
 * Neon Sky Shooter - GPU Acceleration & Hardware Profiler Module
 * 
 * Features:
 * 1. Forces browser/OS to prioritize Discrete GPU via `powerPreference: 'high-performance'`.
 * 2. Active WebGPU & WebGL2 keepalive render loop to prevent browser GPU throttling.
 * 3. Unmasks and detects actual GPU hardware (NVIDIA, AMD Radeon, Intel Arc vs Integrated iGPU).
 * 4. Adaptive visual quality presets (ULTRA / HIGH / ECO).
 */

class GPUManager {
  constructor() {
    this.gpuInfo = {
      vendor: 'Unknown',
      renderer: 'Unknown',
      unmaskedVendor: 'Unknown',
      unmaskedRenderer: 'Hardware Accelerated',
      isDiscrete: false,
      isIntegrated: false,
      tier: 'HIGH', // 'ULTRA' | 'HIGH' | 'ECO'
      webglVersion: 2,
      webgpuActive: false,
      powerPreference: 'high-performance'
    };

    this.qualityMode = 'ULTRA'; // 'ULTRA' | 'HIGH' | 'ECO'
    this.glContext = null;
    this.helperCanvas = null;
    this.webgpuDevice = null;
    this.webgpuAdapter = null;
    this.keepaliveActive = false;

    // Initialize detection and discrete GPU binding
    this.init();
  }

  /**
   * Initializes high-performance WebGL & WebGPU contexts to trigger discrete GPU switching
   */
  async init() {
    try {
      this.helperCanvas = document.createElement('canvas');
      this.helperCanvas.width = 16;
      this.helperCanvas.height = 16;
      this.helperCanvas.style.position = 'fixed';
      this.helperCanvas.style.left = '-9999px';
      this.helperCanvas.style.top = '-9999px';
      this.helperCanvas.style.pointerEvents = 'none';
      this.helperCanvas.style.opacity = '0';
      if (document.body) document.body.appendChild(this.helperCanvas);

      // Request WebGL with strict 'high-performance' power preference
      const contextOptions = {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        desynchronized: true,
        alpha: false,
        antialias: true
      };

      this.glContext = this.helperCanvas.getContext('webgl2', contextOptions) ||
                        this.helperCanvas.getContext('webgl', contextOptions) ||
                        this.helperCanvas.getContext('experimental-webgl', contextOptions);

      if (this.glContext) {
        this.detectGPUDetails(this.glContext);
        this.startKeepalive(this.glContext);
      }

      // Query and activate WebGPU High-Performance Device
      if (typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function') {
        try {
          const isWindows = (typeof navigator !== 'undefined' && (navigator.platform?.includes('Win') || navigator.userAgent?.includes('Windows')));
          const adapter = await navigator.gpu.requestAdapter(isWindows ? undefined : { powerPreference: 'high-performance' });
          if (adapter) {
            this.webgpuAdapter = adapter;
            this.gpuInfo.webgpuActive = true;
            try {
              this.webgpuDevice = await adapter.requestDevice();
              console.log('⚡ [GPUManager] WebGPU Hardware Device Bound:', adapter.info ? (adapter.info.description || adapter.info.renderer || 'Ready') : 'Ready');
            } catch (devErr) {}
            if (adapter.info) {
              this.updateFromWebGPU(adapter.info);
            }
          }
        } catch (e) {}
      }

      // Auto set quality based on hardware
      this.autoTuneQuality();
    } catch (e) {
      console.warn('GPU Hardware Detection encountered a non-fatal error:', e);
    }
  }

  /**
   * Start a lightweight GPU keepalive loop to keep the discrete GPU in active power state
   */
  startKeepalive(gl) {
    if (this.keepaliveActive || !gl) return;
    this.keepaliveActive = true;

    const tick = () => {
      if (!this.keepaliveActive) return;
      try {
        gl.viewport(0, 0, 16, 16);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      } catch (err) {}
      // Run at 10Hz heartbeat to maintain dGPU power clock without CPU overhead
      setTimeout(tick, 100);
    };
    tick();
  }

  /**
   * Query WebGL debug extensions to unmask GPU hardware name
   */
  detectGPUDetails(gl) {
    try {
      this.gpuInfo.vendor = gl.getParameter(gl.VENDOR) || 'Unknown';
      this.gpuInfo.renderer = gl.getParameter(gl.RENDERER) || 'Unknown';
      this.gpuInfo.webglVersion = (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) ? 2 : 1;

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        this.gpuInfo.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || this.gpuInfo.vendor;
        this.gpuInfo.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || this.gpuInfo.renderer;
      } else {
        this.gpuInfo.unmaskedRenderer = this.gpuInfo.renderer;
        this.gpuInfo.unmaskedVendor = this.gpuInfo.vendor;
      }

      this.analyzeGPUStrings();
    } catch (err) {
      console.warn('Failed to unmask GPU parameters:', err);
    }
  }

  /**
   * Update details from WebGPU Adapter info
   */
  updateFromWebGPU(info) {
    const desc = info.description || info.renderer || info.device || '';
    if (desc) {
      this.gpuInfo.unmaskedRenderer = desc;
      if (info.vendor) this.gpuInfo.unmaskedVendor = info.vendor;
      this.analyzeGPUStrings();
    }
  }

  /**
   * Determine discrete vs integrated GPU
   */
  analyzeGPUStrings() {
    const rendererStr = (this.gpuInfo.unmaskedRenderer || '').toLowerCase();
    const vendorStr = (this.gpuInfo.unmaskedVendor || '').toLowerCase();

    // Check for Discrete GPU signatures (NVIDIA, AMD Radeon, Intel Arc, Apple Silicon M-series)
    const discreteKeywords = [
      'nvidia', 'geforce', 'rtx', 'gtx', 'quadro', 'tesla',
      'radeon rx', 'radeon pro', 'radeon r9', 'radeon r7', 'discrete',
      'arc a', 'arc(tm)', 'apple m1', 'apple m2', 'apple m3', 'apple m4'
    ];

    // Check for Integrated GPU signatures (Intel UHD/HD/Iris, AMD Radeon Vega/Graphics)
    const integratedKeywords = [
      'intel(r) uhd', 'intel(r) hd', 'intel hd', 'iris', 'integrated',
      'radeon vega', 'radeon(tm) graphics', 'qualcomm', 'adreno', 'mali', 'powervr'
    ];

    const hasDiscrete = discreteKeywords.some(k => rendererStr.includes(k) || vendorStr.includes(k));
    const hasIntegrated = integratedKeywords.some(k => rendererStr.includes(k) || vendorStr.includes(k));

    if (hasDiscrete && !rendererStr.includes('integrated')) {
      this.gpuInfo.isDiscrete = true;
      this.gpuInfo.isIntegrated = false;
      this.gpuInfo.tier = 'ULTRA';
    } else if (hasIntegrated) {
      this.gpuInfo.isDiscrete = false;
      this.gpuInfo.isIntegrated = true;
      this.gpuInfo.tier = 'HIGH';
    } else {
      this.gpuInfo.isDiscrete = true;
      this.gpuInfo.tier = 'HIGH';
    }
  }

  /**
   * Automatically select best quality preset
   */
  autoTuneQuality() {
    const saved = localStorage.getItem('neon_sky_shooter_quality');
    if (saved && (saved === 'ULTRA' || saved === 'HIGH' || saved === 'ECO')) {
      this.qualityMode = saved;
      return;
    }

    if (this.gpuInfo.isDiscrete) {
      this.qualityMode = 'ULTRA';
    } else {
      this.qualityMode = 'HIGH';
    }
  }

  /**
   * Set and persist Quality preset
   * @param {'ULTRA' | 'HIGH' | 'ECO'} mode 
   */
  setQuality(mode) {
    if (mode === 'ULTRA' || mode === 'HIGH' || mode === 'ECO') {
      this.qualityMode = mode;
      localStorage.setItem('neon_sky_shooter_quality', mode);
    }
  }

  /**
   * Returns current quality parameters for rendering subsystems
   */
  getQualitySettings() {
    switch (this.qualityMode) {
      case 'ULTRA':
        return {
          mode: 'ULTRA',
          label: '极致独显 (ULTRA)',
          maxParticles: 450,
          shadowBlurFactor: 1.0,
          enableComplexGlow: true,
          enableMotionBlur: true,
          starCountMultiplier: 1.0,
          nebulaResolution: 1.0
        };
      case 'HIGH':
        return {
          mode: 'HIGH',
          label: '标准高性能 (HIGH)',
          maxParticles: 260,
          shadowBlurFactor: 0.65,
          enableComplexGlow: true,
          enableMotionBlur: true,
          starCountMultiplier: 0.85,
          nebulaResolution: 0.85
        };
      case 'ECO':
      default:
        return {
          mode: 'ECO',
          label: '核显节能流畅 (ECO)',
          maxParticles: 120,
          shadowBlurFactor: 0.25,
          enableComplexGlow: false,
          enableMotionBlur: false,
          starCountMultiplier: 0.6,
          nebulaResolution: 0.6
        };
    }
  }

  /**
   * Format human-readable GPU badge text for UI display
   */
  getGpuDisplayName() {
    let raw = this.gpuInfo.unmaskedRenderer || 'DirectX/OpenGL Hardware Acceleration';
    if (raw.includes('ANGLE (')) {
      const match = raw.match(/ANGLE \([^,]+,\s*([^,]+)/);
      if (match && match[1]) {
        raw = match[1].trim();
      }
    }
    return raw;
  }
}

// Attach globally
if (typeof window !== 'undefined') {
  window.GPUManager = GPUManager;
  window.gpuManager = new GPUManager();
}
