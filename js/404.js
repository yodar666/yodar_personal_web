(() => {
    'use strict';

    const canvas = document.getElementById('cascada_codigo');
    const contexto = canvas?.getContext('2d');
    const urlSolicitada = document.getElementById('url_solicitada');
    const enlaceInicio = document.getElementById('enlace_inicio');

    if (urlSolicitada) urlSolicitada.textContent = window.location.href;
    if (enlaceInicio) enlaceInicio.href = new URL('/index.html', window.location.origin).href;
    if (!canvas || !contexto) return;

    const fragmentos = [
        'const route = await cache.resolve(seed);',
        'if (signal !== null) { render(void 0); }',
        'return matrix[index] ?? await echo();',
        'for (let node of queue) node ^= noise;',
        'const payload = parse(undefined, 0x0f);',
        'while (memory) await loop.shift();',
        'export default async function ghost() {}',
        'new Promise((resolve) => route.then(resolve));',
        'const [alpha, beta] = await packet.split();',
        'switch (buffer) { case null: break; }',
        'Object.assign(signal, { data: null });',
        'const index = Math.random() * undefined;'
    ];
    const colores = ['#39ff77', '#82ffa5', '#1ac95a', '#b5ffca'];
    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ancho = 0;
    let alto = 0;
    let columnas = [];
    let ultimoFrame = 0;

    function ajustarCanvas() {
        const escala = Math.min(window.devicePixelRatio || 1, 2);
        ancho = window.innerWidth;
        alto = window.innerHeight;
        canvas.width = Math.round(ancho * escala);
        canvas.height = Math.round(alto * escala);
        contexto.setTransform(escala, 0, 0, escala, 0, 0);
        contexto.font = '12px Consolas, monospace';

        const separacion = ancho < 600 ? 190 : 250;
        columnas = Array.from({ length: Math.ceil(ancho / separacion) + 1 }, (_, indice) => ({
            x: indice * separacion + Math.random() * 36,
            y: Math.random() * alto,
            velocidad: 18 + Math.random() * 42,
            fragmento: Math.floor(Math.random() * fragmentos.length),
            color: colores[Math.floor(Math.random() * colores.length)]
        }));
        contexto.clearRect(0, 0, ancho, alto);
    }

    function dibujarCascada(ahora = 0) {
        const delta = Math.min((ahora - ultimoFrame) / 1000, .08);
        ultimoFrame = ahora;
        contexto.fillStyle = 'rgba(2, 8, 4, .18)';
        contexto.fillRect(0, 0, ancho, alto);

        columnas.forEach((columna) => {
            columna.y += columna.velocidad * delta;
            contexto.fillStyle = columna.color;
            contexto.fillText(fragmentos[columna.fragmento], columna.x, columna.y);
            if (Math.random() < .025) {
                columna.fragmento = Math.floor(Math.random() * fragmentos.length);
                columna.color = colores[Math.floor(Math.random() * colores.length)];
            }
            if (columna.y > alto + 40) columna.y = -20 - Math.random() * 180;
        });
    }

    function animar(ahora) {
        if (ahora - ultimoFrame >= 42) dibujarCascada(ahora);
        if (!movimientoReducido) window.requestAnimationFrame(animar);
    }

    ajustarCanvas();
    window.addEventListener('resize', ajustarCanvas, { passive: true });
    dibujarCascada(16);
    if (!movimientoReducido) window.requestAnimationFrame(animar);
})();
