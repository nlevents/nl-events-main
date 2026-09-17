// Dependency-free XLSX export for the admin backup tool.
// The workbook uses inline strings and uncompressed ZIP entries so it works
// in a browser without pulling another package into the site.

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function safeSheetName(name) {
  return String(name).replace(/[\\/:*?\[\]]/g, "-").slice(0, 31) || "Sheet";
}
function columnName(n) {
  let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s;
}
function cell(ref, value) {
  const text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
}
function sheetXml(rows) {
  const cols = [];
  const keys = new Set();
  rows.forEach(r => Object.keys(r || {}).forEach(k => keys.add(k)));
  keys.forEach(k => cols.push(k));
  if (!cols.length) cols.push("Data");
  const header = `<row r="1">${cols.map((k,i) => cell(`${columnName(i+1)}1`, k)).join("")}</row>`;
  const body = rows.map((r,ri) => `<row r="${ri+2}">${cols.map((k,i) => cell(`${columnName(i+1)}${ri+2}`, r?.[k])).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${header}${body}</sheetData></worksheet>`;
}
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) { c ^= b; for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return (c ^ 0xffffffff) >>> 0;
}
function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
function u32(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
function concat(parts) { const out = new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let o=0; for(const p of parts){out.set(p,o);o+=p.length;} return out; }
function zipStore(entries) {
  const chunks=[], central=[]; let offset=0;
  const enc = new TextEncoder();
  for (const e of entries) {
    const name=enc.encode(e.name), data=enc.encode(e.data), crc=crc32(data);
    const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
    chunks.push(local);
    const cd=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
    central.push(cd); offset += local.length;
  }
  const centralData=concat(central); const all=concat(chunks); const end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralData.length),u32(all.length),u16(0)]);
  return new Blob([all, centralData, end], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

export function downloadXlsx(filename, sheets) {
  const names = Object.keys(sheets);
  const sheetEntries = names.map((name, i) => ({ name: safeSheetName(name), index: i + 1 }));
  const workbookSheets = sheetEntries.map(s => `<sheet name="${esc(s.name)}" sheetId="${s.index}" r:id="rId${s.index}"/>`).join("");
  const rels = sheetEntries.map(s => `<Relationship Id="rId${s.index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.index}.xml"/>`).join("");
  const overrides = sheetEntries.map(s => `<Override PartName="/xl/worksheets/sheet${s.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const entries=[
    {name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`},
    {name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`},
    {name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`},
    {name:"xl/styles.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs></styleSheet>`},
    ...sheetEntries.map(s=>({name:`xl/worksheets/sheet${s.index}.xml`,data:sheetXml(sheets[names[s.index-1]] || [])})),
  ];
  const blob=zipStore(entries), url=URL.createObjectURL(blob), a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
