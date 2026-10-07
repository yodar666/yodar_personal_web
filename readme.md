# Estructura del proyecto

```text
.
|-- .htaccess
|-- 404.html
|-- index.html
|-- readme.md
|-- css/
|   |-- 404.css
|   |-- general.css
|   `-- plantilals.css
|-- datos/
|   |-- footer.json
|   |-- formas.json
|   `-- paginas.json
|-- js/
|   |-- 404.js
|   |-- general.js
|   |-- plantilla.js
|   `-- render.js
|-- paginas/
|   |-- plantillas.html
|   `-- render_pruebas.html
`-- recursos/
```

## Descripcion de los archivos

- `.htaccess`: indica a Apache que use `404.html` para las rutas inexistentes.
- `404.html`: muestra el error, la URL solicitada y un enlace al inicio; importa la plantilla comun.
- `index.html`: pagina principal del sitio y estructura inicial de su contenido.
- `readme.md`: documentacion y mapa de archivos del proyecto.
- `css/404.css`: estilos exclusivos de la pagina de error y su fondo verde.
- `css/general.css`: estilos compartidos para la estructura y el contenido del sitio.
- `css/plantilals.css`: temas, encabezado y pie reutilizados por las paginas.
- `datos/footer.json`: citas, comentarios y traducciones que aparecen en el pie y sus controles.
- `datos/formas.json`: coordenadas y conexiones que definen las figuras 3D.
- `datos/paginas.json`: configuracion inicial de las secciones del sitio.
- `js/404.js`: dibuja la cascada de codigo y muestra la URL solicitada.
- `js/general.js`: importa la plantilla, configura las paginas y genera su navegacion.
- `js/plantilla.js`: comportamiento de las opciones, idioma y pie de pagina de la plantilla.
- `js/render.js`: logica del renderizador 3D, sus controles y animaciones.
- `paginas/plantillas.html`: plantilla HTML reutilizable para paginas del sitio.
- `paginas/render_pruebas.html`: pagina para probar y visualizar las figuras 3D.
- `recursos/hobbies_paguina.zip`: archivo comprimido de recursos relacionado con la pagina de hobbies.

## Agregar una pagina

Guarda el HTML en `paginas/` y agrega una entrada con su clave en `datos/paginas.json`.
El selector enlaza por defecto a `paginas/<clave>.html`; usa `a_possition` para indicar
otra ruta. La pagina debe declarar esa clave en `data-pagina`.

## Pagina 404

GitHub Pages detecta `404.html` en la raiz automaticamente. Apache utiliza `.htaccess`; en otros servidores, configura la pagina personalizada de error 404 para que apunte a `/404.html`.
