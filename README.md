# AIRSKY — Portal de venta de paquetes turísticos 🧳✈

Carrito de compras web para una agencia de turismo, desarrollado según la consigna de la
**Olimpíada Nacional de ETP — Programación (Instancia Institucional)** y la documentación
del relevamiento (entrevista con el Jefe de Ventas, alcance, propuesta de solución, DER y
casos de uso).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend (capa Cliente) | HTML5, CSS3, JavaScript (sin frameworks ni librerías externas) |
| Backend (capa Servidor) | Node.js + Express (API REST) |
| Base de datos | Archivos **JSON** (carpeta `data/`) |
| Pasarela de pago | Simulada (representa una herramienta de terceros como Mercado Pago) |
| Correos | Se registran en la tabla `email` y, opcionalmente, se envían de verdad por SMTP (ver abajo) |

> La aplicación **no requiere instalar ningún motor de base de datos**: guarda toda la
> información en archivos JSON, así que funciona en cualquier computadora que tenga Node.js.

## Cómo ejecutar la aplicación

### 1. Instalar dependencias (solo la primera vez)

```
cd C:\Users\Ignacio\Desktop\preolimpiada\appviajes\aplicacionviajes
npm install
```

### 2. Iniciar el servidor

```
npm start
```

### 3. Abrir la aplicación

En el navegador: **http://localhost:3000**

La primera vez, el servidor crea automáticamente la carpeta `data/` con los datos
iniciales (productos, categorías, usuarios de prueba). Los datos persisten entre
ejecuciones. Para empezar de cero, borrá la carpeta `data/` y reiniciá el servidor.

## Cómo usarla en otra computadora

```
git clone <tu-repo>
cd appviajes/aplicacionviajes
npm install
npm start
```

No hace falta configurar nada más: al arrancar se generan los datos iniciales.

## Credenciales de prueba

| Perfil | Usuario | Contraseña |
|---|---|---|
| **Jefe de Ventas** (panel de la empresa) | `jefeventas` | `Ventas2026!` |
| Personal de Ventas | `cventas` | `Ventas2026!` |
| Cliente de demostración | `juanperez` | `Cliente2026!` |

Se puede iniciar sesión indistintamente con el **nombre de usuario o con el correo
electrónico**, sin distinguir mayúsculas de minúsculas. Los clientes nuevos se registran
desde la pestaña **Registrarse** de la página de ingreso.

## Las páginas

| Página | Para qué es |
|---|---|
| `index.html` | Portada pública: presentación de la agencia y 6 paquetes destacados con foto. Se puede ver sin iniciar sesión y desde ahí se agrega al carrito. |
| `ingreso.html` | Inicio de sesión y registro de clientes nuevos (dos pestañas). |
| `catalogo.html` | Listado completo de productos con precio y disponibilidad. Requiere sesión de cliente. |
| `carrito.html` | Carrito, cambio de cantidades y ventana de pago. Requiere sesión de cliente. |
| `mispedidos.html` | Pedidos del cliente, con opción de modificar o cancelar los pendientes. |
| `admin.html` | Panel del Jefe de Ventas, con seis pestañas (productos, pedidos, estado de cuenta, historial, correos y configuración). |
| `ayuda.html` / `manual-jefe-ventas.html` | Ayudas en línea de cada perfil. |

El menú de arriba se arma solo según quién esté conectado: un visitante ve *Inicio,
Paquetes y Contacto*; un cliente ve además *Carrito y Mis pedidos*; un usuario interno ve
solo el *Panel de ventas* y el *Manual*.

## Funcionalidades

**Cliente** (CU-01 a CU-07.2):
- Registro con contraseña e inicio de sesión.
- Consulta del catálogo: código, descripción, tipo, precio unitario y lugares disponibles.
- Carrito de compras: agregar, modificar cantidades, quitar productos.
- Confirmar compra: cobro por pasarela de terceros (simulada), el pedido queda **pendiente de entrega**
  y se envían correos al cliente y al sector correspondiente (registrados en la tabla `email`).
- Mis pedidos: consultar, **modificar** y **cancelar** pedidos pendientes. Cada cliente solo ve los suyos.

**Jefe de Ventas** (CU-08 a CU-11):
- Carga, modificación y baja de productos (código, descripción, precio unitario, stock, categoría).
  La baja es **lógica**: el producto pasa a *Inactivo* y no se pierden los pedidos viejos que lo incluían.
- Pedidos pendientes con detalle y datos del cliente; **registrar entrega** y **anular pedido**
  (al anular se repone el stock y se le avisa al cliente por correo).
- Estado de cuenta: facturas ordenadas **por fecha** y resumen ordenado **por cliente**.
- Historial de pedidos entregados/anulados (tabla `historial_pedidos`).
- Correos enviados por el sistema (tabla `email`).
- Configuración de los emails de sector por categoría, sin tocar el código.

## Cómo se comunican el cliente y el servidor

Todo lo que empieza con `/api` lo atiende `src/rutas.js` y devuelve JSON; el resto son
archivos estáticos (HTML, CSS, imágenes) servidos desde `public/`.

Del lado del navegador, las páginas nunca usan `fetch` directamente: llaman a la función
`api(metodo, ruta, datos)` de `public/js/comun.js`, que está escrita una sola vez y se
encarga de:

