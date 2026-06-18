// Generates the Open Graph share image (1200x630) → public/og-image.png
// Faithful to the in-game cards: pointy-top hexagons, white outer shape,
// coloured inner shape. Re-run with: node scripts/gen-og.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '../public/og-image.png')

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="1200" height="630" fill="#14142a"/>
<rect x="0" y="0" width="1200" height="8" fill="#1E7FFF"/>
<text x="600" y="208" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="116" font-weight="800" fill="#ffffff" letter-spacing="1">Formidable</text>
<text x="600" y="270" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="400" fill="#c3c3da">Il gioco delle forme e dei colori</text>
<ellipse cx="380" cy="548" rx="74" ry="13" fill="#000000" opacity="0.28"/>
<ellipse cx="600" cy="548" rx="74" ry="13" fill="#000000" opacity="0.28"/>
<ellipse cx="820" cy="548" rx="74" ry="13" fill="#000000" opacity="0.28"/>
<polygon points="459.7,486 380,532 300.3,486 300.3,394 380,348 459.7,394" fill="#1E7FFF"/>
<polygon points="380,367 448.9,484.6 311.1,484.6" fill="#ffffff" stroke="#003D80" stroke-width="5"/>
<circle cx="380" cy="440" r="25.1" fill="#FF1010" stroke="#800000" stroke-width="5"/>
<polygon points="679.7,486 600,532 520.3,486 520.3,394 600,348 679.7,394" fill="#FF1010"/>
<rect x="555.1" y="395.1" width="89.7" height="89.7" fill="#ffffff" stroke="#800000" stroke-width="5"/>
<polygon points="600,417.4 621.3,453.8 578.7,453.8" fill="#3DC35A" stroke="#00661A" stroke-width="5"/>
<polygon points="899.7,486 820,532 740.3,486 740.3,394 820,348 899.7,394" fill="#3DC35A"/>
<circle cx="820" cy="440" r="57.4" fill="#ffffff" stroke="#00661A" stroke-width="5"/>
<rect x="800.5" y="420.5" width="38.9" height="38.9" fill="#1E7FFF" stroke="#003D80" stroke-width="5"/>
<text x="600" y="598" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="400" fill="#7777a0">filippo-fresilli.github.io/formidable</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile(out)
console.log('Wrote', out)
