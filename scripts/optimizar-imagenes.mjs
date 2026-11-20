#!/usr/bin/env node
// Convierte y optimiza fotos de producto a JPG estándar (progresivo, sin GPS ni metadatos).
//
//   npm run imagenes                       -> procesa public/images/products
//   npm run imagenes -- ruta/a/foto.heic   -> procesa archivos o carpetas concretos
//   npm run imagenes -- --simular          -> solo muestra qué haría
//
// Opciones: --ancho 1600  --calidad 82  --borrar-original  --simular
// Entradas: .jpg .jpeg .png .webp .avif .gif .heic .heif (el formato se detecta por contenido, no por extensión).
// Salida:   <nombre-base>.jpg en la misma carpeta (se conserva el nombre base).
//
// Requiere sharp:  npm install --no-save sharp   (no modifica package.json)
// HEIC (iPhone): usa herramientas del sistema si existen: sips (macOS), magick/convert (ImageMagick) o ffmpeg.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectarTipo } from './tipo-imagen.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.heic', '.heif'])

const args = process.argv.slice(2)
const opciones = { ancho: 1600, calidad: 82, simular: false, borrarOriginal: false }
const rutas = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--simular') opciones.simular = true
  else if (a === '--borrar-original') opciones.borrarOriginal = true
  else if (a === '--ancho') opciones.ancho = Number(args[++i])
  else if (a === '--calidad') opciones.calidad = Number(args[++i])
  else if (a.startsWith('--')) salir(`Opción desconocida: ${a}`)
  else rutas.push(resolve(a))
}
if (!(opciones.ancho >= 200 && opciones.ancho <= 6000)) salir('--ancho debe estar entre 200 y 6000')
if (!(opciones.calidad >= 40 && opciones.calidad <= 95)) salir('--calidad debe estar entre 40 y 95')
if (rutas.length === 0) rutas.push(join(raiz, 'public', 'images', 'products'))

function salir(mensaje) {
  console.error(`Error: ${mensaje}`)
  process.exit(1)
}

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  salir('falta sharp. Instálalo una vez con:  npm install --no-save sharp')
}

function listar(ruta) {
  if (!existsSync(ruta)) salir(`no existe: ${ruta}`)
  if (statSync(ruta).isDirectory()) {
    return readdirSync(ruta).sort().flatMap(n => listar(join(ruta, n)))
  }
  return EXTENSIONES.has(extname(ruta).toLowerCase()) ? [ruta] : []
}

function convertirHeic(origen, destinoJpg) {
  const intentos = [
    ['sips', ['-s', 'format', 'jpeg', origen, '--out', destinoJpg]],
    ['magick', [origen, destinoJpg]],
    ['convert', [origen, destinoJpg]],
    ['ffmpeg', ['-y', '-loglevel', 'error', '-i', origen, '-frames:v', '1', '-q:v', '2', destinoJpg]],
  ]
  for (const [programa, argumentos] of intentos) {
    try {
      execFileSync(programa, argumentos, { stdio: 'ignore' })
      if (existsSync(destinoJpg) && statSync(destinoJpg).size > 0) return true
    } catch {}
  }
  return false
}

const kb = n => `${(n / 1024).toFixed(0)} KB`
const archivos = [...new Set(rutas.flatMap(listar))]
if (archivos.length === 0) salir('no encontré imágenes para procesar')

const temporal = mkdtempSync(join(tmpdir(), 'imagenes-'))
let ahorro = 0
let fallos = 0

for (const origen of archivos) {
  const ext = extname(origen).toLowerCase()
  const base = basename(origen, extname(origen))
  const destino = join(dirname(origen), `${base}.jpg`)
  const etiqueta = basename(origen)
  const tamOrigen = statSync(origen).size
  try {
    const tipo = detectarTipo(readFileSync(origen).subarray(0, 32))
    let entrada = origen
    if (tipo === 'heic' || ext === '.heic' || ext === '.heif') {
      const intermedio = join(temporal, `${base}.jpg`)
      if (opciones.simular) { console.log(`• ${etiqueta}: HEIC -> ${base}.jpg (simulación)`); continue }
      if (!convertirHeic(origen, intermedio)) {
        throw new Error('no pude leer el HEIC. En Mac funciona sips (viene incluido); en Windows instala ImageMagick o abre la foto y expórtala como JPG')
      }
      entrada = intermedio
    }
    if (opciones.simular) { console.log(`• ${etiqueta}: ${tipo} ${kb(tamOrigen)} -> ${base}.jpg (simulación)`); continue }

    const buffer = await sharp(entrada, { failOn: 'none' })
      .rotate() // aplica la orientación EXIF y la descarta
      .resize({ width: opciones.ancho, withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // PNG/WebP con transparencia -> fondo blanco
      .toColourspace('srgb')
      .jpeg({ quality: opciones.calidad, progressive: true, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer() // sin .withMetadata(): se elimina EXIF y GPS

    const mismoArchivo = resolve(destino) === resolve(origen)
    const yaEraJpegReal = tipo === 'jpeg' && mismoArchivo
    if (yaEraJpegReal && buffer.length >= tamOrigen) {
      console.log(`= ${etiqueta}: ya está optimizada (${kb(tamOrigen)}), se deja igual`)
      continue
    }
    const tmp = join(temporal, `${base}.salida.jpg`)
    writeFileSync(tmp, buffer)
    renameOrCopy(tmp, destino)
    if (!mismoArchivo && opciones.borrarOriginal) rmSync(origen)
    ahorro += tamOrigen - buffer.length
    console.log(`✓ ${etiqueta} (${tipo}, ${kb(tamOrigen)}) -> ${base}.jpg (${kb(buffer.length)})${!mismoArchivo && !opciones.borrarOriginal ? '  [el original se conserva; usa --borrar-original para quitarlo]' : ''}`)
  } catch (error) {
    fallos++
    console.error(`✗ ${etiqueta}: ${error.message}`)
  }
}

function renameOrCopy(desde, hasta) {
  try {
    renameSync(desde, hasta)
  } catch {
    writeFileSync(hasta, readFileSync(desde))
  }
}

rmSync(temporal, { recursive: true, force: true })
if (!opciones.simular) console.log(`\nListo. Ahorro total: ${kb(Math.max(ahorro, 0))}.${fallos ? ` Fallaron ${fallos}.` : ''}`)
process.exit(fallos ? 1 : 0)
