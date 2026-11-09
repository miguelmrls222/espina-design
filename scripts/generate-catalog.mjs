import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const carpeta = join(raiz, 'src', 'data', 'productos')
const salida = join(raiz, 'src', 'data', 'catalog.generated.ts')

const archivos = readdirSync(carpeta)
  .filter(nombre => nombre.endsWith('.json'))
  .sort()

const importaciones = archivos.map((nombre, i) => `import producto${i} from './productos/${nombre}'`)
const lista = archivos.map((_, i) => `  producto${i},`)

const crudo = JSON.parse(readFileSync(join(raiz, 'src', 'data', 'cross-sell.json'), 'utf8'))
const slugsCrossSell = Array.isArray(crudo) ? crudo : crudo.items
if (!Array.isArray(slugsCrossSell) || slugsCrossSell.some(slug => typeof slug !== 'string')) {
  throw new Error('cross-sell.json debe ser un arreglo de slugs o { "items": [...] }')
}

const contenido = `${importaciones.join('\n')}
import type { Producto } from './types'

export const CATALOGO: readonly Producto[] = [
${lista.join('\n')}
]

export const CROSS_SELL: readonly string[] = ${JSON.stringify(slugsCrossSell, null, 2)}
`

writeFileSync(salida, contenido)
console.log(`catalog.generated.ts: ${archivos.length} productos`)
