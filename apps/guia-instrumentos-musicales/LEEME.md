# Guía de Instrumentos Musicales · versión HTML5

Versión moderna y responsiva de la *Guía de Instrumentos Musicales* (Alejandro Guarello F., Instituto de Música UC; programación original en Macromedia Director, Rodrigo F. Cádiz, 2001).

## Cómo abrirla

Doble clic en `index.html`. No necesita Node, Python ni servidor: funciona directo desde el disco (`file://`) en Chrome, Safari, Firefox y Edge actuales, y también en cualquier hosting estático.

La carpeta es autocontenida: todas las fotos, notaciones, audios y videos que usa están en `medios/` (copiados desde `extraido/`, con nombres sin tildes ni espacios para que funcionen en cualquier servidor, incluido GitHub Pages). Para publicarla basta con subir la carpeta completa.

## Qué tiene de nuevo respecto de `app_web/`

- **Direcciones propias para todo**: cada familia, instrumento, sección y técnica tiene su URL (`#/familia/cuerdas/violin/t/pizzicato`), con atrás/adelante del navegador, recuperación de la posición de lectura y botón para copiar el enlace a una técnica.
- **Buscador global** (tecla `/` o `Ctrl/⌘ K`): instrumentos, 395 técnicas, textos descriptivos y temas de acústica, sin distinguir tildes.
- **Reproductor persistente**: el sonido sigue al cambiar de página; barra de progreso, pausa, "Escuchar todas las técnicas" en cola, controles del sistema (teclas multimedia, pantalla bloqueada en el móvil).
- **Menú desplegable de familias**, índice de secciones fijo que sigue el scroll, filtro de técnicas, navegación anterior/siguiente entre instrumentos (`Alt ←/→`).
- **A-Z con las estampillas originales**, filtro por nombre y por familia, saltos por letra.
- **Visor de imágenes** con flechas, deslizamiento táctil y ampliación.
- **Responsivo**: panel lateral en escritorio, selector compacto en tablet, barra inferior de pestañas en el móvil.
- Accesibilidad: navegación por teclado, pestañas ARIA, foco visible, textos alternativos, respeto a "reducir movimiento"; hoja de estilo para imprimir.

## Look and feel

Paleta medida píxel a píxel del original (azul noche `#080029`, ámbar `#FFB431`, naranjo `#E87E10`, amarillo activo `#FFCD10`), la cabecera con el título en versalitas, las líneas verticales finas, la barra de botones ámbar, el collage de la portada (con zonas sensibles por familia) y el cuadro "Ventana" de `interfaz.cxt` (barra naranja, bordes ámbar, base caqui) como contenedor de todo el contenido. Fuentes libres embebidas: Cinzel (título), Source Sans 3 (interfaz) y Crimson Pro (textos).

## Archivos

- `index.html` — estructura, cabecera, barra, reproductor, visor y buscador.
- `css/app.css` — estilos; `css/fonts.css` — fuentes embebidas en base64 (para que funcionen sin servidor).
- `js/data.js` — contenido (el mismo de `app_web`, extraído de las películas Director).
- `js/extra.js` — orden de familias y mapa de estampillas A-Z.
- `js/simulaciones.js` — simulaciones interactivas de Acústica (canvas + Web Audio): onda, formas de onda, Fourier, movimiento periódico/aperiódico, ondas viajeras/estacionarias, octava, batimiento, superposición, membrana circular (modos de Bessel), barras, cuerda pulsada/frotada, modos de cuerda, física de la cuerda, tubos abierto/cerrado y largo efectivo con orificio.
- `js/app.js` — enrutador, vistas, buscador, reproductor y visor (JavaScript sin dependencias ni módulos).
- `ui/` — collage de portada, texturas de familia, escudo y parlantes originales.
