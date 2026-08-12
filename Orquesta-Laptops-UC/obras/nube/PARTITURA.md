# NUBE

*Obra para orquesta de laptops · síntesis granular · sincronía por reloj de sistema*
IEE2003 Orquesta de Laptops · Pontificia Universidad Católica de Chile

Duración: **7:00** · 8 voces (funciona desde 4) · sin red entre laptops · sin servidor

---

## 1. Idea

Ningún estudiante produce una nota. Cada laptop emite **granos**: fragmentos de sonido de 5 a 600 ms, disparados entre 0,3 y 60 veces por segundo. Un solo laptop suena como estática o como goteo; los ocho juntos forman una masa continua cuyo color, registro y densidad nadie controla individualmente. La obra recorre el ciclo de vida de esa masa: aparición, descenso, ruptura, unísono, evaporación.

La segunda idea es técnica y es el punto pedagógico central: **los laptops tocan juntos sin hablarse**. No hay OSC, ni MIDI, ni WebSocket, ni red local. Cada máquina lee el reloj de su propio sistema operativo —ya sincronizado por NTP con los servidores de hora— y calcula desde ahí en qué segundo de la obra está. La sincronía es *implícita*: existe porque todos los relojes apuntan al mismo instante absoluto, no porque alguien mande un mensaje. Es la misma lógica con la que dos observatorios en continentes distintos correlacionan una señal.

> **Regla única de puesta en escena: nadie se mueve de su puesto.** Cuando la partitura dice descender, migrar, llegar desde el agudo o converger, habla siempre del sonido, nunca del cuerpo. Cada ejecutante permanece sentado en su lugar durante los siete minutos y todo lo resuelve con las teclas y con el oído. La única retroalimentación entre ejecutantes es auditiva: no hay señales visuales entre ellos, no se miran las pantallas ajenas, no se desplazan.

## 2. Antes de la clase

Cada estudiante debe verificar que la hora de su laptop se sincroniza automáticamente:

- **macOS**: Configuración → General → Fecha y hora → «Ajustar hora y fecha automáticamente» activado.
- **Windows**: Configuración → Hora e idioma → «Establecer la hora automáticamente» activado, y pulsar «Sincronizar ahora».

En la pantalla de la obra, abajo del cronómetro, aparece la hora del sistema con milisegundos. **Comprobación de ensayo:** poner los ocho laptops uno junto a otro y mirar los milisegundos. Si difieren en más de ~100 ms, esa máquina no está sincronizada.

## 3. Ejecución

Navegador: **Chrome o Firefox** (Safari es menos confiable con AudioWorklet). Se abre el archivo `index.html` desde la URL del curso o desde el disco; no requiere internet una vez cargado.

> **Sobre abrir desde el disco.** Chrome prohíbe cargar módulos de AudioWorklet cuando la página viene de `file://`. La obra lo detecta y cae automáticamente a un motor de respaldo que ejecuta el mismo DSP en el hilo principal: suena idéntico, con ~21 ms más de latencia. El motor en uso aparece abajo de la pantalla. Para la latencia mínima conviene servirla por HTTP, y basta con esto en la carpeta de la obra:
>
> ```
> python3 -m http.server 8000
> ```
>
> y abrir `http://localhost:8000` en cada laptop. También sirve publicarla en la página del curso (GitHub Pages).

1. Cada estudiante elige su **número de voz** (1–8) en el menú superior. Las partes son distintas.
2. Elige su **fuente**: voz, campana, cuerda, micrófono, síntesis pura o un archivo propio.
3. Clic en **Activar audio** (el navegador lo exige).
4. El director presiona **Iniciar en el próximo minuto** en su laptop y da la señal para que todos hagan lo mismo. Cada máquina arranca sola al llegar al minuto exacto. La pantalla muestra la cuenta regresiva en ámbar.
5. Al llegar a 0:00 empieza la obra. La partitura corre sola en pantalla.

**Botón «Ensayar ahora»**: arranca sin esperar, para probar secciones sueltas. No sirve para tocar en conjunto.

