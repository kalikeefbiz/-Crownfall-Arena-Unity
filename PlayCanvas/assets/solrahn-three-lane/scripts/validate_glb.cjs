// Usage: NODE_PATH=/path/to/node_modules node validate_glb.cjs file.glb report.json
const fs = require('node:fs');
const validator = require('gltf-validator');
validator
    .validateBytes(new Uint8Array(fs.readFileSync(process.argv[2])), { uri: process.argv[2], maxIssues: 100 })
    .then((report) => {
        fs.writeFileSync(process.argv[3], JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report.issues));
        process.exitCode = report.issues.numErrors ? 1 : 0;
    });
