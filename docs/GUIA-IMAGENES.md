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

Las fotos del iPhone suelen salir en **HEIC** (aunque el archivo diga `.jpg`). Chrome, Windows y el panel no las muestran y aparece el ícono de imagen rota, sobre todo en el estado **Borrador**. Hay que subirlas como **JPG real**.

**Forma fácil (un comando).** Una sola vez, en la carpeta del proyecto: `npm install --no-save sharp`. Después, para cada lote de fotos:

```bash
# 1. Copia las fotos nuevas a public/images/products (con nombre en minúsculas, sin espacios)
# 2. Conviértelas y optimízalas:
npm run imagenes                              # todas las de public/images/products
npm run imagenes -- ruta/a/foto.heic          # solo ese archivo o carpeta
npm run imagenes -- --simular                 # muestra qué haría sin tocar nada
npm run imagenes -- --ancho 1400 --calidad 80 # más ligero
npm run imagenes -- --borrar-original         # quita el .png/.heic/.webp tras convertir
```

Qué hace: detecta el formato real por su contenido (HEIC, PNG, WebP, AVIF, JPG), corrige la orientación, reduce a 1600 px de ancho como máximo, guarda **JPG progresivo** de calidad 82 (mismo nombre base, extensión `.jpg`) y **borra la ubicación GPS** y demás metadatos. Para HEIC usa `sips` (Mac, ya incluido), ImageMagick o ffmpeg si los tienes. Es seguro correrlo varias veces: lo que ya está optimizado no se toca.

**Sin instalar nada (Mac).** `sips -s format jpeg -Z 1600 foto.heic --out foto.jpg`

**En el iPhone.** Ajustes › Cámara › Formatos › **Más compatible** hace que las fotos nuevas salgan en JPG. Al enviarlas por AirDrop, en Fotos › Compartir › Opciones elige formato **Más compatible**.

Reglas del nombre: minúsculas, sin espacios ni acentos, con guiones (`tarjetero-money-clip-2.jpg`), y extensión `.jpg` en minúsculas.

## Opción A: desde el panel (espinadesign.com/admin)

1. Entra a **Productos** y abre una pieza o pulsa **Nuevo Producto**.
2. En **Fotos del producto** pulsa **Añadir foto**. Cada foto es su propio recuadro: pulsa **Elegir una imagen** y sube el archivo desde tu computadora o teléfono. Repite hasta tener de 3 a 5 fotos (mínimo 1, máximo 5).
3. La primera foto es la portada. Para cambiar el orden, arrastra los recuadros o usa las flechas; para quitar una, usa el icono de basura.
4. Llena el resto de los campos y guarda. El cambio pasa por **Borrador, En revisión, Listo y Publicar** antes de aparecer en la tienda.

## Opción B: directamente en GitHub

1. Entra a `public/images/products` en el repositorio.
2. Pulsa **Add file** y luego **Upload files**. Arrastra todas las fotos juntas.
3. Crea una rama nueva para el cambio y abre el Pull Request.
4. En el mismo Pull Request, abre `src/data/productos/<producto>.json`, pulsa el lápiz y agrega cada ruta a la lista `fotos`.
5. Espera a que Cloudflare termine en verde y haz merge.

## Si algo falla

- El build (`npm run build`) se detiene con un mensaje claro si falta una imagen, si el slug tiene mayúsculas o espacios, o si hay slugs repetidos.
- Si ves el ícono de imagen rota, revisa que el nombre en el JSON sea idéntico al del archivo, letra por letra. Si el nombre es correcto, casi seguro la foto es HEIC o WebP con extensión `.jpg`: conviértela con `npm run imagenes`.
- El build también se detiene si una foto dice ser `.jpg` pero por dentro es HEIC, WebP, etc.
- Si borras una foto desde el panel (Biblioteca de medios), quita antes su ruta del producto: si un producto apunta a una foto que ya no existe, el build falla y el sitio no se actualiza.
- Si una foto pesa más de 1.5 MB, el build lo avisa en la consola.
