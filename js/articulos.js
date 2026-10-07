/* =========================================================
   articulos.js  ·  JS específico de la página "articulos"
   Se carga el último (lo añade general.js según paginas.json).

   Fondo: burbujas que no se mueven. Cada una aparece en un punto,
   crece, explota (anillo + gotitas) y reaparece en otro sitio.

   Solo se dibuja cuando hace falta: se detiene si la pestaña
   está oculta, si el lienzo no está en pantalla o si el usuario
   prefiere menos movimiento (en ese caso queda un cuadro fijo).
   ========================================================= */
(() => {
    'use strict';

    /* ---------- Ajustes ---------- */
    const RADIO_MIN = 26;             // radio máximo de cada burbuja (px)
    const RADIO_MAX = 70;
    const CRECER_MIN = 3;             // segundos que tarda en crecer
    const CRECER_MAX = 7;
    const DURACION_EXPLOSION = 0.4;   // segundos
    const ESPERA_MAX = 1.5;           // pausa antes de reaparecer
    const GOTAS = 9;
    const AREA_POR_BURBUJA = 70000;   // px² de pantalla por burbuja
    const MIN_BURBUJAS = 6;
    const MAX_BURBUJAS = 18;

    const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const raiz = document.documentElement;

    /* ---------- Lienzo ---------- */
    const lienzo = document.createElement('canvas');
    lienzo.id = 'fondo_burbujas';
    lienzo.setAttribute('aria-hidden', 'true');
    document.body.prepend(lienzo);

    const ctx = lienzo.getContext('2d');
    if (!ctx) return;

    let ancho = 0, alto = 0, dpr = 1;
    let burbujas = [];
    let colorRgb = '43, 255, 0';
    let alfaBase = 0.45;

    let lienzoVisible = true;
    let raf = 0;
    let ultimo = 0;

    /* ---------- Color: sigue el estilo activo de la plantilla ---------- */
    function leerColor() {
        const rgb = getComputedStyle(raiz).getPropertyValue('--neon-rgb').trim();
        if (rgb) colorRgb = rgb;
        const estilo = raiz.dataset.estilo;
        alfaBase = (!estilo || estilo === 'claro') ? 0.7 : 0.45;   // el tema claro necesita más intensidad
        if (!raf) dibujar();
    }

    /* ---------- Burbujas ---------- */
    const entre = (min, max) => min + Math.random() * (max - min);

    // Coloca la burbuja en un punto nuevo y reinicia su ciclo
    function reiniciar(b, edadInicial = 0) {
        b.x = entre(0, ancho);
        b.y = entre(0, alto);
        b.max = entre(RADIO_MIN, RADIO_MAX);
        b.dur = entre(CRECER_MIN, CRECER_MAX);
        b.edad = edadInicial;
        b.estado = 'espera';
        b.espera = edadInicial > 0 ? 0 : entre(0, ESPERA_MAX);
        b.giroGotas = entre(0, Math.PI * 2);
        b.fase = entre(0, Math.PI * 2);
        if (edadInicial > 0) b.estado = 'crece';
        return b;
    }

    function actualizar(b, dt) {
        if (b.estado === 'espera') {
            b.espera -= dt;
            if (b.espera <= 0) b.estado = 'crece';
        } else if (b.estado === 'crece') {
            b.edad += dt;
            if (b.edad >= b.dur) { b.estado = 'explota'; b.t = 0; }
        } else {
            b.t += dt;
            if (b.t >= DURACION_EXPLOSION) reiniciar(b);
        }
    }

    /* ---------- Tamaño ---------- */
    function ajustarTamano() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        ancho = window.innerWidth;
        alto = window.innerHeight;
        lienzo.width = Math.round(ancho * dpr);
        lienzo.height = Math.round(alto * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cantidad = Math.min(MAX_BURBUJAS,
            Math.max(MIN_BURBUJAS, Math.round((ancho * alto) / AREA_POR_BURBUJA)));
        // Se reparten en distintas etapas de crecimiento para que no exploten todas a la vez
        burbujas = Array.from({ length: cantidad }, () => {
            const b = reiniciar({});
            b.edad = Math.random() * b.dur * 0.95;
            b.estado = 'crece';
            return b;
        });
        dibujar();
    }

    /* ---------- Dibujo ---------- */
    const suavizar = (k) => 1 - Math.pow(1 - k, 3);   // crece rápido al inicio y se frena al final

    function dibujarBurbuja(b) {
        if (b.estado === 'crece') {
            const k = Math.min(b.edad / b.dur, 1);
            const r = b.max * suavizar(k) * (1 + 0.025 * Math.sin(b.edad * 6 + b.fase));   // leve temblor
            if (r < 1) return;

            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${colorRgb}, ${alfaBase * 0.12})`;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(${colorRgb}, ${alfaBase * (0.6 + 0.4 * k)})`;   // más marcada al acercarse a explotar
            ctx.stroke();

            // Brillo en la esquina superior izquierda
            ctx.beginPath();
            ctx.arc(b.x, b.y, r * 0.72, Math.PI * 1.1, Math.PI * 1.45);
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = `rgba(${colorRgb}, ${Math.min(alfaBase * 1.4, 1)})`;
            ctx.stroke();
        } else if (b.estado === 'explota') {
            const p = b.t / DURACION_EXPLOSION;
            const alfa = alfaBase * (1 - p);

            // Anillo que se expande y se desvanece
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.max * (1 + 0.35 * p), 0, Math.PI * 2);
            ctx.lineWidth = 2 * (1 - p) + 0.5;
            ctx.strokeStyle = `rgba(${colorRgb}, ${alfa})`;
            ctx.stroke();

            // Gotitas que salen disparadas
            ctx.fillStyle = `rgba(${colorRgb}, ${alfa})`;
            for (let i = 0; i < GOTAS; i++) {
                const ang = b.giroGotas + (i / GOTAS) * Math.PI * 2;
                const dist = b.max * (0.9 + 0.9 * p);
                ctx.beginPath();
                ctx.arc(b.x + Math.cos(ang) * dist, b.y + Math.sin(ang) * dist, 3 * (1 - p) + 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function dibujar() {
        ctx.clearRect(0, 0, ancho, alto);
        for (const b of burbujas) dibujarBurbuja(b);
    }

    /* ---------- Bucle: solo corre si se está viendo ---------- */
    function bucle(ahora) {
        const dt = Math.min(ahora - ultimo, 250) / 1000;   // evita saltos tras una pausa
        ultimo = ahora;
        for (const b of burbujas) actualizar(b, dt);
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