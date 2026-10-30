import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, webkit } from '@playwright/test';
const url='https://kalikeefbiz.github.io/-Crownfall-Arena-Unity/solrahn-goal-017b/';
const results=[];
for (const [name,type,hero,id] of [['chromium',chromium,2,'riven'],['webkit',webkit,1,'set']]) {
 const browser=await type.launch(name==='chromium'?{args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{executablePath:process.env.DEVICE_WEBKIT_EXECUTABLE});
 try {
  const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'Enter Crownfall'}).tap();
  await page.locator(`[data-hero="${hero}"]`).tap();await page.getByRole('button',{name:'Enter Arena'}).tap();
  await page.waitForFunction(()=>document.body.dataset.screen==='gameplay',null,{timeout:120000});
  await page.waitForFunction(()=>/FPS \d+\.\d/.test(document.querySelector('.perf-timing').textContent));
  const state=await page.evaluate(()=>window.__crownfall.snapshot());
  assert.equal(state.combat.name,id);assert.equal(state.summonerModels.length,6);assert(state.summonerModels.every(m=>m.state==='loaded'&&m.playing));assert.equal(state.modelAssets.downloads,4);assert.deepEqual(errors,[]);
  await page.screenshot({path:`evidence/017b/public-selected-${id}.png`});
  results.push({browser:name,selected:id,sixAnimatedModels:state.summonerModels,modelAssets:state.modelAssets,errors,physicalIPhone:'NOT VERIFIED'});
 } finally {await browser.close();}
}
await writeFile('evidence/017b/public-selection.json',JSON.stringify(results,null,2)+'\n');
console.log('2/2 public alternative-selection checks passed; six loaded animated actors each.');
