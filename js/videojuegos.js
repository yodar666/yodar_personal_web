/* =========================================================
   videojuegos.js  ·  JS específico de la página "videojuegos"
   Se carga el último (lo añade general.js según paginas.json).

   Fondo: simulación muy básica de "snake". Solo serpientes que
   avanzan por una cuadrícula, giran al azar y reaparecen por el
   lado opuesto. Sin comida, sin colisiones, sin puntuación.

   Solo se dibuja cuando hace falta: se detiene si la pestaña
   está oculta, si el lienzo no está en pantalla o si el usuario
   prefiere menos movimiento (en ese caso queda un cuadro fijo).
   ========================================================= */
(() => {
    'use strict';

    /* ---------- Ajustes ---------- */
    const CELDA = 22;              // tamaño de cada casilla (px)
    const PASOS_POR_SEG = 9;       // velocidad base
    const LARGO_MIN = 8;
    const LARGO_MAX = 18;
    const PROB_GIRO = 0.14;        // probabilidad de girar en cada paso
    const CELDAS_POR_SERPIENTE = 300;
    const MIN_SERPIENTES = 4;
    const MAX_SERPIENTES = 12;

    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // derecha, abajo, izquierda, arriba

    const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const raiz = document.documentElement;

    /* ---------- Lienzo ---------- */
    const lienzo = document.createElement('canvas');
    lienzo.id = 'fondo_snake';
    lienzo.setAttribute('aria-hidden', 'true');
    document.body.prepend(lienzo);

    const ctx = lienzo.getContext('2d');
    if (!ctx) return;

    let cols = 0, filas = 0, dpr = 1;
    let serpientes = [];
    let colorRgb = '43, 255, 0';
    let alfaBase = 0.4;

    let lienzoVisible = true;
    let raf = 0;
    let ultimo = 0;

    /* ---------- Color: sigue el estilo activo de la plantilla ---------- */
    function leerColor() {
        const css = getComputedStyle(raiz);
        const rgb = css.getPropertyValue('--neon-rgb').trim();
        if (rgb) colorRgb = rgb;
        const estilo = raiz.dataset.estilo;
        alfaBase = (!estilo || estilo === 'claro') ? 0.55 : 0.4;   // el tema claro necesita algo más de intensidad
        if (!raf) dibujar();
    }

    /* ---------- Serpientes ---------- */
    const azar = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

    function crearSerpiente() {
        const dir = azar(0, 3);
        const largo = azar(LARGO_MIN, LARGO_MAX);
        const x = azar(0, cols - 1);
        const y = azar(0, filas - 1);
        const [dx, dy] = DIRS[dir];

        // La cabeza va en [0]; el cuerpo queda "detrás" (lado opuesto a la dirección)
        const cuerpo = [];
        for (let i = 0; i < largo; i++) {
            cuerpo.push({
                x: (((x - dx * i) % cols) + cols) % cols,
                y: (((y - dy * i) % filas) + filas) % filas
            });
        }
        return { cuerpo, dir, acum: Math.random(), ritmo: 0.7 + Math.random() * 0.6 };
    }

    function paso(s) {
        if (Math.random() < PROB_GIRO) {
            s.dir = (s.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;   // gira a un lado; nunca da media vuelta
        }
        const [dx, dy] = DIRS[s.dir];
        const cabeza = s.cuerpo[0];
        s.cuerpo.unshift({
            x: (cabeza.x + dx + cols) % cols,     // al salir por un borde reaparece por el opuesto
            y: (cabeza.y + dy + filas) % filas
        });
        s.cuerpo.pop();
    }

    /* ---------- Tamaño ---------- */
    function ajustarTamano() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        lienzo.width = Math.round(w * dpr);
        lienzo.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.max(1, Math.ceil(w / CELDA));
        filas = Math.max(1, Math.ceil(h / CELDA));

        const cantidad = Math.min(MAX_SERPIENTES,
            Math.max(MIN_SERPIENTES, Math.round((cols * filas) / CELDAS_POR_SERPIENTE)));
        serpientes = Array.from({ length: cantidad }, crearSerpiente);
        dibujar();
    }

    /* ---------- Dibujo ---------- */
    function celda(x, y, alfa) {
        ctx.fillStyle = `rgba(${colorRgb}, ${alfa})`;
        const m = 2, l = CELDA - m * 2;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x * CELDA + m, y * CELDA + m, l, l, 5);
            ctx.fill();
        } else {
            ctx.fillRect(x * CELDA + m, y * CELDA + m, l, l);
        }
    }

    function dibujar() {
        ctx.clearRect(0, 0, lienzo.width / dpr, lienzo.height / dpr);
        for (const s of serpientes) {
            const n = s.cuerpo.length;
            for (let i = n - 1; i >= 0; i--) {
                const desvanecer = 1 - (i / n) * 0.7;      // la cola se apaga
                const alfa = alfaBase * desvanecer * (i === 0 ? 1.5 : 1);
                celda(s.cuerpo[i].x, s.cuerpo[i].y, Math.min(alfa, 1));
            }
        }
    }

    /* ---------- Bucle: solo corre si se está viendo ---------- */
    function bucle(ahora) {
        const dt = Math.min(ahora - ultimo, 250) / 1000;   // evita saltos tras una pausa
        ultimo = ahora;

        for (const s of serpientes) {
            s.acum += dt * PASOS_POR_SEG * s.ritmo;
            while (s.acum >= 1) { paso(s); s.acum -= 1; }
        }
        dibujar();
        raf = requestAnimationFrame(bucle);
    }

    function actualizarEjecucion() {
        const debeCorrer = lienzoVisible && !document.hidden && !reducirMovimiento;
        if (debeCorrer && !raf) {
            ultimo = performance.now();
            raf = requestAnimationFrame(bucle);
        } else if (!debeCorrer && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
    }

    /* ---------- Eventos ---------- */
    let temporizadorTamano = 0;
    window.addEventListener('resize', () => {
        clearTimeout(temporizadorTamano);
        temporizadorTamano = setTimeout(ajustarTamano, 150);
    });

    document.addEventListener('visibilitychange', actualizarEjecucion);

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entradas) => {
            lienzoVisible = entradas[entradas.length - 1].isIntersecting;
            actualizarEjecucion();
        }).observe(lienzo);
    }

    // Cambio de estilo (claro / verde / azul / rosa) desde el panel de opciones
    new MutationObserver(leerColor).observe(raiz, { attributes: true, attributeFilter: ['data-estilo'] });

    /* ---------- Inicio ---------- */
    leerColor();
    ajustarTamano();
    actualizarEjecucion();
})();

