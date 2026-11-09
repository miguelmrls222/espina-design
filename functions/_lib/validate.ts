import { AppError } from './http'

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g

export function limpiarTexto(valor: unknown, campo: string, min: number, max: number, multilinea = false): string {
  if (typeof valor !== 'string') {
    throw new AppError(400, 'campo_invalido', `${campo} es obligatorio.`)
  }
  let texto = valor.normalize('NFC').replace(CONTROL, '').replace(/\r\n?/g, '\n')
  texto = multilinea
    ? texto.replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n')
    : texto.replace(/\s+/g, ' ')
  texto = texto.trim()
  if (texto.length < min) {
    throw new AppError(400, 'campo_corto', `${campo} debe tener al menos ${min} caracteres.`)
  }
  if (texto.length > max) {
    throw new AppError(400, 'campo_largo', `${campo} no puede pasar de ${max} caracteres.`)
  }
  return texto
}

export function validarCorreo(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new AppError(400, 'correo_invalido', 'Ingresa un correo válido.')
  }
  const correo = valor.trim().toLowerCase()
  if (correo.length > 254 || !/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(correo)) {
    throw new AppError(400, 'correo_invalido', 'Ingresa un correo válido.')
  }
  return correo
}

export function validarTelefono(valor: unknown): string {
  if (valor === undefined || valor === null || valor === '') return ''
  if (typeof valor !== 'string') {
    throw new AppError(400, 'telefono_invalido', 'El teléfono debe tener entre 10 y 13 dígitos.')
  }
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length < 10 || digitos.length > 13) {
    throw new AppError(400, 'telefono_invalido', 'El teléfono debe tener entre 10 y 13 dígitos.')
  }
  return digitos
}

export function validarCodigoPostal(valor: unknown): string {
  if (typeof valor !== 'string' || !/^\d{5}$/.test(valor.trim())) {
    throw new AppError(400, 'cp_invalido', 'Código postal inválido.')
  }
  return valor.trim()
}

export function validarEntero(valor: unknown, campo: string, min: number, max: number): number {
  if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < min || valor > max) {
    throw new AppError(400, 'campo_invalido', `${campo} debe ser un entero entre ${min} y ${max}.`)
  }
  return valor
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function esTrampa(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim().length > 0
}
