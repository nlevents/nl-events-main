/** Upload every image under public/assets/images to Cloudinary using an unsigned preset. */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ASSET_ROOT = path.join(ROOT, "public", "assets", "images");
const MANIFEST = path.join(ROOT, "cloudinary-assets-manifest.json");

async function loadDotEnv(file) {
  try {
    const text = await fs.readFile(file, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx < 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

await loadDotEnv(path.join(ROOT, ".env.local"));
await loadDotEnv(path.join(ROOT, ".env"));

const cloudName = String(process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
const uploadPreset = String(process.env.VITE_CLOUDINARY_UPLOAD_PRESET || "").trim();
if (!cloudName || !uploadPreset) {
  console.error("Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET.");
  console.error("Create .env.local from .env.local.example first.");
  process.exit(1);
}

const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function isImage(file) {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(file);
}

function publicIdFor(file) {
  const rel = path.relative(ASSET_ROOT, file).split(path.sep).join("/");
  return `nle-assets/${rel.replace(/\.[^.]+$/, "")}`;
}

function deliveryUrl(publicId) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_1200/${publicId}`;
}

async function upload(file, publicId) {
  const bytes = await fs.readFile(file);
  const form = new FormData();
  form.append("file", new Blob([bytes]));
  form.append("upload_preset", uploadPreset);
  form.append("public_id", publicId);

  const response = await fetch(endpoint, { method: "POST", body: form });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}

  if (response.ok && data.secure_url) return { status: "uploaded", url: data.secure_url };

  const message = String(data?.error?.message || text || `HTTP ${response.status}`);
  if (/already exists|public id.*exist|duplicate/i.test(message)) {
    return { status: "exists", url: deliveryUrl(publicId) };
  }
  throw new Error(`${path.relative(ROOT, file)}: ${message}`);
}

const files = (await walk(ASSET_ROOT)).filter(isImage).sort();
console.log(`Found ${files.length} optimized image assets to migrate.`);

let manifest = {};
try { manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8")); } catch {}

let uploaded = 0;
let existing = 0;
let failed = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  const publicId = publicIdFor(file);
  try {
    const result = await upload(file, publicId);
    manifest[`/${rel.replace(/^public\//, "")}`] = {
      publicId,
      url: result.url || deliveryUrl(publicId),
    };
    if (result.status === "uploaded") {
      uploaded += 1;
      console.log(`✓ uploaded ${rel}`);
    } else {
      existing += 1;
      console.log(`↷ exists   ${rel}`);
    }
  } catch (error) {
    failed += 1;
    console.error(`✗ failed   ${error.message}`);
  }
}

await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nDone. Uploaded: ${uploaded}; already present: ${existing}; failed: ${failed}.`);
console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}`);
if (failed) process.exit(1);
