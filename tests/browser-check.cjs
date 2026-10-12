const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.TEMPO_VIVO_CHROME || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page = await browser.newPage({viewport:{width:1080,height:1100},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const modulePage=await browser.newPage();
 modulePage.on('pageerror',e=>errors.push(String(e)));
 const cardFile=path.resolve(__dirname,'../custom_components/tempo_vivo/ceuvia-weather-card.js');
 const version=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../custom_components/tempo_vivo/manifest.json'),'utf8')).version;
 const resourceUrl='/ceuvia/ceuvia-weather-card.js?v='+version;
 // Exercise the shipped file as an external JavaScript module, rather than
 // relying only on the demo's inline script. Every request is intercepted;
 // this fixture uses no account, local Home Assistant or external network.
 await modulePage.route('http://tempo-vivo.test/**',route=>{
  if(new URL(route.request().url()).pathname==='/ceuvia/ceuvia-weather-card.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(cardFile,'utf8')});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><script type="module" src="'+resourceUrl+'"></script><ceuvia-weather-card></ceuvia-weather-card>'});
 });
 await modulePage.goto('http://tempo-vivo.test/');
 await modulePage.waitForFunction(()=>!!customElements.get('ceuvia-weather-card'));
 const moduleChecks=await modulePage.evaluate(()=>{
  const card=document.querySelector('ceuvia-weather-card');
  card.setConfig({type:'custom:ceuvia-weather-card',entity:'weather.forecast_casa'});
  card.hass={states:{'weather.forecast_casa':{state:'sunny',attributes:{temperature:22,temperature_unit:'°C'}}},config:{unit_system:{temperature:'°C'},time_zone:'UTC'},locale:{language:'pt-BR'}};
  return [
  {name:'Módulo externo registra Ceuvia Weather Card',ok:!!customElements.get('ceuvia-weather-card')},
  {name:'Editor do card é registrado',ok:!!customElements.get('ceuvia-weather-card-editor')},
  {name:'Card aparece na lista customCards',ok:window.customCards.some(c=>c.type==='ceuvia-weather-card')},
  {name:'YAML mínimo com entidade weather renderiza o clima',ok:card.shadowRoot.querySelector('.temperature .value').textContent==='22'&&!!card.shadowRoot.querySelector('.home')},
  {name:'Tipo antigo continua disponível',ok:!!customElements.get('tempo-vivo-card')&&!!customElements.get('tempo-vivo-card-editor')},
  {name:'Seletor mostra o nome final sem duplicar o cartão',ok:window.customCards.filter(c=>c.type==='ceuvia-weather-card').length===1&&window.customCards.find(c=>c.type==='ceuvia-weather-card').name==='Ceuvia Weather Card'&&!window.customCards.some(c=>c.type==='tempo-vivo-card')}
 ];});
 await modulePage.addScriptTag({type:'module',url:'http://tempo-vivo.test/ceuvia/ceuvia-weather-card.js?duplicate=1'});
 moduleChecks.push({name:'Carregamento duplicado não quebra o registro',ok:await modulePage.evaluate(()=>window.customCards.filter(c=>c.type==='ceuvia-weather-card').length===1)});
 moduleChecks.push(await modulePage.evaluate(()=>{
  const old=document.createElement('tempo-vivo-card');document.body.append(old);old.setConfig({type:'custom:tempo-vivo-card',entity:'weather.forecast_casa',animation:false});old.hass={states:{'weather.forecast_casa':{state:'rainy',attributes:{temperature:25,temperature_unit:'°C'}}},config:{unit_system:{temperature:'°C'}},language:'pt-BR'};
  const ok=old.shadowRoot.querySelector('.condition').textContent==='Chuva'&&old.shadowRoot.querySelector('.temperature .value').textContent==='25';old.remove();return {name:'YAML antigo renderiza após a atualização',ok};
 }));
 await modulePage.close();
 await page.goto('file://'+path.resolve(__dirname,'../demo.html'));
 await page.getByText('Verificações do card',{exact:true}).click();
 await page.getByRole('button',{name:'Executar verificações'}).click();
 await page.waitForFunction(()=>window.tvTestResult!==null);
 const result=await page.evaluate(()=>window.tvTestResult);
 console.log(JSON.stringify({moduleChecks,result,errors},null,2));
 await page.getByText('Verificações do card',{exact:true}).click();
 const settle=await page.locator('#card').evaluate(e=>e._scene.duration+250);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-sol.png')});
 await page.getByRole('button',{name:'Nuvens',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-nuvens.png')});
 await page.getByRole('button',{name:'Chuva',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-chuva.png')});
 await page.getByRole('button',{name:'Temporal',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.locator('#card').evaluate(e=>{const s=e._scene;s.setActive(false);s.strike=null;s.nextStrike=s.clock;s.draw();s.clock+=.06;s.draw();});
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-temporal.png')});
 const performanceReport=await page.locator('#card').evaluate(e=>{
  const scene=e._scene, samples=[];
  scene.setOptions('high',4.5);
  for(let i=0;i<90;i++){scene.clock+=1/60;const start=performance.now();scene.draw();samples.push(performance.now()-start);}
  samples.sort((a,b)=>a-b);scene.setOptions('balanced',4.5);scene.setActive(true);
  return {scene:'temporal',quality:'high',frames:samples.length,medianMs:Number(samples[45].toFixed(2)),p95Ms:Number(samples[85].toFixed(2))};
 });
 await page.getByRole('button',{name:'Noite',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-noite.png')});
 await page.getByRole('button',{name:'Onda de calor',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-calor.png')});
 await page.getByRole('button',{name:'Chuva',exact:true}).click();
 await page.waitForTimeout(settle);
 await page.getByRole('button',{name:'Mostrar cômodos'}).click();
 await page.locator('#width').selectOption('320');
 await page.waitForTimeout(400);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-celular.png')});
 const overflow=await page.locator('#card').evaluate(e=>({width:e.clientWidth,scroll:e.shadowRoot.querySelector('ha-card').scrollWidth}));
 console.log(JSON.stringify({mobileOverflow:overflow}));
 await page.getByRole('button',{name:'Editar sensores'}).click();
 await page.locator('#editor').screenshot({path:path.resolve(__dirname,'../docs/editor.png')});
 await browser.close();
 console.log(JSON.stringify({performanceReport}));
 fs.writeFileSync(path.resolve(__dirname,'../docs/test-results.json'),JSON.stringify({version,moduleChecks,result,errors,mobileOverflow:overflow,performanceReport},null,2));
 if(!moduleChecks.every(c=>c.ok)||!result.passed||errors.length||overflow.scroll>overflow.width+1)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
