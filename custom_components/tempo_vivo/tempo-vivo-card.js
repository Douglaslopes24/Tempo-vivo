/* Tempo Vivo card — dependency-free Lovelace custom element */
const CONDITIONS = {
  'sunny':['Sol','sun'], 'clear-night':['Céu limpo','night'], 'partlycloudy':['Parcialmente nublado','cloud'],
  'cloudy':['Nublado','cloud'], 'rainy':['Chuva','rain'], 'pouring':['Chuva forte','storm'],
  'lightning':['Temporal','storm'], 'lightning-rainy':['Temporal','storm'],
  'snowy':['Neve','snow'], 'snowy-rainy':['Chuva e neve','snow'], 'fog':['Neblina','fog'],
  'hail':['Granizo','storm'], 'windy':['Vento','wind'], 'windy-variant':['Vento','wind'],
  'exceptional':['Condição extrema','storm']
};
const style = `
:host { display:block; --tv-text:#f7fbff; --tv-muted:#d4e5f4; }
ha-card { overflow:hidden; border-radius:24px; color:var(--tv-text); background:#203c66; position:relative; font-family:var(--primary-font-family,Roboto,sans-serif); }
.frame { position:relative; min-height:280px; padding:26px 28px 20px; isolation:isolate; box-sizing:border-box; }
.sky { position:absolute; inset:0; z-index:-1; overflow:hidden; background:linear-gradient(145deg,#1d4071,#5886b3); transition:background 1.5s ease; }
.sky[data-scene="sun"] { background:linear-gradient(140deg,#267db7,#f5af67); }
.sky[data-scene="night"] { background:linear-gradient(145deg,#101a3a,#345179); }
.sky[data-scene="cloud"] { background:linear-gradient(145deg,#385977,#7ca4b8); }
.sky[data-scene="rain"],.sky[data-scene="fog"] { background:linear-gradient(145deg,#263f61,#536d83); }
.sky[data-scene="storm"] { background:linear-gradient(145deg,#15243d,#37435c); }
.sky[data-scene="snow"] { background:linear-gradient(145deg,#4d779b,#b9d6df); }
.sky[data-scene="heat"] { background:linear-gradient(145deg,#b94736,#f4a34e); }
.sky[data-scene="wind"] { background:linear-gradient(145deg,#34627d,#87adb8); }
.sky:after {content:"";position:absolute;inset:0;background:linear-gradient(90deg,#0b233052,transparent 70%);}
.scene { position:absolute;inset:0; opacity:0; transform:translateX(18%); transition:opacity 1.3s ease, transform 1.5s ease; pointer-events:none; overflow:hidden; }
.scene.active {opacity:1;transform:translateX(0)}
.scene.depart {opacity:0;transform:translateX(-20%)}
.sun {position:absolute;left:16%;top:21%;width:100px;height:100px;border-radius:50%;background:#ffe898;box-shadow:0 0 40px 14px #ffd07788,0 0 100px 55px #ffc97250;animation:pulse 5s ease-in-out infinite;}
.cloud {position:absolute;left:10%;top:31%;width:170px;height:57px;border-radius:45px;background:#dce6ef;filter:drop-shadow(0 8px 8px #172b4266);animation:drift 7s ease-in-out infinite alternate;}
.cloud:before,.cloud:after {content:"";position:absolute;background:inherit;border-radius:50%}.cloud:before{width:82px;height:82px;left:23px;bottom:16px}.cloud:after{width:105px;height:95px;left:69px;bottom:3px}
.cloud.two{left:28%;top:20%;transform:scale(.7);opacity:.8;animation-delay:-3s}.rain-cloud{left:13%;top:25%;background:#a8bacb;z-index:2}.storm-cloud{background:#6b7d98}
.rain {position:absolute;inset:38% 15% 4% 13%;background:repeating-linear-gradient(112deg,transparent 0 16px,#bceeffbd 17px 19px,transparent 20px 38px);mask-image:repeating-linear-gradient(0deg,#000 0 18px,transparent 19px 42px);animation:fall .65s linear infinite;opacity:.8}
.flash {position:absolute;left:29%;top:45%;font-size:65px;color:#fff1a3;animation:flash 5s infinite;filter:drop-shadow(0 0 18px #fff);}
.haze{position:absolute;left:6%;right:6%;bottom:14%;height:80px;background:repeating-linear-gradient(0deg,transparent 0 12px,#ecf4f36b 14px 21px,transparent 24px 35px);filter:blur(5px);animation:drift 8s ease-in-out infinite alternate}
.snowflakes{position:absolute;inset:18% 7%;font-size:40px;letter-spacing:28px;color:#edfaff;animation:fall 6s linear infinite}
.heatwave{position:absolute;inset:16% 8%;background:repeating-linear-gradient(100deg,transparent 0 33px,#fff3bc3b 37px 46px,transparent 50px 75px);filter:blur(12px);animation:shimmer 3s ease-in-out infinite alternate}
.windlines{position:absolute;inset:32% 8%;background:repeating-linear-gradient(0deg,transparent 0 30px,#e7f6ff99 32px 35px,transparent 38px 65px);transform:skewY(-8deg);animation:drift 2s ease-in-out infinite alternate}
@keyframes drift{to{translate:22px 3px}}@keyframes fall{to{background-position:-30px 48px;translate:0 20px}}@keyframes flash{0%,88%,93%,100%{opacity:0}89%,91%{opacity:1}}@keyframes pulse{50%{box-shadow:0 0 55px 22px #ffd077aa,0 0 110px 60px #ffc97255}}@keyframes shimmer{to{transform:translateX(20px) skewX(-5deg)}}
.title{font-size:15px;font-weight:650;letter-spacing:.04em;opacity:.95}.top{display:flex;justify-content:space-between;align-items:center;min-height:142px;gap:16px}.condition{font-size:24px;font-weight:650;text-shadow:0 2px 8px #0005;max-width:52%}.outside{text-align:right}.temp{font-size:clamp(48px,10vw,82px);font-weight:300;letter-spacing:-.07em;line-height:1}.temp small{font-size:.38em;vertical-align:top;letter-spacing:0}.label{font-size:14px;margin-top:5px}.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 22px;font-size:14px}.metric{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 4px #0008}.metric:nth-child(even){text-align:right}.metric ha-icon{--mdc-icon-size:18px;vertical-align:-4px;margin-right:5px}.home{background:#ffffff19;border-top:1px solid #ffffff36;padding:17px 28px 21px;display:flex;align-items:center;justify-content:space-between;gap:15px;backdrop-filter:blur(10px)}.home .heading{font-size:14px;color:var(--tv-muted)}.home .reading{font-size:clamp(30px,6vw,47px);font-weight:350;white-space:nowrap}.home .extras{display:flex;gap:15px;flex-wrap:wrap;font-size:13px;color:var(--tv-muted);justify-content:flex-end}.empty{padding:24px;color:var(--primary-text-color)}
@media(max-width:480px){.frame{padding:20px;min-height:255px}.home{padding:14px 20px;align-items:flex-start;flex-direction:column}.home .extras{justify-content:flex-start}.metrics{gap:8px 10px;font-size:12px}}
/* Composition inspired by the preview: artwork at left, current readings at right. */
ha-card {border:1px solid #a9d0ee33;box-shadow:0 16px 38px #081a3550;background:#172f4d}
.frame {min-height:315px;padding:27px 30px 27px}
.sky {background:radial-gradient(circle at 25% 36%,#b5dbff55,transparent 27%),linear-gradient(135deg,#253f60,#112741 78%)}
.sky:after {background:linear-gradient(90deg,transparent 30%,#0c223ab9 60%,#0b2039ef 100%)}
.sky[data-scene="sun"] {background:radial-gradient(circle at 24% 38%,#fdd48c99,transparent 32%),linear-gradient(135deg,#315b81,#103455)}
.sky[data-scene="rain"] {background:radial-gradient(circle at 20% 36%,#f5b75b66,transparent 34%),linear-gradient(135deg,#304f70,#10283f)}
.scene {right:42%}
.sun {left:26%;top:29%;width:118px;height:118px;background:radial-gradient(circle at 35% 35%,#fff8d4,#ffd36c 65%,#eaa74d);box-shadow:0 0 38px 14px #ffcf75a6,0 0 115px 60px #ffc46742}
.sun.fading {animation:sunset 1.7s ease forwards}
.cloud {left:5%;top:39%;width:210px;height:67px;background:linear-gradient(#e8f2fa,#879fb8);filter:drop-shadow(0 13px 14px #0a1a2c99)}
.cloud:before {width:100px;height:95px}.cloud:after {width:120px;height:108px}
.cloud.two {left:24%;top:24%;opacity:.75}.rain-cloud {left:8%;top:31%;background:linear-gradient(#c8d5e0,#526c86)}
.rain {inset:49% 0 0 4%;opacity:.8}
.title {position:relative;z-index:2;font-size:20px;font-weight:500;letter-spacing:0}
.top {margin-left:52%;min-height:155px;display:flex;flex-direction:column-reverse;justify-content:center;align-items:flex-end;gap:8px}
.condition {max-width:none;font-size:21px;font-weight:500;text-align:right;width:100%}
.outside {width:100%}.temp {font-size:clamp(51px,6vw,78px);letter-spacing:-.055em}.label{font-size:12px;opacity:.8}
.metrics {margin-left:50%;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px 10px;margin-top:2px;font-size:13px}
.metric:nth-child(even){text-align:left}
.home {min-height:95px;padding:20px 30px;background:linear-gradient(110deg,#254364,#18334e);border-top:1px solid #b9dcf333}
.home-primary {display:flex;align-items:center;gap:15px}.home-primary>ha-icon {--mdc-icon-size:42px;color:#b8dcf5}
.home .heading{font-size:14px}.home .reading{font-size:clamp(36px,5vw,54px);line-height:1.1}
.home .extras{font-size:16px;border-left:1px solid #bddbf255;padding-left:20px;min-height:55px;align-items:center}
@keyframes sunset {to {opacity:0;transform:scale(.8)}}
@media(max-width:600px){.frame{min-height:325px;padding:20px}.scene{right:28%}.sun{left:10%;top:28%;width:80px;height:80px}.cloud{left:-20%;width:155px;height:48px}.cloud:before{width:75px;height:72px}.cloud:after{width:90px;height:80px}.rain-cloud{left:-10%}.top{margin-left:37%;min-height:154px}.condition{font-size:17px}.metrics{margin-left:0;margin-top:12px;font-size:12px;gap:9px 12px}.home{padding:17px 20px}.home .extras{font-size:13px}}
@media(max-width:360px){.home{flex-direction:column;align-items:flex-start}.home .extras{border-left:0;padding-left:0;min-height:auto}.scene{right:35%}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}
`;
const SCENES = {
 sun:'<div class="sun"></div>', night:'<div class="sun" style="background:#e4efff;box-shadow:0 0 38px #d4ecff99;width:75px;height:75px"></div>',
 cloud:'<div class="sun"></div><div class="cloud two"></div><div class="cloud"></div>',
 rain:'<div class="sun fading"></div><div class="cloud rain-cloud"></div><div class="rain"></div>',
 storm:'<div class="cloud rain-cloud storm-cloud"></div><div class="rain"></div><div class="flash">ϟ</div>',
 snow:'<div class="cloud"></div><div class="snowflakes">❄ ❄ ❄ ❄</div>',
 fog:'<div class="cloud"></div><div class="haze"></div>',
 wind:'<div class="cloud"></div><div class="windlines"></div>',
 heat:'<div class="sun"></div><div class="heatwave"></div>'
};
class TempoVivoCard extends HTMLElement {
  static getStubConfig(hass) {
    const entity = Object.keys(hass?.states || {}).find(id =>
      id.startsWith('sensor.') && hass.states[id].attributes?.source_entities?.weather
    );
    return {entity: entity || 'sensor.tempo_vivo', title: 'Tempo agora'};
  }
  constructor(){super();this.attachShadow({mode:'open'});this._config={};this._scene=null;this._timer=null;}
  setConfig(config){if(!config.entity)throw Error('Defina entity: sensor.tempo_vivo');this._config=config;this.render();}
  set hass(hass){this._hass=hass;this.render();}
  getCardSize(){return 5;}
  connectedCallback(){this.render();}
  disconnectedCallback(){clearTimeout(this._timer);}
  _state(id){const x=this._hass?.states?.[id];return x && !['unknown','unavailable'].includes(x.state)?x:null;}
  _value(a,key){const id=this._config[key]||a.source_entities?.[key];const s=this._state(id);return s?{value:s.state,unit:s.attributes.unit_of_measurement||''}:a[key]!=null?{value:a[key],unit:a[key+'_unit']||''}:null;}
  render(){if(!this.isConnected||!this._hass||!this._config.entity)return;
    const base=this._state(this._config.entity);const a=base?.attributes||{};const source=this._state(this._config.weather_entity||a.source_entities?.weather);
    const wa=source?.attributes||a.weather_attributes||{};const condition=source?.state||a.weather||base?.state||'unknown';
    const heat=this._value(a,'heat_alert');const outside=this._value(a,'outdoor_temperature');const outdoor=outside|| (wa.temperature!=null?{value:wa.temperature,unit:wa.temperature_unit||this._hass.config?.unit_system?.temperature||'°C'}:null);
    const indoors=this._value(a,'indoor_temperature');const humidity=this._value(a,'outdoor_humidity')|| (wa.humidity!=null?{value:wa.humidity,unit:'%'}:null);
    const indoorHumidity=this._value(a,'indoor_humidity');const wind=this._value(a,'wind')|| (wa.wind_speed!=null?{value:wa.wind_speed,unit:wa.wind_speed_unit||''}:null);
    const pressure=this._value(a,'pressure')|| (wa.pressure!=null?{value:wa.pressure,unit:wa.pressure_unit||''}:null);
    const visibility=this._value(a,'visibility')|| (wa.visibility!=null?{value:wa.visibility,unit:wa.visibility_unit||''}:null);
    const sunrise=this._value(a,'sunrise'),sunset=this._value(a,'sunset');
    const threshold=Number(this._config.heat_threshold??35);const hot=heat?.value==='on'||(this._config.heat_threshold!==false&&Number(outdoor?.value)>=threshold);
    const [name,kind]=CONDITIONS[condition]||['Tempo indisponível','cloud'];const scene=hot&&['sun','cloud'].includes(kind)?'heat':kind;const label=hot?'Onda de calor':name;
    const fmt=v=>v?`${v.value}${v.unit?' '+v.unit:''}`:'—';const time=v=>{if(!v)return null;const date=new Date(v.value);return Number.isNaN(date.valueOf())?v.value:date.toLocaleTimeString(this._hass.language||'pt-BR',{hour:'2-digit',minute:'2-digit'});};
    const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const row=(icon,v,title)=>v?`<div class="metric" title="${esc(title)}"><ha-icon icon="mdi:${icon}"></ha-icon>${esc(v)}</div>`:'<div></div>';
    if(!this.shadowRoot.querySelector('ha-card'))this.shadowRoot.innerHTML=`<style>${style}</style><ha-card><div class="frame"><div class="sky"><div class="scene active"></div></div><div class="title"></div><div class="top"><div class="condition"></div><div class="outside"><div class="temp"></div><div class="label">Temperatura externa</div></div></div><div class="metrics"></div></div><div class="home"><div class="home-primary"><ha-icon icon="mdi:home-thermometer-outline"></ha-icon><div><div class="heading">Temperatura da casa</div><div class="reading"></div></div></div><div class="extras"></div></div></ha-card>`;
    const root=this.shadowRoot, sky=root.querySelector('.sky');
    if(this._scene!==scene){this._scene=scene;sky.dataset.scene=scene;const prev=sky.querySelector('.scene.active');if(prev){prev.classList.remove('active');prev.classList.add('depart');setTimeout(()=>prev.remove(),1600)}const layer=document.createElement('div');layer.className='scene';layer.innerHTML=SCENES[scene];sky.append(layer);requestAnimationFrame(()=>layer.classList.add('active'));}
    root.querySelector('.title').textContent=this._config.title||'Tempo agora';root.querySelector('.condition').textContent=label;
    root.querySelector('.temp').textContent=outdoor?fmt(outdoor):'—';
    root.querySelector('.metrics').innerHTML=[row('weather-windy',wind&&fmt(wind)+(wa.wind_bearing!=null?' · '+wa.wind_bearing+'°':''),'Vento'),row('water-percent',humidity&&fmt(humidity),'Umidade externa'),row('eye-outline',visibility&&fmt(visibility),'Visibilidade'),row('gauge',pressure&&fmt(pressure),'Pressão'),row('weather-sunset-up',time(sunrise),'Nascer do sol'),row('weather-sunset-down',time(sunset),'Pôr do sol')].join('');
    root.querySelector('.reading').textContent=fmt(indoors);root.querySelector('.extras').innerHTML=indoorHumidity?row('water-percent',fmt(indoorHumidity),'Umidade da casa'):'';
  }
}
customElements.define('tempo-vivo-card',TempoVivoCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'tempo-vivo-card',name:'Tempo Vivo',description:'Tempo animado e temperatura da casa'});