1. mandar el token de la sesión en el encabezado `X-Auth-Token`;
2. convertir los datos a JSON;
3. si el servidor responde **401**, borrar la sesión y volver a `ingreso.html`;
4. si responde otro error, lanzar una excepción con el mensaje del servidor, que cada
   página muestra en su cartel rojo.

Las sesiones se guardan en memoria del servidor, así que al reiniciarlo hay que volver a
iniciar sesión. Las contraseñas nunca se guardan en texto plano: se almacenan como
`sal:hash` con `scrypt` (ver `src/auth.js`).

## Envío real de correos (opcional)

Por defecto, los correos de confirmación de compra se **registran en la tabla `email`**
(requisito de la consigna) pero no se envían a ninguna casilla real. Para que además
**lleguen de verdad** al correo del cliente y de los sectores, se puede activar el envío
por SMTP. Con Gmail:

1. Tu cuenta de Google debe tener la **verificación en dos pasos activada**
   (myaccount.google.com → Seguridad).
2. Creá una **Contraseña de aplicación**: myaccount.google.com → Seguridad →
   "Contraseñas de aplicaciones". Google te da una clave de 16 letras.
3. En la carpeta del proyecto, copiá `config.correo.ejemplo.json` como
   **`config.correo.json`** y completá:
   - `"activado": true`
   - `"usuario"`: tu correo de Gmail
   - `"contrasena"`: la contraseña de aplicación de 16 letras (NO tu contraseña normal)
   - `"remitente"`: por ejemplo `"AIRSKY <tucorreo@gmail.com>"`
4. Reiniciá el servidor (`Ctrl + C` y `npm start`).

Ahora, al confirmar una compra, el correo llega a la casilla del cliente. Para probarlo,
registrá un cliente con **tu propio correo** y hacé una compra: te va a llegar la
confirmación.

> **Importante:** `config.correo.json` está en el `.gitignore`, así que tu contraseña de
> aplicación **no se sube a Git**. Si el envío falla o no está configurado, la compra
> funciona igual y el correo queda registrado en la tabla `email`.

## Ayudas en línea

- Cliente: **http://localhost:3000/ayuda.html**
- Manual del Jefe de Ventas: **http://localhost:3000/manual-jefe-ventas.html**

## Estructura del proyecto

```
appviajes/aplicacionviajes/
├── server.js               Punto de entrada (Express)
├── config.json             Puerto del servidor
├── package.json
├── data/                   Datos JSON (se genera solo)
├── src/
│   ├── auth.js             Hash de contraseñas y control de sesiones
│   ├── seed.js             Datos iniciales
│   ├── util.js             Utilidades (fechas, redondeo)
│   ├── correo.js           Envío por SMTP (nodemailer)
│   ├── rutas.js            Endpoints de la API REST
│   ├── servicio-pedidos.js Lógica de pedidos, pagos, ventas, emails e historial
│   └── store/
│       ├── index.js        Crea el almacén de datos
│       ├── json-store.js   Lectura y escritura de los archivos JSON
│       └── tablas.js       Nombre del id de cada tabla
└── public/                 Frontend (capa Cliente)
    ├── index.html          Portada
    ├── ingreso.html        Inicio de sesión y registro
    ├── catalogo.html       Lista de productos
    ├── carrito.html        Carrito y pasarela de pago
    ├── mispedidos.html     Pedidos del cliente
    ├── admin.html          Panel del Jefe de Ventas
    ├── ayuda.html          Ayuda en línea (cliente)
    ├── manual-jefe-ventas.html
    ├── img/                Fotos de los destinos (portada y destacados)
    ├── css/estilos.css     Todos los estilos
    └── js/
        ├── comun.js        Sesión, carrito, menú y llamadas a la API
        └── (una por página) index.js, ingreso.js, catalogo.js, carrito.js,
                             mispedidos.js, admin.js
```

## Notas sobre la interfaz

- La portada usa las 6 fotos de `public/img/` como fondo, en un mosaico de 3 columnas por
  2 filas, con una sombra negra encima para que se lea el título. La sombra es negra y no
  azul a propósito: así las fotos conservan su color original.
- El CSS es uno solo para toda la aplicación y no tiene estilos escritos dentro del HTML.
  Las clases que se repiten son: `.tarjeta` (`.plana` para las que van en lista),
  `.boton` (`.secundario`, `.exito`, `.linea`, `.chico`), `.acciones` (`.separadas` para
  dejar el total a la izquierda y los botones a la derecha), `.chip` para los estados,
  `.mensaje` para los carteles y `.tabla-envoltura` para que las tablas se puedan
  desplazar en pantallas chicas.
- Todo se adapta a celulares con un único `@media (max-width: 680px)` al final del archivo.

## Modelo de datos (según el DER)

Cada "tabla" del DER se guarda como un archivo JSON en `data/`:
`cliente`, `usuario_interno`, `categoria` (con `email_sector`), `producto`,
`pedido`, `detalle_pedido`, `pago`, `venta`, `email`, `historial_pedidos`, `configuracion`.

Los id funcionan como el autonumérico de una base de datos: al insertar, se busca el id
más alto de esa tabla y se le suma uno.

Cuando un pedido es **entregado o anulado**, se registra su estado final en
`historial_pedidos`, tal como indica la nota del DER.
