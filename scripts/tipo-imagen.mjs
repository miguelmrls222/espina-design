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

const ESPERADO = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp', '.gif': 'gif', '.avif': 'avif' }

/** Devuelve un mensaje de error si el contenido no corresponde a la extensión, o null si todo bien. */
export function revisarImagen(nombre, buf) {
  const ext = nombre.slice(nombre.lastIndexOf('.')).toLowerCase()
  const esperado = ESPERADO[ext]
  if (!esperado) return null
  const real = detectarTipo(buf)
  if (real === esperado) return null
  const que = real === 'heic' ? 'una foto HEIC de iPhone' : real === 'desconocido' ? 'un archivo que no se reconoce como imagen' : `una imagen ${real.toUpperCase()}`
  return `${nombre} dice ser ${ext} pero en realidad es ${que}. Conviértela a JPG real con "npm run imagenes" (ver docs/GUIA-IMAGENES.md)`
}
