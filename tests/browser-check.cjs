const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.TEMPO_VIVO_CHROME || undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page = await browser.newPage({viewport:{width:1080,height:1100},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const modulePage=await browser.newPage();
 modulePage.on('pageerror',e=>errors.push(String(e)));
 const cardFile=path.resolve(__dirname,'../custom_components/tempo_vivo/tempo-vivo-card.js');
 const version=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../custom_components/tempo_vivo/manifest.json'),'utf8')).version;
 const resourceUrl='/tempo_vivo/tempo-vivo-card.js?v='+version;
 // Exercise the shipped file as an external JavaScript module, rather than
 // relying only on the demo's inline script. Every request is intercepted;
 // this fixture uses no account, local Home Assistant or external network.
 await modulePage.route('http://tempo-vivo.test/**',route=>{
  if(new URL(route.request().url()).pathname==='/tempo_vivo/tempo-vivo-card.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(cardFile,'utf8')});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><script type="module" src="'+resourceUrl+'"></script><tempo-vivo-card></tempo-vivo-card>'});
 });
 await modulePage.goto('http://tempo-vivo.test/');
 await modulePage.waitForFunction(()=>!!customElements.get('tempo-vivo-card'));
 const moduleChecks=await modulePage.evaluate(()=>{
  const card=document.querySelector('tempo-vivo-card');
  card.setConfig({type:'custom:tempo-vivo-card',entity:'weather.forecast_casa'});
  card.hass={states:{'weather.forecast_casa':{state:'sunny',attributes:{temperature:22,temperature_unit:'°C'}}},config:{unit_system:{temperature:'°C'},time_zone:'UTC'},locale:{language:'pt-BR'}};
  return [
  {name:'Módulo externo registra tempo-vivo-card',ok:!!customElements.get('tempo-vivo-card')},
  {name:'Editor do card é registrado',ok:!!customElements.get('tempo-vivo-card-editor')},
  {name:'Card aparece na lista customCards',ok:window.customCards.some(c=>c.type==='tempo-vivo-card')},
  {name:'YAML mínimo com entidade weather renderiza o clima',ok:card.shadowRoot.querySelector('.temperature .value').textContent==='22'&&!!card.shadowRoot.querySelector('.home')}
 ];});
 await modulePage.addScriptTag({type:'module',url:'http://tempo-vivo.test/tempo_vivo/tempo-vivo-card.js?duplicate=1'});
 moduleChecks.push({name:'Carregamento duplicado não quebra o registro',ok:await modulePage.evaluate(()=>window.customCards.filter(c=>c.type==='tempo-vivo-card').length===1)});
 await modulePage.close();
 await page.goto('file://'+path.resolve(__dirname,'../demo.html'));
 await page.getByText('Verificações do card',{exact:true}).click();
 await page.getByRole('button',{name:'Executar verificações'}).click();
 await page.waitForFunction(()=>window.tvTestResult!==null);
 const result=await page.evaluate(()=>window.tvTestResult);
 console.log(JSON.stringify({moduleChecks,result,errors},null,2));
 await page.getByText('Verificações do card',{exact:true}).click();
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-sol.png')});
 await page.getByRole('button',{name:'Chuva',exact:true}).click();
 await page.waitForTimeout(3400);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-chuva.png')});
 await page.getByRole('button',{name:'Mostrar cômodos'}).click();
 await page.locator('#width').selectOption('320');
 await page.waitForTimeout(400);
 await page.locator('.card-wrap').screenshot({path:path.resolve(__dirname,'../docs/card-celular.png')});
 const overflow=await page.locator('#card').evaluate(e=>({width:e.clientWidth,scroll:e.shadowRoot.querySelector('ha-card').scrollWidth}));
 console.log(JSON.stringify({mobileOverflow:overflow}));
 await page.getByRole('button',{name:'Editar sensores'}).click();
 await page.locator('#editor').screenshot({path:path.resolve(__dirname,'../docs/editor.png')});
 await browser.close();
 fs.writeFileSync(path.resolve(__dirname,'../docs/test-results.json'),JSON.stringify({version,moduleChecks,result,errors,mobileOverflow:overflow},null,2));
 if(!moduleChecks.every(c=>c.ok)||!result.passed||errors.length||overflow.scroll>overflow.width+1)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
