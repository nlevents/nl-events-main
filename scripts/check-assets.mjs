import fs from "node:fs/promises";
import path from "node:path";
const root=process.cwd();
const assetRoot=path.join(root,"public","assets","images");
const files=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(/\.(avif|gif|jpe?g|png|webp)$/i.test(e.name))files.push(p)}}
await walk(assetRoot);
let total=0;
for(const p of files){const s=(await fs.stat(p)).size;total+=s;console.log(`${path.relative(root,p)}\t${(s/1024).toFixed(1)} KB`)}
console.log(`\n${files.length} image files; ${(total/1024/1024).toFixed(2)} MB total.`);
