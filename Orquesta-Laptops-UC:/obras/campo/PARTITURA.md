# CAMPO

*Obra para orquesta de laptops · síntesis FM controlada solo con el mouse · sincronía por reloj de sistema*
IEE2003 Orquesta de Laptops · Pontificia Universidad Católica de Chile

Duración: **7:30** · tres movimientos con dos entreactos · 8 voces (funciona desde 4) · sin red entre laptops · sin servidor

---

## 1. Idea

El instrumento no tiene teclas. Toda la obra se ejecuta con un solo gesto continuo: mover el cursor por un cuadrante y decidir cuándo apretar el botón.

Tres cosas se oyen a la vez:

- **Dónde estás.** El cuadrante está dividido en nueve zonas y cada una fija una relación distinta entre la portadora y la moduladora de la FM. La fila superior es armónica (1:1, 1:2, 2:1), la media es armónica compuesta (2:3, 3:2, 1:3) y la inferior es inarmónica (1:√2, 1:2.76, 1:3.53): campana, gong, ruido tonal. Cruzar de zona cambia el timbre de golpe.
- **Cuán rápido te mueves.** La velocidad del cursor controla el índice de modulación. Quieto, el sonido es casi una sinusoide; en movimiento rápido, el espectro se llena y se vuelve ruido. Los cambios bruscos de velocidad inyectan transitorios. Es la idea central de la obra: **el gesto físico es audible**, y no como metáfora — la brusquedad de tu mano es literalmente el ancho de banda de tu espectro.
- **Dónde estás en el eje horizontal.** La posición X también fija la frecuencia portadora, de 55 a 1760 Hz, y el lugar en la imagen estéreo. Moverse a la derecha es subir y desplazarse a la derecha del campo sonoro.

**Anclaje.** Si te quedas completamente quieto un segundo y medio con el botón apretado, ese sonido queda anclado: sigue sonando solo, con su timbre congelado, y puedes seguir tocando encima. Hasta cuatro por ejecutante. Se apagan uno a uno, con doble clic encima del anclaje que quieras retirar, y no se cortan: se desvanecen en dos segundos. En el segundo entreacto los anclajes son lo único que suena: la orquesta suena sin que nadie la toque.

**Final.** Al llegar a 7:30 la obra se apaga sola: la voz activa y todos los anclajes caen en tres segundos y medio, sin que nadie tenga que hacer nada. El botón **Detener** hace lo mismo con una caída de algo más de un segundo.

> **Nadie se mueve de su puesto** y nadie mira la pantalla del vecino. Todo el ajuste es de oído.

## 2. Ejecución

Igual que en *Nube*: Chrome o Firefox, botón **Activar audio**, elegir número de voz, y **Iniciar en el próximo minuto** en todos los laptops a la señal del director. La sincronía sale del reloj del sistema operativo, no de la red.

| Gesto | Efecto |
|---|---|
| **botón izquierdo mantenido** sobre el cuadrante | sonar; al soltar, callas |
| **barra espaciadora** | lo mismo, para quien use trackpad y le incomode arrastrar |
| **posición horizontal** | frecuencia portadora (55–1760 Hz) y panorama estéreo |
| **zona bajo el cursor** | relación portadora : moduladora, es decir el timbre |
| **velocidad del cursor** | índice de modulación: quieto = seno, rápido = ruido |
| **quedarse quieto 1,5 s** | anclar el sonido (máximo 4) |
| **doble clic sobre un anclaje** | lo apaga con dos segundos de caída; sobre una zona vacía no hace nada |
| **shift + doble clic** | apaga todos los anclajes |
| **rueda del mouse** | transposición de ±2 octavas |

El aro alrededor del cursor es el índice de modulación: mientras más rápido te mueves, más grande. El arco verde que lo rodea es la cuenta hacia el anclaje.

## 3. Las nueve zonas

| | columna izquierda | columna central | columna derecha |
|---|---|---|---|
| **fila superior** — armónico | **1:1** zona 1 · sinusoide que se abre en impares | **1:2** zona 2 · octava, brillo limpio | **2:1** zona 3 · subarmónico grave y hueco |
| **fila media** — armónico compuesto | **2:3** zona 4 · quinta metálica | **3:2** zona 5 · doble fundamental | **1:3** zona 6 · nasal, tipo clarinete |
| **fila inferior** — inarmónico | **1:√2** zona 7 · batidos internos | **1:2.76** zona 8 · campana sin fundamental | **1:3.53** zona 9 · gong, el más áspero |

## 4. Los tres movimientos

