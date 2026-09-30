/* Tempo Vivo 2.0.1 — Home Assistant card. MIT. No CDN or runtime dependency. */
(() => {
  'use strict';
  if (customElements.get('tempo-vivo-card')) return;
  const VERSION = '2.0.1';
  const INVALID = new Set(['unknown', 'unavailable', '', 'None']);
  const CONDITIONS = {
    sunny: 'Ensolarado', 'clear-night': 'Céu limpo', partlycloudy: 'Parcialmente nublado',
    cloudy: 'Nublado', rainy: 'Chuva', pouring: 'Chuva forte', lightning: 'Temporal',
    'lightning-rainy': 'Temporal com chuva', snowy: 'Neve', 'snowy-rainy': 'Chuva e neve',
    fog: 'Neblina', hail: 'Granizo', windy: 'Vento', 'windy-variant': 'Vento e nuvens',
    exceptional: 'Condição excepcional'
  };
  const ICON_PATHS = {
    wind: 'M3 8h12a3 3 0 1 0-3-3 M2 12h17a3 3 0 1 1-3 3 M4 16h5a3 3 0 1 1-3 3',
    humidity: 'M12 3C8 9 5 12 5 16a7 7 0 0 0 14 0c0-4-3-7-7-13Z M9 16a3 3 0 0 0 3 3',
    pressure: 'M4 18a9 9 0 1 1 16 0 M12 13l4-5 M5 13h1 M8 7l1 1 M12 4v2 M18 13h1 M9 18h6',
    visibility: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    sunrise: 'M3 19h18 M5 15h14 M7 15a5 5 0 0 1 10 0 M12 2v6 M9 5l3-3 3 3 M3 11l2 1 M19 12l2-1',
    sunset: 'M3 19h18 M5 15h14 M7 15a5 5 0 0 1 10 0 M12 2v6 M9 5l3 3 3-3 M3 11l2 1 M19 12l2-1',
    home: 'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7',
    thermometer: 'M10 14V5a2 2 0 0 1 4 0v9a5 5 0 1 1-4 0 M12 9v9',
    feels: 'M3 12h3 M18 12h3 M12 3v3 M5.6 5.6l2 2 M16.4 7.6l2-2 M8 13a4 4 0 1 1 8 0 M7 18h10 M9 21h6',
    alert: 'M12 3 2 21h20L12 3Z M12 9v5 M12 17v.1',
    room: 'M4 21V3h16v18 M8 21V7h8v14 M13 14h.1'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON_PATHS[name] || ICON_PATHS.thermometer}"/></svg>`;
  const stateOf = (hass, id) => {
    const s = id && hass?.states?.[id];
    return s && !INVALID.has(s.state) ? s : null;
  };
  const number = v => v === null || v === undefined || typeof v === 'boolean' || String(v).trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const configSources = a => a.source_entities || {};
  const isAggregate = s => Boolean(s?.attributes?.source_entities?.weather);
  const toCelsius = (v, unit) => unit === '°F' ? (v - 32) * 5 / 9 : unit === 'K' ? v - 273.15 : v;
  const convertTemperature = (v, from, to) => {
    if (v === null || from === to) return v;
    const c = toCelsius(v, from);
    return to === '°F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c;
  };
  const rgb = (a, alpha = 1) => `rgba(${a.map(Math.round).join(',')},${alpha})`;
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  /* A persistent canvas interpolates weather layers; HA updates do not rebuild it. */
  class WeatherScene {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.width = 1; this.height = 1;
      this.current = null; this.transition = null; this.key = ''; this.active = false;
      this.enabled = true; this.reduced = false; this.lastFrame = 0; this.clock = 0; this.raf = 0;
      this.clouds = [this.makeCloud(42), this.makeCloud(17), this.makeCloud(97)];
      const rand = rng(28);
      this.particles = Array.from({ length: 100 }, () => ({ x: rand(), y: rand(), z: .4 + rand() * .6, phase: rand() * 8 }));
    }
    makeCloud(seed) {
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 400;
      const c = canvas.getContext('2d'); if (!c) return canvas;
      const r = rng(seed);
      // Several overlapping translucent puffs give the cloud a soft, textured edge.
      for (let i = 0; i < 140; i++) {
        const x = 100 + r() * 590, y = 150 + r() * 130 - Math.sin((x - 80) / 650 * Math.PI) * 85;
        const radius = 25 + r() * 65;
        const g = c.createRadialGradient(x - radius * .18, y - radius * .4, 0, x, y, radius);
        g.addColorStop(0, 'rgba(230,240,250,.38)');
        g.addColorStop(.48, 'rgba(166,187,209,.28)'); g.addColorStop(1, 'rgba(90,119,155,0)');
        c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      const shade = c.createLinearGradient(0, 150, 0, 350);
      shade.addColorStop(0, 'rgba(24,48,79,0)'); shade.addColorStop(1, 'rgba(14,37,63,.75)');
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = shade; c.fillRect(0, 0, 800, 400);
      return canvas;
    }
    target(condition, night, heat) {
      let p = { sun: night ? 0 : 1, moon: night ? 1 : 0, cloud: 0, rain: 0, snow: 0, fog: 0, lightning: 0, wind: .15, heat: heat ? 1 : 0, hail: 0,
        top: night ? [12, 22, 49] : [30, 83, 122], bottom: night ? [31, 54, 79] : [104, 146, 165] };
      if (condition === 'partlycloudy') p.cloud = .6;
      if (condition === 'cloudy') Object.assign(p, { cloud: 1, sun: 0, moon: .2, top: [38, 59, 80], bottom: [81, 111, 136] });
      if (['rainy', 'pouring', 'lightning', 'lightning-rainy', 'hail', 'exceptional'].includes(condition)) {
        const storm = ['pouring', 'lightning', 'lightning-rainy', 'exceptional'].includes(condition);
        Object.assign(p, { cloud: 1, sun: 0, moon: 0, rain: condition === 'lightning' || condition === 'hail' ? 0 : storm ? 1 : .55,
          hail: condition === 'hail' ? 1 : 0, lightning: ['lightning', 'lightning-rainy', 'exceptional'].includes(condition) ? 1 : 0,
          wind: storm ? .8 : .4, top: storm ? [14, 28, 47] : [28, 49, 73], bottom: [55, 81, 111] });
      }
      if (['snowy', 'snowy-rainy'].includes(condition)) Object.assign(p, { cloud: .9, sun: 0, snow: 1, rain: condition === 'snowy-rainy' ? .35 : 0, top: [50, 78, 110], bottom: [133, 165, 180] });
      if (condition === 'fog') Object.assign(p, { fog: 1, cloud: .4, sun: .1, top: [52, 77, 94], bottom: [112, 137, 144] });
      if (['windy', 'windy-variant'].includes(condition)) Object.assign(p, { wind: 1, cloud: condition === 'windy-variant' ? .9 : .2 });
      if (heat && !p.rain && !p.snow && !p.lightning && !p.hail) Object.assign(p, { top: [99, 55, 45], bottom: [185, 108, 66] });
      return p;
    }
    setWeather(condition, night, heat) {
      const key = `${condition}:${night}:${heat}`; if (key === this.key) return;
      const now = performance.now(); this.update(now); const to = this.target(condition, night, heat);
      if (!this.current || this.reduced || !this.enabled) { this.current = to; this.transition = null; }
      else this.transition = { from: structuredClone(this.current), to, start: now, duration: 3000 };
      this.key = key; this.draw(now); this.schedule();
    }
    update(now) {
      if (!this.transition) return;
      const { from, to, start, duration } = this.transition, raw = clamp((now - start) / duration);
      const out = {};
      for (const key of Object.keys(to)) {
        let t = smooth(raw);
        // Clouds arrive before new precipitation; precipitation stops before clouds leave.
        if (key === 'cloud') t = to.cloud > from.cloud ? smooth(raw / .7) : smooth((raw - .25) / .75);
        if (['rain', 'snow', 'hail'].includes(key)) t = to[key] > from[key] ? smooth((raw - .4) / .6) : smooth(raw / .55);
        out[key] = Array.isArray(to[key]) ? to[key].map((v, i) => mix(from[key][i], v, t)) : mix(from[key], to[key], t);
      }
      this.current = out; if (raw === 1) this.transition = null;
    }
    resize(w, h) {
      this.width = Math.max(1, w); this.height = Math.max(1, h); const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0); this.draw(performance.now());
    }
    setActive(value) { this.active = value; if (value) this.schedule(); else this.stop(); }
    setMotion(enabled, reduced) {
      this.enabled = enabled; this.reduced = reduced;
      if ((!enabled || reduced) && this.transition) { this.current = this.transition.to; this.transition = null; }
      this.draw(performance.now()); if (enabled && !reduced) this.schedule(); else this.stop();
    }
    schedule() { if (!this.raf && this.active && this.enabled && !this.reduced && this.ctx) this.raf = requestAnimationFrame(t => this.tick(t)); }
    tick(t) { this.raf = 0; if (t - this.lastFrame >= 1000 / 30) { this.lastFrame = t; this.update(t); this.draw(t); } this.schedule(); }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
    draw(now) {
      if (!this.ctx || !this.current) return;
      const c = this.ctx, w = this.width, h = this.height, p = this.current;
      const t = this.enabled && !this.reduced ? now / 1000 : 12;
      c.clearRect(0, 0, w, h);
      let g = c.createLinearGradient(0, 0, w * .4, h); g.addColorStop(0, rgb(p.top)); g.addColorStop(1, rgb(p.bottom));
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const cx = w * .265, cy = h * .40, radius = Math.min(w * .115, h * .19);
      if (p.moon > .01) {
        c.globalAlpha = p.moon;
        for (const star of this.particles.slice(0, 38)) { c.fillStyle = `rgba(225,237,255,${.45 + Math.sin(t * .7 + star.phase) * .2})`; c.beginPath(); c.arc(star.x * w * .7, star.y * h * .63, star.z * 1.4, 0, Math.PI * 2); c.fill(); }
        g = c.createRadialGradient(cx, cy, radius * .4, cx, cy, radius * 2.7); g.addColorStop(0, 'rgba(192,218,255,.34)'); g.addColorStop(1, 'rgba(144,177,234,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#dfeaff'; c.beginPath(); c.arc(cx, cy, radius * .75, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
      if (p.sun > .01) {
        c.globalAlpha = p.sun;
        g = c.createRadialGradient(cx, cy, radius * .5, cx, cy, radius * 3.1); g.addColorStop(0, 'rgba(255,218,130,.78)'); g.addColorStop(.4, 'rgba(252,194,99,.23)'); g.addColorStop(1, 'rgba(248,164,87,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        g = c.createRadialGradient(cx - radius * .3, cy - radius * .4, 0, cx, cy, radius); g.addColorStop(0, '#fffbd0'); g.addColorStop(.7, '#ffe798'); g.addColorStop(1, '#fac864');
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, radius, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      }
      if (p.heat > .01) {
        c.globalAlpha = p.heat * .2; c.strokeStyle = '#ffb978'; c.lineWidth = 18;
        for (let i = 0; i < 5; i++) { c.beginPath(); for (let y = 0; y < h; y += 9) { const x = w * (.06 + i * .105) + Math.sin(y / 40 + t * 1.6 + i) * 8; y ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
        c.globalAlpha = 1;
      }
      if (p.cloud > .01) {
        const entry = (1 - p.cloud) * -w * .35;
        for (let i = 0; i < 4; i++) {
          c.globalAlpha = clamp(p.cloud * (i === 0 ? .6 : .94)); const cw = w * (.58 + (i % 2) * .12), ch = cw * .5;
          const x = entry + w * (-.16 + i * .13) + Math.sin(t * (.06 + p.wind * .07) + i * 2) * 16;
          const y = h * (.16 + (i % 2) * .18) - (i === 0 ? h * .06 : 0);
          c.drawImage(this.clouds[i % 3], x, y, cw, ch);
        }
        c.globalAlpha = 1;
      }
      const precipitation = p.rain + p.snow + p.hail;
      if (precipitation > .01) {
        c.save(); c.beginPath(); c.rect(0, h * .3, w * .62, h * .7); c.clip();
        for (const a of this.particles) {
          const xx = ((a.x + t * .04 * p.wind) % 1) * w * .64;
          if (p.rain > .01 && a.z <= .5 + p.rain * .5) {
            const y = ((a.y + t * (.7 + a.z * .65)) % 1) * h;
            c.strokeStyle = `rgba(189,225,251,${p.rain * (.3 + a.z * .35)})`; c.lineWidth = a.z * 1.15;
            c.beginPath(); c.moveTo(xx, y); c.lineTo(xx - 4 - p.wind * 9, y + 11 + a.z * 13); c.stroke();
          }
          if (p.snow > .01 || p.hail > .01) {
            const y = ((a.y + t * (p.hail ? .65 : .09) * a.z) % 1) * h;
            c.fillStyle = `rgba(235,248,255,${Math.max(p.snow, p.hail) * .8})`;
            c.beginPath(); c.arc(xx + Math.sin(t + a.phase) * (p.hail ? 2 : 15), y, p.hail ? a.z * 2.3 : 1 + a.z * 2.4, 0, Math.PI * 2); c.fill();
          }
        }
        c.restore();
      }
      if (p.fog > .01) {
        for (let i = 0; i < 4; i++) {
          const y = h * (.55 + i * .09), x = Math.sin(t * .13 + i) * w * .07;
          g = c.createRadialGradient(w * .25 + x, y, 0, w * .25 + x, y, w * .48); g.addColorStop(0, `rgba(215,232,239,${p.fog * .18})`); g.addColorStop(1, 'rgba(215,232,239,0)');
          c.fillStyle = g; c.fillRect(0, y - h * .18, w, h * .3);
        }
      }
      if (p.wind > .8) {
        c.strokeStyle = 'rgba(226,240,246,.26)'; c.lineWidth = 1;
        for (let i = 0; i < 5; i++) { const x = ((t * .23 + i * .19) % 1) * w * .6; c.beginPath(); c.moveTo(x, h * (.43 + i * .07)); c.quadraticCurveTo(x + 35, h * (.4 + i * .07), x + 85, h * (.42 + i * .07)); c.stroke(); }
      }
      if (p.lightning > .01 && this.enabled && !this.reduced) {
        const phase = t % 8.5;
        if (phase > 7.7 && phase < 7.92) {
          c.globalAlpha = p.lightning * Math.sin((phase - 7.7) / .22 * Math.PI); c.strokeStyle = '#eff6ff'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(w * .28, h * .38); c.lineTo(w * .23, h * .59); c.lineTo(w * .29, h * .58); c.lineTo(w * .20, h * .83); c.stroke(); c.globalAlpha = 1;
        }
      }
      g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(10,27,48,.03)'); g.addColorStop(.45, 'rgba(10,27,48,.1)'); g.addColorStop(.64, 'rgba(10,27,48,.75)'); g.addColorStop(1, 'rgba(10,27,48,.96)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    }
  }

  const STYLE = `
:host{display:block;container-type:inline-size;color:#f2f6fc;font-family:var(--primary-font-family,Roboto,Arial,sans-serif)}
*{box-sizing:border-box}ha-card{display:block;background:#112b44;color:#f2f6fc;border:1px solid #a8c6e82e;border-radius:24px;overflow:hidden;box-shadow:0 12px 32px #07122236}
.stage{position:relative;min-height:340px;isolation:isolate}.sky{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:25px 29px 0}h2{font-size:19px;font-weight:550;letter-spacing:.01em;margin:0}.subtitle{font-size:12px;color:#bad0e3;margin-top:5px}.status{border:1px solid #d0e9fa29;border-radius:30px;padding:6px 11px;font-size:11px;letter-spacing:.02em;background:#16324d60;white-space:nowrap}.status:before{content:'';display:inline-block;width:5px;height:5px;background:#9bcbb9;border-radius:50%;margin-right:6px}
.current{display:grid;grid-template-columns:44% 56%;padding:15px 29px 19px;min-height:160px}.reading{grid-column:2;align-self:center}.temperature{padding:0;background:none;border:0;color:inherit;font:inherit;cursor:pointer;display:flex;align-items:flex-start;gap:7px;text-align:left}.temperature:hover{opacity:.86}.temperature:focus-visible{outline:2px solid #a9d8fa;outline-offset:6px;border-radius:8px}.temperature .value{font-weight:300;letter-spacing:-.065em;font-size:76px;line-height:1}.temperature .unit{font-size:28px;font-weight:300;line-height:1.5}.condition{margin-top:9px;font-size:20px;font-weight:450;line-height:1.2}.alert{display:inline-flex;align-items:center;gap:5px;font-size:11px;border:1px solid #ffc3844d;color:#ffe0b5;border-radius:8px;padding:5px 8px;margin-top:9px;background:#92593424}.alert svg{width:13px;height:13px}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px 15px;padding:0 29px 24px;margin-left:44%}.metric{display:flex;gap:9px;align-items:center;min-width:0}.metric svg{width:24px;height:24px;flex:none;color:#a4c4e1}.metric .caption{font-size:10px;color:#bbcfdf;line-height:1.4}.metric .metric-value{font-size:13px;font-weight:500;line-height:1.6;white-space:nowrap}.metrics [hidden],.alert[hidden],.rooms[hidden],.home-humidity[hidden]{display:none}
svg{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.home{background:linear-gradient(115deg,#2d4967b3,#1c3755de);border-top:1px solid #b9d8ee2c;padding:21px 29px 22px}.home-main{display:flex;align-items:center;justify-content:space-between;gap:16px}.house{display:flex;align-items:center;gap:14px;min-width:0}.house>svg{width:39px;height:39px;flex:none;color:#bad5ed}.home-label{font-size:13px;color:#bfd3e6;margin-bottom:5px}.home-temp{border:0;background:none;color:inherit;padding:0;text-align:left;font:300 37px/1.15 var(--primary-font-family,Roboto,Arial,sans-serif);letter-spacing:-.03em;cursor:pointer}.home-humidity{border-left:1px solid #aecde53b;padding-left:22px;display:flex;gap:10px;align-items:center}.home-humidity svg{width:27px;height:27px;color:#b6d3ec}.home-humidity .value{font-size:23px;margin-top:5px}.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:19px;padding-top:17px;border-top:1px solid #b3d2e324}.room{border:1px solid #bfdaef22;background:#0d254136;border-radius:12px;padding:10px 11px;color:inherit;text-align:left;cursor:pointer;font:inherit}.room-name{font-size:11px;color:#bad1e5}.room-value{font-size:20px;margin-top:4px}.room-humidity{font-size:10px;color:#acc5dc;margin-top:4px}
.notice{font-size:12px;padding:10px 29px;background:#59412870;color:#ffdfb7}.notice[hidden]{display:none}
ha-card[data-theme=light] .home{background:#ecf3f9;color:#223b54}ha-card[data-theme=light] .home-label,ha-card[data-theme=light] .room-name,ha-card[data-theme=light] .room-humidity{color:#526d85}ha-card[data-theme=light] .house>svg,ha-card[data-theme=light] .home-humidity svg{color:#4c7a9e}ha-card[data-theme=light] .home-humidity{border-color:#b5cadb}ha-card[data-theme=light] .room{background:#fff;border-color:#cbdbe7;color:#23445c}
@container(max-width:550px){.stage{min-height:345px}header{padding:22px 22px 0}.current{grid-template-columns:42% 58%;padding:20px 22px 25px;min-height:176px}.temperature .value{font-size:63px}.temperature .unit{font-size:24px}.condition{font-size:17px}.metrics{margin-left:0;padding:0 22px 23px;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px}.metric{gap:6px}.metric svg{width:21px;height:21px}.metric .metric-value{font-size:12px}.metric .caption{font-size:9px}.home{padding:19px 22px}.home-temp{font-size:32px}.house>svg{width:32px;height:32px}.home-humidity{padding-left:15px;gap:8px}.home-humidity .value{font-size:21px}.home-label{font-size:11px}}
@container(max-width:350px){header{padding:18px 16px 0}h2{font-size:17px}.current{padding:20px 16px 24px}.temperature .value{font-size:52px}.temperature .unit{font-size:21px}.condition{font-size:15px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr));padding:0 16px 20px}.home{padding:17px 16px}.home-main{gap:8px}.house{gap:9px}.house>svg{width:25px;height:25px}.home-temp{font-size:27px}.home-humidity{padding-left:9px}.home-humidity svg{display:none}.home-humidity .value{font-size:19px}.home-label{font-size:10px}.status{font-size:10px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
`;
  const sensorFields = ['indoor_temperature','indoor_humidity','outdoor_temperature','outdoor_humidity','wind','pressure','visibility','sunrise','sunset','heat_alert','rain_sensor','storm_alert','feels_like'];
  class TempoVivoCard extends HTMLElement {
    static getConfigElement() { return document.createElement('tempo-vivo-card-editor'); }
    static getStubConfig(hass, entities = [], fallback = []) {
      const ids = [...entities, ...fallback, ...Object.keys(hass?.states || {})];
      return { entity: ids.find(id => isAggregate(hass?.states?.[id])) || ids.find(id => id.startsWith('weather.')) || '', title: 'Tempo agora', animation: true };
    }
    constructor() {
      super(); this.attachShadow({ mode: 'open' }); this._config = null; this._hass = null; this._visible = true; this._listening = false;
      this._onVisibility = () => this._syncMotion();
      this._onResize = () => { if (this._stage) this._scene.resize(this._stage.clientWidth, this._stage.clientHeight); };
      this._media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._onMedia = () => this._syncMotion();
      this._root = null;
    }
    setConfig(config) {
      if (!config || !(config.entity || config.weather_entity)) throw new Error('Selecione a entidade de clima ou o sensor Tempo Vivo.');
      if (config.rooms && (!Array.isArray(config.rooms) || config.rooms.some(r => !r.entity))) throw new Error('Cada cômodo precisa de uma entidade de temperatura.');
      const duration = number(config.heat_threshold);
      if (config.heat_threshold !== undefined && config.heat_threshold !== false && duration === null) throw new Error('O limite de calor deve ser um número em °C ou false.');
      this._config = { title: 'Tempo agora', animation: true, theme: 'auto', heat_threshold: 35, sun_entity: 'sun.sun', ...config };
      this._build(); this._render();
    }
    set hass(hass) { this._hass = hass; this._render(); }
    get hass() { return this._hass; }
    getCardSize() { return this._config?.rooms?.length ? 7 : 6; }
    getGridOptions() { return { columns: 12, rows: this._config?.rooms?.length ? 8 : 7, min_columns: 6, min_rows: 5 }; }
    connectedCallback() {
      this._build(); this._render();
      if (!this._root || this._listening) return;
      this._listening = true; document.addEventListener('visibilitychange', this._onVisibility); this._media.addEventListener('change', this._onMedia);
      this._resizeObserver = new ResizeObserver(this._onResize); this._resizeObserver.observe(this._stage);
      this._intersection = new IntersectionObserver(entries => { this._visible = entries[0].isIntersecting; this._syncMotion(); }); this._intersection.observe(this);
      this._onResize(); this._syncMotion();
    }
    disconnectedCallback() {
      this._scene?.stop(); this._listening = false;
      this._resizeObserver?.disconnect(); this._intersection?.disconnect();
      document.removeEventListener('visibilitychange', this._onVisibility); this._media.removeEventListener('change', this._onMedia);
    }
    _syncMotion() {
      if (!this._scene) return;
      this._scene.setMotion(this._config?.animation !== false, this._media.matches);
      this._scene.setActive(this.isConnected && this._visible && !document.hidden);
    }
    _moreInfo(id) { if (id) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true })); }
    _build() {
      if (this._root || !this._config) return;
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card><div class="stage"><canvas class="sky" aria-hidden="true"></canvas><header><div><h2></h2><div class="subtitle"></div></div><span class="status">Agora</span></header><div class="current"><div class="reading"><button class="temperature" aria-label="Detalhes do clima"><span class="value">—</span><span class="unit"></span></button><div class="condition" role="status" aria-live="polite"></div><div class="alert" hidden>${icon('alert')}<span></span></div></div></div><div class="metrics"></div></div><section class="home"><div class="home-main"><div class="house">${icon('home')}<div><div class="home-label">Temperatura da casa</div><button class="home-temp" aria-label="Detalhes da temperatura da casa">—</button></div></div><div class="home-humidity" hidden>${icon('humidity')}<div><div class="home-label">Umidade interna</div><div class="value"></div></div></div></div><div class="rooms" hidden></div></section><div class="notice" role="status" hidden></div></ha-card>`;
      this._root = this.shadowRoot.querySelector('ha-card'); this._stage = this.shadowRoot.querySelector('.stage');
      this._scene = new WeatherScene(this.shadowRoot.querySelector('canvas'));
      this._metrics = {};
      for (const [key, label] of [['wind','Vento'],['humidity','Umidade'],['pressure','Pressão'],['visibility','Visibilidade'],['sunrise','Nascer do sol'],['sunset','Pôr do sol'],['feels','Sensação térmica']]) {
        const el = document.createElement('div'); el.className = 'metric'; el.hidden = true;
        el.innerHTML = `${icon(key)}<div><div class="caption"></div><div class="metric-value"></div></div>`;
        el.querySelector('.caption').textContent = label; this.shadowRoot.querySelector('.metrics').append(el); this._metrics[key] = el;
      }
      this.shadowRoot.querySelector('.temperature').addEventListener('click', () => this._moreInfo(this._weatherId));
      this.shadowRoot.querySelector('.home-temp').addEventListener('click', () => this._moreInfo(this._indoorId));
      if (this.isConnected && !this._listening) this.connectedCallback();
    }
    _render() {
      if (!this._root || !this._hass || !this._config) return;
      const hass = this._hass, cfg = this._config, root = this.shadowRoot;
      const baseId = cfg.entity || cfg.weather_entity, rawBase = hass.states?.[baseId], base = stateOf(hass, baseId), a = base?.attributes || {};
      const sources = configSources(a);
      const weatherId = cfg.weather_entity || (baseId.startsWith('weather.') ? baseId : sources.weather);
      const weather = stateOf(hass, weatherId), weatherAttrs = weather?.attributes || (weatherId && hass.states?.[weatherId] ? {} : a.weather_attributes || {});
      const sourceAvailable = weatherId ? Boolean(weather) : Boolean(base && a.weather);
      let condition = weather?.state || (sourceAvailable ? a.weather : '') || 'unknown';
      const unit = hass.config?.unit_system?.temperature || weatherAttrs.temperature_unit || '°C';
      const sensor = key => {
        const id = cfg[key] || sources[key];
        if (id) {
          const st = stateOf(hass, id); if (!st) return null;
          const value = st.attributes?.current_temperature ?? st.state;
          return { value, unit: st.attributes?.unit_of_measurement || (st.attributes?.current_temperature != null ? unit : ''), id };
        }
        return a[key] !== undefined && !INVALID.has(String(a[key])) ? { value: a[key], unit: a[key + '_unit'] || '' } : null;
      };
      const attr = (name, unitName = '', fallback = '') => number(weatherAttrs[name]) === null ? null : { value: number(weatherAttrs[name]), unit: unitName ? weatherAttrs[unitName] || fallback : fallback };
      const temperature = reading => reading && number(reading.value) !== null ? { ...reading, value: convertTemperature(number(reading.value), reading.unit || unit, unit), unit } : null;
      const out = temperature(sensor('outdoor_temperature') || attr('temperature','temperature_unit',unit));
      const indoor = temperature(sensor('indoor_temperature'));
      const rainOn = sensor('rain_sensor')?.value === 'on', stormOn = sensor('storm_alert')?.value === 'on', heatOn = sensor('heat_alert')?.value === 'on';
      if (rainOn && sourceAvailable && !['pouring','lightning','lightning-rainy','hail'].includes(condition)) condition = 'rainy';
      if (stormOn && sourceAvailable) condition = 'lightning-rainy';
      const threshold = cfg.heat_threshold;
      const hot = heatOn || (threshold !== false && out && toCelsius(out.value, out.unit) >= Number(threshold));
      const sun = stateOf(hass, cfg.sun_entity); const night = condition === 'clear-night' || (sun?.state === 'below_horizon' && !['sunny'].includes(condition));
      const locale = hass.locale?.language || hass.language || 'pt-BR';
      let formatter; try { formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }); } catch { formatter = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}); }
      const fmt = reading => reading && number(reading.value) !== null ? `${formatter.format(Number(reading.value))}${reading.unit ? ' ' + reading.unit : ''}` : null;
      const time = value => { if (!value) return null; const d = new Date(value); if (Number.isNaN(d.valueOf())) return null; try { return new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',timeZone:hass.config?.time_zone}).format(d); } catch { return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); } };
      const wind = sensor('wind') || attr('wind_speed','wind_speed_unit');
      let windValue = fmt(wind); const bearing = weatherAttrs.wind_bearing;
      if (windValue && bearing != null) { const directions=['N','NNE','NE','ENE','L','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO']; windValue += ' · ' + (number(bearing) !== null ? directions[Math.round(Number(bearing)/22.5)%16] || 'N' : String(bearing)); }
      const data = {
        wind: windValue, humidity: fmt(sensor('outdoor_humidity') || attr('humidity','','%')),
        pressure: fmt(sensor('pressure') || attr('pressure','pressure_unit')),
        visibility: fmt(sensor('visibility') || attr('visibility','visibility_unit')),
        sunrise: time(sensor('sunrise')?.value || sun?.attributes?.next_rising), sunset: time(sensor('sunset')?.value || sun?.attributes?.next_setting),
        feels: fmt(temperature(sensor('feels_like') || attr('apparent_temperature','temperature_unit',unit)))
      };
      this._weatherId = weatherId || baseId; this._indoorId = cfg.indoor_temperature || sources.indoor_temperature;
      root.querySelector('h2').textContent = cfg.title; root.querySelector('.subtitle').textContent = cfg.location || weather?.attributes?.friendly_name || 'Clima da sua casa';
      root.querySelector('.status').textContent = sourceAvailable ? 'Agora' : 'Sem dados';
      root.querySelector('.temperature .value').textContent = out ? formatter.format(out.value) : '—'; root.querySelector('.temperature .unit').textContent = out ? out.unit : '';
      root.querySelector('.condition').textContent = sourceAvailable ? CONDITIONS[condition] || 'Condição desconhecida' : 'Clima indisponível';
      const alert = root.querySelector('.alert'); alert.hidden = !hot; alert.querySelector('span').textContent = heatOn ? 'Onda de calor · sensor de alerta' : 'Calor intenso';
      for (const [key, value] of Object.entries(data)) { this._metrics[key].hidden = !value; this._metrics[key].querySelector('.metric-value').textContent = value || ''; }
      root.querySelector('.home-temp').textContent = fmt(indoor) || '—';
      const ih = fmt(sensor('indoor_humidity')); root.querySelector('.home-humidity').hidden = !ih; root.querySelector('.home-humidity .value').textContent = ih || '';
      const notice = root.querySelector('.notice'); const messages = [];
      if (!rawBase) messages.push(`Entidade ${baseId} não encontrada.`);
      else if (!sourceAvailable) messages.push('A entidade de clima está indisponível.');
      if (!this._indoorId) messages.push('Selecione o sensor de temperatura da casa no editor.');
      else if (!indoor) messages.push('Sensor de temperatura da casa indisponível.');
      notice.hidden = !messages.length; notice.textContent = messages.join(' ');
      this._root.dataset.theme = cfg.theme === 'auto' ? (hass.themes?.darkMode === false ? 'light' : 'dark') : cfg.theme;
      const sceneHeat = Boolean(hot && !['rainy','pouring','lightning','lightning-rainy','snowy','snowy-rainy','hail'].includes(condition));
      this._scene.setWeather(sourceAvailable ? condition : 'cloudy', night, sceneHeat); this._syncMotion();
      this._renderRooms(sensor, temperature, formatter, unit);
    }
    _renderRooms(_sensor, _temperature, formatter, unit) {
      const el = this.shadowRoot.querySelector('.rooms'), rooms = this._config.rooms || [];
      const signature = JSON.stringify(rooms);
      if (signature !== this._roomSignature) {
        this._roomSignature = signature; el.replaceChildren();
        for (const room of rooms) {
          const button = document.createElement('button'); button.type='button'; button.className='room';
          button.innerHTML='<div class="room-name"></div><div class="room-value"></div><div class="room-humidity"></div>';
          button.addEventListener('click',()=>this._moreInfo(room.entity)); el.append(button);
        }
      }
      el.hidden = !rooms.length;
      rooms.forEach((room, i) => {
        const st = stateOf(this._hass, room.entity), val = number(st?.state), humidity = stateOf(this._hass, room.humidity_entity), hu = number(humidity?.state);
        const button = el.children[i]; button.querySelector('.room-name').textContent = room.name || st?.attributes?.friendly_name || room.entity;
        button.querySelector('.room-value').textContent = val === null ? '—' : formatter.format(convertTemperature(val, st.attributes.unit_of_measurement || unit, unit)) + ' ' + unit;
        button.querySelector('.room-humidity').textContent = hu === null ? '' : formatter.format(hu) + ' %';
      });
    }
  }

  const FIELD_LABELS = {
    entity: 'Clima ou sensor Tempo Vivo', title: 'Título', location: 'Local (opcional)',
    indoor_temperature: 'Temperatura da casa', indoor_humidity: 'Umidade interna', outdoor_temperature: 'Temperatura externa',
    outdoor_humidity: 'Umidade externa', wind: 'Vento', pressure: 'Pressão', visibility: 'Visibilidade',
    sunrise: 'Nascer do sol', sunset: 'Pôr do sol', heat_alert: 'Alerta de onda de calor', rain_sensor: 'Sensor de chuva', storm_alert: 'Alerta de temporal', feels_like: 'Sensação térmica', sun_entity: 'Entidade Sol'
  };
  class TempoVivoEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({mode:'open'}); this._config={}; this._hass=null; }
    setConfig(config) { this._config = {...config}; this.render(); }
    set hass(value) { const first=!this._hass; this._hass=value; if(first) this.render(); }
    connectedCallback() { this.render(); }
    change(key, value) {
      const next={...this._config}; if(value === '' || value === undefined) delete next[key]; else next[key]=value;
      this._config=next; this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
    }
    select(key) {
      const select=document.createElement('select'); select.dataset.key=key;
      const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent=key==='entity'?'Selecione uma entidade':'Automático / não configurado';select.append(placeholder);
      let ids=Object.keys(this._hass?.states||{}).filter(id=>key==='entity'?id.startsWith('weather.')||isAggregate(this._hass.states[id]):key==='sun_entity'?id.startsWith('sun.'):['heat_alert','rain_sensor','storm_alert'].includes(key)?id.startsWith('binary_sensor.'):id.startsWith('sensor.')||key.includes('temperature')&&id.startsWith('climate.'));
      const saved=this._config[key]; if(saved&&!ids.includes(saved))ids.push(saved);
      ids.sort((a,b)=>a.localeCompare(b));
      for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=(this._hass?.states[id]?.attributes?.friendly_name||id)+' · '+id;select.append(option);}
      select.value=saved||'';select.addEventListener('change',()=>this.change(key,select.value));return select;
    }
    wrap(label, input) { const el=document.createElement('label'); const caption=document.createElement('span'); caption.textContent=label;el.append(caption,input);return el; }
    render() {
      if(!this.isConnected)return;
      this.shadowRoot.innerHTML='<style>:host{display:block;color:var(--primary-text-color,#23394c);font-family:var(--primary-font-family,Arial,sans-serif)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}label{display:flex;flex-direction:column;gap:6px;font-size:12px}select,input{font:inherit;color:inherit;background:var(--card-background-color,#fff);border:1px solid var(--divider-color,#b8c9d7);border-radius:9px;padding:12px;min-width:0;width:100%;box-sizing:border-box}summary{cursor:pointer;padding:16px 0;font-weight:500}p{font-size:12px;line-height:1.6;opacity:.75}.row{display:flex;gap:8px;align-items:center}.row input{width:auto}.full{grid-column:1/-1}button{padding:9px;border:1px solid #a4bacb;border-radius:8px;background:transparent;color:inherit;cursor:pointer}.rooms{display:flex;flex-direction:column;gap:10px}.room-edit{border:1px solid #bac9d755;border-radius:9px;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px}@media(max-width:420px){.grid,.room-edit{grid-template-columns:1fr}}</style><p>Selecione uma entidade weather ou o sensor da integração. Os sensores extras são opcionais.</p><div class="grid"></div><details><summary>Sensores e alertas adicionais</summary><div class="grid extra"></div></details><details><summary>Temperaturas por cômodo</summary><div class="rooms"></div><button class="add-room" type="button">Adicionar cômodo</button></details>';
      const grid=this.shadowRoot.querySelector('.grid');
      const text=(key,label)=>{const x=document.createElement('input');x.value=this._config[key]||'';x.dataset.key=key;x.addEventListener('change',()=>this.change(key,x.value));return this.wrap(label,x);};
      grid.append(this.wrap(FIELD_LABELS.entity,this.select('entity')),text('title','Título'),this.wrap(FIELD_LABELS.indoor_temperature,this.select('indoor_temperature')),this.wrap(FIELD_LABELS.indoor_humidity,this.select('indoor_humidity')),text('location','Local (opcional)'));
      const theme=document.createElement('select');for(const [v,label] of [['auto','Tema do Home Assistant'],['dark','Escuro'],['light','Claro']]){const o=document.createElement('option');o.value=v;o.textContent=label;theme.append(o);}theme.value=this._config.theme||'auto';theme.dataset.key='theme';theme.addEventListener('change',()=>this.change('theme',theme.value));grid.append(this.wrap('Aparência',theme));
      const heat=document.createElement('input');heat.type='number';heat.min='20';heat.max='60';heat.step='1';heat.value=this._config.heat_threshold===false?'':this._config.heat_threshold??35;heat.placeholder='Vazio desativa';heat.dataset.key='heat_threshold';heat.addEventListener('change',()=>this.change('heat_threshold',heat.value===''?false:Number(heat.value)));grid.append(this.wrap('Calor intenso a partir de (°C)',heat));
      const motion=document.createElement('input');motion.type='checkbox';motion.checked=this._config.animation!==false;motion.dataset.key='animation';motion.addEventListener('change',()=>this.change('animation',motion.checked));const motionLabel=this.wrap('Ativar animações',motion);motionLabel.className='row';grid.append(motionLabel);
      const extra=this.shadowRoot.querySelector('.extra');for(const key of [...sensorFields.filter(k=>!['indoor_temperature','indoor_humidity'].includes(k)),'sun_entity'])extra.append(this.wrap(FIELD_LABELS[key],this.select(key)));
      this.shadowRoot.querySelector('.add-room').addEventListener('click',()=>{const first=Object.keys(this._hass?.states||{}).find(id=>this._hass.states[id].attributes?.device_class==='temperature');if(first){this.change('rooms',[...(this._config.rooms||[]),{entity:first,name:'Cômodo'}]);this.render();}});
      (this._config.rooms||[]).forEach((room,index)=>{
        const r=document.createElement('div');r.className='room-edit';
        const name=document.createElement('input');name.value=room.name||'';name.placeholder='Nome';
        const saved=this._config;this._config={...saved,indoor_temperature:room.entity,indoor_humidity:room.humidity_entity};const entity=this.select('indoor_temperature'),humidity=this.select('indoor_humidity');this._config=saved;
        // Replace these selectors with independent controls to preserve the room list.
        const e=entity.cloneNode(true),h=humidity.cloneNode(true); e.value=room.entity||''; h.value=room.humidity_entity||'';
        const update=(field,value)=>{const rooms=this._config.rooms.map((x,i)=>i===index?{...x,[field]:value}:x);this.change('rooms',rooms);};
        name.addEventListener('change',()=>update('name',name.value));e.addEventListener('change',()=>{if(e.value)update('entity',e.value);});h.addEventListener('change',()=>update('humidity_entity',h.value));
        const remove=document.createElement('button');remove.textContent='Remover';remove.type='button';remove.addEventListener('click',()=>{this.change('rooms',this._config.rooms.filter((_,i)=>i!==index));this.render();});
        r.append(this.wrap('Nome',name),this.wrap('Temperatura',e),this.wrap('Umidade',h),remove);this.shadowRoot.querySelector('.rooms').append(r);
      });
    }
  }
  customElements.define('tempo-vivo-card-editor',TempoVivoEditor);
  customElements.define('tempo-vivo-card',TempoVivoCard);
  window.customCards=window.customCards||[];
  window.customCards.push({type:'tempo-vivo-card',name:'Tempo Vivo',description:'Céu animado, clima atual e temperaturas da casa',preview:true,
    getEntitySuggestion:(hass,id)=>id.startsWith('weather.')||isAggregate(hass.states[id])?{config:{type:'custom:tempo-vivo-card',entity:id}}:null});
  window.tempoVivoVersion=VERSION;
})();
