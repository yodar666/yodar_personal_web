(() => {
    'use strict';

    /* =====================================================
       CONFIGURACIÓN
       Todas las rutas se resuelven desde este script (js/general.js),
       así funcionan igual desde una página en cualquier carpeta.
       ===================================================== */

    const BASE = document.currentScript ? document.currentScript.src : location.href;
    const desdeJs = (ruta) => new URL(ruta, BASE);
    const RAIZ = desdeJs('../');                        // raíz del sitio

    function quitarTerminacionHtml() {
        const url = new URL(location.href);
        if (!/\.html$/i.test(url.pathname)) return;

        url.pathname = url.pathname.replace(/\.html$/i, '');
        try {
            history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
        } catch (error) {
            console.warn('No se pudo quitar .html de la URL actual.', error);
        }
    }

    quitarTerminacionHtml();

    const RUTA_PAGINAS = '../datos/paginas.json';
    // Ruta a la plantilla que aporta el encabezado y el pie (contada desde js/).
    const RUTAS_PLANTILLA = ['../paginas/plantillas.html'];
    const RUTA_PLANTILLA_ARTICULO = '../paginas/plantilla_articulo.html';
    const RUTA_PLANTILLA_JS = 'plantilla.js';           // el JS de esa plantilla (junto a este)

    const SUGERENCIA_SERVIDOR = location.protocol === 'file:'
        ? 'Estás abriendo la página como archivo (file://): usa un servidor local (Live Server de VS Code o "python -m http.server").'
        : 'Revisa que las rutas de la configuración de js/general.js existan.';

    const CLAVE_VISITA = 'sitio_visitado';              // sessionStorage: ¿ya se vio el encabezado grande?

    // Nombres de los campos tal como están escritos en paginas.json
    const CAMPOS = {
        css: 'css',
        js: 'js',
        ruta: 'a_possition',
        articulos: 'articulos'
    };

    const CARPETA_CSS = '../css/';
    const CARPETA_JS = '../js/';

    /* =====================================================
       JERARQUÍA DEL JS
       1) general.js importa el encabezado y el pie y carga su JS (plantilla.js)
       2) hace su propio trabajo y publica window.Pagina
       3) al final se carga el JS específico de la página (paginas.json), que
          se ejecuta el último: puede leer el estado y sustituir cualquier
          método de Pagina (p. ej. Pagina.crearTarjeta) y volver a llamar a
          Pagina.renderizarSelector().

       La navegación entre artículos NO tiene botón: solo se activa por
       código, con Pagina.activarNavegacion(true).
       ===================================================== */

    const Pagina = window.Pagina = {
        clave: null,          // página actual (clave en paginas.json)
        config: null,         // datos de la página actual
        paginas: {},          // todo paginas.json
        encabezadoCompacto: false,
        estado: { navegacion: false, articulo: 0, articuloClave: null },

        crearTarjeta,
        renderizarSelector,
        renderizarNavegacion,
        activarNavegacion,
        irAArticulo
    };

    /* =====================================================
       UTILIDADES
       ===================================================== */

    const $ = (id) => document.getElementById(id);

    function resaltar666(contenido) {
        const filtro = {
            acceptNode(nodo) {
                if (!nodo.nodeValue.includes('666')) return NodeFilter.FILTER_REJECT;
                if (nodo.parentElement?.closest('.numero_neon, script, style, textarea')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        };
        const recorrido = document.createTreeWalker(contenido, NodeFilter.SHOW_TEXT, filtro);
        const nodos = [];

        while (recorrido.nextNode()) nodos.push(recorrido.currentNode);

        nodos.forEach((nodo) => {
            const fragmento = document.createDocumentFragment();
            nodo.nodeValue.split(/(666)/g).forEach((parte) => {
                if (parte === '666') {
                    const marca = document.createElement('span');
                    marca.className = 'numero_neon';
                    marca.textContent = parte;
                    fragmento.append(marca);
                } else if (parte) {
                    fragmento.append(document.createTextNode(parte));
                }
            });
            nodo.replaceWith(fragmento);
        });
    }

    const contenidoInicial = $('contenido');
    if (contenidoInicial) {
        resaltar666(contenidoInicial);
        new MutationObserver(() => resaltar666(contenidoInicial)).observe(contenidoInicial, {
            childList: true,
            subtree: true
        });
    }

    function crear(etiqueta, clase, texto) {
        const el = document.createElement(etiqueta);
        if (clase) el.className = clase;
        if (texto !== undefined) el.textContent = texto;
        return el;
    }

    const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

    function numero(valor) {
        const n = Number.parseInt(valor, 10);
        return Number.isFinite(n) && n >= 0 ? n : 0;
    }

    function valorArticulos(datos) {
        return datos[CAMPOS.articulos] ?? datos.artuculos;
    }

    function esDiccionario(valor) {
        return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
    }

    function cantidadArticulos(valor) {
        return esDiccionario(valor) ? Object.keys(valor).length : numero(valor);
    }

    function requiereNavegacion(valor) {
        return esDiccionario(valor) || numero(valor) > 1;
    }

    const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

    function nombreVisible(clave) {
        const limpio = clave.replace(/_/g, ' ');
        return limpio.charAt(0).toUpperCase() + limpio.slice(1);
    }

    // Las páginas del sitio van en paginas/; index.html es la excepción en la raíz.
    function rutaDe(clave, datos) {
        return texto(datos[CAMPOS.ruta]) || (clave === 'index' ? 'index.html' : `paginas/${clave}.html`);
    }

    function rutaDeArticulo(clave) {
        return new URL(
            `paginas/${encodeURIComponent(Pagina.clave)}/${encodeURIComponent(clave)}.html`,
            RAIZ
        ).href;
    }

    // "videojuegos" -> css/videojuegos.css ; una ruta con "/" se cuenta desde la raíz del sitio
    function resolverRuta(valor, carpeta, extension) {
        const v = texto(valor);
        if (!v) return null;
        if (v.includes('/')) return new URL(v, RAIZ).href;
        return new URL(`${carpeta}${v}${v.toLowerCase().endsWith(extension) ? '' : extension}`, BASE).href;
    }

    // Qué página es esta: <body data-pagina="..."> o, si no está, el nombre del archivo
    function detectarPagina(paginas) {
        const declarada = document.body.dataset.pagina;
        if (declarada && Object.hasOwn(paginas, declarada)) return declarada;

        const archivo = location.pathname.split('/').filter(Boolean).pop() || 'index';
        const nombre = archivo.replace(/\.[^.]+$/, '');
        return Object.hasOwn(paginas, nombre) ? nombre : null;
    }

    /* =====================================================
       ENCABEZADO Y PIE: se importan de la plantilla
       ===================================================== */

    // Encabezado grande solo la primera vez que se entra al sitio (o al refrescar).
    // Al cambiar de página dentro del sitio, se muestra la versión compacta.
    function debeIniciarCompacto() {
        const entrada = performance.getEntriesByType('navigation')[0];
        const esRecarga = !!entrada && entrada.type === 'reload';

        let yaVisitado = false;
        try {
            yaVisitado = sessionStorage.getItem(CLAVE_VISITA) === '1';
            sessionStorage.setItem(CLAVE_VISITA, '1');
        } catch (e) { /* sin sessionStorage: siempre encabezado grande */ }

        return yaVisitado && !esRecarga;
    }

    // Muestra un aviso en la propia página (además de la consola), para que un fallo no deje todo en blanco
    function avisar(mensaje) {
        console.error(mensaje);
        const aviso = crear('p', 'aviso_carga', mensaje);
        const cuerpo = document.querySelector('.cuerpo');
        if (cuerpo) cuerpo.prepend(aviso);
        else document.body.prepend(aviso);
    }

    // Sustituye el hueco de la página por el elemento importado (o lo añade si no hay hueco)
    function colocar(nodo, selector, alFinal) {
        const hueco = document.querySelector(selector);
        if (hueco) hueco.replaceWith(nodo);
        else if (alFinal) document.body.append(nodo);
        else document.body.prepend(nodo);
    }

    function cargarScript(url) {
        return new Promise((resolver, rechazar) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = false;
            script.addEventListener('load', resolver);
            script.addEventListener('error', () => rechazar(new Error(`No se pudo cargar ${url}`)));
            document.body.append(script);
        });
    }

    // Lee la plantilla probando cada ruta; devuelve el documento que tenga #encabezado y #pie_pagina
    async function leerPlantilla() {
        const probadas = [];
        for (const ruta of RUTAS_PLANTILLA) {
            const url = desdeJs(ruta);
            try {
                const respuesta = await fetch(url);
                if (!respuesta.ok) { probadas.push(`${ruta} (HTTP ${respuesta.status})`); continue; }
                const doc = new DOMParser().parseFromString(await respuesta.text(), 'text/html');
                if (doc.getElementById('encabezado') && doc.getElementById('pie_pagina')) return doc;
                probadas.push(`${ruta} (no tiene #encabezado y #pie_pagina)`);
            } catch (error) {
                probadas.push(`${ruta} (no se pudo leer)`);
            }
        }
        throw new Error(`No se encontró la plantilla. Rutas probadas: ${probadas.join('; ')}`);
    }

    async function importarPlantilla(compacto) {
        const doc = await leerPlantilla();
        const encabezado = doc.getElementById('encabezado');
        const pie = doc.getElementById('pie_pagina');

        if (compacto) {
            // Ya nace contraído (sin animación); plantilla.js lo deja bloqueado así
            encabezado.dataset.inicio = 'compacto';
            encabezado.style.setProperty('--p', '1');
            encabezado.classList.add('encabezado_compacto', 'encabezado_plano', 'encabezado_bloqueado');
        }

        colocar(document.adoptNode(encabezado), '.encabezado', false);
        colocar(document.adoptNode(pie), '.pie_pagina', true);

        // Encabezado grande: se parte desde arriba (si el navegador restauró el scroll al refrescar,
        // plantilla.js lo tomaría por "ya se bajó" y lo contraería al instante)
        if (!compacto) window.scrollTo({ top: 0, behavior: 'instant' });

        // El JS de la plantilla necesita que el encabezado y el pie ya estén en la página
        await cargarScript(desdeJs(RUTA_PLANTILLA_JS));
    }

    /* =====================================================
       SELECTOR: una nota (marcador) por página del JSON
       ===================================================== */

    // Construye la nota de una página: solo el título; el detalle va en el tooltip.
    // Sustituible desde el JS específico.
    function crearTarjeta(clave, datos, esActual) {
        const ruta = rutaDe(clave, datos);
        const css = texto(datos[CAMPOS.css]);
        const js = texto(datos[CAMPOS.js]);

        const enlace = crear('a', 'nota' + (esActual ? ' nota_actual' : ''));
        enlace.href = new URL(ruta, RAIZ).href;
        enlace.title = [
            ruta,
            plural(cantidadArticulos(valorArticulos(datos)), 'artículo', 'artículos'),
            `css: ${css || 'solo el general'}`,
            `js: ${js || 'solo el general'}`
        ].join('\n');
        if (esActual) enlace.setAttribute('aria-current', 'page');

        enlace.append(crear('span', 'nota_cara', nombreVisible(clave)));
        return enlace;
    }

    function renderizarSelector() {
        const lista = $('selector_lista');
        if (!lista) return;

        const entradas = Object.entries(Pagina.paginas);
        lista.replaceChildren();

        if (entradas.length === 0) {
            lista.append(crear('p', 'selector_mensaje', 'No hay páginas definidas en paginas.json.'));
            return;
        }
        entradas.forEach(([clave, datos]) => {
            lista.append(Pagina.crearTarjeta(clave, datos || {}, clave === Pagina.clave));
        });
    }

    /* =====================================================
       CONTENIDO: navegación entre artículos (solo por código)
       ===================================================== */

    const articulos = () => Array.from(document.querySelectorAll('#tarjeta_articulo .articulo'));
    let plantillaArticuloPromesa = null;
    let solicitudArticulo = 0;

    function cargarPlantillaArticulo() {
        if (!plantillaArticuloPromesa) {
            plantillaArticuloPromesa = (async () => {
                const respuesta = await fetch(desdeJs(RUTA_PLANTILLA_ARTICULO));
                if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

                const documento = new DOMParser().parseFromString(await respuesta.text(), 'text/html');
                const plantilla = documento.getElementById('plantilla_articulo');
                const articulo = plantilla?.content.firstElementChild;
                if (!articulo?.matches('article.articulo')) {
                    throw new Error('La plantilla no contiene <article class="articulo">.');
                }
                return articulo;
            })();
        }
        return plantillaArticuloPromesa.then((articulo) => articulo.cloneNode(true));
    }

    async function cargarArticulo(clave, datos) {
        const solicitud = ++solicitudArticulo;
        const url = rutaDeArticulo(clave);
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} al cargar ${url}`);

        const documento = new DOMParser().parseFromString(await respuesta.text(), 'text/html');
        const fuente = documento.querySelector('article.articulo');
        if (!fuente) throw new Error(`No se encontró <article class="articulo"> en ${url}`);

        const articulo = await cargarPlantillaArticulo();
        if (solicitud !== solicitudArticulo) return;

        for (const atributo of fuente.attributes) articulo.setAttribute(atributo.name, atributo.value);
        articulo.classList.add('articulo');
        if (!articulo.id) articulo.id = `articulo_${clave}`;
        if (!articulo.dataset.titulo) articulo.dataset.titulo = nombreVisible(clave);
        articulo.innerHTML = fuente.innerHTML;

        const contenedor = $('tarjeta_articulo');
        if (!contenedor) return;
        contenedor.replaceChildren(articulo);
        Pagina.estado.articuloClave = clave;
        Pagina.renderizarNavegacion();
        cargarEspecificosArticulo(datos || {});
    }

    function resolverRecursoArticulo(valor, carpeta, extension) {
        const ruta = texto(valor);
        if (!ruta || ruta.toUpperCase() === 'N') return null;
        return resolverRuta(ruta, carpeta, extension);
    }

    function cargarEspecificosArticulo(config) {
        document.querySelectorAll('[data-articulo-especifico]').forEach((recurso) => recurso.remove());

        const css = resolverRecursoArticulo(config.css, CARPETA_CSS, '.css');
        if (css) {
            const enlace = document.createElement('link');
            enlace.rel = 'stylesheet';
            enlace.href = css;
            enlace.dataset.articuloEspecifico = 'css';
            enlace.addEventListener('error', () => console.warn(`No se pudo cargar el CSS del artículo: ${css}`));
            document.head.append(enlace);
        }

        const js = resolverRecursoArticulo(config.js, CARPETA_JS, '.js');
        if (js) {
            const script = document.createElement('script');
            script.src = js;
            script.async = false;
            script.dataset.articuloEspecifico = 'js';
            script.addEventListener('error', () => console.warn(`No se pudo cargar el JS del artículo: ${js}`));
            document.body.append(script);
        }
    }

    function renderizarNavegacion() {
        const lista = $('navegacion_lista');
        if (!lista) return;

        lista.replaceChildren();

        const valorConfigurado = Pagina.config ? valorArticulos(Pagina.config) : null;
        if (esDiccionario(valorConfigurado)) {
            Object.keys(valorConfigurado).forEach((clave) => {
                const enlace = crear('a', 'navegacion_opcion', clave);
                enlace.href = rutaDeArticulo(clave);
                enlace.dataset.articuloClave = clave;
                enlace.addEventListener('click', (evento) => {
                    evento.preventDefault();
                    cargarArticulo(clave, valorConfigurado[clave]).catch((error) => {
                        console.error(`No se pudo cargar el artículo "${clave}".`, error);
                    });
                });

                const item = crear('li');
                item.append(enlace);
                lista.append(item);
            });
            marcarArticuloActual();
            return;
        }

        articulos().forEach((articulo, i) => {
            const titulo = articulo.dataset.titulo ||
                           articulo.querySelector('h1, h2, h3')?.textContent.trim() ||
                           `Artículo ${i + 1}`;
            const boton = crear('button', 'navegacion_opcion', titulo);
            boton.type = 'button';
            boton.addEventListener('click', () => Pagina.irAArticulo(i));

            const item = crear('li');
            item.append(boton);
            lista.append(item);
        });
        marcarArticuloActual();
    }

    function marcarArticuloActual() {
        document.querySelectorAll('.navegacion_opcion').forEach((opcion, i) => {
            const esActual = opcion.tagName === 'A'
            ? opcion.dataset.articuloClave === Pagina.estado.articuloClave
                : i === Pagina.estado.articulo;
            if (esActual) opcion.setAttribute('aria-current', 'true');
            else opcion.removeAttribute('aria-current');
        });
    }

    // Con la navegación activa solo se ve un artículo; desactivada, se ven todos
    function mostrarArticulos() {
        articulos().forEach((articulo, i) => {
            articulo.hidden = Pagina.estado.navegacion && i !== Pagina.estado.articulo;
        });
    }

    function irAArticulo(indice) {
        const total = articulos().length;
        if (total === 0) return;
        Pagina.estado.articulo = Math.min(Math.max(indice, 0), total - 1);
        marcarArticuloActual();
        mostrarArticulos();
    }

    // Única forma de mostrar u ocultar la tarjeta de navegación: Pagina.activarNavegacion(true | false)
    function activarNavegacion(activa) {
        Pagina.estado.navegacion = !!activa;
        const tarjeta = $('tarjeta_navegacion');
        if (tarjeta) tarjeta.hidden = !activa;

        const contenido = $('contenido');
        if (contenido) {
            contenido.classList.toggle('contenido_con_navegacion', !!activa);
            contenido.classList.toggle('contenido_solo', !activa);
        }

        mostrarArticulos();
    }

    /* =====================================================
       CSS y JS ESPECÍFICOS DE LA PÁGINA
       Se añaden al final, después de los generales.
       ===================================================== */

    function cargarEspecificos(config) {
        const css = resolverRuta(config[CAMPOS.css], CARPETA_CSS, '.css');
        if (css) {
            const enlace = document.createElement('link');
            enlace.rel = 'stylesheet';
            enlace.href = css;
            enlace.dataset.especifico = 'css';
            enlace.addEventListener('error', () => console.warn(`No se pudo cargar el CSS específico: ${css}`));
            document.head.append(enlace);
        }

        const js = resolverRuta(config[CAMPOS.js], CARPETA_JS, '.js');
        if (js) {
            const script = document.createElement('script');
            script.src = js;
            script.async = false;
            script.dataset.especifico = 'js';
            script.addEventListener('error', () => console.warn(`No se pudo cargar el JS específico: ${js}`));
            document.body.append(script);
        }
    }

    /* =====================================================
       INICIO
       ===================================================== */

    async function cargarPaginas() {
        const respuesta = await fetch(desdeJs(RUTA_PAGINAS));
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
            throw new Error('El formato de paginas.json no es válido (se esperaba un objeto).');
        }
        return datos;
    }

    async function iniciar() {
        const compacto = document.documentElement.dataset.encabezado === 'compacto' || debeIniciarCompacto();
        Pagina.encabezadoCompacto = compacto;
        if (compacto) document.documentElement.dataset.encabezado = 'compacto';
        // Encabezado grande: la página empieza arriba (el navegador no restaura el scroll al refrescar)
        else history.scrollRestoration = 'manual';

        // La navegación no depende de nada externo: se prepara primero (desactivada)
        Pagina.renderizarNavegacion();
        Pagina.activarNavegacion(false);

        // Plantilla (encabezado + pie + su JS) y paginas.json se piden a la vez
        const plantilla = importarPlantilla(compacto).catch((error) => error);   // devuelve el error, no lo lanza
        const paginas = cargarPaginas();

        try {
            Pagina.paginas = await paginas;
        } catch (error) {
            avisar(`No se pudo cargar ${RUTA_PAGINAS.replace('../', '')}. ${SUGERENCIA_SERVIDOR}`);
            console.error(error);
        }

        const falloPlantilla = await plantilla;
        if (falloPlantilla) {
            // Sin encabezado no hay por qué reservar la primera pantalla en blanco
            document.documentElement.dataset.encabezado = 'compacto';
            avisar(`No se pudo importar el encabezado y el pie. ${falloPlantilla.message} ${SUGERENCIA_SERVIDOR}`);
        }

        if (Object.keys(Pagina.paginas).length === 0) return;

        Pagina.clave = detectarPagina(Pagina.paginas);
        Pagina.config = Pagina.clave ? Pagina.paginas[Pagina.clave] : null;
        Pagina.renderizarSelector();

        if (!Pagina.config) {
            if (document.body.dataset.pagina !== '404') {
                console.warn('Esta página no aparece en paginas.json: solo se usan el CSS y JS generales.');
            }
            return;
        }

        const valorConfigurado = valorArticulos(Pagina.config);
        const esperados = cantidadArticulos(valorConfigurado);
        if (esperados !== articulos().length) {
            console.warn(`paginas.json indica ${esperados} artículo(s) para "${Pagina.clave}", pero la página tiene ${articulos().length}.`);
        }

        Pagina.renderizarNavegacion();
        Pagina.activarNavegacion(requiereNavegacion(valorConfigurado));

        cargarEspecificos(Pagina.config);   // lo específico se carga el último y gana a lo general
    }

    iniciar();
})();