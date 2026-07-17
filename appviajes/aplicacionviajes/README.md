# AIRSKY — Portal de venta de paquetes turísticos 🧳✈

Carrito de compras web para una agencia de turismo, desarrollado según la consigna de la
**Olimpíada Nacional de ETP — Programación (Instancia Institucional)** y la documentación
del relevamiento (entrevista con el Jefe de Ventas, alcance, propuesta de solución, DER y
casos de uso).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend (capa Cliente) | HTML5, CSS3, JavaScript |
| Backend (capa Servidor) | Node.js + Express (API REST) |
| Base de datos | Archivos **JSON** (carpeta `data/`) |
| Pasarela de pago | Simulada (representa una herramienta de terceros como Mercado Pago) |
| Correos | Se registran en la tabla `email` y, opcionalmente, se envían de verdad por SMTP (ver abajo) |

> La aplicación **no requiere instalar ningún motor de base de datos**: guarda toda la
> información en archivos JSON, así que funciona en cualquier computadora que tenga Node.js.

## Cómo ejecutar la aplicación

### 1. Instalar dependencias (solo la primera vez)

```
cd C:\Users\Ignacio\Desktop\preolimpiada\aplicacionviajes
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
cd aplicacionviajes
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

Los clientes nuevos se registran desde la pestaña **Registrarse** de la página de inicio.

## Funcionalidades

**Cliente** (CU-01 a CU-07.2):
- Registro con contraseña e inicio de sesión.
- Consulta del catálogo (lista sin imágenes: código, descripción, precio unitario), con búsqueda y filtro.
- Carrito de compras: agregar, modificar cantidades, quitar productos.
- Confirmar compra: cobro por pasarela de terceros (simulada), el pedido queda **pendiente de entrega**
  y se envían correos al cliente y al sector correspondiente (registrados en la tabla `email`).
- Mis pedidos: consultar, **modificar** y **cancelar** pedidos pendientes. Cada cliente solo ve los suyos.

**Jefe de Ventas** (CU-08 a CU-11):
- Carga, modificación y baja de productos (código, descripción, precio unitario, stock, categoría).
- Pedidos pendientes con detalle y datos del cliente; **registrar entrega** y **anular pedido**.
- Estado de cuenta: facturas ordenadas **por fecha** y resumen ordenado **por cliente**.
- Historial de pedidos entregados/anulados (tabla `historial_pedidos`).
- Correos enviados por el sistema (tabla `email`).
- Configuración de los emails de sector por categoría, sin tocar el código.

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
aplicacionviajes/
├── server.js              Punto de entrada (Express)
├── config.json            Puerto del servidor
├── package.json
├── data/                  Datos JSON (se genera solo)
├── src/
│   ├── auth.js            Hash de contraseñas y sesiones
│   ├── seed.js            Datos iniciales
│   ├── util.js            Utilidades (fechas, redondeo)
│   ├── rutas.js           Endpoints de la API REST
│   ├── servicio-pedidos.js Lógica de pedidos, pagos, ventas, emails e historial
│   └── store/             Capa de datos (json-store)
└── public/                Frontend (capa Cliente)
    ├── index.html         Login y registro
    ├── catalogo.html      Lista de productos
    ├── carrito.html       Carrito y pasarela de pago
    ├── mispedidos.html    Pedidos del cliente
    ├── admin.html         Panel del Jefe de Ventas
    ├── ayuda.html         Ayuda en línea (cliente)
    ├── manual-jefe-ventas.html
    ├── css/estilos.css
    └── js/                Lógica de cada página
```

## Modelo de datos (según el DER)

Cada "tabla" del DER se guarda como un archivo JSON en `data/`:
`cliente`, `usuario_interno`, `categoria` (con `email_sector`), `producto`,
`pedido`, `detalle_pedido`, `pago`, `venta`, `email`, `historial_pedidos`, `configuracion`.

Cuando un pedido es **entregado o anulado**, se registra su estado final en
`historial_pedidos`, tal como indica la nota del DER.
