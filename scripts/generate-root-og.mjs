import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(scriptDirectory, '..')
const width = 1200
const height = 630
const output = path.join(root, 'public/images/og/alec-mingione-og.png')

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const title = escapeXml('ALEC MINGIONE')
const role = escapeXml('FRACTIONAL CTO · AI SYSTEMS · ARCHITECTURE')
const certification = escapeXml('CERTIFIED FULL-STACK SOFTWARE DEVELOPER')
const certifier = escapeXml('WOZ U · 2019')
const mentorship = escapeXml('MBA · WOOLF UNIVERSITY')
const mentorCompanies = escapeXml('COMPLETED FEB 2026')

const background = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#3f3f46" stroke-width="1" opacity="0.22"/>
      </pattern>
      <radialGradient id="glow" cx="76%" cy="42%" r="56%">
        <stop offset="0" stop-color="#2dd4bf" stop-opacity="0.16"/>
        <stop offset="0.5" stop-color="#2dd4bf" stop-opacity="0.035"/>
        <stop offset="1" stop-color="#09090b" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="portraitFade" x1="0" x2="1">
        <stop offset="0" stop-color="#09090b" stop-opacity="1"/>
        <stop offset="0.22" stop-color="#09090b" stop-opacity="0.78"/>
        <stop offset="0.54" stop-color="#09090b" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#09090b" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.58" stop-color="#09090b" stop-opacity="0"/>
        <stop offset="1" stop-color="#09090b" stop-opacity="0.9"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="#09090b"/>
    <rect width="1200" height="630" fill="url(#grid)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <path d="M72 72h38M72 72v38M1128 72h-38M1128 72v38M72 558h38M72 558v-38M1128 558h-38M1128 558v-38" stroke="#a1a1aa" stroke-width="1" opacity="0.42"/>
    <path d="M72 138h420" stroke="#3f3f46" stroke-width="1" stroke-dasharray="5 7" opacity="0.7"/>
    <circle cx="72" cy="138" r="3" fill="#2dd4bf"/>
  </svg>
`)

const portrait = await sharp(
  path.join(root, 'src/images/portrait-bg-removed.png')
)
  .resize({ width: 550, height: 590, fit: 'inside', withoutEnlargement: true })
  .png()
  .toBuffer()

const logo = await sharp(path.join(root, 'src/images/logos/Amware Icon.svg'), {
  density: 288,
})
  .resize({ width: 132, height: 96, fit: 'inside' })
  .png()
  .toBuffer()

const overlays = Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @font-face { font-family: Layer; src: url('${path.join(
          root,
          'public/fonts/Layer/Layer.ttf'
        )}'); }
        @font-face { font-family: Vector; src: url('${path.join(
          root,
          'public/fonts/Vector/Vector-Bold.ttf'
        )}'); font-weight: 700; }
        @font-face { font-family: Mono; src: local('Menlo'), local('DejaVu Sans Mono'); }
      </style>
      <linearGradient id="portraitFade" x1="0" x2="1">
        <stop offset="0" stop-color="#09090b" stop-opacity="1"/>
        <stop offset="0.28" stop-color="#09090b" stop-opacity="0.75"/>
        <stop offset="0.58" stop-color="#09090b" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.58" stop-color="#09090b" stop-opacity="0"/>
        <stop offset="1" stop-color="#09090b" stop-opacity="0.94"/>
      </linearGradient>
    </defs>
    <rect x="490" width="270" height="630" fill="url(#portraitFade)"/>
    <rect width="1200" height="630" fill="url(#bottomFade)"/>
    <text x="72" y="202" fill="#2dd4bf" font-family="Mono, monospace" font-size="15" font-weight="700" letter-spacing="2.2">// BUILDER PROFILE — PHOENIX, AZ</text>
    <text x="72" y="310" fill="#fafafa" font-family="Layer, Vector, sans-serif" font-size="72" font-weight="700" letter-spacing="-1.5">${title}</text>
    <rect x="72" y="344" width="44" height="4" rx="2" fill="#2dd4bf"/>
    <text x="72" y="394" fill="#e4e4e7" font-family="Mono, monospace" font-size="19" font-weight="700" letter-spacing="0.3">${role}</text>
    <circle cx="77" cy="435" r="4" fill="#2dd4bf"/>
    <text x="92" y="440" fill="#e4e4e7" font-family="Mono, monospace" font-size="14" font-weight="700" letter-spacing="0.35">${certification}</text>
    <text x="92" y="463" fill="#a1a1aa" font-family="Mono, monospace" font-size="13" letter-spacing="0.5">${certifier}</text>
    <circle cx="77" cy="493" r="4" fill="#2dd4bf"/>
    <text x="92" y="498" fill="#e4e4e7" font-family="Mono, monospace" font-size="14" font-weight="700" letter-spacing="0.35">${mentorship}</text>
    <text x="92" y="521" fill="#a1a1aa" font-family="Mono, monospace" font-size="13" letter-spacing="0.5">${mentorCompanies}</text>
    <text x="72" y="566" fill="#fafafa" font-family="Mono, monospace" font-size="18" font-weight="700" letter-spacing="2.2">AMWARE.DEV</text>
    <rect x="982" y="536" width="154" height="42" rx="7" fill="#2dd4bf"/>
    <text x="1000" y="562" fill="#09090b" font-family="Mono, monospace" font-size="13" font-weight="700" letter-spacing="0.45">WORK WITH ME →</text>
  </svg>
`)

await fs.mkdir(path.dirname(output), { recursive: true })
await sharp(background)
  .composite([
    { input: portrait, left: 650, top: 40 },
    { input: overlays, left: 0, top: 0 },
    { input: logo, left: 72, top: 48 },
  ])
  .png({ compressionLevel: 9, quality: 100 })
  .toFile(output)

console.log(output)
