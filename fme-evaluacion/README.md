# FME UC 2026 — Panel de Evaluación de Jurado

Cuatro páginas HTML estáticas (una por categoría + admin). No requieren servidor.
Los jurados acceden a su link, seleccionan su nombre, evalúan las obras y envían.
Resultados se guardan en Google Sheets vía Apps Script.

---

## Paso 1 — Configurar Google Sheets + Apps Script

1. Crea un nuevo Google Sheet en [sheets.google.com](https://sheets.google.com)
   Nómbralo **"FME 2026 — Evaluaciones"**

2. En el Sheet: **Extensiones → Apps Script**

3. Borra el código de ejemplo y pega todo el contenido de **`apps_script.js`**

4. Guarda (Ctrl+S) y luego: **Implementar → Nueva implementación**
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién tiene acceso: **Cualquier persona**
   - Clic en **Implementar** → copia la **URL** que aparece

5. Abre cada HTML (`acusmaticas.html`, `audiovisuales.html`, `mixtas.html`)
   y reemplaza esta línea con tu URL:
   ```javascript
   const APPS_URL = "REEMPLAZAR_CON_TU_URL_DE_APPS_SCRIPT";
   ```
   (Son 3 archivos — reemplazar en los 3)

---

## Paso 2 — Probar antes de enviar a los jurados

**Importantísimo:** prueba el sistema completo antes de enviar los links.

1. Abre `acusmaticas.html` en tu navegador
2. Selecciona tu nombre ("Rodrigo Cádiz")
3. Activa **☑ Modo prueba** (las respuestas van a una pestaña separada `TEST_A`)
4. Evalúa unas pocas obras con puntajes de prueba
5. Ve al resumen → haz clic en **"Enviar evaluación completa"**
6. Abre el Google Sheet → verifica que aparezca la pestaña `TEST_A` con los datos
7. Si todo se ve bien, elimina la pestaña `TEST_A` del Sheet

Si la URL no está configurada, el sistema mostrará un aviso y ofrecerá descargar
un JSON de respaldo — esto también sirve como fallback si hay problemas de conectividad.

---

## Paso 3 — Publicar en GitHub Pages

```bash
# En tu terminal, dentro de la carpeta fme-evaluacion/
git init
git add .
git commit -m "FME 2026 evaluacion jurado"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/fme2026-evaluacion.git
git push -u origin main
```

Luego en GitHub: **Settings → Pages → Branch: main → Save**

Tu sitio quedará disponible en:
```
https://TU_USUARIO.github.io/fme2026-evaluacion/acusmaticas.html
https://TU_USUARIO.github.io/fme2026-evaluacion/audiovisuales.html
https://TU_USUARIO.github.io/fme2026-evaluacion/mixtas.html
```

---

## Paso 4 — Enviar links a los jurados

Envía solo el link correspondiente a su categoría.

| Jurado | Categoría | Link a enviar |
|---|---|---|
| José Miguel Fernández | Acusmáticas + Audiovisuales | `…/acusmaticas.html` y `…/audiovisuales.html` |
| Roque Rivas | Acusmáticas + Audiovisuales | `…/acusmaticas.html` y `…/audiovisuales.html` |
| Anthony de Ritis | Acusmáticas + Audiovisuales + Mixtas | los 3 links |
| Miguel Farías | Acusmáticas + Audiovisuales + Mixtas | los 3 links |
| Rodrigo Cádiz | Acusmáticas + Audiovisuales + Mixtas | los 3 links |
| Juan Pablo Vergara | Acusmáticas + Audiovisuales + Mixtas | los 3 links |
| Pink Noise | Mixtas | `…/mixtas.html` |

**Plazo máximo: 5 de abril de 2026**

---

## Monitorear el progreso

Abre `admin.html` en tu navegador (no hace falta subir este archivo a GitHub — ábrelo localmente).

1. Ingresa la URL del Apps Script
2. Haz clic en **Actualizar**
3. Verás el estado de cada jurado: sin iniciar / en progreso / completado
4. El panel muestra también la cuenta regresiva al plazo

Para recordar a los jurados que están atrasados, mira quién aparece en rojo
en el panel y escríbeles directamente.

---

## Cómo funciona

| Característica | Detalle |
|---|---|
| Evaluación ciega | Solo muestra el título, sin compositor ni datos personales |
| Selección de jurado | Cada jurado elige su nombre de una lista al inicio |
| Modo prueba | Para testear: los datos van a pestañas `TEST_A/B/C` en el Sheet |
| Guardado automático | `localStorage` del navegador — se puede cerrar y volver |
| Notas de programa | Disponibles (expandibles) para cada obra |
| Links originales | Botón directo al archivo del compositor en cada obra |
| Flag de link roto | Si un link no funciona, el jurado lo puede marcar y se registra |
| Una obra a la vez | Navegación secuencial con botones anterior/siguiente |
| Criterios (1–10) | Calidad compositiva · Diseño sonoro · Originalidad · Realización técnica · (+Relación AV en audiovisuales) |
| Envío | Al completar todas las obras → "Ver resumen y enviar" |
| Respaldo | Botón "Descargar JSON" en el resumen, por si falla el envío |
| Idioma | Interfaz bilingüe ES/EN (toggle en todas las pantallas) |

---

## Estructura de hojas en Google Sheets

Después de recibir evaluaciones, el Sheet tendrá:

| Pestaña | Contenido |
|---|---|
| `A` | Evaluaciones de Acusmáticas (todas las columnas con puntajes) |
| `B` | Evaluaciones de Mixtas |
| `C` | Evaluaciones de Audiovisuales |
| `Progreso` | Registro de cada envío con timestamp, jurado, categoría y si completó |
| `TEST_A/B/C` | Evaluaciones de prueba (se pueden eliminar) |
