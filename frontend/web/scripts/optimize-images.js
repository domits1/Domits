const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const INPUT_DIR = "src/pages/home/Images";
const OUTPUT_DIR = "src/pages/home/Images/optimized";

const SIZES = [400, 800, 1600];
const QUALITY = 70;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

fs.readdirSync(INPUT_DIR).forEach(file => {
  if (!file.match(/\.(jpg|jpeg|png|webp)$/i)) return;

  const inputPath = path.join(INPUT_DIR, file);
  const name = path.parse(file).name;

  SIZES.forEach(size => {
    const outputFile = `${name}-${size}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputFile);

    if (fs.existsSync(outputPath)) {
      console.log(`⏭ Skipping existing: ${outputFile}`);
      return;
    }

    sharp(inputPath)
      .resize({ width: size, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath)
      .then(() => {
        console.log(`✔ ${file} → ${outputFile}`);
      })
      .catch(err => {
        console.error(`❌ Error processing ${file} (${size}px)`, err);
      });
  });
});