## 4. Mapeo del teclado

| Tecla | Función |
|---|---|
| **espacio** (mantener) | sonar. Al soltar, calla. Nada suena sin esta tecla |
| **⇧ shift** (mantener) | ráfaga: cuadruplica la densidad mientras se sostiene |
| **Q W E R T Y U I O P** | posición de lectura dentro del material (Q = inicio, P = final) |
| **A S D F G H J K L Ñ** | transposición: −24 −19 −12 −7 −5 **0** +7 +12 +19 +24 semitonos |
| **↑ ↓** | densidad de granos (0,3 a 60 por segundo) |
| **← →** | tamaño de grano (5 a 600 ms) |
| **Z X** | dispersión de posición: de un punto fijo a todo el material a la vez |
| **C V** | dispersión de altura: de afinado a nube inarmónica |
| **B N** | apertura estéreo |
| **M** | congelar la posición de lectura |
| **, .** | ganancia |

El mapeo usa códigos físicos de tecla, así que funciona igual en teclados latinoamericanos, españoles o ingleses.

La barra ámbar dentro de cada medidor es **el rango que la partitura pide en ese instante**. No hay que ser exacto: es una guía de escucha, no una nota. El número se pone blanco cuando estás dentro del rango.

## 5. Secciones

| # | Tiempo | Sección | Qué ocurre |
|---|---|---|---|
| I | 0:00–1:30 | **Aparición** | Granos escasos, agudos, muy dispersos. Las voces entran escalonadas cada 10 s. Todavía no hay masa: hay puntos |
| II | 1:30–3:00 | **Migración** | Descenso colectivo de registro y espesamiento. Nadie salta de golpe: se baja de a un grado |
| III | 3:00–4:15 | **Fractura** | Ráfagas y silencios. Dispersión máxima. Nadie sostiene más de 4 s salvo la voz 8 |
| IV | 4:15–5:45 | **Convergencia** | Todos a la misma altura (tecla H) y misma posición (tecla T). Granos largos, dispersión mínima. Se afina escuchando los batidos hasta que desaparecen |
| V | 5:45–7:00 | **Evaporación** | Granos largos y cada vez más raros. Las voces callan en el orden indicado. La voz 8 queda sola |

Las indicaciones individuales aparecen en pantalla en la sección **Tu voz N**; no hay que memorizarlas. El botón **Partitura completa** (arriba a la derecha, o `Esc` para cerrar) abre el plan entero: las cinco secciones con las ocho partes cada una, con la propia resaltada. Sirve para saber qué viene y para leer la obra completa antes de tocarla.

## 5 bis. Dirección en vivo — `director.html`

Página aparte, solo para quien dirige. **No hay red: los laptops no reciben nada desde ahí.** Es un guion de dirección y, si se proyecta, un canal visual hacia la orquesta. Contiene:

- El mismo reloj de obra, con los mismos botones de arranque.
- Las **ocho voces en vivo**, cada una con la indicación que le toca en ese instante; la voz que tiene una entrada o una salida en los próximos 10 segundos se enciende en ámbar con su cuenta atrás.
- **Próximo evento** con cuenta regresiva y los cuatro siguientes en cola: útil para avisar «en cinco, entra la cuatro».
- Un **guion por sección**: qué vigilar y qué corregir en cada tramo.
- **Comandos en vivo** (teclas `1`–`9`, `0`, `D`, `R`, `F`, `T`): TUTTI, SILENCIO, GRAVE, AGUDO, UNÍSONO, DISPERSAR, CONCENTRAR, GRANO LARGO/CORTO, RÁFAGA, MÁS DENSO/RALO, CONGELAR. Cada comando dice **qué tecla debe apretar el ejecutante**. **Abrir proyección ⧉** lanza una ventana independiente que se arrastra al monitor extendido y se pone a pantalla completa con doble clic, mientras la consola sigue visible en el laptop del director; los comandos se disparan con el teclado desde cualquiera de las dos ventanas y aparecen ahí en letras gigantes. (**Proyectar aquí** hace lo mismo sobre la propia pantalla, para cuando se dirige con un solo monitor.) Si esa pantalla está en el proyector, la orquesta lee la instrucción y la ejecuta al instante. Es la vía para dirigir libremente fuera de la partitura, o para improvisar dirigido sin partitura alguna.
- Clic en una voz: la pone en **solo** y lo anuncia en la proyección.
- **Señas manuales** para dirigir sin proyector (palma abierta = tutti, puño = silencio, mano bajando = grave, dedos en punta = unísono, mano sacudida = ráfaga, etc.).

