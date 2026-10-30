// Actual PlayCanvas frames. The response-only app reference enables inspection
// cameras without adding a camera mode or hook to the delivered game.
import { chromium } from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const out='evidence/018a';
try {
 for(const [name,port] of (process.env.AFTER_ONLY ? [['after',4182]] : [['before',4181],['after',4182]])) {
  const p=await b.newPage({viewport:{width:1000,height:650},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await p.route('**/assets/game-*.js',async r=>{const resp=await r.fetch();let s=await resp.text();const id=s.match(/entities:(\w+)\.root\.find/)[1];s=s.replace('Object.defineProperty(window,"__crownfall",',`window.__reviewApp=${id};Object.defineProperty(window,"__crownfall",`);await r.fulfill({response:resp,body:s});});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/?verify=1`);
  await p.getByRole('button',{name:'Enter Crownfall'}).tap();await p.getByRole('button',{name:'Enter Arena'}).tap();
  await p.waitForFunction(()=>document.body.dataset.screen==='gameplay',null,{timeout:120000});
  await p.evaluate(()=>{window.__crownfall.verification.arrange('roster');window.__crownfall.verification.pause();document.querySelector('#v2-tools [data-option=markers]').checked=false;document.querySelector('#v2-tools [data-option=markers]').dispatchEvent(new Event('change',{bubbles:true}));});
  const cdp=await p.context().newCDPSession(p);
  const shot=async label=>{await p.waitForTimeout(1500);await writeFile(`${out}/${name}-${label}.png`,Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));};
  await shot('gameplay');
  await p.evaluate(()=>{const select=document.querySelector('#v2-tools [data-option=focus]');select.value='middle-lane';select.dispatchEvent(new Event('change',{bubbles:true}));});
  await shot('matched-lane');
  const matchedCamera=await p.evaluate(()=>{const c=window.__reviewApp.root.findByName('MOBA-camera');return {position:c.getPosition().toArray(),euler:c.getEulerAngles().toArray()}});
  if(name==='after'){
   for(const [w,h] of [[844,390],[390,844]]){await p.setViewportSize({width:w,height:h});await shot(`mobile-${w}`);}
   await p.setViewportSize({width:1000,height:650});
  }
  await p.addStyleTag({content:'body * {visibility:hidden !important} canvas {visibility:visible !important}'});
  for(const [label,position,target] of [['integration',[-2,9,13],[-9,2,5]],['topdown',[0,48,1],[0,0,0]]]){
   await p.evaluate(({position,target})=>{const a=window.__reviewApp;const c=a.root.findByName('MOBA-camera');if(window.__reviewCamera)a.off('prerender',window.__reviewCamera);window.__reviewCamera=()=>{c.setPosition(...position);c.lookAt(...target)};a.on('prerender',window.__reviewCamera);},{position,target});
   await shot(label);
  }
  await writeFile(`${out}/${name}-capture.json`,JSON.stringify({errors,matchedCamera,snapshot:await p.evaluate(()=>window.__crownfall.snapshot()),inspectionCamera:'Response-only app reference, prerender pose; normal gameplay images use unchanged camera.'},null,2));
  console.log(name,'captured',errors);
  await p.close();
 }
}finally{await b.close();}
