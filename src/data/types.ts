export interface Resena {
  nombre: string
  puntuacion: number
  texto: string
  fecha?: string
}

export interface Producto {
  slug: string
  nombre: string
  precio: number
  descripcion?: string
  fotos?: string[]
  colores?: string[]
  activo?: boolean
  destacado?: boolean
  categoria?: string
  materiales?: string
  dimensiones?: string
  stock?: string | number
  tiempo_fabricacion?: string
  resenas?: Resena[]
}

export interface LineaPrecio {
  precio: number
  cantidad: number
}

export interface Totales {
  subtotal: number
  descuento: number
  total: number
  promoActiva: boolean
  envioGratis: boolean
}
