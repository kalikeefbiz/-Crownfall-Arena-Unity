// Sequential AB/BA software-renderer comparison. No network response injection,
// accelerated simulation ticks, inspector cameras, concurrent browser work or screenshots.
import {chromium,webkit} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const results=process.env.RESUME === '1' ? JSON.parse(await readFile('evidence/018a/performance-raw.json','utf8')) : [];
console.log('Retained completed samples:',results.length);
for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
 if(results.filter((r)=>r.engine===engine).length===6) continue;
 const browser=await type.launch(engine==='chromium'?{args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{executablePath:process.env.DEVICE_WEBKIT_EXECUTABLE});
 try{
 for(let round=0;round<3;round++) for(const name of round%2?['after','before']:['before','after']){
  if(results.some((r)=>r.engine===engine && r.round===round && r.name===name)) continue;
  const context=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>localStorage.setItem('crownfall.quality','low'));
  await p.goto(`http://127.0.0.1:${name==='before'?4181:4182}/?verify=1`);await p.getByRole('button',{name:'Enter Crownfall'}).tap();await p.getByRole('button',{name:'Enter Arena'}).tap();await p.waitForFunction(()=>document.body.dataset.screen==='gameplay',null,{timeout:120000});
  await p.evaluate(()=>{window.__crownfall.verification.arrange('roster');window.__crownfall.verification.pause()});
  // Fixture only freezes actor positions for equivalent visible workload. Rendering
  // and animation continue on real wall time. Not a live combat throughput claim.
  await p.waitForTimeout(4000);
  const sample=await p.evaluate(async()=>{const api=window.__crownfall;const begin=performance.now();const first=api.snapshot();let last=await new Promise(requestAnimationFrame);const intervals=[];while(performance.now()-begin<12000){const t=await new Promise(requestAnimationFrame);intervals.push(t-last);last=t}const final=api.snapshot();const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return {first,final,intervals,wallMs:performance.now()-begin,jsHeapUsed:performance.memory?.usedJSHeapSize??null,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};});
  let cdpMetrics=null;if(engine==='chromium'){const cdp=await context.newCDPSession(p);await cdp.send('Performance.enable');cdpMetrics=(await cdp.send('Performance.getMetrics')).metrics;}
  const sorted=[...sample.intervals].sort((a,b)=>a-b);const mean=sample.intervals.reduce((a,b)=>a+b,0)/sorted.length;
  const row={engine,round,name,meanFps:1000/mean,meanFrameMs:mean,p95FrameMs:sorted[Math.floor(sorted.length*.95)],renderedFps:(sample.final.frames-sample.first.frames)*1000/sample.wallMs,cdpMetrics,errors,...sample};results.push(row);console.log(engine,round,name,row.meanFps,row.meanFrameMs,row.p95FrameMs);await writeFile('evidence/018a/performance-raw.json',JSON.stringify(results,null,2));await context.close();
 }
 }finally{await browser.close()}
}
