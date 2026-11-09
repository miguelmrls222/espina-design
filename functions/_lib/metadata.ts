import { AppError } from './http'

export const METADATA_MAX_CLAVES = 50
export const METADATA_MAX_CLAVE = 40
export const METADATA_MAX_VALOR = 500

export function validarMetadata(entradas: Record<string, string | undefined>): Record<string, string> {
  const resultado: Record<string, string> = {}
  for (const [clave, valor] of Object.entries(entradas)) {
    if (valor === undefined || valor === '') continue
    if (clave.length > METADATA_MAX_CLAVE || /[[\]]/.test(clave)) {
      throw new AppError(500, 'metadata_clave', `Clave de metadata inválida: ${clave}`)
    }
    if (valor.length > METADATA_MAX_VALOR) {
      throw new AppError(400, 'metadata_excedida', 'El pedido es demasiado grande. Divídelo en dos compras.')
    }
    resultado[clave] = valor
  }
  if (Object.keys(resultado).length > METADATA_MAX_CLAVES) {
    throw new AppError(400, 'metadata_excedida', 'El pedido es demasiado grande. Divídelo en dos compras.')
  }
  return resultado
}
