import type { Producto } from './types'

export const CATALOGO: readonly Producto[] = [
  {
    "precio": 789,
    "destacado": true,
    "nombre": "Billetera Sahuaro",
    "slug": "billetera-sahuaro",
    "descripcion": "Diseño simple y elegante, muy práctico para quienes llevan consigo sus billetes y tarjetas esenciales.",
    "fotos": [
      "/images/products/billetera-sahuaro.jpg"
    ],
    "colores": [
      "verde",
      "gris",
      "vino",
      "cafe oscuro"
    ],
    "activo": true,
    "categoria": "billeteras",
    "materiales": "Cuero vegetal 100%",
    "dimensiones": "10 cm × 8 cm",
    "stock": "disponible",
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
    ]
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
    "precio": 589,
    "destacado": true,
    "nombre": "Tarjetero Cardón",
    "slug": "tarjetero-cardon",
    "descripcion": "Diseño minimalista, súper práctico para quienes andan ligeros. Especial para tarjetas esenciales y pocos billetes.",
    "fotos": [
      "/images/products/tarjetero-cardon.jpg"
    ],
    "colores": [
      "verde",
      "gris",
      "vino",
      "cafe oscuro"
    ],
    "activo": true,
    "categoria": "billeteras",
    "materiales": "Cuero vegetal 100%",
    "dimensiones": "10 cm × 7 cm",
    "stock": "disponible",
    "resenas": [
      {
        "nombre": "Laura P.",
        "puntuacion": 5,
        "texto": "Minimalista y de gran calidad. Exactamente lo que buscaba.",
        "fecha": "Feb 2026"
      },
      {
        "nombre": "Jorge T.",
        "puntuacion": 4,
        "texto": "Muy buen producto, el cuero se ve y se siente increíble.",
        "fecha": "Ene 2026"
      }
    ]
  },
  {
    "precio": 780,
    "destacado": false,
    "nombre": "Tarjetero Desert Money Clip",
    "slug": "tarjetero-dmc",
    "descripcion": "Tarjetero sencillo y muy práctico. Cuenta con un moneyclip para llevar con seguridad tus billetes o tickets importantes. Capacidad para 12-16 tarjetas y algunos billetes.",
    "fotos": [
      "/images/products/tarjetero-money-clip.jpg"
    ],
    "activo": true,
    "colores": [
      "vino"
    ],
    "categoria": "billeteras",
    "materiales": "Cuero vacuno.",
    "stock": "disponible"
  }
]

export const CROSS_SELL: readonly string[] = [
  "tarjetero-agave",
  "tarjetero-cactus",
  "billetera-sahuaro"
]
