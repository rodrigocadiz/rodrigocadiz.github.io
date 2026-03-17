# context.md — Aplicación Educativa: Parámetros del Sonido

## Objetivo General
Crear una aplicación web educativa en español, en un solo archivo HTML con JavaScript vanilla,
sin servidor, que funcione directamente en cualquier navegador. La app es para una clase
universitaria sobre los parámetros físicos del sonido.

---

## Audiencia
Estudiantes universitarios. Nivel introductorio. Todo el texto, etiquetas y descripciones
deben estar en **español**.

---

## Tecnología
- Un solo archivo: `index.html`
- JavaScript vanilla (sin frameworks, sin Node.js, sin servidor)
- Web Audio API para síntesis y reproducción de sonido en tiempo real
- Canvas API o SVG para visualizaciones
- CSS interno

---

## Módulos de la Aplicación

### Módulo 1 — El Círculo Unitario y la Onda Sinusoidal
- Animación del círculo unitario con un punto girando
- La proyección vertical del punto traza la onda seno en tiempo real
- La proyección horizontal traza el coseno
- Control de velocidad de rotación → directamente relacionado con la frecuencia
- El estudiante ve y escucha cómo la velocidad angular = frecuencia del sonido

### Módulo 2 — Parámetros de una Sinusoide
Controles interactivos (sliders) para:
- **Amplitud** → altura de la onda, volumen del sonido
- **Frecuencia** (Hz) → velocidad de oscilación, tono del sonido
- **Fase** (grados o radianes) → desplazamiento temporal de la onda
- Visualización en tiempo real de la onda resultante
- Reproducción de audio en tiempo real con Web Audio API

### Módulo 3 — Suma de Sinusoides y Desfase
- Dos o más sinusoides con frecuencia, amplitud y fase ajustables independientemente
- Visualización de cada onda por separado y de su suma
- Demostración de interferencia constructiva y destructiva
- El estudiante puede ver cómo dos ondas en fase se refuerzan y en contrafase se cancelan

### Módulo 4 — Espectro de Frecuencias
- Visualización en dominio del tiempo (forma de onda) y dominio de la frecuencia (espectro)
- Barras de amplitud por frecuencia (FFT simplificada o calculada manualmente)
- Cuando se agrega una sinusoide, aparece un pico en el espectro
- Relación directa entre la forma de onda compleja y su representación espectral

### Módulo 5 — Armónicos vs Parciales
- Demostración de frecuencias armónicas (múltiplos enteros de una frecuencia fundamental)
- Demostración de parciales inarmónicos (frecuencias no relacionadas)
- Visualización comparativa: armónicos → espectro regular, forma de onda periódica
- Parciales inarmónicos → espectro irregular, forma de onda caótica
- Audio para escuchar la diferencia tímbrica

### Módulo 6 — Sintetizador Aditivo de Armónicos
- Controles para activar/desactivar hasta 20–30 armónicos individuales
- Slider de amplitud por armónico
- La forma de onda se actualiza en tiempo real al agregar/quitar armónicos
- Demostración progresiva: 1 armónico = onda pura → muchos armónicos = onda cuadrada/diente de sierra
- Audio en tiempo real

---

## Requisitos Técnicos
- Todo en un archivo `index.html`
- Sin dependencias externas (sin CDN, sin librerías)
- Funciona offline
- Interfaz clara, limpia, pedagógica
- Texto completamente en español
- Cada módulo accesible por sección o pestaña dentro de la misma página

---

## Estilo Visual Sugerido
- Fondo oscuro para que las ondas resalten (verde o azul sobre negro)
- Sliders grandes y etiquetas claras
- Gráficas de alta resolución con canvas
- Navegación sencilla entre módulos

---

## Notas Adicionales
- Priorizar claridad pedagógica sobre complejidad técnica
- Cada módulo debe incluir una breve descripción conceptual en español
- El audio debe poder silenciarse globalmente