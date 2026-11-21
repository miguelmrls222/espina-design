// Detecta el formato REAL de una imagen leyendo sus primeros bytes, sin fiarse de la extensión.
// Un archivo de iPhone (HEIC) renombrado a .jpg se ve roto en Chrome, Windows y en el CMS.
export function detectarTipo(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return 'gif'
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const marca = buf.toString('ascii', 8, 12)
    if (marca === 'avif' || marca === 'avis') return 'avif'
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(marca)) return 'heic'
  }
  return 'desconocido'
}

/** Número de componentes de color de un JPEG (3 = RGB, 4 = CMYK), o 0 si no se pudo leer. */
export function componentesJpeg(buf) {
  let i = 2
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue }
    const marca = buf[i + 1]
    if (marca === 0xff) { i++; continue }
    if (marca === 0xd8 || marca === 0x01 || (marca >= 0xd0 && marca <= 0xd7)) { i += 2; continue }
    const largo = buf.readUInt16BE(i + 2)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marca)) return buf[i + 9]
    i += 2 + largo
  }
  return 0
}

const ESPERADO = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp', '.gif': 'gif', '.avif': 'avif' }

/** Devuelve un mensaje de error si el contenido no corresponde a la extensión, o null si todo bien. */
export function revisarImagen(nombre, buf) {
  const ext = nombre.slice(nombre.lastIndexOf('.')).toLowerCase()
  const esperado = ESPERADO[ext]
  if (!esperado) return null
  const real = detectarTipo(buf)
  if (real === esperado) {
    if (real === 'jpeg' && componentesJpeg(buf) === 4) {
      return `${nombre} es un JPG en CMYK (modo de impresión): se ve mal en el navegador y en el panel. Conviértela a RGB con "npm run imagenes" (ver docs/GUIA-IMAGENES.md)`
    }
    return null
  }
  const que = real === 'heic' ? 'una foto HEIC de iPhone' : real === 'desconocido' ? 'un archivo que no se reconoce como imagen' : `una imagen ${real.toUpperCase()}`
  return `${nombre} dice ser ${ext} pero en realidad es ${que}. Conviértela a JPG real con "npm run imagenes" (ver docs/GUIA-IMAGENES.md)`
}
