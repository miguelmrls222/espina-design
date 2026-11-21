import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
// @ts-expect-error módulo .mjs sin tipos
import { componentesJpeg, detectarTipo, revisarImagen } from '../scripts/tipo-imagen.mjs'

const ftyp = (marca: string) => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from(`ftyp${marca}`), Buffer.alloc(12)])
const config = readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')

test('detecta el formato real por contenido', () => {
  assert.equal(detectarTipo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])), 'jpeg')
  assert.equal(detectarTipo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), 'png')
  assert.equal(detectarTipo(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), 'webp')
  assert.equal(detectarTipo(ftyp('heic')), 'heic')
  assert.equal(detectarTipo(ftyp('mif1')), 'heic')
  assert.equal(detectarTipo(ftyp('avif')), 'avif')
  assert.equal(detectarTipo(Buffer.from('hola')), 'desconocido')
})

test('un HEIC o WebP con extensión .jpg se rechaza con mensaje claro; un JPG real pasa', () => {
  assert.match(revisarImagen('/images/products/a.jpg', ftyp('heic')), /HEIC de iPhone.*npm run imagenes/)
  assert.match(revisarImagen('/images/products/a.jpg', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), /WEBP/)
  assert.equal(revisarImagen('/images/products/a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0, 0, 0, 0, 0, 0, 0])), null)
  assert.equal(revisarImagen('/images/products/a.webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])), null)
})

test('todas las fotos del repositorio son JPG reales y ligeras', () => {
  const carpeta = new URL('../public/images/products/', import.meta.url)
  for (const nombre of readdirSync(carpeta)) {
    const buf = readFileSync(new URL(nombre, carpeta))
    assert.equal(revisarImagen(nombre, buf), null, nombre)
    assert.ok(buf.length < 1.5 * 1048576, `${nombre} pesa demasiado`)
  }
})

test('CMS: media_folder y public_folder apuntan a la misma carpeta', () => {
  assert.match(config, /^media_folder: "public\/images\/products"$/m)
  assert.match(config, /^public_folder: "\/images\/products"$/m)
  assert.match(config, /no HEIC de iPhone/)
})

test('un JPG en CMYK (4 componentes) se rechaza y uno RGB (3) pasa', () => {
  const jpeg = (componentes: number) => Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe1, 0x00, 0x06, 0, 0, 0, 0]), // un segmento cualquiera (EXIF)
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x10, componentes]),
    Buffer.alloc(30),
  ])
  assert.equal(componentesJpeg(jpeg(4)), 4)
  assert.equal(componentesJpeg(jpeg(3)), 3)
  assert.match(revisarImagen('foto.jpg', jpeg(4)), /CMYK/)
  assert.equal(revisarImagen('foto.jpg', jpeg(3)), null)
})
