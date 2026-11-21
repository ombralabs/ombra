/*
 * Ombra local probe — core fingerprint probes.
 *
 * Local-only browser fingerprint stability checker.
 * No network calls, no external scripts, no telemetry, no LLM.
 * Everything is computed from the current page and kept in localStorage
 * (unless the caller exports the returned snapshot).
 *
 * Classes:
 *   hard     — must be bit-identical for the same profile/machine/display;
 *              any change is a stability failure.
 *   context  — may legitimately change with window size, zoom, monitor,
 *              permissions or network; reported but not a hard failure.
 *   volatile — inherently changes (time, battery, throughput); excluded
 *              from the stability score.
 */
(function () {
  'use strict';

  var VERSION = '1.1.0';
  var SCHEMA = 1;
  var IS_FILE = window.location.protocol === 'file:';

  var GROUPS = {
    navigator: 'Navigator и Client Hints',
    screen: 'Экран, окно, media queries',
    locale: 'Локаль, время, Intl',
    canvas: 'Canvas 2D',
    dom: 'DOM / ClientRects',
    webgl: 'WebGL / GPU',
    webgpu: 'WebGPU',
    audio: 'Audio',
    fonts: 'Шрифты',
    js: 'JS-движок, Math, WASM',
    css: 'CSS',
    media: 'Медиа и речь',
    hardware: 'Железо и API',
    automation: 'Автоматизация и «ложь»',
    context: 'Кросс-контекстность (Worker / iframe)',
    webrtc: 'WebRTC',
    volatile: 'Волатильные сигналы'
  };

  // ------------------------------------------------------------------ utils

  function hashString(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ('00000000' + (h2 >>> 0).toString(16)).slice(-8) +
           ('00000000' + (h1 >>> 0).toString(16)).slice(-8);
  }

  function hashBytes(bytes) {
    var h1 = 0x811c9dc5, h2 = 0x9e3779b9;
    for (var i = 0; i < bytes.length; i++) {
      h1 = Math.imul(h1 ^ bytes[i], 16777619);
      h2 = Math.imul(h2 ^ bytes[i], 2246822519);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) +
           ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }

  function canon(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    var t = typeof value;
    if (t === 'number') {
      if (Object.is(value, -0)) return '-0';
      return Number.isFinite(value) ? String(value) : 'num:' + String(value);
    }
    if (t === 'string') return JSON.stringify(value);
    if (t === 'boolean') return value ? 'true' : 'false';
    if (t === 'bigint') return 'bigint:' + value.toString();
    if (Array.isArray(value)) {
      return '[' + value.map(canon).join(',') + ']';
    }
    if (t === 'object') {
      var keys = Object.keys(value).sort();
      var parts = [];
      for (var i = 0; i < keys.length; i++) {
        parts.push(JSON.stringify(keys[i]) + ':' + canon(value[keys[i]]));
      }
      return '{' + parts.join(',') + '}';
    }
    return String(value);
  }

  function skippedReason(value) {
    if (value && typeof value === 'object' && typeof value.skipped === 'string' && value.skipped) {
      return value.skipped;
    }
    return null;
  }

  function probeSkippedReason(probe) {
    if (!probe || typeof probe !== 'object') return null;
    if (typeof probe.s === 'string' && probe.s) return probe.s;
    return skippedReason(probe.v);
  }

  function pack(value) {
    if (typeof value === 'string') {
      if (value.length <= 320) return value;
      return value.slice(0, 180) + '…[' + value.length + ' chars]';
    }
    if (Array.isArray(value)) {
      if (value.length > 80) {
        return value.slice(0, 50).map(pack).concat(['…[' + (value.length - 50) + ' more]']);
      }
      return value.map(pack);
    }
    if (value && typeof value === 'object') {
      var out = {};
      var keys = Object.keys(value);
      for (var i = 0; i < keys.length; i++) out[keys[i]] = pack(value[keys[i]]);
      return out;
    }
    return value;
  }

  function errText(e) {
    if (!e) return 'unknown error';
    return String(e && e.message ? e.message : e);
  }

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; reject(new Error('timeout ' + ms + 'ms' + (label ? ' / ' + label : ''))); }
      }, ms);
      Promise.resolve(promise).then(function (value) {
        if (!done) { done = true; clearTimeout(timer); resolve(value); }
      }, function (err) {
        if (!done) { done = true; clearTimeout(timer); reject(err); }
      });
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function plain(value) {
    if (value && typeof value === 'object' && typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
      return Array.from(value);
    }
    return value;
  }

  function makeId() {
    var stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return stamp + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ------------------------------------------------------------- DOM helpers

  function newCanvas(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context unavailable');
    return { canvas: canvas, ctx: ctx };
  }

  function drawCanvasScene(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    ctx.textBaseline = 'alphabetic';
    ctx.font = '16px "Arial", sans-serif';
    ctx.fillStyle = '#f60';
    ctx.fillRect(8, 8, 86, 36);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint 0123 😀', 12, 30);

    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(220, 50, 32, 0, Math.PI * 2);
    ctx.stroke();

    var gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.5, 'rgba(0,128,255,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 70, w, 24);

    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255,0,128,0.45)';
    ctx.beginPath();
    ctx.moveTo(120, 20);
    ctx.lineTo(300, 18);
    ctx.lineTo(210, 78);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = '14px "Times New Roman", serif';
    ctx.fillStyle = '#000';
    ctx.fillText('ℱ𝔦𝔫𝔤𝔢𝔯𝔭𝔯𝔦𝔫𝔱 · тест', 8, 62);
  }

  // ---------------------------------------------------------- WebGL helpers

  var glCache = { 1: null, 2: null };
  var passFontsCache = null;

  function resetPassState() {
    passFontsCache = null;
    var keys = [1, 2];
    for (var i = 0; i < keys.length; i++) {
      var entry = glCache[keys[i]];
      if (entry && entry.gl) {
        try {
          var lose = entry.gl.getExtension('WEBGL_lose_context');
          if (lose && typeof lose.loseContext === 'function') lose.loseContext();
        } catch (e) { /* ignore */ }
      }
      glCache[keys[i]] = null;
    }
  }

  function getGL(version) {
    var key = version === 2 ? 2 : 1;
    if (glCache[key] && !glCache[key].gl.isContextLost()) return glCache[key];

    var canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    var options = {
      alpha: true,
      antialias: false,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: true,
      powerPreference: 'default'
    };
    var gl = null;
    try {
      gl = canvas.getContext(key === 2 ? 'webgl2' : 'webgl', options);
    } catch (e) {
      gl = null;
    }
    if (!gl) return null;
    glCache[key] = { gl: gl, canvas: canvas };
    return glCache[key];
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('shader: ' + log);
    }
    return shader;
  }

  function renderGL(gl, version, canvas) {
    var vertexSource, fragmentSource;
    if (version === 2) {
      vertexSource = [
        '#version 300 es',
        'in vec3 p;',
        'in vec3 c;',
        'out vec3 vc;',
        'out vec3 vp;',
        'void main(){',
        '  vc = c;',
        '  vp = p;',
        '  float z = 1.0 + p.z * 0.35;',
        '  gl_Position = vec4(p.x / z, p.y / z, p.z * 0.5, 1.0);',
        '}'
      ].join('\n');
      fragmentSource = [
        '#version 300 es',
        'precision highp float;',
        'in vec3 vc;',
        'in vec3 vp;',
        'out vec4 o;',
        'void main(){',
        '  float w = 0.5 + 0.5 * sin(vp.x * 9.0 + cos(vp.y * 7.0));',
        '  o = vec4(clamp(vc.r * w + 0.15, 0.0, 1.0), clamp(vc.g * (1.0 - w * 0.4), 0.0, 1.0), clamp(vc.b + 0.2 * w, 0.0, 1.0), 0.85);',
        '}'
      ].join('\n');
    } else {
      vertexSource = [
        'attribute vec3 p;',
        'attribute vec3 c;',
        'varying vec3 vc;',
        'varying vec3 vp;',
        'void main(){',
        '  vc = c;',
        '  vp = p;',
        '  float z = 1.0 + p.z * 0.35;',
        '  gl_Position = vec4(p.x / z, p.y / z, p.z * 0.5, 1.0);',
        '}'
      ].join('\n');
      fragmentSource = [
        'precision mediump float;',
        'varying vec3 vc;',
        'varying vec3 vp;',
        'void main(){',
        '  float w = 0.5 + 0.5 * sin(vp.x * 9.0 + cos(vp.y * 7.0));',
        '  gl_FragColor = vec4(clamp(vc.r * w + 0.15, 0.0, 1.0), clamp(vc.g * (1.0 - w * 0.4), 0.0, 1.0), clamp(vc.b + 0.2 * w, 0.0, 1.0), 0.85);',
        '}'
      ].join('\n');
    }

    var vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    var fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    // Interleaved [x, y, z, r, g, b] for two intersecting 3D triangles
    var vertices = new Float32Array([
      -0.9, -0.8, 0.2, 0.9, 0.2, 0.3,
       0.9, -0.6, -0.3, 0.2, 0.8, 0.4,
       0.1,  0.9, 0.4, 0.2, 0.3, 0.95,
      -0.7,  0.7, -0.2, 0.95, 0.75, 0.1,
       0.8,  0.5, 0.3, 0.15, 0.85, 0.85,
      -0.1, -0.9, -0.1, 0.75, 0.2, 0.9
    ]);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    var stride = 6 * 4;
    var locP = gl.getAttribLocation(program, 'p');
    var locC = gl.getAttribLocation(program, 'c');
    gl.enableVertexAttribArray(locP);
    gl.vertexAttribPointer(locP, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(locC);
    gl.vertexAttribPointer(locC, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.viewport(0, 0, 128, 64);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.colorMask(true, true, true, true);
    gl.clearColor(0.12, 0.22, 0.34, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.finish();

    var pixels = new Uint8Array(128 * 64 * 4);
    gl.readPixels(0, 0, 128, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    var canvasHash = null;
    if (canvas && typeof canvas.toDataURL === 'function') {
      try { canvasHash = hashString(canvas.toDataURL('image/png')); } catch (e) { canvasHash = null; }
    }

    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    return {
      hash: hashBytes(pixels),
      canvasHash: canvasHash,
      first: Array.from(pixels.slice(0, 12)),
      error: gl.getError()
    };
  }

  var GL_PARAMS = [
    'MAX_TEXTURE_SIZE', 'MAX_VIEWPORT_DIMS', 'ALIASED_LINE_WIDTH_RANGE',
    'ALIASED_POINT_SIZE_RANGE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VERTEX_ATTRIBS',
    'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_FRAGMENT_UNIFORM_VECTORS',
    'MAX_VARYING_VECTORS', 'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
    'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_TEXTURE_IMAGE_UNITS',
    'MAX_VERTEX_TEXTURE_IMAGE_UNITS', 'MAX_SAMPLES', 'MAX_3D_TEXTURE_SIZE',
    'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_DRAW_BUFFERS', 'MAX_COLOR_ATTACHMENTS',
    'MAX_UNIFORM_BUFFER_BINDINGS', 'MAX_UNIFORM_BLOCK_SIZE',
    'MAX_ELEMENT_INDEX', 'MAX_ELEMENTS_INDICES', 'MAX_ELEMENTS_VERTICES',
    'MAX_FRAGMENT_INPUT_COMPONENTS', 'MAX_VERTEX_OUTPUT_COMPONENTS',
    'SAMPLES', 'SAMPLE_BUFFERS', 'RED_BITS', 'GREEN_BITS', 'BLUE_BITS',
    'ALPHA_BITS', 'DEPTH_BITS', 'STENCIL_BITS', 'SUBPIXEL_BITS'
  ];

  function glParameters(gl, version) {
    var out = {};
    for (var i = 0; i < GL_PARAMS.length; i++) {
      var name = GL_PARAMS[i];
      var constant = gl[name];
      if (typeof constant !== 'number') continue;
      try { out[name] = plain(gl.getParameter(constant)); } catch (e) { out[name] = 'err'; }
    }
    try {
      var aniso = gl.getExtension('EXT_texture_filter_anisotropic') ||
        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
        gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
      if (aniso && typeof aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT === 'number') {
        out.MAX_TEXTURE_MAX_ANISOTROPY_EXT = plain(gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
      }
    } catch (e) { /* ignore */ }
    if (version === 2 && typeof gl.getInternalformatParameter === 'function') {
      try {
        out.INTERNALFORMAT_RGBA8_SAMPLES = plain(
          gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES)
        );
      } catch (e) { /* ignore */ }
    }
    try {
      var attrs = gl.getContextAttributes();
      out.contextAttributes = attrs ? {
        alpha: attrs.alpha,
        antialias: attrs.antialias,
        depth: attrs.depth,
        stencil: attrs.stencil,
        premultipliedAlpha: attrs.premultipliedAlpha,
        preserveDrawingBuffer: attrs.preserveDrawingBuffer
      } : null;
    } catch (e) { /* ignore */ }
    return out;
  }

  function glPrecision(gl) {
    var out = {};
    var stages = [
      ['VERTEX_SHADER', 'HIGH_FLOAT'], ['VERTEX_SHADER', 'MEDIUM_FLOAT'], ['VERTEX_SHADER', 'LOW_FLOAT'],
      ['VERTEX_SHADER', 'HIGH_INT'], ['VERTEX_SHADER', 'MEDIUM_INT'], ['VERTEX_SHADER', 'LOW_INT'],
      ['FRAGMENT_SHADER', 'HIGH_FLOAT'], ['FRAGMENT_SHADER', 'MEDIUM_FLOAT'], ['FRAGMENT_SHADER', 'LOW_FLOAT'],
      ['FRAGMENT_SHADER', 'HIGH_INT'], ['FRAGMENT_SHADER', 'MEDIUM_INT'], ['FRAGMENT_SHADER', 'LOW_INT']
    ];
    for (var i = 0; i < stages.length; i++) {
      var stage = gl[stages[i][0]];
      var precision = gl[stages[i][1]];
      if (typeof stage !== 'number' || typeof precision !== 'number') continue;
      try {
        var format = gl.getShaderPrecisionFormat(stage, precision);
        if (!format) continue;
        out[stages[i][0] + '.' + stages[i][1]] = {
          rangeMin: format.rangeMin,
          rangeMax: format.rangeMax,
          precision: format.precision
        };
      } catch (e) { /* ignore */ }
    }
    return out;
  }

  function glExtensions(gl) {
    var supported = (gl.getSupportedExtensions() || []).slice().sort();
    var nullList = [];
    for (var i = 0; i < supported.length; i++) {
      var extName = supported[i];
      if (extName === 'WEBGL_lose_context') continue;
      try {
        if (gl.getExtension(extName) === null) nullList.push(extName);
      } catch (e) {
        nullList.push(extName);
      }
    }
    return {
      supported: supported,
      nullCount: nullList.length,
      nullList: nullList
    };
  }

  function glInfo(gl) {
    var debug = null;
    try { debug = gl.getExtension('WEBGL_debug_renderer_info'); } catch (e) { debug = null; }
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      unmaskedVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null
    };
  }

  // --------------------------------------------------------------- probes

  var PROBES = [];

  function add(id, group, title, cls, fn, timeout) {
    PROBES.push({
      id: id,
      group: group,
      title: title,
      cls: cls,
      run: fn,
      timeout: timeout || 3000
    });
  }

  // --- navigator -----------------------------------------------------------

  add('nav.userAgent', 'navigator', 'User-Agent', 'hard', function () {
    return navigator.userAgent;
  });

  add('nav.appVersion', 'navigator', 'appVersion', 'hard', function () {
    return navigator.appVersion;
  });

  add('nav.platform', 'navigator', 'navigator.platform', 'hard', function () {
    return navigator.platform;
  });

  add('nav.vendor', 'navigator', 'navigator.vendor', 'hard', function () {
    return navigator.vendor;
  });

  add('nav.productSub', 'navigator', 'navigator.productSub', 'hard', function () {
    return navigator.productSub;
  });

  add('nav.languages', 'navigator', 'Языки', 'hard', function () {
    return {
      language: navigator.language,
      languages: Array.from(navigator.languages || [])
    };
  });

  add('nav.cores', 'navigator', 'hardwareConcurrency', 'hard', function () {
    return navigator.hardwareConcurrency ?? null;
  });

  add('nav.memory', 'navigator', 'deviceMemory', 'hard', function () {
    return navigator.deviceMemory ?? null;
  });

  add('nav.touch', 'navigator', 'maxTouchPoints', 'hard', function () {
    return navigator.maxTouchPoints ?? null;
  });

  add('nav.pdf', 'navigator', 'pdfViewerEnabled', 'hard', function () {
    return navigator.pdfViewerEnabled ?? null;
  });

  add('nav.webdriver', 'navigator', 'navigator.webdriver', 'hard', function () {
    return navigator.webdriver ?? null;
  });

  add('nav.cookieEnabled', 'navigator', 'cookieEnabled', 'hard', function () {
    return navigator.cookieEnabled;
  });

  add('nav.privacy', 'navigator', 'DNT / GPC', 'hard', function () {
    return {
      doNotTrack: navigator.doNotTrack ?? null,
      globalPrivacyControl: navigator.globalPrivacyControl ?? null
    };
  });

  add('nav.plugins', 'navigator', 'Plugins и MIME types', 'hard', function () {
    return {
      length: navigator.plugins.length,
      plugins: Array.from(navigator.plugins).map(function (plugin) {
        return { name: plugin.name, filename: plugin.filename, description: plugin.description };
      }),
      mimeTypes: Array.from(navigator.mimeTypes).map(function (mime) {
        return { type: mime.type, suffixes: mime.suffixes, description: mime.description };
      })
    };
  });

  add('nav.uaData', 'navigator', 'User-Agent Client Hints', 'hard', async function () {
    var uaData = navigator.userAgentData;
    if (!uaData) return { available: false };
    var high = null;
    var highError = null;
    if (typeof uaData.getHighEntropyValues === 'function') {
      try {
        high = await uaData.getHighEntropyValues([
          'architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion',
          'fullVersionList', 'wow64', 'formFactors'
        ]);
      } catch (e) {
        highError = errText(e);
      }
    }
    return {
      available: true,
      brands: (uaData.brands || []).map(function (item) {
        return { brand: item.brand, version: item.version };
      }),
      mobile: uaData.mobile,
      platform: uaData.platform,
      high_error: highError,
      high: high ? {
        architecture: high.architecture,
        bitness: high.bitness,
        model: high.model,
        platformVersion: high.platformVersion,
        uaFullVersion: high.uaFullVersion,
        wow64: high.wow64,
        formFactors: high.formFactors,
        fullVersionList: (high.fullVersionList || []).map(function (item) {
          return { brand: item.brand, version: item.version };
        })
      } : null
    };
  }, 2500);

  // --- screen --------------------------------------------------------------

  add('screen.geometry', 'screen', 'Параметры экрана', 'hard', function () {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      availLeft: screen.availLeft ?? null,
      availTop: screen.availTop ?? null,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      isExtended: screen.isExtended ?? null
    };
  });

  add('screen.window', 'screen', 'Окно, DPR, позиция', 'context', function () {
    return {
      inner: [window.innerWidth, window.innerHeight],
      outer: [window.outerWidth, window.outerHeight],
      screenXY: [window.screenX, window.screenY],
      dpr: window.devicePixelRatio
    };
  });

  add('screen.visualViewport', 'screen', 'visualViewport', 'context', function () {
    var viewport = window.visualViewport;
    if (!viewport) return null;
    return {
      width: viewport.width,
      height: viewport.height,
      scale: viewport.scale,
      offsetLeft: viewport.offsetLeft,
      offsetTop: viewport.offsetTop
    };
  });

  add('screen.orientation', 'screen', 'Ориентация', 'context', function () {
    var orientation = screen.orientation;
    return orientation ? { type: orientation.type, angle: orientation.angle } : null;
  });

  add('screen.media', 'screen', 'Media queries', 'context', function () {
    var queries = [
      '(prefers-color-scheme: dark)', '(prefers-color-scheme: light)',
      '(prefers-reduced-motion: reduce)', '(prefers-contrast: more)',
      '(forced-colors: active)', '(inverted-colors: inverted)',
      '(hover: hover)', '(any-hover: hover)',
      '(pointer: fine)', '(any-pointer: fine)',
      '(color-gamut: srgb)', '(color-gamut: p3)', '(color-gamut: rec2020)',
      '(dynamic-range: high)', '(display-mode: browser)', '(display-mode: standalone)',
      '(scripting: enabled)', '(prefers-reduced-transparency: reduce)'
    ];
    var out = {};
    for (var i = 0; i < queries.length; i++) {
      out[queries[i]] = window.matchMedia(queries[i]).matches;
    }
    return out;
  });

  add('screen.mediaMatch', 'screen', 'Media queries (hard / screen)', 'hard', function () {
    return {
      deviceWidthMatch: window.matchMedia('(device-width: ' + screen.width + 'px)').matches,
      deviceHeightMatch: window.matchMedia('(device-height: ' + screen.height + 'px)').matches,
      hoverHover: window.matchMedia('(hover: hover)').matches,
      anyHoverHover: window.matchMedia('(any-hover: hover)').matches,
      pointerFine: window.matchMedia('(pointer: fine)').matches,
      pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
      anyPointerFine: window.matchMedia('(any-pointer: fine)').matches,
      colorGamutSrgb: window.matchMedia('(color-gamut: srgb)').matches,
      colorGamutP3: window.matchMedia('(color-gamut: p3)').matches,
      colorGamutRec2020: window.matchMedia('(color-gamut: rec2020)').matches
    };
  });

  // --- locale --------------------------------------------------------------

  add('locale.timezone', 'locale', 'Часовой пояс и смещения', 'hard', function () {
    var january = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
    var july = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
    var formatter = new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' });
    function zoneName(date) {
      var parts = formatter.formatToParts(date);
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') return parts[i].value;
      }
      return null;
    }
    return {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offsetJanuary: january.getTimezoneOffset(),
      offsetJuly: july.getTimezoneOffset(),
      nameJanuary: zoneName(january),
      nameJuly: zoneName(july),
      dateString: january.toString()
    };
  });

  add('locale.intl', 'locale', 'Intl resolvedOptions', 'hard', function () {
    var options = Intl.DateTimeFormat().resolvedOptions();
    return {
      locale: options.locale,
      calendar: options.calendar,
      numberingSystem: options.numberingSystem,
      hourCycle: options.hourCycle,
      timeZone: options.timeZone
    };
  });

  add('locale.date', 'locale', 'Форматирование даты', 'hard', function () {
    var date = new Date(Date.UTC(2026, 10, 19, 12, 34, 56));
    function format(locale) {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long' }).format(date);
    }
    return {
      defaultLocale: format(undefined),
      defaultShort: date.toLocaleString(),
      en: format('en-US'),
      ru: format('ru-RU'),
      de: format('de-DE'),
      jp: format('ja-JP')
    };
  });

  add('locale.number', 'locale', 'Форматирование чисел', 'hard', function () {
    return {
      defaultLocale: (1234567.891).toLocaleString(),
      en: (1234567.891).toLocaleString('en-US'),
      de: (1234567.891).toLocaleString('de-DE'),
      ru: (1234567.891).toLocaleString('ru-RU'),
      currency: (1234567.891).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      percent: (0.1234).toLocaleString('en-US', { style: 'percent' }),
      significant: (0.000001234).toLocaleString('en-US', { maximumSignificantDigits: 4 })
    };
  });

  add('locale.collator', 'locale', 'Collator', 'hard', function () {
    var values = ['ä', 'z', 'a', 'ö', 'A', 'Z', 'å', 'é'];
    function sorted(locale) {
      return values.slice().sort(new Intl.Collator(locale).compare);
    }
    return {
      defaultLocale: sorted(undefined),
      de: sorted('de'),
      sv: sorted('sv')
    };
  });

  add('locale.plural', 'locale', 'PluralRules', 'hard', function () {
    var locales = ['en', 'ru', 'ar', 'pl', 'fr'];
    var out = {};
    var defRules = new Intl.PluralRules();
    out.defaultLocale = [1, 2, 5, 21].map(function (n) { return defRules.select(n); });
    for (var i = 0; i < locales.length; i++) {
      var rules = new Intl.PluralRules(locales[i]);
      out[locales[i]] = [1, 2, 5, 21].map(function (n) { return rules.select(n); });
    }
    return out;
  });

  // --- canvas --------------------------------------------------------------

  function decodeDataUrlBytes(dataUrl) {
    var marker = ';base64,';
    var idx = dataUrl.indexOf(marker);
    if (idx === -1) return null;
    var binary = atob(dataUrl.slice(idx + marker.length));
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  add('canvas.2d', 'canvas', 'Canvas 2D: сцена', 'hard', async function () {
    var pair = newCanvas(320, 100);
    drawCanvasScene(pair.ctx, 320, 100);
    var url = pair.canvas.toDataURL('image/png');
    var imageDataHash = null;
    try {
      var pixels = pair.ctx.getImageData(0, 0, 320, 100).data;
      imageDataHash = hashBytes(pixels);
    } catch (e) {
      imageDataHash = 'err:' + errText(e);
    }

    var blobHash = null;
    var dataUrlMatchesBlob = null;
    if (typeof pair.canvas.toBlob === 'function') {
      try {
        var blob = await new Promise(function (resolve) {
          pair.canvas.toBlob(resolve, 'image/png');
        });
        if (blob && typeof blob.arrayBuffer === 'function') {
          var blobBytes = new Uint8Array(await blob.arrayBuffer());
          blobHash = hashBytes(blobBytes);
          var urlBytes = decodeDataUrlBytes(url);
          if (urlBytes) {
            dataUrlMatchesBlob = (urlBytes.length === blobBytes.length) && (hashBytes(urlBytes) === blobHash);
          }
        }
      } catch (e) {
        blobHash = 'err:' + errText(e);
      }
    }

    // Uniform solid-fill test (detects naive per-pixel canvas noise on flat fills)
    var solid = newCanvas(32, 32);
    solid.ctx.fillStyle = '#4287f5';
    solid.ctx.fillRect(0, 0, 32, 32);
    var solidPixels = solid.ctx.getImageData(0, 0, 32, 32).data;
    var solidUniform = true;
    for (var i = 4; i < solidPixels.length; i += 4) {
      if (solidPixels[i] !== solidPixels[0] ||
          solidPixels[i + 1] !== solidPixels[1] ||
          solidPixels[i + 2] !== solidPixels[2] ||
          solidPixels[i + 3] !== solidPixels[3]) {
        solidUniform = false;
        break;
      }
    }

    return {
      width: pair.canvas.width,
      height: pair.canvas.height,
      url: url,
      imageDataHash: imageDataHash,
      blobHash: blobHash,
      dataUrlMatchesBlob: dataUrlMatchesBlob,
      solidUniform: solidUniform
    };
  }, 4000);

  add('canvas.metrics', 'canvas', 'Canvas 2D: text metrics', 'hard', function () {
    var pair = newCanvas(600, 100);
    var ctx = pair.ctx;
    var cases = [
      ['arial', '16px "Arial"', 'Fingerprint 0123 😀'],
      ['serif', '18px "Times New Roman"', 'ℱ𝔦𝔫𝔤𝔢𝔯𝔭𝔯𝔦𝔫𝔱'],
      ['mono', '14px "Courier New"', 'mmmmmmmmmmlliWWQ@#%&'],
      ['emoji', '24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif', '😀🙂👨‍👩‍👧‍👦']
    ];
    var out = {};
    for (var i = 0; i < cases.length; i++) {
      ctx.font = cases[i][1];
      var metrics = ctx.measureText(cases[i][2]);
      out[cases[i][0]] = {
        width: metrics.width,
        ascent: metrics.actualBoundingBoxAscent,
        descent: metrics.actualBoundingBoxDescent,
        left: metrics.actualBoundingBoxLeft,
        right: metrics.actualBoundingBoxRight,
        fontAscent: metrics.fontBoundingBoxAscent,
        fontDescent: metrics.fontBoundingBoxDescent
      };
    }
    return out;
  });

  add('canvas.winding', 'canvas', 'Canvas 2D: fill rules', 'hard', function () {
    function render(rule) {
      var pair = newCanvas(120, 120);
      var ctx = pair.ctx;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.rect(10, 10, 80, 80);
      ctx.rect(40, 40, 70, 70);
      ctx.fill(rule);
      return pair.canvas.toDataURL('image/png');
    }
    return {
      nonzero: hashString(render('nonzero')),
      evenodd: hashString(render('evenodd'))
    };
  });

  add('canvas.offscreen', 'canvas', 'OffscreenCanvas', 'hard', async function () {
    if (typeof OffscreenCanvas === 'undefined') return null;
    var canvas = new OffscreenCanvas(160, 80);
    var ctx = null;
    try { ctx = canvas.getContext('2d'); } catch (e) { return { available: true, error: errText(e) }; }
    if (!ctx) return null;
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 160, 80);
    ctx.fillStyle = '#fedcba';
    ctx.font = '18px sans-serif';
    ctx.fillText('offscreen 😀', 8, 40);
    var pixels;
    try { pixels = ctx.getImageData(0, 0, 160, 80).data; }
    catch (e) { return { available: true, pixels: false, error: errText(e) }; }
    var blobHash = null;
    if (typeof canvas.convertToBlob === 'function') {
      try {
        var blob = await canvas.convertToBlob({ type: 'image/png' });
        if (blob && typeof blob.arrayBuffer === 'function') {
          blobHash = hashBytes(new Uint8Array(await blob.arrayBuffer()));
        }
      } catch (e) {
        blobHash = 'err:' + errText(e);
      }
    }
    return {
      available: true,
      pixels: true,
      size: [160, 80],
      hash: hashBytes(pixels),
      blobHash: blobHash
    };
  }, 4000);

  // --- DOM / ClientRects ---------------------------------------------------

  add('dom.rects', 'dom', 'ClientRects & Range parity', 'hard', function () {
    if (!document.body) return null;
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;font-family:sans-serif;font-size:16px;line-height:1.25;';
    var span = document.createElement('span');
    span.style.cssText = 'display:inline-block;padding:1.333px 2.75px;border:0.5px solid transparent;transform:scale(1.013);';
    span.textContent = 'ClientRects 0123 · mmmlliWWQ 😀';
    host.appendChild(span);
    document.body.appendChild(host);
    try {
      var elemRect = span.getBoundingClientRect();
      var range = document.createRange();
      range.selectNode(span);
      var rangeRects = range.getClientRects();
      var rangeRect = rangeRects.length ? rangeRects[0] : range.getBoundingClientRect();
      var dims = [elemRect.width, elemRect.height, rangeRect.width, rangeRect.height];
      var gridAligned = true;
      for (var i = 0; i < dims.length; i++) {
        var scaled = dims[i] * 512;
        if (Math.abs(scaled - Math.round(scaled)) > 1e-4) {
          gridAligned = false;
          break;
        }
      }
      return {
        elemWidth: elemRect.width,
        elemHeight: elemRect.height,
        rangeWidth: rangeRect.width,
        rangeHeight: rangeRect.height,
        rangeCount: rangeRects.length,
        widthDelta: Number(Math.abs(elemRect.width - rangeRect.width).toFixed(6)),
        heightDelta: Number(Math.abs(elemRect.height - rangeRect.height).toFixed(6)),
        subpixelGrid512: gridAligned
      };
    } finally {
      host.remove();
    }
  });

  // --- WebGL ---------------------------------------------------------------

  add('webgl1.info', 'webgl', 'WebGL1: vendor/renderer', 'hard', function () {
    var state = getGL(1);
    return state ? glInfo(state.gl) : null;
  });

  add('webgl1.params', 'webgl', 'WebGL1: лимиты и precision', 'hard', function () {
    var state = getGL(1);
    if (!state) return null;
    return { params: glParameters(state.gl, 1), precision: glPrecision(state.gl) };
  });

  add('webgl1.extensions', 'webgl', 'WebGL1: расширения', 'hard', function () {
    var state = getGL(1);
    if (!state) return null;
    return glExtensions(state.gl);
  });

  add('webgl1.render', 'webgl', 'WebGL1: рендер', 'hard', function () {
    var state = getGL(1);
    if (!state) return null;
    return renderGL(state.gl, 1, state.canvas);
  });

  add('webgl2.info', 'webgl', 'WebGL2: vendor/renderer', 'hard', function () {
    var state = getGL(2);
    return state ? glInfo(state.gl) : null;
  });

  add('webgl2.params', 'webgl', 'WebGL2: лимиты и precision', 'hard', function () {
    var state = getGL(2);
    if (!state) return null;
    return { params: glParameters(state.gl, 2), precision: glPrecision(state.gl) };
  });

  add('webgl2.extensions', 'webgl', 'WebGL2: расширения', 'hard', function () {
    var state = getGL(2);
    if (!state) return null;
    return glExtensions(state.gl);
  });

  add('webgl2.render', 'webgl', 'WebGL2: рендер', 'hard', function () {
    var state = getGL(2);
    if (!state) return null;
    return renderGL(state.gl, 2, state.canvas);
  });

  // --- WebGPU --------------------------------------------------------------

  add('webgpu.adapter', 'webgpu', 'WebGPU adapter', 'hard', async function () {
    if (!navigator.gpu) return { available: false };
    var adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { available: true, adapter: false };

    var rawInfo = null;
    try {
      rawInfo = adapter.info || null;
      if (!rawInfo && typeof adapter.requestAdapterInfo === 'function') {
        rawInfo = await adapter.requestAdapterInfo();
      }
    } catch (e) {
      rawInfo = { error: errText(e) };
    }

    var info = null;
    if (rawInfo) {
      info = {
        vendor: rawInfo.vendor ?? null,
        architecture: rawInfo.architecture ?? null,
        device: rawInfo.device ?? null,
        description: rawInfo.description ?? null,
        subgroupMinSize: rawInfo.subgroupMinSize ?? null,
        subgroupMaxSize: rawInfo.subgroupMaxSize ?? null
      };
    }

    var limitNames = [
      'maxTextureDimension1D', 'maxTextureDimension2D', 'maxTextureDimension3D',
      'maxTextureArrayLayers', 'maxBindGroups', 'maxBindingsPerBindGroup',
      'maxDynamicUniformBuffersPerPipelineLayout', 'maxDynamicStorageBuffersPerPipelineLayout',
      'maxSampledTexturesPerShaderStage', 'maxSamplersPerShaderStage',
      'maxStorageBuffersPerShaderStage', 'maxStorageTexturesPerShaderStage',
      'maxUniformBuffersPerShaderStage', 'maxUniformBufferBindingSize',
      'maxStorageBufferBindingSize', 'minUniformBufferOffsetAlignment',
      'minStorageBufferOffsetAlignment', 'maxVertexBuffers', 'maxBufferSize',
      'maxVertexAttributes', 'maxVertexBufferArrayStride', 'maxInterStageShaderVariables',
      'maxColorAttachments', 'maxColorAttachmentBytesPerSample', 'maxComputeWorkgroupStorageSize',
      'maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupSizeX',
      'maxComputeWorkgroupSizeY', 'maxComputeWorkgroupSizeZ',
      'maxComputeWorkgroupsPerDimension'
    ];
    var limits = {};
    for (var i = 0; i < limitNames.length; i++) {
      try { limits[limitNames[i]] = adapter.limits[limitNames[i]]; } catch (e) { /* skip */ }
    }

    return {
      available: true,
      adapter: true,
      info: info,
      features: adapter.features ? Array.from(adapter.features).sort() : [],
      limits: limits
    };
  }, 3000);

  // --- audio ---------------------------------------------------------------

  add('audio.offline', 'audio', 'OfflineAudioContext', 'hard', async function () {
    var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Offline) return null;
    var context = new Offline(1, 11025, 44100);
    var oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 10000;

    var compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    var buffer = await new Promise(function (resolve, reject) {
      var result;
      try { result = context.startRendering(); } catch (e) { reject(e); return; }
      if (result && typeof result.then === 'function') {
        result.then(resolve, reject);
      } else {
        context.oncomplete = function (event) { resolve(event.renderedBuffer); };
      }
    });

    var data = buffer.getChannelData(0);
    var sliceStart = 4500;
    var sliceEnd = Math.min(5000, data.length);
    var sliceSum = 0;
    var sum = 0;
    var samples = [];
    for (var i = 0; i < data.length; i++) {
      var absVal = Math.abs(data[i]);
      sum += absVal;
      if (i >= sliceStart && i < sliceEnd) sliceSum += absVal;
      if (i % 441 === 0) samples.push(Number(data[i].toPrecision(12)));
    }

    var sliceView = new Float32Array(data.subarray(sliceStart, sliceEnd));
    var sliceHash = hashBytes(new Uint8Array(sliceView.buffer));

    var copyMatch = null;
    if (typeof buffer.copyFromChannel === 'function') {
      try {
        var copied = new Float32Array(sliceEnd - sliceStart);
        buffer.copyFromChannel(copied, 0, sliceStart);
        copyMatch = hashBytes(new Uint8Array(copied.buffer)) === sliceHash;
      } catch (e) {
        copyMatch = false;
      }
    }

    return {
      sum: Number(sum.toPrecision(15)),
      sliceSum: Number(sliceSum.toPrecision(15)),
      sliceHash: sliceHash,
      copyMatch: copyMatch,
      samples: samples,
      sampleRate: buffer.sampleRate,
      length: buffer.length
    };
  }, 4000);

  add('audio.context', 'audio', 'AudioContext-параметры', 'hard', function () {
    var AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    var context;
    try { context = new AudioCtor(); } catch (e) { return { error: errText(e) }; }
    var out = {
      sampleRate: context.sampleRate,
      maxChannelCount: safe(function () { return context.destination.maxChannelCount; }, null),
      baseLatency: context.baseLatency ?? null
    };
    try { var closing = context.close(); if (closing && closing.catch) closing.catch(function () {}); } catch (e) { /* ignore */ }
    return out;
  });

  add('audio.worklet', 'audio', 'AudioWorklet', 'hard', function () {
    var proto = window.AudioContext ? window.AudioContext.prototype : null;
    var descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'audioWorklet') : null;
    return {
      audioWorklet: !!descriptor,
      audioWorkletNode: !!window.AudioWorkletNode
    };
  });

  // --- fonts ---------------------------------------------------------------

  var FONT_LIST = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold', 'Baskerville',
    'Bodoni 72', 'Bookman Old Style', 'Calibri', 'Cambria', 'Candara',
    'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
    'Courier New', 'Didot', 'Franklin Gothic Medium', 'Futura', 'Garamond',
    'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Hoefler Text',
    'Impact', 'Lucida Console', 'Lucida Grande', 'Lucida Sans Unicode',
    'Marker Felt', 'Menlo', 'Monaco', 'MS Gothic', 'MS Sans Serif', 'MS Serif',
    'Optima', 'Palatino', 'Palatino Linotype', 'Papyrus', 'PingFang SC',
    'Roboto', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'SimSun', 'Tahoma',
    'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings',
    'Noto Sans', 'Noto Serif', 'Noto Color Emoji', 'Apple Color Emoji',
    'Apple SD Gothic Neo', 'Hiragino Sans', 'Hiragino Mincho ProN', 'Songti SC',
    'Heiti SC', 'STHeiti', 'DejaVu Sans', 'Liberation Sans', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Source Sans Pro', 'Open Sans', 'Lato',
    'Montserrat', 'Poppins', 'Inter', 'SF Pro Display', 'SF Pro Text',
    'Ubuntu Mono', 'DejaVu Sans Mono', 'Liberation Mono', 'Courier',
    'Cousine', 'Arimo', 'Tinos', 'Carlito', 'Caladea'
  ];

  function detectFonts() {
    if (passFontsCache) return passFontsCache;
    var pair = newCanvas(600, 80);
    var ctx = pair.ctx;
    var text = 'mmmmmmmmmmlliWWQ@#%&';
    var fallbacks = ['monospace', 'serif', 'sans-serif'];
    var base = {};
    for (var f = 0; f < fallbacks.length; f++) {
      ctx.font = '72px ' + fallbacks[f];
      base[fallbacks[f]] = ctx.measureText(text).width;
    }

    var available = [];
    var metrics = {};
    for (var i = 0; i < FONT_LIST.length; i++) {
      var font = FONT_LIST[i];
      var widths = [];
      var present = false;
      for (var j = 0; j < fallbacks.length; j++) {
        ctx.font = '72px "' + font + '", ' + fallbacks[j];
        var width = ctx.measureText(text).width;
        widths.push(Number(width.toFixed(3)));
        if (Math.abs(width - base[fallbacks[j]]) > 0.02) present = true;
      }
      if (present) {
        available.push(font);
        metrics[font] = widths;
      }
    }
    passFontsCache = { available: available, metrics: metrics };
    return passFontsCache;
  }

  add('fonts.available', 'fonts', 'Установленные шрифты', 'hard', function () {
    return detectFonts();
  });

  add('fonts.dom', 'fonts', 'DOM-метрики и системные шрифты', 'hard', function () {
    if (!document.body) return null;
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap;';
    document.body.appendChild(host);
    try {
      var sampleText = 'mmmmmmmmmmlliWWQ@#%& 0123';
      var probes = ['monospace', 'serif', 'sans-serif', 'system-ui', '"Arial", sans-serif', '"Segoe UI", sans-serif', '"Helvetica Neue", sans-serif', '"DejaVu Sans", sans-serif'];
      var domMetrics = {};
      for (var i = 0; i < probes.length; i++) {
        var span = document.createElement('span');
        span.style.font = '48px ' + probes[i];
        span.textContent = sampleText;
        host.appendChild(span);
        var rect = span.getBoundingClientRect();
        domMetrics[probes[i]] = [span.offsetWidth, span.offsetHeight, Number(rect.width.toFixed(3)), Number(rect.height.toFixed(3))];
      }
      var systemKeywords = ['caption', 'menu', 'message-box', 'small-caption', 'status-bar'];
      var systemFonts = {};
      for (var k = 0; k < systemKeywords.length; k++) {
        var el = document.createElement('span');
        el.style.font = systemKeywords[k];
        host.appendChild(el);
        var cs = window.getComputedStyle(el);
        systemFonts[systemKeywords[k]] = cs ? cs.fontFamily : null;
      }
      var checkList = ['Arial', 'Segoe UI', 'Helvetica Neue', 'SF Pro Text', 'Roboto', 'DejaVu Sans', 'Liberation Sans', 'Noto Sans'];
      var fontChecks = {};
      if (document.fonts && typeof document.fonts.check === 'function') {
        for (var c = 0; c < checkList.length; c++) {
          fontChecks[checkList[c]] = safe(function () { return document.fonts.check('16px "' + checkList[c] + '"'); }, null);
        }
      }
      return {
        domMetrics: domMetrics,
        systemFonts: systemFonts,
        fontChecks: fontChecks,
        queryLocalFonts: typeof window.queryLocalFonts === 'function'
      };
    } finally {
      host.remove();
    }
  });

  add('fonts.emoji', 'fonts', 'Emoji-рендеринг', 'hard', function () {
    var pair = newCanvas(420, 80);
    var ctx = pair.ctx;
    ctx.font = '32px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    var text = '😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚';
    ctx.fillStyle = '#000';
    ctx.fillText(text, 4, 48);
    var metrics = ctx.measureText(text);
    return {
      width: metrics.width,
      ascent: metrics.actualBoundingBoxAscent,
      descent: metrics.actualBoundingBoxDescent,
      urlHash: hashString(pair.canvas.toDataURL('image/png'))
    };
  });

  // --- JS engine -----------------------------------------------------------

  add('js.math', 'js', 'Math-функции и NaN', 'hard', function () {
    var cases = [
      ['sin', Math.sin, 0.1], ['sinHuge', Math.sin, 1e300],
      ['cos', Math.cos, 0.1], ['cosHuge', Math.cos, 1e300],
      ['tan', Math.tan, 0.1], ['tanHuge', Math.tan, -1e300],
      ['asin', Math.asin, 0.5], ['acos', Math.acos, 0.5], ['atan', Math.atan, 0.5],
      ['atan2', Math.atan2, 1, 3], ['atan2Tiny', Math.atan2, 1e-300, -1e-300],
      ['exp', Math.exp, 0.1], ['expm1', Math.expm1, 1],
      ['log', Math.log, 10], ['log1p', Math.log1p, 0.1], ['log2', Math.log2, 3],
      ['log10', Math.log10, 1000], ['pow', Math.pow, 2, 0.5], ['powPi', Math.pow, Math.PI, -100],
      ['sqrt', Math.sqrt, 2], ['cbrt', Math.cbrt, 2], ['hypot', Math.hypot, 3, 4],
      ['sinh', Math.sinh, 1], ['cosh', Math.cosh, 1], ['tanh', Math.tanh, 0.1],
      ['asinh', Math.asinh, 1e300], ['acosh', Math.acosh, 1e300], ['atanh', Math.atanh, 0.5],
      ['fround', Math.fround, 0.1], ['imul', Math.imul, 0xffffffff, 5], ['clz32', Math.clz32, 1]
    ];
    var out = {};
    for (var i = 0; i < cases.length; i++) {
      var item = cases[i];
      var value = item[1](item[2], item[3]);
      out[item[0]] = Number.isFinite(value) ? Number(value.toPrecision(17)) : String(value);
    }
    var nanBuf = new Float64Array([0 / 0]);
    out.nanBytes = Array.from(new Uint8Array(nanBuf.buffer));
    return out;
  });

  add('js.number', 'js', 'Числа и парсинг', 'hard', function () {
    return {
      pointOne: 0.1 + 0.2,
      third: 1 / 3,
      pi: Math.PI,
      e: Math.E,
      epsilon: Number.EPSILON,
      maxSafeInteger: Number.MAX_SAFE_INTEGER,
      big: (1e21).toString(),
      small: (1e-7).toString(),
      parsed: parseFloat('1.2e3'),
      parsedInt: parseInt('08', 10),
      nan: Number.isNaN(NaN),
      negativeZero: Object.is(-0, -0),
      string: (123.456).toString()
    };
  });

  add('js.error', 'js', 'Error stack и sourceURL', 'hard', function () {
    var error = new Error('fp');
    var stack = error.stack || '';
    var sourceUrlLeak = /pptr:\/\/|UtilityScript|__playwright_evaluation_script__|__puppeteer_evaluation_script__/i.test(stack);
    return {
      name: error.name,
      message: error.message,
      stackLimit: Error.stackTraceLimit,
      stackLines: stack.split('\n').length,
      hasAt: stack.indexOf('    at ') !== -1,
      hasEval: stack.indexOf('eval') !== -1,
      hasPrepareStackTrace: typeof Error.prepareStackTrace === 'function',
      sourceUrlLeak: sourceUrlLeak
    };
  });

  add('js.native', 'js', 'Native code / подмена функций', 'hard', function () {
    function getterOf(proto, prop) {
      if (!proto) return null;
      var desc = Object.getOwnPropertyDescriptor(proto, prop);
      return desc && typeof desc.get === 'function' ? desc.get : null;
    }
    var navProto = typeof Navigator !== 'undefined' ? Navigator.prototype : null;
    var screenProto = typeof Screen !== 'undefined' ? Screen.prototype : null;
    var entries = [
      ['Function.prototype.toString', Function.prototype.toString],
      ['Math.sin', Math.sin],
      ['Array.prototype.map', Array.prototype.map],
      ['Promise', Promise],
      ['fetch', window.fetch],
      ['setTimeout', setTimeout],
      ['RTCPeerConnection', window.RTCPeerConnection],
      ['navigator.getBattery', navigator.getBattery],
      ['Navigator.webdriver.get', getterOf(navProto, 'webdriver')],
      ['Navigator.userAgent.get', getterOf(navProto, 'userAgent')],
      ['Navigator.platform.get', getterOf(navProto, 'platform')],
      ['Navigator.hardwareConcurrency.get', getterOf(navProto, 'hardwareConcurrency')],
      ['Navigator.languages.get', getterOf(navProto, 'languages')],
      ['Navigator.plugins.get', getterOf(navProto, 'plugins')],
      ['Navigator.deviceMemory.get', getterOf(navProto, 'deviceMemory')],
      ['Screen.width.get', getterOf(screenProto, 'width')],
      ['Screen.height.get', getterOf(screenProto, 'height')],
      ['HTMLCanvasElement.toDataURL', typeof HTMLCanvasElement !== 'undefined' ? HTMLCanvasElement.prototype.toDataURL : null],
      ['Canvas2D.getImageData', typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.getImageData : null],
      ['WebGL.getParameter', typeof WebGLRenderingContext !== 'undefined' ? WebGLRenderingContext.prototype.getParameter : null],
      ['AudioBuffer.getChannelData', typeof AudioBuffer !== 'undefined' ? AudioBuffer.prototype.getChannelData : null]
    ];
    var nativeRe = /^function\s+[^(\n]*\(\)\s*\{\s*\[native code\]\s*\}$/;
    var funcs = {};
    var nonNative = [];
    for (var i = 0; i < entries.length; i++) {
      var name = entries[i][0];
      var fn = entries[i][1];
      if (typeof fn !== 'function') { funcs[name] = null; continue; }
      var src = Function.prototype.toString.call(fn).slice(0, 300);
      funcs[name] = src;
      if (!nativeRe.test(src)) nonNative.push(name);
    }
    var webdriverOwnProp = Object.prototype.hasOwnProperty.call(navigator, 'webdriver');
    return {
      funcs: funcs,
      nonNative: nonNative,
      webdriverOwnProp: webdriverOwnProp,
      allNative: nonNative.length === 0 && !webdriverOwnProp
    };
  });

  add('js.proxy', 'js', 'Proxy / Reflect', 'hard', function () {
    var proxy = new Proxy({ a: 1 }, {
      get: function (target, key) {
        if (key === 'a') return 2;
        return Reflect.get(target, key);
      }
    });
    return {
      proxyType: typeof Proxy,
      revocable: typeof Proxy.revocable,
      toString: Object.prototype.toString.call(proxy),
      value: proxy.a,
      keys: Reflect.ownKeys(proxy).map(String),
      proxyName: Proxy.name,
      reflectKeys: Object.getOwnPropertyNames(Reflect).sort()
    };
  });

  add('js.wasm', 'js', 'WebAssembly', 'hard', function () {
    if (typeof WebAssembly === 'undefined') return null;
    var module = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    return {
      validate: WebAssembly.validate(module),
      compile: typeof WebAssembly.compile,
      compileStreaming: typeof WebAssembly.compileStreaming,
      instantiateStreaming: typeof WebAssembly.instantiateStreaming,
      module: typeof WebAssembly.Module,
      memory: typeof WebAssembly.Memory,
      table: typeof WebAssembly.Table
    };
  });

  add('misc.url', 'js', 'URL & OS-когерентность', 'hard', function () {
    return {
      windowsDriveProtocol: safe(function () { return new URL('C:/').protocol; }, null),
      fileUrlPath: safe(function () { return new URL('file:///C:/').pathname; }, null),
      screenIsExtended: screen.isExtended ?? null,
      onLine: navigator.onLine,
      historyPositive: history.length >= 1
    };
  });

  // --- CSS -----------------------------------------------------------------

  add('css.supports', 'css', 'CSS.supports', 'hard', function () {
    var properties = [
      'display:grid', 'display:flex', 'gap:1px', 'aspect-ratio:1',
      'backdrop-filter:blur(1px)', 'color:color(display-p3 1 0 0)',
      'container-type:inline-size', 'text-wrap:balance',
      'view-transition-name:x', 'field-sizing:content', 'anchor-name:--a',
      'scrollbar-gutter:stable', 'font-variation-settings:"wght" 400',
      '-webkit-backdrop-filter:blur(1px)', 'user-select:none',
      'overscroll-behavior:contain', 'position:sticky', 'inset:0',
      'd:path("M0 0")', 'paint-order:stroke', 'ruby-position:over',
      'math-depth:1', 'color-scheme:dark', 'forced-color-adjust:none',
      'accent-color:red', 'caret-color:red', 'scrollbar-color:red blue',
      'text-box:trim-both cap alphabetic', 'interpolate-size:allow-keywords'
    ];
    var selectors = [':has(*)', ':is(a,b)', ':where(a)', ':focus-visible', '::backdrop'];
    var out = { properties: {}, selectors: {} };
    for (var i = 0; i < properties.length; i++) {
      try { out.properties[properties[i]] = CSS.supports(properties[i]); }
      catch (e) { out.properties[properties[i]] = 'err'; }
    }
    for (var j = 0; j < selectors.length; j++) {
      try { out.selectors[selectors[j]] = CSS.supports('selector(' + selectors[j] + ')'); }
      catch (e) { out.selectors[selectors[j]] = 'err'; }
    }
    return out;
  });

  add('css.api', 'css', 'CSS API', 'hard', function () {
    return {
      escape: typeof CSS.escape,
      registerProperty: typeof CSS.registerProperty,
      supports: typeof CSS.supports,
      paintWorklet: !!(CSS.paintWorklet),
      highlights: typeof CSS.highlights
    };
  });

  // --- media ---------------------------------------------------------------

  add('media.canPlay', 'media', 'Кодеки: canPlayType', 'hard', function () {
    var video = document.createElement('video');
    var types = [
      'video/mp4; codecs="avc1.42E01E"',
      'video/mp4; codecs="hvc1"',
      'video/mp4; codecs="av01.0.05M.08"',
      'video/webm; codecs="vp8"',
      'video/webm; codecs="vp9"',
      'video/ogg; codecs="theora"',
      'audio/mpeg',
      'audio/ogg; codecs="vorbis"',
      'audio/wav; codecs="1"',
      'audio/flac',
      'audio/mp4; codecs="mp4a.40.2"'
    ];
    var out = {};
    for (var i = 0; i < types.length; i++) out[types[i]] = video.canPlayType(types[i]);
    return out;
  });

  add('media.capabilities', 'media', 'MediaCapabilities и MediaSource', 'hard', async function () {
    var mse = {};
    if (typeof MediaSource !== 'undefined' && typeof MediaSource.isTypeSupported === 'function') {
      var mseTypes = [
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4; codecs="av01.0.05M.08"',
        'video/webm; codecs="vp9"',
        'audio/mp4; codecs="mp4a.40.2"',
        'audio/webm; codecs="opus"'
      ];
      for (var m = 0; m < mseTypes.length; m++) {
        mse[mseTypes[m]] = safe(function () { return MediaSource.isTypeSupported(mseTypes[m]); }, null);
      }
    }
    var decoding = null;
    if (navigator.mediaCapabilities && typeof navigator.mediaCapabilities.decodingInfo === 'function') {
      var configs = [
        ['h264', { type: 'file', video: { contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 2000000, framerate: 30 } }],
        ['vp9', { type: 'file', video: { contentType: 'video/webm; codecs="vp09.00.10.08"', width: 1920, height: 1080, bitrate: 2000000, framerate: 30 } }],
        ['av1', { type: 'file', video: { contentType: 'video/mp4; codecs="av01.0.05M.08"', width: 1920, height: 1080, bitrate: 2000000, framerate: 30 } }],
        ['hevc', { type: 'file', video: { contentType: 'video/mp4; codecs="hvc1.1.6.L93.B0"', width: 1920, height: 1080, bitrate: 2000000, framerate: 30 } }],
        ['aac', { type: 'file', audio: { contentType: 'audio/mp4; codecs="mp4a.40.2"', channels: 2, bitrate: 128000, samplerate: 48000 } }],
        ['opus', { type: 'file', audio: { contentType: 'audio/webm; codecs="opus"', channels: 2, bitrate: 128000, samplerate: 48000 } }]
      ];
      decoding = {};
      for (var i = 0; i < configs.length; i++) {
        try {
          var info = await navigator.mediaCapabilities.decodingInfo(configs[i][1]);
          decoding[configs[i][0]] = {
            supported: !!info.supported,
            smooth: !!info.smooth,
            powerEfficient: !!info.powerEfficient
          };
        } catch (e) {
          decoding[configs[i][0]] = { error: errText(e) };
        }
      }
    }
    return { mse: mse, decoding: decoding };
  }, 3000);

  add('media.recorder', 'media', 'MediaRecorder', 'hard', function () {
    if (typeof MediaRecorder === 'undefined') return null;
    var types = [
      'video/webm', 'video/webm;codecs=vp8', 'video/webm;codecs=vp9',
      'video/mp4', 'audio/webm', 'audio/ogg', 'audio/mp4'
    ];
    var out = {};
    for (var i = 0; i < types.length; i++) out[types[i]] = MediaRecorder.isTypeSupported(types[i]);
    return out;
  });

  function enumerateMediaDevices() {
    return Promise.race([
      navigator.mediaDevices.enumerateDevices(),
      delay(900).then(function () { return null; })
    ]);
  }

  add('media.devices', 'media', 'Media devices', 'context', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return null;
    var devices = await enumerateMediaDevices();
    if (!devices) return { available: false };
    var out = devices.map(function (device) {
      return { kind: device.kind, hasLabel: !!device.label };
    });
    out.sort(function (a, b) {
      var ka = a.kind + ':' + a.hasLabel;
      var kb = b.kind + ':' + b.hasLabel;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return out;
  }, 2000);

  function loadVoices() {
    return new Promise(function (resolve) {
      var started = performance.now();
      function check() {
        var voices = [];
        try { voices = speechSynthesis.getVoices(); } catch (e) { resolve([]); return; }
        if (voices.length || performance.now() - started > 2200) {
          resolve(voices);
        } else {
          setTimeout(check, 120);
        }
      }
      check();
    });
  }

  add('media.voices', 'media', 'SpeechSynthesis voices', 'context', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (!window.speechSynthesis) return null;
    var voices = await loadVoices();
    var out = voices.map(function (voice) {
      return { name: voice.name, lang: voice.lang, local: voice.localService, def: voice.default };
    });
    out.sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
    return out;
  }, 3000);

  // --- hardware / APIs -----------------------------------------------------

  add('hw.apis', 'hardware', 'Доступные API', 'hard', function () {
    return {
      bluetooth: !!navigator.bluetooth,
      usb: !!navigator.usb,
      hid: !!navigator.hid,
      serial: !!navigator.serial,
      wakeLock: !!navigator.wakeLock,
      share: !!navigator.share,
      clipboard: !!navigator.clipboard,
      credentials: !!navigator.credentials,
      serviceWorker: !!navigator.serviceWorker,
      geolocation: !!navigator.geolocation,
      mediaDevices: !!navigator.mediaDevices,
      keyboard: !!navigator.keyboard,
      paymentRequest: !!window.PaymentRequest,
      webgpu: !!navigator.gpu
    };
  });

  add('hw.heapLimit', 'hardware', 'JS Heap Limit (hard)', 'hard', function () {
    if (!performance.memory) return null;
    return {
      bytes: performance.memory.jsHeapSizeLimit,
      mib: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    };
  });

  add('hw.keyboard', 'hardware', 'Keyboard layout map', 'hard', async function () {
    if (!navigator.keyboard || typeof navigator.keyboard.getLayoutMap !== 'function') {
      return { available: false };
    }
    try {
      var layout = await navigator.keyboard.getLayoutMap();
      var keys = ['KeyQ', 'KeyW', 'KeyA', 'KeyZ', 'Backquote', 'Minus'];
      var sample = {};
      for (var i = 0; i < keys.length; i++) sample[keys[i]] = layout.get(keys[i]) ?? null;
      return {
        available: true,
        size: layout.size,
        sample: sample
      };
    } catch (e) {
      return { available: true, error: errText(e) };
    }
  }, 2000);

  add('hw.connection', 'volatile', 'NetworkInformation', 'volatile', function () {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return null;
    return {
      effectiveType: connection.effectiveType ?? null,
      rtt: connection.rtt ?? null,
      downlink: connection.downlink ?? null,
      saveData: connection.saveData ?? null,
      type: connection.type ?? null
    };
  });

  add('hw.battery', 'volatile', 'Battery', 'volatile', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (typeof navigator.getBattery !== 'function') return null;
    var battery = await Promise.race([
      navigator.getBattery(),
      delay(800).then(function () { return null; })
    ]);
    if (!battery) return { available: false };
    return {
      charging: battery.charging,
      level: Number(battery.level.toFixed(2)),
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime
    };
  }, 1500);

  add('hw.gamepads', 'hardware', 'Gamepads', 'context', function () {
    if (!navigator.getGamepads) return null;
    return navigator.getGamepads().length;
  });

  add('hw.storage', 'hardware', 'Storage / cookies', 'context', async function () {
    var out = { localStorage: false, sessionStorage: false, indexedDB: !!window.indexedDB, cookie: false };
    try {
      localStorage.setItem('__fp_audit__', '1');
      out.localStorage = localStorage.getItem('__fp_audit__') === '1';
      localStorage.removeItem('__fp_audit__');
    } catch (e) { /* ignore */ }
    try {
      sessionStorage.setItem('__fp_audit__', '1');
      out.sessionStorage = sessionStorage.getItem('__fp_audit__') === '1';
      sessionStorage.removeItem('__fp_audit__');
    } catch (e) { /* ignore */ }
    try {
      document.cookie = '__fp_audit__=1; SameSite=Lax; path=/';
      out.cookie = document.cookie.indexOf('__fp_audit__=1') !== -1;
      document.cookie = '__fp_audit__=; Max-Age=0; path=/';
    } catch (e) { /* ignore */ }
    if (!IS_FILE && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        var estimate = await Promise.race([
          navigator.storage.estimate(),
          delay(800).then(function () { return null; })
        ]);
        out.quota = estimate ? (estimate.quota ?? null) : null;
      } catch (e) { /* ignore */ }
    }
    return out;
  }, 2500);

  add('hw.permissions', 'hardware', 'Permissions API', 'context', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (!navigator.permissions || !navigator.permissions.query) return null;
    var names = [
      'notifications', 'geolocation', 'camera', 'microphone', 'clipboard-read',
      'clipboard-write', 'midi', 'push', 'persistent-storage', 'screen-wake-lock',
      'accelerometer', 'gyroscope', 'magnetometer'
    ];
    var results = await Promise.all(names.map(function (name) {
      return new Promise(function (resolve) {
        var timer = setTimeout(function () { resolve('timeout'); }, 350);
        try {
          navigator.permissions.query({ name: name }).then(function (status) {
            clearTimeout(timer);
            resolve(status.state);
          }, function () {
            clearTimeout(timer);
            resolve('n/a');
          });
        } catch (e) {
          clearTimeout(timer);
          resolve('n/a');
        }
      });
    }));
    var out = {};
    for (var i = 0; i < names.length; i++) out[names[i]] = results[i];
    return out;
  }, 2000);

  add('hw.memory', 'volatile', 'performance.memory', 'volatile', function () {
    if (!performance.memory) return null;
    return {
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576)
    };
  });

  // --- automation ----------------------------------------------------------

  add('auto.chrome', 'automation', 'window.chrome', 'hard', function () {
    var chrome = window.chrome;
    if (!chrome) return null;
    return {
      keys: Object.keys(chrome).sort(),
      app: !!chrome.app,
      runtime: !!chrome.runtime,
      loadTimes: typeof chrome.loadTimes,
      csi: typeof chrome.csi
    };
  });

  add('auto.cdp', 'automation', 'CDP / automation-артефакты', 'hard', function () {
    var patterns = [
      '__playwright', '__puppeteer', '__pw_manual', '__pwinitscripts', '__nightmare',
      '_phantom', 'callselenium', '_selenium', '__selenium', '$cdc_', 'cdc_', '$wdc_',
      'domautomation', '__webdriver', '__driver_evaluate', '__fxdriver',
      '__lastwatiralert', '__ombra', 'webdriver'
    ];
    var hits = [];
    var sources = [window, document];
    for (var s = 0; s < sources.length; s++) {
      var names = Object.getOwnPropertyNames(sources[s]);
      var keys = safe(function () { return Object.keys(sources[s]); }, []);
      for (var k = 0; k < keys.length; k++) {
        if (names.indexOf(keys[k]) === -1) names.push(keys[k]);
      }
      for (var i = 0; i < names.length; i++) {
        var name = names[i].toLowerCase();
        for (var p = 0; p < patterns.length; p++) {
          if (name.indexOf(patterns[p]) !== -1 && hits.indexOf(names[i]) === -1) {
            hits.push(names[i]);
            break;
          }
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(navigator, 'webdriver')) {
      hits.push('navigator.own.webdriver');
    }
    hits.sort();
    return hits;
  });

  function inferUaOs(ua) {
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Windows NT/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
    if (/CrOS/i.test(ua)) return 'chromeos';
    if (/Linux/i.test(ua)) return 'linux';
    return null;
  }

  function inferPlatformOs(plat) {
    if (!plat) return null;
    if (/^Win/i.test(plat)) return 'windows';
    if (/^Mac/i.test(plat)) return 'macos';
    if (/iPhone|iPad|iPod/i.test(plat)) return 'ios';
    if (/Android/i.test(plat)) return 'android';
    if (/Linux/i.test(plat)) return 'linux';
    return null;
  }

  function inferUaDataOs(plat) {
    if (!plat) return null;
    if (/Windows/i.test(plat)) return 'windows';
    if (/macOS/i.test(plat)) return 'macos';
    if (/Android/i.test(plat)) return 'android';
    if (/Chrome\s*OS/i.test(plat)) return 'chromeos';
    if (/iOS/i.test(plat)) return 'ios';
    if (/Linux/i.test(plat)) return 'linux';
    return null;
  }

  function inferGpuOs(renderer) {
    if (!renderer) return null;
    if (/Direct3D|D3D11|D3D9/i.test(renderer)) return 'windows';
    if (/Apple\s+M\d|Apple\s+GPU/i.test(renderer)) return 'apple';
    return null;
  }

  function inferGpuArch(renderer) {
    if (!renderer) return null;
    if (/Apple\s+M\d|Apple\s+GPU|Mali|Adreno|PowerVR/i.test(renderer)) return 'arm';
    if (/\b(Intel|NVIDIA|GeForce|Radeon|AMD)\b/i.test(renderer)) return 'x86';
    return null;
  }

  var MAC_ONLY_FONTS = [
    'Apple Color Emoji', 'Apple SD Gothic Neo', 'Bodoni 72', 'Hiragino Sans',
    'Hiragino Mincho ProN', 'Hoefler Text', 'Marker Felt', 'Menlo',
    'PingFang SC', 'SF Pro Display', 'SF Pro Text'
  ];

  var WIN_ONLY_FONTS = [
    'Segoe UI', 'Segoe Print', 'Segoe Script', 'MS Gothic', 'MS Sans Serif', 'MS Serif'
  ];

  add('auto.consistency', 'automation', 'Согласованность полей', 'hard', async function () {
    var ua = navigator.userAgent;
    var isChrome = /Chrome\//.test(ua);
    var isFirefox = /Firefox\//.test(ua);
    var isSafari = /Safari\//.test(ua) && !isChrome;
    var mobileUA = /Mobi|Android|iPhone|iPad/.test(ua);
    var uaData = navigator.userAgentData;
    var uaOs = inferUaOs(ua);
    var platformOs = inferPlatformOs(navigator.platform);
    var uaDataOs = inferUaDataOs(uaData ? uaData.platform : null);
    var glState = getGL(1);
    var unmaskedRenderer = glState ? safe(function () { return glInfo(glState.gl).unmaskedRenderer; }, null) : null;
    var gpuOs = inferGpuOs(unmaskedRenderer);
    var gpuArch = inferGpuArch(unmaskedRenderer);

    var uaArch = null;
    if (uaData && typeof uaData.getHighEntropyValues === 'function') {
      try {
        var highArch = await withTimeout(
          uaData.getHighEntropyValues(['architecture', 'bitness']),
          1200,
          'consistency.uaData'
        );
        if (highArch && typeof highArch.architecture === 'string' && highArch.architecture.trim()) {
          uaArch = highArch.architecture.trim().toLowerCase();
        }
      } catch (e) { /* ignore */ }
    }

    var navPlatformMismatch = !!(uaOs && platformOs && uaOs !== platformOs &&
      !((uaOs === 'android' || uaOs === 'chromeos') && platformOs === 'linux'));
    var uaDataPlatformMismatch = !!(uaOs && uaDataOs && uaOs !== uaDataOs);
    var uaPlatformMismatch = navPlatformMismatch || uaDataPlatformMismatch;
    var uaMobileMismatch = !!(uaData && typeof uaData.mobile === 'boolean' && uaData.mobile !== mobileUA);
    var gpuOsMismatch = !!(uaOs && gpuOs && (
      (gpuOs === 'windows' && uaOs !== 'windows') ||
      (gpuOs === 'apple' && uaOs !== 'macos' && uaOs !== 'ios')
    ));

    var platStr = String(navigator.platform || '');
    var platformHasX86 = /x86_64|amd64|i[3-6]86/i.test(platStr) || /Linux\s+x86_64/i.test(ua);
    var platformHasArm = /aarch64|armv\d/i.test(platStr);
    var uaArchMismatch = !!(uaArch && (
      (platformHasX86 && uaArch === 'arm') ||
      (platformHasArm && uaArch === 'x86') ||
      (uaOs === 'windows' && uaArch === 'arm' && gpuArch === 'x86') ||
      (uaArch === 'x86' && gpuArch === 'arm')
    ));

    var hasInner = typeof window.innerWidth === 'number' && typeof window.innerHeight === 'number';
    var hasOuter = typeof window.outerWidth === 'number' && typeof window.outerHeight === 'number';
    var innerExceedsOuter = !!(hasInner && hasOuter && window.outerWidth > 0 && window.outerHeight > 0 &&
      (window.innerWidth > window.outerWidth || window.innerHeight > window.outerHeight));
    var windowExceedsScreen = !!(!screen.isExtended && screen.width > 0 && screen.height > 0 && (
      (hasInner && (window.innerWidth > screen.width || window.innerHeight > screen.height)) ||
      (hasOuter && (window.outerWidth > screen.width || window.outerHeight > screen.height))
    ));

    var detectedFonts = safe(function () { return detectFonts().available || []; }, []);
    var osFontLeak = [];
    if (uaOs && detectedFonts.length) {
      if (uaOs !== 'macos' && uaOs !== 'ios') {
        for (var mf = 0; mf < MAC_ONLY_FONTS.length; mf++) {
          if (detectedFonts.indexOf(MAC_ONLY_FONTS[mf]) !== -1) osFontLeak.push(MAC_ONLY_FONTS[mf]);
        }
      }
      if (uaOs !== 'windows') {
        for (var wf = 0; wf < WIN_ONLY_FONTS.length; wf++) {
          if (detectedFonts.indexOf(WIN_ONLY_FONTS[wf]) !== -1) osFontLeak.push(WIN_ONLY_FONTS[wf]);
        }
      }
    }
    osFontLeak.sort();
    var osFontMismatch = osFontLeak.length > 0;
    var webdriverOwnProp = Object.prototype.hasOwnProperty.call(navigator, 'webdriver');

    return {
      isChrome: isChrome,
      isFirefox: isFirefox,
      isSafari: isSafari,
      mobileUA: mobileUA,
      platform: navigator.platform,
      uaPlatform: uaData ? uaData.platform : null,
      uaMobile: uaData ? uaData.mobile : null,
      uaOs: uaOs,
      platformOs: platformOs,
      uaDataOs: uaDataOs,
      gpuOs: gpuOs,
      uaArch: uaArch,
      gpuArch: gpuArch,
      touchPoints: navigator.maxTouchPoints,
      plugins: navigator.plugins.length,
      mimeTypes: navigator.mimeTypes.length,
      languages: navigator.languages.length,
      chromeObject: !!window.chrome,
      outerZero: window.outerWidth === 0 || window.outerHeight === 0,
      screenZero: screen.width === 0 || screen.height === 0,
      innerExceedsOuter: innerExceedsOuter,
      windowExceedsScreen: windowExceedsScreen,
      mobileNoTouch: mobileUA && navigator.maxTouchPoints === 0,
      chromeNoPlugins: isChrome && !mobileUA && navigator.plugins.length === 0,
      uaPlatformMismatch: uaPlatformMismatch,
      uaMobileMismatch: uaMobileMismatch,
      uaArchMismatch: uaArchMismatch,
      gpuOsMismatch: gpuOsMismatch,
      osFontLeak: osFontLeak,
      osFontMismatch: osFontMismatch,
      webdriverOwnProp: webdriverOwnProp,
      webdriver: navigator.webdriver === true
    };
  }, 2500);

  add('auto.headless', 'automation', 'Headless-эвристики', 'hard', function () {
    var mobileUA = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
    return {
      webdriver: navigator.webdriver === true,
      uaHeadless: /HeadlessChrome/.test(navigator.userAgent),
      outerZero: window.outerWidth === 0 || window.outerHeight === 0,
      screenZero: screen.width === 0 || screen.height === 0,
      noChrome: !window.chrome,
      pluginsZero: !mobileUA && navigator.plugins.length === 0,
      languagesZero: navigator.languages.length === 0
    };
  });

  add('auto.runtimeLeak', 'automation', 'CDP Runtime.enable leak', 'hard', function () {
    var leaked = false;
    try {
      var probeError = new Error('rt-probe');
      Object.defineProperty(probeError, 'stack', {
        configurable: true,
        get: function () {
          leaked = true;
          return '';
        }
      });
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(probeError);
      }
    } catch (e) { /* ignore */ }
    return { leaked: leaked };
  });

  add('auto.permissions', 'automation', 'Notification vs Permissions', 'hard', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (!navigator.permissions || !navigator.permissions.query) return null;
    var queryState = await new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve('timeout'); }, 800);
      try {
        navigator.permissions.query({ name: 'notifications' }).then(function (status) {
          clearTimeout(timer);
          resolve(status.state);
        }, function () {
          clearTimeout(timer);
          resolve('n/a');
        });
      } catch (e) {
        clearTimeout(timer);
        resolve('n/a');
      }
    });
    var notification = (window.Notification && window.Notification.permission) || 'n/a';
    var normalizedQuery = queryState === 'prompt' ? 'default' : queryState;
    if (normalizedQuery === 'timeout') normalizedQuery = 'n/a';
    return {
      query: queryState,
      notification: notification,
      mismatch: normalizedQuery !== 'n/a' && notification !== 'n/a' && normalizedQuery !== notification
    };
  }, 1500);

  // --- cross-context agreement (L5-02) -------------------------------------

  function renderOffscreenSampleHash() {
    if (typeof OffscreenCanvas === 'undefined') return null;
    try {
      var c = new OffscreenCanvas(64, 32);
      var ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#1d3557';
      ctx.fillRect(0, 0, 64, 32);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(6, 6, 24, 20);
      ctx.fillStyle = '#f1faee';
      ctx.font = '12px sans-serif';
      ctx.fillText('ctx42', 10, 20);
      var bytes = ctx.getImageData(0, 0, 64, 32).data;
      return hashBytes(bytes);
    } catch (e) {
      return null;
    }
  }

  function runDedicatedWorkerProbe() {
    if (IS_FILE) return Promise.resolve({ skipped: 'file-origin' });
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
      return Promise.resolve({ available: false });
    }
    var workerSource = [
      'self.onmessage = function () {',
      '  function hashBytes(bytes) {',
      '    var h1 = 0x811c9dc5, h2 = 0x9e3779b9;',
      '    for (var i = 0; i < bytes.length; i++) {',
      '      h1 = Math.imul(h1 ^ bytes[i], 16777619);',
      '      h2 = Math.imul(h2 ^ bytes[i], 2246822519);',
      '    }',
      '    return ("00000000" + (h1 >>> 0).toString(16)).slice(-8) + ("00000000" + (h2 >>> 0).toString(16)).slice(-8);',
      '  }',
      '  var offscreenHash = null;',
      '  if (typeof OffscreenCanvas !== "undefined") {',
      '    try {',
      '      var c = new OffscreenCanvas(64, 32);',
      '      var ctx = c.getContext("2d");',
      '      if (ctx) {',
      '        ctx.fillStyle = "#1d3557"; ctx.fillRect(0, 0, 64, 32);',
      '        ctx.fillStyle = "#e63946"; ctx.fillRect(6, 6, 24, 20);',
      '        ctx.fillStyle = "#f1faee"; ctx.font = "12px sans-serif"; ctx.fillText("ctx42", 10, 20);',
      '        offscreenHash = hashBytes(ctx.getImageData(0, 0, 64, 32).data);',
      '      }',
      '    } catch (e) { offscreenHash = null; }',
      '  }',
      '  var intl = Intl.DateTimeFormat().resolvedOptions();',
      '  var uaData = navigator.userAgentData;',
      '  self.postMessage({',
      '    userAgent: navigator.userAgent,',
      '    platform: navigator.platform,',
      '    language: navigator.language,',
      '    languages: Array.from(navigator.languages || []),',
      '    hardwareConcurrency: navigator.hardwareConcurrency ?? null,',
      '    deviceMemory: navigator.deviceMemory ?? null,',
      '    uaPlatform: uaData ? uaData.platform : null,',
      '    uaMobile: uaData ? uaData.mobile : null,',
      '    timeZone: intl.timeZone,',
      '    locale: intl.locale,',
      '    offscreenHash: offscreenHash',
      '  });',
      '};'
    ].join('\n');

    var blobUrl = null;
    var worker = null;
    return new Promise(function (resolve) {
      var settled = false;
      function finish(val) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        try { if (worker) worker.terminate(); } catch (e) { /* ignore */ }
        try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch (e) { /* ignore */ }
        resolve(val);
      }
      var timer = setTimeout(function () { finish({ error: 'worker-timeout' }); }, 2000);
      try {
        var blob = new Blob([workerSource], { type: 'text/javascript' });
        blobUrl = URL.createObjectURL(blob);
        worker = new Worker(blobUrl);
        worker.onmessage = function (ev) { finish(ev.data || { error: 'empty-message' }); };
        worker.onerror = function (err) { finish({ error: err && err.message ? err.message : 'worker-error' }); };
        worker.postMessage('run');
      } catch (e) {
        finish({ error: errText(e) });
      }
    });
  }

  add('context.agreement', 'context', 'Согласованность Main / Worker / iframe (L5-02)', 'hard', async function () {
    var mainIntl = Intl.DateTimeFormat().resolvedOptions();
    var mainUaData = navigator.userAgentData;
    var main = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      webdriver: navigator.webdriver ?? null,
      language: navigator.language,
      languages: Array.from(navigator.languages || []),
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory: navigator.deviceMemory ?? null,
      uaPlatform: mainUaData ? mainUaData.platform : null,
      uaMobile: mainUaData ? mainUaData.mobile : null,
      timeZone: mainIntl.timeZone,
      locale: mainIntl.locale,
      screenWidth: screen.width,
      screenHeight: screen.height,
      offscreenHash: renderOffscreenSampleHash()
    };

    var mismatches = [];
    var worker = await runDedicatedWorkerProbe();
    var workerSkipped = skippedReason(worker);
    if (!workerSkipped && worker && !worker.error && worker.available !== false) {
      var workerFields = [
        'userAgent', 'platform', 'language', 'hardwareConcurrency', 'deviceMemory',
        'uaPlatform', 'uaMobile', 'timeZone', 'locale', 'offscreenHash'
      ];
      for (var w = 0; w < workerFields.length; w++) {
        var wf = workerFields[w];
        if (worker[wf] !== main[wf]) mismatches.push('worker.' + wf);
      }
      if (canon(worker.languages) !== canon(main.languages)) mismatches.push('worker.languages');
    } else if (!workerSkipped && worker && worker.error) {
      mismatches.push('worker.error:' + worker.error);
    }

    var iframeResult = null;
    var detachedResult = null;
    if (document.body) {
      var frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;visibility:hidden;';
      frame.src = 'about:blank';
      document.body.appendChild(frame);
      try {
        var cw = frame.contentWindow;
        if (cw && cw.navigator) {
          var fIntl = cw.Intl.DateTimeFormat().resolvedOptions();
          iframeResult = {
            userAgent: cw.navigator.userAgent,
            platform: cw.navigator.platform,
            webdriver: cw.navigator.webdriver ?? null,
            language: cw.navigator.language,
            languages: Array.from(cw.navigator.languages || []),
            hardwareConcurrency: cw.navigator.hardwareConcurrency ?? null,
            deviceMemory: cw.navigator.deviceMemory ?? null,
            timeZone: fIntl.timeZone,
            screenWidth: cw.screen.width,
            screenHeight: cw.screen.height
          };
          var iframeFields = [
            'userAgent', 'platform', 'webdriver', 'language', 'hardwareConcurrency',
            'deviceMemory', 'timeZone', 'screenWidth', 'screenHeight'
          ];
          for (var f = 0; f < iframeFields.length; f++) {
            var ff = iframeFields[f];
            if (iframeResult[ff] !== main[ff]) mismatches.push('iframe.' + ff);
          }
          if (canon(iframeResult.languages) !== canon(main.languages)) mismatches.push('iframe.languages');
        }
        frame.remove();
        if (cw) {
          detachedResult = {
            accessible: true,
            webdriver: safe(function () { return cw.navigator ? (cw.navigator.webdriver ?? null) : null; }, null),
            userAgent: safe(function () { return cw.navigator ? cw.navigator.userAgent : null; }, null),
            screenZero: safe(function () { return cw.screen ? (cw.screen.width === 0 && cw.screen.height === 0) : null; }, null)
          };
          if (detachedResult.webdriver !== null && detachedResult.webdriver !== main.webdriver) {
            mismatches.push('detached.webdriver');
          }
          if (detachedResult.userAgent && detachedResult.userAgent !== main.userAgent) {
            mismatches.push('detached.userAgent');
          }
        }
      } catch (e) {
        iframeResult = { error: errText(e) };
        mismatches.push('iframe.error:' + errText(e));
      } finally {
        try { if (frame.parentNode) frame.remove(); } catch (e) { /* ignore */ }
      }
    }

    mismatches.sort();
    return {
      workerSkipped: workerSkipped,
      workerOk: !workerSkipped && worker && !worker.error && worker.available !== false,
      iframeOk: !!(iframeResult && !iframeResult.error),
      detachedScreenZero: detachedResult ? detachedResult.screenZero : null,
      mismatches: mismatches
    };
  }, 4000);

  // --- WebRTC --------------------------------------------------------------

  add('rtc.candidates', 'webrtc', 'WebRTC host-кандидаты', 'context', async function () {
    if (IS_FILE) return { skipped: 'file-origin' };
    if (typeof RTCPeerConnection === 'undefined') return null;
    var pc = new RTCPeerConnection({ iceServers: [] });
    try {
      pc.createDataChannel('fp');
      var candidatesPromise = new Promise(function (resolve) {
        var list = [];
        var timer = setTimeout(function () { resolve(list); }, 1500);
        pc.onicecandidate = function (event) {
          if (!event.candidate) {
            clearTimeout(timer);
            resolve(list);
          } else {
            list.push(event.candidate.candidate);
          }
        };
      });
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      var candidates = await candidatesPromise;

      var types = [];
      var addressKinds = [];
      for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        var typeMatch = /\s+typ\s+([a-z0-9]+)/i.exec(candidate);
        var addressMatch = /^candidate:\S+\s+\d+\s+\S+\s+\d+\s+(\S+)\s+\d+\s+typ\s+/i.exec(candidate);
        var type = typeMatch ? typeMatch[1] : 'unknown';
        var address = addressMatch ? addressMatch[1] : '';
        var kind = !address ? 'unknown' :
          address.indexOf('.local') !== -1 ? 'mdns' :
          address.indexOf(':') !== -1 ? 'ipv6' : 'ipv4';
        if (types.indexOf(type) === -1) types.push(type);
        if (addressKinds.indexOf(kind) === -1) addressKinds.push(kind);
      }
      types.sort();
      addressKinds.sort();
      return {
        types: types,
        addressKinds: addressKinds,
        hash: hashString(types.join('|') + '|' + addressKinds.join('|'))
      };
    } finally {
      try { pc.close(); } catch (e) { /* ignore */ }
    }
  }, 3500);

  // ------------------------------------------------------------- pass runner

  async function runPass(onProgress, phase, active) {
    resetPassState();
    var out = {};
    var list = active || PROBES;
    var total = list.length;
    for (var i = 0; i < total; i++) {
      var probe = list[i];
      var started = performance.now();
      var result;
      try {
        var value = await withTimeout(
          Promise.resolve().then(probe.run),
          probe.timeout,
          probe.id
        );
        var skipped = skippedReason(value);
        result = {
          ok: true,
          s: skipped,
          v: value,
          h: hashString(canon(value)),
          ms: Number((performance.now() - started).toFixed(1))
        };
      } catch (error) {
        result = {
          ok: false,
          s: null,
          v: null,
          h: null,
          err: errText(error),
          ms: Number((performance.now() - started).toFixed(1))
        };
      }
      out[probe.id] = result;
      if (onProgress) {
        onProgress({
          phase: phase,
          done: i + 1,
          total: total,
          id: probe.id,
          group: probe.group,
          ok: result.ok
        });
      }
    }
    return out;
  }

  // --------------------------------------------------------------- snapshot

  function buildSnapshot(pass, noise, meta, active) {
    var probes = {};
    var hardIds = [];
    var contextIds = [];
    var allIds = [];
    var list = active || PROBES;

    for (var i = 0; i < list.length; i++) {
      var probe = list[i];
      var result = pass[probe.id];
      allIds.push(probe.id);
      if (probe.cls === 'hard') hardIds.push(probe.id);
      if (probe.cls === 'context') contextIds.push(probe.id);
      probes[probe.id] = {
        c: probe.cls,
        h: result.h,
        v: pack(result.v),
        ok: result.ok,
        s: result.s || null,
        err: result.err || null,
        ms: result.ms,
        n: !!noise[probe.id]
      };
    }

    function stableIds(ids) {
      var out = [];
      for (var j = 0; j < ids.length; j++) {
        var item = probes[ids[j]];
        if (item.ok && !item.n && !item.s) out.push(ids[j]);
      }
      return out;
    }

    function hashOf(ids) {
      var parts = [];
      for (var k = 0; k < ids.length; k++) {
        parts.push(ids[k] + ':' + probes[ids[k]].h);
      }
      return hashString(parts.join('|'));
    }

    var hardNoisy = [];
    var hardErr = [];
    var hardSkipped = [];
    for (var m = 0; m < hardIds.length; m++) {
      var item = probes[hardIds[m]];
      if (item.n) hardNoisy.push(hardIds[m]);
      if (!item.ok) hardErr.push(hardIds[m]);
      if (item.s) hardSkipped.push(hardIds[m]);
    }

    var hardStableIds = stableIds(hardIds);
    var sessionIds = stableIds(hardIds.concat(contextIds));

    return {
      schema: SCHEMA,
      version: VERSION,
      id: meta.id || makeId(),
      createdAt: meta.started || new Date().toISOString(),
      durationMs: Math.round(meta.duration || 0),
      label: meta.label || '',
      profile: meta.profile || 'default',
      note: meta.note || '',
      probes: probes,
      noise: Object.keys(noise),
      hardHash: hashOf(hardStableIds),
      sessionHash: hashOf(sessionIds),
      hardStable: hardNoisy.length === 0 && hardErr.length === 0 && hardSkipped.length === 0,
      hardNoisy: hardNoisy,
      hardErr: hardErr,
      hardSkipped: hardSkipped,
      counts: {
        total: list.length,
        hard: hardIds.length,
        context: contextIds.length,
        hardStable: hardStableIds.length,
        hardNoisy: hardNoisy.length,
        hardErr: hardErr.length,
        hardSkipped: hardSkipped.length
      }
    };
  }

  async function run(options) {
    options = options || {};
    var doubleRun = options.doubleRun !== false;
    var active = options.hardOnly ? PROBES.filter(function (probe) { return probe.cls === 'hard'; }) : PROBES;
    var startedAt = new Date().toISOString();
    var started = performance.now();

    if (document.fonts && document.fonts.ready) {
      try { await withTimeout(document.fonts.ready, 1500); } catch (e) { /* ignore */ }
    }

    var pass1 = await runPass(options.onProgress || null, 'pass1', active);
    var pass2 = null;
    if (doubleRun) {
      pass2 = await runPass(options.onProgress || null, 'pass2', active);
    }

    var noise = {};
    if (pass2) {
      for (var i = 0; i < active.length; i++) {
        if (active[i].cls === 'volatile') continue;
        var id = active[i].id;
        var a = pass1[id];
        var b = pass2[id];
        if (!a || !b) continue;
        if (a.ok && b.ok && a.h !== b.h) {
          noise[id] = { h1: a.h, h2: b.h };
        } else if (a.ok !== b.ok) {
          noise[id] = { h1: a.h, h2: b.h, err: [a.err || null, b.err || null] };
        }
      }
    }

    return buildSnapshot(pass1, noise, {
      started: startedAt,
      duration: performance.now() - started,
      label: options.label || '',
      profile: options.profile || 'default',
      note: options.note || ''
    }, active);
  }

  // --------------------------------------------------------------- compare

  function compare(base, current, options) {
    options = options || {};
    var strict = !!options.strict;
    var rows = [];

    var byId = {};
    for (var d = 0; d < PROBES.length; d++) byId[PROBES[d].id] = PROBES[d];

    var baseProbes = (base && base.probes) ? base.probes : {};
    var curProbes = (current && current.probes) ? current.probes : {};
    var ids = [];
    var seen = {};
    for (var i = 0; i < PROBES.length; i++) {
      var pid = PROBES[i].id;
      if (Object.prototype.hasOwnProperty.call(baseProbes, pid) ||
          Object.prototype.hasOwnProperty.call(curProbes, pid)) {
        ids.push(pid);
        seen[pid] = true;
      }
    }
    var extraKeys = Object.keys(baseProbes).concat(Object.keys(curProbes));
    for (var e = 0; e < extraKeys.length; e++) {
      if (!seen[extraKeys[e]]) {
        seen[extraKeys[e]] = true;
        ids.push(extraKeys[e]);
      }
    }

    for (var r = 0; r < ids.length; r++) {
      var id = ids[r];
      var b = Object.prototype.hasOwnProperty.call(baseProbes, id) ? baseProbes[id] : null;
      var c = Object.prototype.hasOwnProperty.call(curProbes, id) ? curProbes[id] : null;
      var def = byId[id];
      var cls = def ? def.cls : ((b && b.c) || (c && c.c) || 'hard');
      var bSkipped = probeSkippedReason(b);
      var cSkipped = probeSkippedReason(c);
      var status;

      if (cls === 'volatile') {
        status = 'volatile';
      } else if (!b || !c) {
        status = 'missing';
      } else if (!b.ok && !c.ok) {
        status = 'absent';
      } else if (!b.ok || !c.ok) {
        status = 'changed';
      } else if (bSkipped && cSkipped) {
        status = 'skipped';
      } else if (bSkipped || cSkipped) {
        status = 'changed';
      } else if (b.n || c.n) {
        status = 'noisy';
      } else if (b.h === c.h) {
        status = 'same';
      } else {
        status = 'changed';
      }

      rows.push({
        id: id,
        group: def ? def.group : 'unknown',
        title: def ? def.title : id,
        cls: cls,
        status: status,
        base: b,
        cur: c
      });
    }

    function stats(filter) {
      var subset = rows.filter(filter);
      var denominator = subset.filter(function (row) {
        return row.status !== 'absent' && row.status !== 'skipped';
      }).length;
      var same = subset.filter(function (row) { return row.status === 'same'; }).length;
      return {
        total: subset.length,
        same: same,
        denominator: denominator,
        pct: denominator ? Math.round((same / denominator) * 1000) / 10 : (subset.length ? 0 : 100)
      };
    }

    var hardRows = rows.filter(function (row) { return row.cls === 'hard'; });
    var contextRows = rows.filter(function (row) { return row.cls === 'context'; });
    var hard = stats(function (row) { return row.cls === 'hard'; });
    var context = stats(function (row) { return row.cls === 'context'; });

    var hardMissing = hardRows.filter(function (row) { return row.status === 'missing'; });
    var hardSkipped = hardRows.filter(function (row) { return row.status === 'skipped'; });
    var hardBad = hardRows.filter(function (row) {
      return row.status === 'changed' || row.status === 'noisy';
    });
    var contextBad = contextRows.filter(function (row) {
      return row.status === 'changed' || row.status === 'noisy' || row.status === 'missing';
    });

    var verdict = 'STABLE';
    if (hardBad.length) {
      verdict = 'UNSTABLE';
    } else if (hardMissing.length || hardRows.length === 0 || hard.denominator === 0) {
      verdict = 'INCOMPLETE';
    } else if (contextBad.length && strict) {
      verdict = 'REVIEW';
    } else if (contextBad.length) {
      verdict = 'STABLE_CONTEXT_CHANGED';
    }

    return {
      rows: rows,
      hard: hard,
      context: context,
      hardBad: hardBad,
      hardMissing: hardMissing,
      hardSkipped: hardSkipped,
      contextBad: contextBad,
      verdict: verdict,
      strict: strict
    };
  }

  // ------------------------------------------------------------------- API

  window.FPAudit = {
    version: VERSION,
    schema: SCHEMA,
    groups: GROUPS,
    probes: PROBES.map(function (probe) {
      return { id: probe.id, group: probe.group, title: probe.title, cls: probe.cls };
    }),
    run: run,
    compare: compare,
    hashString: hashString
  };
})();
