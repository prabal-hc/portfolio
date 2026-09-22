// Rebuilds src/app/favicon.ico from src/app/icon.svg, at the sizes browsers actually pick from (16/32/48).
// Hand-rolled ICO writer using the modern "PNG-in-ICO" entry format (a plain ICO directory pointing at full PNG
// blobs) — simpler than the classic BMP-based format and supported by every current browser and OS.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SIZES = [16, 32, 48];
const svgPath = path.join(__dirname, "..", "src", "app", "icon.svg");
const outPath = path.join(__dirname, "..", "src", "app", "favicon.ico");

async function main() {
  const svg = fs.readFileSync(svgPath);
  const pngs = await Promise.all(SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()));

  const dirSize = 6 + 16 * pngs.length;
  let offset = dirSize;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  for (let i = 0; i < pngs.length; i++) {
    const size = SIZES[i];
    const png = pngs[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // color count (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(entry);
  }

  fs.writeFileSync(outPath, Buffer.concat([header, ...entries, ...pngs]));
  console.log(`Wrote ${outPath} (${SIZES.join("/")}px, ${fs.statSync(outPath).size} bytes)`);
}

main();
