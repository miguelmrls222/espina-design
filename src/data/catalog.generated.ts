import type { Producto } from './types'

export const CATALOGO: readonly Producto[] = [
  {
    "nombre": "Billetera Sahuaro",
    "slug": "billetera-sahuaro",
    "fotos": [
      "/images/products/billetera-bifold-sahuaro-3.jpg",
      "/images/products/billetera-bifold-sahuaro-4.jpg",
      "/images/products/billetera-bifold-sahuaro-2.jpg"
    ],
    "precio": 949,
    "colores": [
      "negro"
    ],
    "descripcion": "Diseño simple y elegante, muy práctico para quienes llevan consigo sus billetes y tarjetas esenciales.",
    "categoria": "billeteras",
    "cantidad_disponible": 1,
    "stock": "disponible",
    "materiales": "Cuero vacuno 100%",
    "destacado": true,
    "activo": true,
    "resenas": [
      {
        "nombre": "Carlos M.",
        "puntuacion": 5,
        "texto": "Excelente calidad, el cuero se siente premium. Ya pedí otra para regalar.",
        "fecha": "Mar 2026"
      },
      {
        "nombre": "Ana R.",
        "puntuacion": 5,
        "texto": "Me encantó, muy funcional y elegante. El envío fue rápido.",
        "fecha": "Feb 2026"
      }
    ],
    "dimensiones": "10 cm × 8 cm"
  },
  {
    "precio": 589,
    "destacado": false,
    "nombre": "Tarjetero Agave",
    "slug": "tarjetero-agave",
    "descripcion": "Tarjetero muy practico y sencillo para billetes doblados y 8-10 tarjetas cómodamente. Ideal para personas prácticas.",
    "fotos": [
      "/images/products/img_7196-2.jpg"
    ],
    "colores": [
      "verde",
      "gris",
      "vino",
      "cafe oscuro"
    ],
    "activo": true,
    "categoria": "billeteras",
    "materiales": "Cuero",
    "dimensiones": "11 cm × 7 cm",
    "stock": "disponible",
    "resenas": [
      {
        "nombre": "María L.",
        "puntuacion": 5,
        "texto": "Práctico y bonito. Cabe todo lo esencial sin ser voluminoso.",
        "fecha": "Abr 2026"
      },
      {
        "nombre": "Pedro G.",
        "puntuacion": 4,
        "texto": "Buen material, me gustó el diseño. Llegó antes de lo esperado.",
        "fecha": "Mar 2026"
      }
    ]
  },
  {
    "precio": 489,
    "destacado": true,
    "nombre": "Tarjetero Cactus",
    "slug": "tarjetero-cactus",
    "descripcion": "Ideal para cargar ligero, practico, sencillo y con mucho estilo.",
    "fotos": [
      "/images/products/img_5063.jpg"
    ],
    "colores": [
      "verde",
      "gris",
      "vino",
      "cafe oscuro"
    ],
    "activo": true,
    "categoria": "billeteras",
    "materiales": "Cuero",
    "dimensiones": "8 cm × 6 cm",
    "stock": "disponible",
    "resenas": [
      {
        "nombre": "Sofía H.",
        "puntuacion": 5,
        "texto": "Perfecto para el día a día, super ligero y cabe en cualquier bolsillo.",
        "fecha": "Abr 2026"
      },
      {
        "nombre": "Diego V.",
        "puntuacion": 5,
        "texto": "Segunda vez que compro, la calidad es consistente. Muy recomendado.",
        "fecha": "Ene 2026"
      }
    ]
  },
  {
    "nombre": "Tarjetero Cardón",
    "slug": "tarjetero-cardon",
    "fotos": [
      "/images/products/tarjetero-cardon-1.jpg",
      "/images/products/tarjetero-cardon-2.jpg",
      "/images/products/tarjetero-cardon-3.jpg",
      "/images/products/tarjetero-cardon-4.jpg"
    ],
    "precio": 769,
    "colores": [
      "verde"
    ],
    "descripcion": "Diseño minimalista, súper práctico para quienes andan ligeros. Especial para tarjetas esenciales y pocos billetes. Incluye bolígrafo telescópico y repuestos.",
    "categoria": "billeteras",
    "cantidad_disponible": 1,
    "stock": "disponible",
    "materiales": "Cuero vacuno 100%",
    "destacado": true,
    "activo": true,
    "resenas": [],
    "dimensiones": "10 cm × 7 cm"
  },
  {
    "nombre": "Tarjetero Desierto Money Clip",
    "slug": "tarjetero-dmc",
    "fotos": [
      "/images/products/tarjetero-desierto-moneyclip-1.jpg",
      "/images/products/tarjetero-desierto-moneyclip-2.jpg",
      "/images/products/tarjetero-desierto-moneyclip-3.jpg"
    ],
    "precio": 889,
    "colores": [
      "vino"
    ],
    "descripcion": "Tarjetero sencillo y muy práctico. Cuenta con un moneyclip para llevar con seguridad tus billetes o tickets importantes. Capacidad para 10-16 tarjetas y algunos billetes.",
    "categoria": "billeteras",
    "cantidad_disponible": 1,
    "stock": "disponible",
    "materiales": "Cuero vacuno 100%",
    "destacado": false,
    "activo": true
  }
]

export const CROSS_SELL: readonly string[] = [
  "tarjetero-agave",
  "tarjetero-cactus",
  "billetera-sahuaro"
]
