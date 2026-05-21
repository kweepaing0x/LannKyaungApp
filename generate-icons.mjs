#!/usr/bin/env node
/**
 * generate-icons.mjs
 * Generates all required PWA icon sizes from a single source image.
 *
 * Usage:
 *   1. npm install sharp   (one time)
 *   2. Put your icon as  public/icon-source.png  (1024x1024 recommended)
 *   3. node generate-icons.mjs
 *
 * Output: public/icons/icon-{size}.png for all required sizes
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const SOURCE = "./public/icon-source.png"; // your source icon
const OUT    = "./public/icons";
const SIZES  = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync(OUT, { recursive: true });

for (const size of SIZES) {
  await sharp(SOURCE)
    .resize(size, size)
    .png()
    .toFile(join(OUT, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

console.log("\nAll icons generated in public/icons/");
console.log("Now deploy and test install on Android Chrome.");