Si se editan las secciones en `index.html`, hay que editarlas también en `director.html`: cada archivo es autónomo a propósito, para que ninguno dependa del otro ni de un servidor.

## 6. Protocolo de ensayo (≈45 min)

1. **(5 min)** Verificación de relojes. Ocho laptops en fila, comparar milisegundos.
2. **(10 min)** Exploración libre con «Ensayar ahora». Cada uno busca los extremos de sus controles: el grano más corto, el más largo, la máxima dispersión. Sin partitura.
3. **(5 min)** Ejercicio de escucha: **solo la barra espaciadora**. Todos con los mismos parámetros. Se toca en silencio y se entra únicamente cuando ya suenan otras dos personas. Enseña que en esta obra la decisión compositiva es *cuándo callar*.
4. **(10 min)** Secciones IV y V por separado — son las que exigen coordinación real de afinación.
5. **(10 min)** Pasada completa sincronizada al minuto.
6. **(5 min)** Discusión: ¿en qué momento dejó de oírse como ocho computadores y empezó a oírse como una sola cosa? ¿Qué falló en la sincronía y por qué?

## 7. Disposición

Ocho laptops en semicírculo abierto hacia la sala, o rodeando al público si el recinto lo permite. Cada uno con su propio parlante o audífonos abiertos. **No usar un solo sistema de amplificación central**: la obra depende de que cada fuente esté en un punto distinto del espacio, y la dispersión estéreo (teclas B/N) solo tiene sentido si cada laptop irradia desde su lugar.

Si se usa el micrófono como fuente, bajar la ganancia general: el acople es parte del material, pero se vuelve incontrolable rápido.

## 8. Notas técnicas

- Un solo archivo HTML sin dependencias, sin CDN y sin *build*. Abre por `file://` o por HTTP.
- El procesador granular corre en un `AudioWorklet` inyectado como *blob*, en el hilo de audio, con hasta 160 granos simultáneos. Costo medido en el peor caso (60 granos/s × ráfaga, granos de 500 ms): **≈3,4 % de CPU**.
- Si el navegador rechaza el worklet (caso `file://` en Chrome), el mismo código fuente se instancia en un `ScriptProcessorNode` de 1024 muestras mediante `new Function`, sin duplicar una sola línea de DSP. Es un buen ejemplo en clase de cómo aislar el algoritmo de su envoltorio de ejecución.
- Las tres muestras se generan proceduralmente al cargar la página —síntesis aditiva de formantes vocales, parciales inarmónicos de campana, y cuerda frotada con inarmonicidad y ruido de arco—, así que no se descarga ni un byte de audio.
- El micrófono se captura en un buffer circular de 6 s; la tecla de posición controla cuánto atrás en el pasado se lee. La transposición no altera la velocidad del buffer, solo la de cada grano, así que se puede transponer sin cambiar la duración.
- Salida con limitador `tanh` suave para evitar que una máquina sature al sumarse la nube.

## 9. Qué evaluar / conversar en clase

- Síntesis granular: relación entre tamaño de grano, densidad y percepción. Bajo ~50 ms el grano deja de oírse como evento y se vuelve timbre; bajo ~20 ms la tasa de disparo se vuelve altura audible.
- Sincronía distribuida sin comunicación, y por qué el problema no desaparece: la deriva de los relojes, la latencia del buffer de audio de cada máquina (~10–25 ms según hardware) y el tiempo de propagación del sonido en la sala (3 ms por metro) siguen ahí.
- Autoría en un sistema donde ningún ejecutante produce el resultado que se escucha.