/* =========================================================
   MINIJUEGO SNAKE (6x6)
   - Pierdes al chocar con la pared o contigo mismo: vuelve el botón de play.
   - Ganas al alcanzar META_LARGO: sale el popup de la galleta y el juego se reinicia.
   - Controles: flechas / WASD, o deslizar el dedo sobre el tablero.
   - Se pausa si la pestaña está oculta o el tablero no está en pantalla.
   ========================================================= */
(() => {
    'use strict';

    /* ---------- Ajustes ---------- */
    const N = 6;                    // tablero de N x N
    const META_LARGO = 15;          // largo que hay que alcanzar para ganar (N * N = llenar el tablero)
    const PASO_MS = 260;            // tiempo entre pasos
    const LARGO_INICIAL = 3;
    const COLOR_COMIDA = '#ff444b';

    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // derecha, abajo, izquierda, arriba

    const tablero = document.getElementById('snake_tablero');
    const lienzo = document.getElementById('snake_lienzo');
    const btnPlay = document.getElementById('snake_play');
    const estado = document.getElementById('snake_estado');
    const popup = document.getElementById('snake_popup');
    const btnCerrar = document.getElementById('snake_popup_cerrar');
    if (!tablero || !lienzo || !btnPlay || !estado || !popup || !btnCerrar) return;

    const ctx = lienzo.getContext('2d');
    if (!ctx) return;

    const raiz = document.documentElement;
    const CELDA = lienzo.width / N;
    const META = Math.min(META_LARGO, N * N);
    const MENSAJE_INICIAL = 'Flechas, WASD o desliza para moverte';

    let cuerpo = [];                // la cabeza va en [0]
    let dir = 0;
    let cola = [];                  // giros pendientes (evita dar media vuelta entre dos pasos)
    let comida = { x: 0, y: 0 };
    let jugando = false;
    let temporizador = 0;
    let enPantalla = true;
    let colorSerpiente = '#50ff50';
    let temporizadorError = 0;

    /* ---------- Color: sigue el estilo activo de la plantilla ---------- */
    function leerColor() {
        const c = getComputedStyle(raiz).getPropertyValue('--resalte').trim();
        if (c) colorSerpiente = c;
        dibujar();
    }

    /* ---------- Estado del juego ---------- */
    function reiniciar() {
        cuerpo = [];
        for (let i = 0; i < LARGO_INICIAL; i++) cuerpo.push({ x: LARGO_INICIAL - 1 - i, y: 3 });
        dir = 0;
        cola = [];
        colocarComida();
        dibujar();
    }

    function colocarComida() {
        const libres = [];
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                if (!cuerpo.some(c => c.x === x && c.y === y)) libres.push({ x, y });
            }
        }
        comida = libres[Math.floor(Math.random() * libres.length)] || { x: -1, y: -1 };
    }

    function mostrarLargo() {
        estado.textContent = `Largo ${cuerpo.length} / ${META}`;
    }

    function iniciar() {
        popup.hidden = true;
        clearTimeout(temporizadorError);
        tablero.classList.remove('snake_error');
        reiniciar();
        jugando = true;
        btnPlay.hidden = true;
        mostrarLargo();
        reanudar();
    }

    function terminar(mensaje) {
        jugando = false;
        pausar();
        estado.textContent = `${mensaje} Inténtalo otra vez`;
        tablero.classList.add('snake_error');
        temporizadorError = setTimeout(() => tablero.classList.remove('snake_error'), 500);
        reiniciar();
        btnPlay.hidden = false;
    }

    function ganar() {
        jugando = false;
        pausar();
        estado.textContent = MENSAJE_INICIAL;
        reiniciar();
        btnPlay.hidden = false;
        popup.hidden = false;
        btnCerrar.focus();
    }

    function cerrarPopup() {
        popup.hidden = true;
        btnPlay.focus();
    }

    /* ---------- Bucle ---------- */
    function paso() {
        temporizador = 0;
        if (!jugando) return;

        if (cola.length) dir = cola.shift();
        const [dx, dy] = DIRS[dir];
        const nx = cuerpo[0].x + dx;
        const ny = cuerpo[0].y + dy;

        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return terminar('¡Chocaste con la pared!');

        const come = nx === comida.x && ny === comida.y;
        const limite = come ? cuerpo.length : cuerpo.length - 1;   // si no crece, la cola libera su casilla
        for (let i = 0; i < limite; i++) {
            if (cuerpo[i].x === nx && cuerpo[i].y === ny) return terminar('¡Te mordiste la cola!');
        }

        cuerpo.unshift({ x: nx, y: ny });
        if (!come) {
            cuerpo.pop();
        } else {
            if (cuerpo.length >= META) { dibujar(); return ganar(); }
            colocarComida();
            mostrarLargo();
        }

        dibujar();
        reanudar();
    }

    function reanudar() {
        if (jugando && !temporizador && enPantalla && !document.hidden) {
            temporizador = setTimeout(paso, PASO_MS);
        }
    }

    function pausar() {
        clearTimeout(temporizador);
        temporizador = 0;
    }

    /* ---------- Dibujo (mismo estilo que las serpientes del fondo) ---------- */
    function celda(x, y) {
        const m = CELDA * 0.09, l = CELDA - m * 2;
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x * CELDA + m, y * CELDA + m, l, l, CELDA * 0.22);
            ctx.fill();
        } else {
            ctx.fillRect(x * CELDA + m, y * CELDA + m, l, l);
        }
    }

    function dibujar() {
        ctx.clearRect(0, 0, lienzo.width, lienzo.height);

        // Casillas del tablero, muy tenues
        ctx.fillStyle = colorSerpiente;
        ctx.globalAlpha = 0.07;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) celda(x, y);

        // Comida: roja con un poco de brillo
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLOR_COMIDA;
        ctx.shadowColor = 'rgba(255, 0, 18, .8)';
        ctx.shadowBlur = CELDA * 0.25;
        celda(comida.x, comida.y);
        ctx.shadowBlur = 0;

        // Serpiente: la cola se apaga y la cabeza resalta
        ctx.fillStyle = colorSerpiente;
        const n = cuerpo.length;
        for (let i = n - 1; i >= 0; i--) {
            ctx.globalAlpha = i === 0 ? 1 : 0.9 * (1 - (i / n) * 0.65);
            celda(cuerpo[i].x, cuerpo[i].y);
        }
        ctx.globalAlpha = 1;
    }

    /* ---------- Controles ---------- */
    function girar(nueva) {
        const ultima = cola.length ? cola[cola.length - 1] : dir;
        if (nueva === ultima || nueva === (ultima + 2) % 4) return;   // ni repetir ni dar media vuelta
        if (cola.length < 2) cola.push(nueva);
    }

    const TECLAS = {
        ArrowRight: 0, d: 0, D: 0,
        ArrowDown: 1,  s: 1, S: 1,
        ArrowLeft: 2,  a: 2, A: 2,
        ArrowUp: 3,    w: 3, W: 3
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !popup.hidden) return cerrarPopup();
        if (!jugando || e.ctrlKey || e.metaKey || e.altKey) return;
        if (!(e.key in TECLAS)) return;
        e.preventDefault();      // evita que las flechas desplacen la página mientras juegas
        girar(TECLAS[e.key]);
    });

    let toqueX = 0, toqueY = 0;
    lienzo.addEventListener('touchstart', (e) => {
        toqueX = e.touches[0].clientX;
        toqueY = e.touches[0].clientY;
    }, { passive: true });

    lienzo.addEventListener('touchend', (e) => {
        if (!jugando) return;
        const dx = e.changedTouches[0].clientX - toqueX;
        const dy = e.changedTouches[0].clientY - toqueY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        girar(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3));
    }, { passive: true });

    btnPlay.addEventListener('click', iniciar);
    btnCerrar.addEventListener('click', cerrarPopup);
    popup.addEventListener('click', (e) => { if (e.target === popup) cerrarPopup(); });

    /* ---------- Pausa si no se ve ---------- */
    document.addEventListener('visibilitychange', () => { document.hidden ? pausar() : reanudar(); });

    if ('IntersectionObserver' in window) {
        new IntersectionObserver((entradas) => {
            enPantalla = entradas[entradas.length - 1].isIntersecting;
            enPantalla ? reanudar() : pausar();
        }).observe(tablero);
    }

    new MutationObserver(leerColor).observe(raiz, { attributes: true, attributeFilter: ['data-estilo'] });

    /* ---------- Inicio ---------- */
    estado.textContent = MENSAJE_INICIAL;
    leerColor();
    reiniciar();
})();