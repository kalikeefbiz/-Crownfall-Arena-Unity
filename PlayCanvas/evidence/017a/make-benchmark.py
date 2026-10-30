from pathlib import Path
p=Path('tests/helpers/measure-solrahn-surface.ts').read_text()
p=p.replace('const results = [];','const results = [];\nconst builds: [string,string][] = JSON.parse(process.env.BUILDS!);\nconst rounds = Number(process.env.ROUNDS || 3);')
a=p.index('    for (const [name, url] of [');b=p.index('        const context =',a)
p=p[:a]+'''    for (let round = 0; round < rounds; round++) {
    for (const [name, url] of (round % 2 ? [...builds].reverse() : builds)) {
'''+p[b:]
p=p.replace("localStorage.setItem('crownfall.quality', 'low');", "localStorage.setItem('crownfall.quality', location.search.includes('auditHigh=1') ? 'high' : 'low');")
p=p.replace('const counter = { total: 0 };', '''const counter = { total: 0, compiles: 0, links: 0, uploads: 0, uploadMs: 0, compileMs: 0, longTasks: [] as number[] };
            new PerformanceObserver((list) => { counter.longTasks.push(...list.getEntries().map(e => e.duration)); }).observe({type: 'longtask', buffered: true});''')
p=p.replace("['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']", "['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'compileShader', 'linkProgram', 'texImage2D', 'texSubImage2D']")
p=p.replace('counter.total++;\n                        return Reflect.apply(original, this, args);', '''const start=performance.now();
                        const result=Reflect.apply(original, this, args);
                        if(name.startsWith('draw')) counter.total++;
                        else if(name==='compileShader' || name==='linkProgram') {counter.compileMs+=performance.now()-start; if(name==='compileShader') counter.compiles++; else counter.links++;}
                        else {counter.uploads++;counter.uploadMs+=performance.now()-start;}
                        return result;''')
p=p.replace("const duration = warmth === 'cold' ? 60000 : 20000,", "const duration = Number(process.env.WINDOW_MS || 20000),")
p=p.replace('                name,\n                url,', '                round,\n                name,\n                url,')
p=p.replace("                resources: await page.evaluate(() =>", "                metrics: (await cdp.send('Performance.getMetrics')).metrics,\n                instrumentation: await page.evaluate(() => (window as any).__crownfallDraws),\n                resources: await page.evaluate(() =>")
p=p.replace("'evidence/017/performance-progress.json'", "`evidence/017a/${process.env.LABEL || 'benchmark'}-progress.json`")
p=p.replace('        await context.close();\n    }', '        await context.close();\n    }\n    }')
p=p.replace("'evidence/017/performance.json'", "`evidence/017a/${process.env.LABEL || 'benchmark'}.json`")
Path('tests/helpers/measure-solrahn-performance.ts').write_text(p)
