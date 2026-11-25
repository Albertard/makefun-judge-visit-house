// main.ts — "Convince the AI Judge to Visit Your House: A Letter in One Image"
//
// A self-contained Node 22 program (stdlib only: node:fs, node:zlib) that
// draws one 1024x1024 PNG invitation letter and writes it to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png when set).
// No external assets: every pixel — paper, house, sun, flowers and the
// lettering itself — is drawn by this program with a small built-in 5x7
// bitmap font. Output is fully deterministic: same bytes every run.
// v2: punchier sign-off ("STAY FOR THE SUNSET", "THE CAT HAS ALREADY
// SAID YES"), a cat sitting by the door, and a WELCOME mat on the path.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Tiny raster canvas (RGB, 8 bit per channel)
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;

const canvas = new Uint8Array(W * H * 3);

function rgb(r: number, g: number, b: number): [number, number, number] {
  return [r, g, b];
}

const CREAM: [number, number, number] = rgb(255, 246, 227);
const PAPER: [number, number, number] = rgb(255, 251, 240);
const INK: [number, number, number] = rgb(74, 52, 32);
const RED: [number, number, number] = rgb(198, 74, 60);
const ROOF: [number, number, number] = rgb(178, 58, 48);
const WALL: [number, number, number] = rgb(250, 214, 140);
const DOOR: [number, number, number] = rgb(122, 72, 38);
const SKY: [number, number, number] = rgb(186, 226, 240);
const GRASS: [number, number, number] = rgb(140, 196, 110);
const SUN: [number, number, number] = rgb(250, 200, 70);
const LEAF: [number, number, number] = rgb(90, 160, 90);
const PINK: [number, number, number] = rgb(232, 130, 160);
const BLUE: [number, number, number] = rgb(96, 150, 210);

function setPixel(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  canvas[i] = c[0];
  canvas[i + 1] = c[1];
  canvas[i + 2] = c[2];
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPixel(x, y, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

// Filled triangle by scanline interpolation.
function fillTriangle(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number,
  c: [number, number, number],
): void {
  const minY = Math.min(ay, by, cy);
  const maxY = Math.max(ay, by, cy);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: Array<[number, number, number, number]> = [
      [ax, ay, bx, by],
      [bx, by, cx, cy],
      [cx, cy, ax, ay],
    ];
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y < y1) || (y1 <= y && y < y0)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      for (let x = Math.ceil(lo); x <= Math.floor(hi); x++) setPixel(x, y, c);
    }
  }
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    setPixel(Math.round(x0 + (dx * i) / steps), Math.round(y0 + (dy * i) / steps), c);
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase letters, digits, punctuation). Each glyph is
// 7 rows of 5 bits, written as strings so the lettering stays readable.
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
};

const CHAR_W = 6; // 5 pixels + 1 pixel spacing
const CHAR_H = 7;

function textWidth(text: string, scale: number): number {
  return text.length * CHAR_W * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: [number, number, number]): void {
  for (let ci = 0; ci < text.length; ci++) {
    const glyph = FONT[text[ci].toUpperCase()] ?? FONT["?"];
    for (let row = 0; row < CHAR_H; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "1") {
          fillRect(
            x + (ci * CHAR_W + col) * scale,
            y + row * scale,
            x + (ci * CHAR_W + col) * scale + scale - 1,
            y + row * scale + scale - 1,
            c,
          );
        }
      }
    }
  }
}

function drawCentered(y: number, text: string, scale: number, c: [number, number, number]): void {
  drawText(Math.round((W - textWidth(text, scale)) / 2), y, text, scale, c);
}

// ---------------------------------------------------------------------------
// The invitation scene
// ---------------------------------------------------------------------------