| | Tiempo | | Qué ocurre |
|---|---|---|---|
| **I** | 0:00–2:15 | **RETÍCULA** | Sonidos separados por silencio real. Se va a una zona, se toca dos o tres segundos y se suelta. Los saltos son secos: no se arrastra el cursor con el botón apretado. Solo filas superior y media: el campo todavía es armónico |
| | 2:15–2:30 | *entreacto* | Silencio. Manos fuera del mouse, apoyadas sobre la mesa, a la vista |
| **II** | 2:30–4:45 | **DERIVA** | Un solo sonido continuo: se aprieta el botón al empezar y no se suelta. Desplazamiento tan lento que el aro casi no crece. Cada voz recorre su trayectoria por las nueve zonas y ancla al menos dos sonidos en el camino |
| | 4:45–5:00 | *entreacto* | Silencio de manos. Los anclajes siguen sonando: nadie los borra |
| **III** | 5:00–7:30 | **TORMENTA** | Agitación en la fila inarmónica, botón siempre apretado, movimiento rápido y errático. Desde 6:45 cada voz se detiene en su tiempo **sin soltar el botón**: al dejar de moverse el índice cae solo y queda una sinusoide pura. La obra termina en ocho senos inmóviles |

El final es el argumento de la obra dicho al revés: durante siete minutos el gesto produjo el timbre; en los últimos cuarenta y cinco segundos la ausencia de gesto produce la pureza.

Las indicaciones por voz aparecen en pantalla en **Tu voz N**, y el botón **Partitura completa** abre el plan entero con las ocho partes.

## 5. Dirección en vivo — `director.html`

Misma lógica que en *Nube*. **No hay red**: la consola es un guion y, proyectada, un canal visual.

- Reloj de obra, ocho voces con su indicación actual, próximo evento con cuenta regresiva (incluida la detención escalonada del final, voz por voz) y guion de dirección por movimiento.
- **Comandos en vivo** con teclado: TODOS SUENAN, SILENCIO, QUIETOS, AGITAR, ARMÓNICO, INARMÓNICO, AL CENTRO, ANCLAR, BORRAR ANCLAS, DERIVA LENTA, GRAVE, AGUDO, SUBE UNA OCTAVA, ESQUINAS. Cada uno dice el gesto exacto que debe hacer el ejecutante.
- **Abrir proyección ⧉** lanza una ventana aparte para el monitor extendido, a pantalla completa con doble clic.
- **Señas manuales** para dirigir sin proyector.

## 6. Protocolo de ensayo (≈40 min)

1. **(5 min)** Relojes y voces. Prueba de rango: cada uno recorre el cuadrante de esquina a esquina **sin sonar**, mirando cómo cambian los números.
2. **(8 min)** Exploración libre. Objetivo declarado: encontrar el punto exacto de lentitud en que el timbre se mantiene limpio. Es más difícil de lo que parece.
3. **(5 min)** Ejercicio de anclaje: cada uno deposita cuatro anclajes y luego suelta el botón. Se escucha el resultado colectivo sin que nadie toque nada. Discutir qué se oye.
4. **(10 min)** Movimiento III por separado, especialmente la detención escalonada: es lo único que exige coordinación exacta.
5. **(10 min)** Pasada completa sincronizada al minuto.
6. Discusión: ¿en qué se parece este instrumento a un instrumento acústico, donde la energía del gesto también determina el espectro?

## 7. Notas técnicas

- Un solo archivo HTML sin dependencias, sin CDN y sin *build*, igual que *Nube*. Abre por `file://` o por HTTP; si el navegador bloquea el AudioWorklet (caso `file://` en Chrome), cae solo a un `ScriptProcessorNode` con el mismo código DSP.
- Cinco voces FM simultáneas por laptop: una activa más cuatro anclajes. Costo medido con las cinco sonando y el índice al máximo: **≈1,3 % de CPU**.
- El índice de modulación tiene un techo dinámico calculado desde la frecuencia moduladora, `I_max = 0.42·f_s/f_m − 1`, para que las bandas laterales no se plieguen sobre Nyquist. Es la razón por la que en la zona 9 y en el registro agudo el sonido deja de ensuciarse por más rápido que uno se mueva: la restricción es de Carson, no una decisión estética.
- Verificado sin *offset* de continua y con limitador `tanh` a la salida.

## 8. Qué evaluar / conversar en clase

- FM: relación c:m y armonicidad; por qué 1:2 suena limpio y 1:2.76 suena a campana; el índice como control de ancho de banda (regla de Carson).
- Mapeo gesto → parámetro: por qué mapear la *velocidad* y no la posición a un parámetro tímbrico cambia por completo la sensación de estar tocando un instrumento.
- El anclaje como forma de polifonía en un instrumento monofónico de un solo punto de control.
- Aliasing: qué pasaría sin el techo de índice, y por qué el problema es intrínseco a la FM digital.
