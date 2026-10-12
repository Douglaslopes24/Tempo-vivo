/* Capture a reproducible preview from the production card and demo data. */
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
 const browser=await chromium.launch({executablePath:process.env.TEMPO_VIVO_CHROME||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:850,height:850},deviceScaleFactor:1});
 await page.goto('file://'+path.resolve(__dirname,'../demo.html'));
 const folder=process.env.TEMPO_VIVO_FRAMES||'/tmp/tempo-vivo-frames';fs.mkdirSync(folder,{recursive:true});
 const fps=30, frames=13*fps;
 await page.locator('#card').evaluate(e=>{e._scene.setActive(false);e._scene.setOptions('high',4.5);e._scene.clock=0;e._scene.wind=e._scene.windTarget;});
 let transitionStart=0;
 for(let frame=0;frame<frames;frame++){
  if(frame===fps||frame===7*fps){
   transitionStart=await page.evaluate(condition=>{
    setWeather(condition);const s=document.getElementById('card')._scene;s.setActive(false);return s.transition.start;
   },frame===fps?'rainy':'sunny');
  }
  await page.locator('#card').evaluate((e,args)=>{
   const s=e._scene; s.clock=args.frame/args.fps;
   if(args.frame>=args.fps)s.update(args.start+(args.frame-(args.frame<7*args.fps?args.fps:7*args.fps))*1000/args.fps);
   s.draw();
  },{frame,start:transitionStart,fps});
  await page.locator('.card-wrap').screenshot({path:path.join(folder,String(frame).padStart(3,'0')+'.png')});
 }
 await browser.close();console.log(JSON.stringify({frames,fps,folder}));
})().catch(error=>{console.error(error);process.exitCode=1;});