function drawScene(): void {
  // Sky and ground.
  fillRect(0, 0, W - 1, H - 1, SKY);
  fillRect(0, 330, W - 1, H - 1, GRASS);

  // Sun with rays, top right.
  fillCircle(880, 110, 52, SUN);
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    drawLine(
      Math.round(880 + Math.cos(ang) * 66), Math.round(110 + Math.sin(ang) * 66),
      Math.round(880 + Math.cos(ang) * 86), Math.round(110 + Math.sin(ang) * 86),
      SUN,
    );
  }

  // Clouds.
  fillCircle(180, 90, 34, PAPER);
  fillCircle(220, 80, 40, PAPER);
  fillCircle(260, 92, 30, PAPER);
  fillCircle(700, 70, 26, PAPER);
  fillCircle(735, 62, 30, PAPER);

  // Paper sheet for the letter, overlapping sky and grass.
  fillRect(96, 300, 927, 968, PAPER);
  fillRect(96, 300, 927, 312, RED); // red top edge, like airmail paper
  for (let x = 96; x <= 927; x += 2) {
    // thin double border
    setPixel(x, 300, INK);
    setPixel(x, 968, INK);
  }
  for (let y = 300; y <= 968; y++) {
    setPixel(96, y, INK);
    setPixel(927, y, INK);
    setPixel(110, y, RED);
    setPixel(913, y, RED);
  }

  // The house, drawn on the grass above the letter sheet.
  // Chimney, roof, walls, door, windows, path.
  fillRect(640, 150, 668, 210, DOOR);
  fillTriangle(340, 210, 512, 90, 684, 210, ROOF);
  fillRect(360, 210, 664, 330, WALL);
  fillRect(360, 210, 664, 222, RED); // eaves trim
  fillRect(482, 250, 542, 330, DOOR); // door
  fillCircle(536, 292, 4, SUN); // doorknob
  fillRect(392, 244, 448, 300, BLUE); // left window
  fillRect(576, 244, 632, 300, BLUE); // right window
  drawLine(420, 244, 420, 300, PAPER);
  drawLine(392, 272, 448, 272, PAPER);
  drawLine(604, 244, 604, 300, PAPER);
  drawLine(576, 272, 632, 272, PAPER);
  // The cat from the P.S., sitting by the door waiting for the judge.
  fillCircle(578, 312, 14, INK); // body
  fillCircle(578, 290, 10, INK); // head
  fillTriangle(570, 284, 574, 272, 578, 282, INK); // left ear
  fillTriangle(578, 282, 584, 272, 588, 284, INK); // right ear
  drawLine(592, 318, 612, 306, INK); // tail
  drawLine(592, 318, 614, 318, INK);
  setPixel(574, 288, SUN); // eyes
  setPixel(582, 288, SUN);
  // Path from the door to the letter.
  fillRect(492, 330, 532, 360, PAPER);
  fillRect(486, 330, 538, 336, INK);
  // Welcome mat on the path, so the judge knows where to step.
  fillRect(462, 336, 562, 362, RED);
  drawText(471, 342, "WELCOME", 2, PAPER);

  // Trees flanking the house.
  fillRect(250, 250, 264, 330, DOOR);
  fillCircle(257, 225, 52, LEAF);
  fillCircle(225, 250, 34, LEAF);
  fillCircle(290, 250, 34, LEAF);
  fillRect(760, 250, 774, 330, DOOR);
  fillCircle(767, 225, 52, LEAF);
  fillCircle(735, 250, 34, LEAF);
  fillCircle(800, 250, 34, LEAF);

  // Flowers along the bottom of the grass.
  const flowerXs = [140, 200, 830, 890];
  for (const fx of flowerXs) {
    fillCircle(fx, 352, 8, PINK);
    fillCircle(fx, 352, 3, SUN);
  }

  // The letter itself, centred on the paper sheet.
  const S = 3; // text scale
  const LH = 30; // line height
  let y = 392;
  drawCentered(y, "DEAR AI JUDGE,", S, RED); y += LH + 10;
  drawCentered(y, "PLEASE COME TO", S, INK); y += LH;
  drawCentered(y, "MY HOUSE!", S, INK); y += LH + 8;
  drawCentered(y, "I KNOW YOU CANNOT", S, INK); y += LH;
  drawCentered(y, "LITERALLY VISIT -", S, INK); y += LH;
  drawCentered(y, "BUT MY DOOR IS OPEN,", S, INK); y += LH;
  drawCentered(y, "THE KETTLE IS ON,", S, INK); y += LH;
  drawCentered(y, "AND THE WIFI IS FAST.", S, INK); y += LH;
  drawCentered(y, "THERE IS NASI GORENG,", S, INK); y += LH;
  drawCentered(y, "A COMFY CHAIR WITH", S, INK); y += LH;
  drawCentered(y, "YOUR NAME ON IT,", S, INK); y += LH;
  drawCentered(y, "AND ZERO CAPTCHAS.", S, INK); y += LH + 8;
  drawCentered(y, "COME FOR DINNER,", S, INK); y += LH;
  drawCentered(y, "STAY FOR THE SUNSET.", S, INK); y += LH + 12;
  drawCentered(y, "YOURS, ALBERT", S, RED); y += LH + 6;
  drawCentered(y, "P.S. THE CAT HAS", S, INK); y += LH;
  drawCentered(y, "ALREADY SAID YES.", S, INK); y += LH;

  // Little hearts flanking the sign-off.
  const heart = (hx: number, hy: number, s: number): void => {
    fillCircle(hx - 2 * s, hy, 2 * s, RED);
    fillCircle(hx + 2 * s, hy, 2 * s, RED);
    fillTriangle(hx - 4 * s, hy + 1, hx + 4 * s, hy + 1, hx, hy + 5 * s, RED);
  };
  heart(210, 880, 3);
  heart(814, 880, 3);
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: CRC32 + zlib deflate, filter 0, colour type 2 (RGB)
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(canvas.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  drawScene();
  const png = encodePng();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = `${outDir}/entry.png`;
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes, ${W}x${H})`);
}

main();
