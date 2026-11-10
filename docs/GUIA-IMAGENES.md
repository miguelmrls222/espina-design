# Guía de imágenes de producto

## Cómo se guardan las fotos de un producto

Cada producto es un archivo en `src/data/productos/` y sus fotos van en una **lista** llamada `fotos`.
La primera foto es la portada de la tarjeta; las demás aparecen al deslizar la tarjeta y en la ficha del producto.

```json
{
  "nombre": "Tarjetero Desert Money Clip",
  "slug": "tarjetero-dmc",
  "precio": 780,
  "fotos": [
    "/images/products/tarjetero-money-clip.jpg",
    "/images/products/tarjetero-money-clip-2.jpg",
    "/images/products/tarjetero-money-clip-3.jpg"
  ]
}
```

Las rutas empiezan con `/images/products/` y el archivo vive en `public/images/products/`.
Si el CMS guarda una sola foto como texto en lugar de lista, el sitio lo corrige solo.

## Antes de subir las fotos

1. Cámbiales el nombre: minúsculas, sin espacios ni acentos y con guiones. Ejemplo: `tarjetero-money-clip-2.jpg`.
2. Redúcelas a unos 1600 px por lado y guárdalas como JPG (en https://squoosh.app, calidad 80 a 85). Deben pesar menos de 0.5 MB cada una.
3. Respeta mayúsculas y minúsculas de la extensión: `.jpg`, no `.JPG`.

## Opción A: desde el panel (espinadesign.com/admin)

1. Abre el producto y ve al campo **Fotos**.
2. Pulsa para elegir imágenes y selecciona varias a la vez (o súbelas una por una).
3. Ordénalas: la primera es la portada.
4. Guarda y publica el cambio (modo editorial: Draft, In review, Ready y Publish).

## Opción B: directamente en GitHub

1. Entra a `public/images/products` en el repositorio.
2. Pulsa **Add file** y luego **Upload files**. Arrastra todas las fotos juntas.
3. Crea una rama nueva para el cambio y abre el Pull Request.
4. En el mismo Pull Request, abre `src/data/productos/<producto>.json`, pulsa el lápiz y agrega cada ruta a la lista `fotos`.
5. Espera a que Cloudflare termine en verde y haz merge.

## Si algo falla

- El build (`npm run build`) se detiene con un mensaje claro si falta una imagen, si el slug tiene mayúsculas o espacios, o si hay slugs repetidos.
- Si ves el ícono de imagen rota, revisa que el nombre en el JSON sea idéntico al del archivo, letra por letra.
- Si una foto pesa más de 1.5 MB, el build lo avisa en la consola.
