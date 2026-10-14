import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['hero', 'technology-selection', 'migration-planning', 'interface-research', 'source-audit']) {
  await sharp(path.join(root, 'assets/raw', name + '.png')).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 88 }).toFile(path.join(root, 'assets', name + '.webp'));
}
await sharp(path.join(root, 'assets/raw/social-preview.png')).resize(1280, 640, { fit: 'contain', background: '#F5F4EE' }).png({ compressionLevel: 9 }).toFile(path.join(root, 'assets/social-preview.png'));

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="52" fill="#007991"/><path d="M67 188V69h65c32 0 51 16 51 43 0 20-10 33-28 39l34 37h-41l-29-33h-18v33zm34-62h29c13 0 19-5 19-14s-6-14-19-14h-29z" fill="#F5F4EE"/><circle cx="185" cy="183" r="11" fill="#D58B30"/></svg>`;
writeFileSync(path.join(root, 'assets/icon.svg'), icon);
await sharp(Buffer.from(icon)).png().toFile(path.join(root, 'assets/icon.png'));

const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1080" viewBox="0 0 1800 1080" role="img" aria-labelledby="title desc"><title id="title">rSEARCH architecture and dataflow</title><desc id="desc">A brief enters the CLI or skill or the desktop MCP server. Native Codex or Claude produce recorded search events and structured findings. Two completed retrieval operations are required. Failed runs stop. A verifier assigns evidence levels and produces Markdown and JSON dossiers.</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#007991"/></marker></defs><rect width="1800" height="1080" fill="#F5F4EE"/><g font-family="Segoe UI,Arial,sans-serif" fill="#152E36">`];
const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function text(x,y,value,size=27,weight=400,color='#152E36') { parts.push(`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(value)}</text>`); }
function box(x,y,w,h,title,rows,fill='#FFFFFF') {
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="#CDD5D3" stroke-width="2"/>`);
  text(x+26,y+50,title,31,700);
  rows.forEach((row,i)=>text(x+26,y+94+i*39,row,25,400,'#53666B'));
}
function arrow(points,dashed=false) { parts.push(`<path d="${points}" fill="none" stroke="#007991" stroke-width="4" ${dashed?'stroke-dasharray="10 8"':''} marker-end="url(#arrow)"/>`); }
text(72,102,'rSEARCH',64,700);
text(72,159,'A focused question becomes an inspectable evidence dossier.',30,400,'#53666B');
box(72,245,340,200,'Bounded brief',['Question and scope','Sources and falsifiers']);
box(492,235,390,125,'CLI or operator skill',['Native provider selection']);
box(492,400,390,160,'Desktop MCP',['Start → status → read','Cancel an active run'],'#E5F2F4');
arrow('M412 315H455V297H487'); arrow('M412 380H450V480H487');
box(972,235,360,145,'Codex',['Live search · read-only','Recorded JSONL events']);
box(972,420,360,145,'Claude',['Search / fetch / read','Matched tool results']);
parts.push('<path d="M882 296H920V492M882 480H920" fill="none" stroke="#007991" stroke-width="4"/>');
arrow('M920 305H967'); arrow('M920 492H967');
text(995,214,'Choose one provider',23,400,'#53666B');
box(1422,295,306,240,'Retrieval gate',['At least 2 completed','retrieval operations','Valid findings payload'],'#E5F2F4');
arrow('M1332 305H1376V365H1417'); arrow('M1332 492H1376V462H1417');
box(1422,635,306,148,'Failed run stops',['Diagnostics retained'],'#FCEDDA');
arrow('M1575 535V630');
text(1598,586,'Fail',23,600,'#936124');
box(972,720,360,200,'Evidence verifier',['Source-origin groups','Final tiers · no auto T5','Limits and demotions']);
arrow('M1422 520H1360V665H1152V715');
text(1176,648,'Pass',23,600,'#007991');
box(492,720,390,200,'Readable dossier',['dossier.md + dossier.json','Claims · sources · gaps'],'#E5F2F4');
arrow('M972 820H887');
box(72,720,340,200,'User decision',['Inspect and challenge','Choose the next action']);
arrow('M492 820H417');
text(72,1014,'The log proves retrieval activity. Citation support, source independence and claim correctness still need review.',26,400,'#53666B');
parts.push('</g></svg>');
const svg = parts.join('\n');
writeFileSync(path.join(root, 'assets/dataflow.svg'), svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(root, 'assets/dataflow.png'));
console.log('Web graphics, 1280 × 640 social preview, icon and editable SVG/PNG dataflow built.');
