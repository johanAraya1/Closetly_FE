const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "node_modules/@expo/cli/build/src/start/server/metro/externals.js");
let content = fs.readFileSync(filePath, "utf8");
const oldCode = '.filter((x)=>!/^_|^(internal|v8|node-inspect)\\/|\\//.test(x) && ![';
const newCode = '.map((x)=>x.replace(/^node:/,"")).filter((x)=>!/^_|^(internal|v8|node-inspect)\\/|\\//.test(x) && ![';
content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content);
console.log("Patched OK");
