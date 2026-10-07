(() => {
    'use strict';

    /* =====================================================
       CONFIGURACIÓN (edita aquí tus datos)
       ===================================================== */

    // Las rutas se resuelven desde este script, así funciona igual desde cualquier página
    const RUTA_SCRIPT = document.currentScript ? document.currentScript.src : location.href;

    const INTERVALO_CONTACTO_MS = 5000; // cada cuánto alterna contacto / comentarios

    let CITAS = [];
    let COMENTARIOS = [];
    let TRADUCCIONES = {};

    const ESTILO_POR_DEFECTO = 'claro';
    const IDIOMA_POR_DEFECTO = 'es';

    /* =====================================================
       UTILIDADES
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    const guardar = (clave, valor) => {
        try { localStorage.setItem(clave, valor); } catch (e) { /* almacenamiento no disponible */ }
    };
    const leer = (clave) => {
        try { return localStorage.getItem(clave); } catch (e) { return null; }
    };

    // Abre/cierra un panel controlado por un botón
    function alternarPanel(boton, panel, abierto) {
        panel.hidden = !abierto;
        boton.setAttribute('aria-expanded', String(abierto));
    }

    /* =====================================================
       ENCABEZADO: botón del título
       ===================================================== */

    $('boton_titulo').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* =====================================================
       ENCABEZADO: panel de opciones (estilos + idioma)
       ===================================================== */

    const botonOpciones = $('boton_opciones');
    const panelOpciones = $('panel_opciones');
    const botonIdioma = $('boton_idioma');
    const seccionIdiomas = $('seccion_idiomas');

    function cerrarOpciones() {
        alternarPanel(botonOpciones, panelOpciones, false);
        alternarPanel(botonIdioma, seccionIdiomas, false);
    }

    botonOpciones.addEventListener('click', () => {
        const abrir = panelOpciones.hidden;
        if (abrir) {
            alternarPanel(botonOpciones, panelOpciones, true);
        } else {
            cerrarOpciones();
        }
    });

    botonIdioma.addEventListener('click', () => {
        alternarPanel(botonIdioma, seccionIdiomas, seccionIdiomas.hidden);
    });

    // Cerrar al hacer clic fuera o con Escape
    document.addEventListener('click', (e) => {
        if (!panelOpciones.hidden &&
            !panelOpciones.contains(e.target) &&
            !botonOpciones.contains(e.target)) {
            cerrarOpciones();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarOpciones();
    });

    /* =====================================================
       ENCABEZADO: se aplana al hacer scroll
       ===================================================== */

    const encabezado = $('encabezado');
    let esperandoFrame = false;
    let encabezadoBloqueado = false;

    // Escribe --p (0 a 1) en el encabezado según el scroll; el CSS hace el resto.
    // Al contraerse del todo (p = 1) se bloquea: no vuelve a expandirse hasta refrescar la página.
    function actualizarEncabezado() {
        esperandoFrame = false;
        if (encabezadoBloqueado) return;

        const recorrido = Math.min(window.innerHeight * 0.6, 480); // px de scroll hasta quedar plano
        const p = Math.min(1, Math.max(0, window.scrollY / recorrido));

        if (p >= 1) {
            bloquearEncabezado();
            return;
        }

        encabezado.style.setProperty('--p', p.toFixed(3));

        // A partir de la mitad, el panel de opciones cambia de lado (se abre hacia abajo)
        const compacto = p >= 0.5;
        if (compacto !== encabezado.classList.contains('encabezado_compacto')) {
            encabezado.classList.toggle('encabezado_compacto', compacto);
            cerrarOpciones();
        }
    }

    // Deja el encabezado contraído para siempre y apaga todo lo que solo servía para expandirlo
    function bloquearEncabezado() {
        encabezadoBloqueado = true;
        document.documentElement.dataset.encabezado = 'compacto';
        window.removeEventListener('scroll', pedirActualizacion);
        window.removeEventListener('resize', pedirActualizacion);

        if (!encabezado.classList.contains('encabezado_compacto')) cerrarOpciones();
        encabezado.style.setProperty('--p', '1');
        encabezado.classList.add('encabezado_compacto', 'encabezado_plano', 'encabezado_bloqueado');

        finalizarLienzo();   // el lienzo del título ya no se vuelve a dibujar
    }

    function pedirActualizacion() {
        if (esperandoFrame) return;
        esperandoFrame = true;
        requestAnimationFrame(actualizarEncabezado);
    }

    window.addEventListener('scroll', pedirActualizacion, { passive: true });
    window.addEventListener('resize', pedirActualizacion);

    /* =====================================================
       SELECCIÓN DE ESTILO
       ===================================================== */

    const opcionesEstilo = document.querySelectorAll('.opcion_estilo');

    function aplicarEstilo(estilo) {
        document.documentElement.dataset.estilo = estilo;
        document.body.dataset.estilo = estilo;
        leerColorBrillo();
        opcionesEstilo.forEach((btn) => {
            const activo = btn.dataset.estilo === estilo;
            btn.classList.toggle('opcion_activa', activo);
            btn.setAttribute('aria-pressed', String(activo));
        });
        guardar('estilo', estilo);
    }

    opcionesEstilo.forEach((btn) => {
        btn.addEventListener('click', () => aplicarEstilo(btn.dataset.estilo));
    });

    /* =====================================================
        SELECCIÓN DE IDIOMA
       ===================================================== */

    const opcionesIdioma = document.querySelectorAll('.opcion_idioma');

    function aplicarIdioma(idioma) {
        const textos = TRADUCCIONES[idioma];
        if (!textos) return;

        document.documentElement.lang = idioma;
        Object.entries(textos).forEach(([selector, texto]) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = texto;
        });

        opcionesIdioma.forEach((btn) => {
            const activo = btn.dataset.idioma === idioma;
            btn.classList.toggle('opcion_activa', activo);
            btn.setAttribute('aria-pressed', String(activo));
        });
        guardar('idioma', idioma);
    }

    opcionesIdioma.forEach((btn) => {
        btn.addEventListener('click', () => aplicarIdioma(btn.dataset.idioma));
    });

    /* =====================================================
       PIE DE PÁGINA: contraer / expandir
       ===================================================== */

    const pie = $('pie_pagina');
    const botonPie = $('boton_pie');
    const usuariosRedes = document.querySelectorAll('.red_usuario');

    const DURACION_CIERRE_MS = 500;   // igual que --dur-pie en el CSS
    let temporizadorCierre = null;

    function actualizarBotonPie(expandido) {
        botonPie.setAttribute('aria-expanded', String(expandido));
        botonPie.setAttribute('aria-label', expandido ? 'Contraer pie de página' : 'Expandir pie de página');
        botonPie.textContent = expandido ? '▼' : '▲';
    }

    // Aplica de golpe el estado final (sin animación de cierre)
    function aplicarPie(expandir) {
        pie.classList.toggle('pie_expandido', expandir);
        pie.classList.toggle('pie_contraido', !expandir);
        actualizarBotonPie(expandir);
        // Sin CSS, esto asegura que los usuarios solo se vean al expandir.
        usuariosRedes.forEach((u) => { u.hidden = !expandir; });

        // La cita y el título "Contacto" solo se ven con el pie expandido
        $('pie_cita').hidden = !expandir;
        $('contacto_info').querySelector('.contacto_titulo').hidden = !expandir;

        // Contraído: solo el icono del correo (sin alternar comentarios)
        actualizarContactoSegunPie(expandir);
    }

    function expandirPie(expandir) {
        clearTimeout(temporizadorCierre);
        pie.classList.remove('pie_cerrando');

        if (!expandir && pie.classList.contains('pie_expandido')) {
            // Cierre suave: .pie_cerrando anima el repliegue y después se aplica el estado contraído
            pie.classList.add('pie_cerrando');
            actualizarBotonPie(false);
            detenerRotacion();
            if (!esMovil.matches) {              // en móvil los comentarios se desvanecen con el cierre
                panelActual = 0;
                mostrarPanelContacto(0);
            }
            temporizadorCierre = setTimeout(() => {
                pie.classList.remove('pie_cerrando');
                aplicarPie(false);
            }, DURACION_CIERRE_MS);
            return;
        }
        aplicarPie(expandir);
    }

    botonPie.addEventListener('click', () => {
        const abierto = pie.classList.contains('pie_expandido') &&
                        !pie.classList.contains('pie_cerrando');
        expandirPie(!abierto);
    });

    /* =====================================================
       PIE DE PÁGINA: cita del día
       ===================================================== */

    function mostrarCitaDelDia() {
        const hoy = new Date();
        // Número de día (local) desde 1970; cambia a medianoche
        const dia = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000);
        const cita = CITAS[dia % CITAS.length];
        $('cita_texto').textContent = cita.texto;
        $('cita_autor').textContent = cita.autor;
    }

    /* =====================================================
       PIE DE PÁGINA: alternar contacto / comentarios
       ===================================================== */

    const panelesContacto = [$('contacto_info'), $('contacto_comentarios')];
    let panelActual = 0;
    const esMovil = window.matchMedia('(max-width: 720px)');   // mismo corte que el CSS
    let comentarioActual = 0;
    let temporizador = null;
    let pieVisible = false;   // el contacto solo rota mientras el pie está en pantalla

    function mostrarPanelContacto(indice) {
        panelesContacto.forEach((panel, i) => {
            const activo = i === indice;
            panel.hidden = !activo;
            panel.classList.toggle('contacto_activo', activo);
        });
    }

    function mostrarComentario() {
        if (COMENTARIOS.length === 0) return;
        const c = COMENTARIOS[comentarioActual % COMENTARIOS.length];
        $('comentario_texto').textContent = c.texto;
        $('comentario_autor').textContent = '— ' + c.autor;
        comentarioActual++;
    }

    async function cargarDatosPie() {
        try {
            const respuesta = await fetch(new URL('../datos/footer.json', RUTA_SCRIPT));
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

            const datos = await respuesta.json();
            if (!Array.isArray(datos.citas) || !Array.isArray(datos.comentarios) ||
                !datos.traducciones || typeof datos.traducciones !== 'object') {
                throw new Error('El formato de footer.json no es válido.');
            }

            CITAS = datos.citas;
            COMENTARIOS = datos.comentarios;
            TRADUCCIONES = datos.traducciones;
            aplicarIdioma(leer('idioma') || IDIOMA_POR_DEFECTO);
            mostrarCitaDelDia();
        } catch (error) {
            console.error('No se pudieron cargar las citas y los comentarios del pie.', error);
        }
    }

    // Reinicia la animación de entrada del panel de comentarios
    function reanimarComentarios() {
        const panel = $('contacto_comentarios');
        panel.style.animation = 'none';
        void panel.offsetWidth;
        panel.style.animation = '';
    }

    function siguientePanelContacto() {
        // Móvil: el correo no se muestra, así que solo van cambiando los comentarios
        if (esMovil.matches) {
            mostrarComentario();
            reanimarComentarios();
            return;
        }
        panelActual = (panelActual + 1) % panelesContacto.length;
        if (panelActual === 1) mostrarComentario();
        mostrarPanelContacto(panelActual);
    }

    function actualizarContactoSegunPie(expandido) {
        if (expandido) {
            if (esMovil.matches) {
                panelActual = 1;                 // móvil: directamente los comentarios
                mostrarComentario();
                mostrarPanelContacto(1);
            } else {
                panelActual = 0;
                mostrarPanelContacto(0);
            }
            iniciarRotacion();
        } else {
            detenerRotacion();
            panelActual = 0;
            mostrarPanelContacto(0);
        }
    }

    function iniciarRotacion() {
        detenerRotacion();
        if (!pieVisible) return;   // fuera de pantalla: no rota
        if (!pie.classList.contains('pie_expandido') || pie.classList.contains('pie_cerrando')) return; // contraído o cerrando: no rota
        temporizador = setInterval(siguientePanelContacto, INTERVALO_CONTACTO_MS);
    }
    function detenerRotacion() {
        if (temporizador) clearInterval(temporizador);
        temporizador = null;
    }

    // Pausar mientras el usuario tiene el ratón encima o enfoca el enlace
    const contenedorContacto = $('pie_contacto');
    contenedorContacto.addEventListener('mouseenter', detenerRotacion);
    contenedorContacto.addEventListener('mouseleave', iniciarRotacion);
    contenedorContacto.addEventListener('focusin', detenerRotacion);
    contenedorContacto.addEventListener('focusout', iniciarRotacion);

    // Si se cruza el corte móvil / escritorio, recoloca el panel que corresponde
    esMovil.addEventListener('change', () => {
        actualizarContactoSegunPie(pie.classList.contains('pie_expandido') && !pie.classList.contains('pie_cerrando'));
    });

    /* =====================================================
       RENDER 2D: rosa verde o pentagrama rojo (al azar en cada carga)
       (versión simplificada del render 3D: sin perspectiva,
        solo giro + escala pulsante)
       Solo se dibuja mientras el lienzo está en pantalla.
       ===================================================== */

    const PROBABILIDAD_PENTAGRAMA = 0.5;   // 0 = nunca, 1 = siempre
    const FORMA = Math.random() < PROBABILIDAD_PENTAGRAMA ? 'pentagrama' : 'rosa';   // se decide al cargar
    const TEXTO_TITULO_PENTAGRAMA = '666';       // el título grande cambia a esto con el pentagrama

    const COLOR_LINEA = '#2BFF00';               // rosa: verde; el brillo cambia según el estilo
    const COLOR_PENTAGRAMA = '#FF1A1A';          // pentagrama: rojo, sin importar el estilo
    const COLOR_BRILLO_PENTAGRAMA = '#FF0000';
    const PUNTOS_ROSA = 240;
    const VELOCIDAD_RENDER = 1;

    const lienzo = $('lienzo');
    const ctx = lienzo ? lienzo.getContext('2d') : null;
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let colorBrillo = COLOR_LINEA;
    let lienzoVisible = false;
    let lienzoTerminado = false;      // true cuando el encabezado se contrae y el lienzo se retira
    let observadorLienzo = null;
    let renderActivo = false;
    let idFrame = 0;
    let ultimoFrame = 0;
    let tRender = 0;

    // Contornos normalizados (de -1 a 1)
    const CONTORNOS = {
        rosa: Array.from({ length: PUNTOS_ROSA + 1 }, (_, i) => {
            const a = (i / PUNTOS_ROSA) * Math.PI;      // r = cos(5a) se cierra en media vuelta
            const r = Math.cos(5 * a);
            return { x: r * Math.cos(a), y: r * Math.sin(a) };
        }),
        pentagrama: Array.from({ length: 6 }, (_, k) => {
            const a = -Math.PI / 2 + ((k * 2) % 5) * (2 * Math.PI / 5);
            return { x: Math.cos(a), y: -Math.sin(a) };
        })
    };

    // Toma el color neón del estilo activo (variable --neon del CSS)
    function leerColorBrillo() {
        const c = getComputedStyle(document.documentElement).getPropertyValue('--neon').trim();
        if (c) colorBrillo = c;
        if (ctx && reducirMovimiento && !lienzoTerminado) dibujar(tRender);   // sin animación: redibuja el cuadro fijo
    }

    function ajustarLienzo() {
        if (!lienzo || lienzoTerminado) return;
        const lado = lienzo.clientWidth;
        if (!lado) return;
        const dpr = window.devicePixelRatio || 1;
        lienzo.width = lienzo.height = Math.round(lado * dpr);
        if (reducirMovimiento) dibujar(tRender);
    }

    function dibujar(t) {
        const w = lienzo.width;
        const dpr = window.devicePixelRatio || 1;
        const esc = 0.7 + 0.3 * Math.sin(t * 1.6);     // escala pulsante
        const ang = t * 0.35;                          // giro lento
        const c = Math.cos(ang), s = Math.sin(ang);
        const R = (w / 2) * 0.88 * esc;

        ctx.clearRect(0, 0, w, w);
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = 'round';
        const esPentagrama = FORMA === 'pentagrama';
        ctx.strokeStyle = esPentagrama ? COLOR_PENTAGRAMA : COLOR_LINEA;
        ctx.shadowColor = esPentagrama ? COLOR_BRILLO_PENTAGRAMA : colorBrillo;

        // Dos pasadas: halo amplio y luego brillo cercano
        [30, 8].forEach((desenfoque) => {
            ctx.shadowBlur = desenfoque * dpr;
            ctx.beginPath();
            CONTORNOS[FORMA].forEach((p, i) => {
                const x = w / 2 + (p.x * c - p.y * s) * R;
                const y = w / 2 - (p.x * s + p.y * c) * R;   // y hacia arriba, como en el 3D
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });
    }

    function bucleRender(ahora) {
        const dt = Math.min((ahora - ultimoFrame) / 1000, 0.1);
        ultimoFrame = ahora;
        tRender += dt * VELOCIDAD_RENDER;
        dibujar(tRender);
        idFrame = requestAnimationFrame(bucleRender);
    }

    // Arranca o detiene el bucle según la visibilidad
    function actualizarRender() {
        const debe = !!ctx && !lienzoTerminado && lienzoVisible && !reducirMovimiento &&
                     !encabezado.classList.contains('encabezado_plano');
        if (debe === renderActivo) return;
        renderActivo = debe;
        if (debe) {
            ultimoFrame = performance.now();
            idFrame = requestAnimationFrame(bucleRender);
        } else {
            cancelAnimationFrame(idFrame);
        }
    }

    function iniciarLienzo() {
        if (!ctx || lienzoTerminado) return;
        ajustarLienzo();
        window.addEventListener('resize', ajustarLienzo);
        observadorLienzo = new IntersectionObserver(([entrada]) => {
            lienzoVisible = entrada.isIntersecting;
            actualizarRender();
        });
        observadorLienzo.observe(lienzo);
    }

    // Retira el lienzo para siempre (se llama al contraerse el encabezado)
    function finalizarLienzo() {
        lienzoTerminado = true;
        renderActivo = false;
        cancelAnimationFrame(idFrame);
        if (observadorLienzo) observadorLienzo.disconnect();
        window.removeEventListener('resize', ajustarLienzo);
        if (lienzo) lienzo.remove();
    }

    // Con el pentagrama: el título grande pasa a "666" y la luz del centro se vuelve roja
    function prepararForma() {
        if (!ctx || FORMA !== 'pentagrama') return;
        encabezado.classList.add('encabezado_pentagrama');
        const titulo = $('titulo_principal');
        if (titulo) titulo.textContent = TEXTO_TITULO_PENTAGRAMA;
    }

    // El contacto del pie solo rota mientras el pie está en pantalla
    function observarPie() {
        new IntersectionObserver(([entrada]) => {
            pieVisible = entrada.isIntersecting;
            if (pieVisible) actualizarContactoSegunPie(pie.classList.contains('pie_expandido') && !pie.classList.contains('pie_cerrando'));
            else detenerRotacion();
        }).observe(pie);
    }

    /* =====================================================
       INICIO
       ===================================================== */

    function iniciar() {
        prepararForma();

        // Si el estilo guardado ya no existe (p. ej. "oscuro"), usa el predeterminado
        const estilosValidos = Array.from(opcionesEstilo).map((b) => b.dataset.estilo);
        const guardado = leer('estilo');
        aplicarEstilo(estilosValidos.includes(guardado) ? guardado : ESTILO_POR_DEFECTO);
        // Páginas interiores: el encabezado arranca ya contraído (lo pide general.js)
        if (encabezado.dataset.inicio === 'compacto') bloquearEncabezado();
        else actualizarEncabezado();

        cerrarOpciones();
        expandirPie(false);
        mostrarPanelContacto(0);

        iniciarLienzo();
        observarPie();
    }

    iniciar();
    cargarDatosPie();
})();