import producto0 from './productos/billetera-sahuaro.json'
import producto1 from './productos/tarjetero-agave.json'
import producto2 from './productos/tarjetero-cactus.json'
import producto3 from './productos/tarjetero-cardon.json'
import type { Producto } from './types'

export const CATALOGO: readonly Producto[] = [
  producto0,
  producto1,
  producto2,
  producto3,
]

export const CROSS_SELL: readonly string[] = [
  "tarjetero-agave",
  "tarjetero-cactus",
  "billetera-sahuaro"
]
