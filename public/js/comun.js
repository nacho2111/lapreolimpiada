/**
 * comun.js
 * Funciones compartidas por todas las páginas del frontend:
 *  - Comunicación con la API REST (con el token de sesión).
 *  - Manejo de la sesión en localStorage.
 *  - Carrito de compras del lado del cliente (localStorage).
 *  - Barra de navegación y utilidades de formato.
 */

'use strict';

const Sesion = {
  /** Devuelve los datos de sesión guardados o null. */
  obtener() {
    try { return JSON.parse(localStorage.getItem('sesion')); } catch { return null; }
  },
  /** Guarda los datos de sesión (token incluido). */
  guardar(datos) { localStorage.setItem('sesion', JSON.stringify(datos)); },
  /** Elimina la sesión local. */
  limpiar() { localStorage.removeItem('sesion'); }
};

/**
 * Realiza una llamada a la API REST enviando el token de sesión.
 * @param {string} metodo - GET | POST | PUT | DELETE.
 * @param {string} ruta - Ruta de la API (ej: '/api/productos').
 * @param {object} [cuerpo] - Cuerpo JSON opcional.
 * @returns {Promise<object>} Respuesta JSON.
 * @throws {Error} Con el mensaje de error devuelto por el servidor.
 */
async function api(metodo, ruta, cuerpo) {
  const sesion = Sesion.obtener();
  const opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' }
  };
  if (sesion && sesion.token) opciones.headers['X-Auth-Token'] = sesion.token;
  if (cuerpo !== undefined) opciones.body = JSON.stringify(cuerpo);

  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401) {
    Sesion.limpiar();
    if (!location.pathname.endsWith('index.html') && location.pathname !== '/') {
      location.href = 'index.html';
    }
  }
  if (!respuesta.ok) throw new Error(datos.error || 'Error de comunicación con el servidor.');
  return datos;
}

/** Carrito de compras (se guarda en el navegador hasta confirmar la compra). */
const Carrito = {
  obtener() {
    try { return JSON.parse(localStorage.getItem('carrito')) || []; } catch { return []; }
  },
  guardar(items) { localStorage.setItem('carrito', JSON.stringify(items)); },
  vaciar() { localStorage.removeItem('carrito'); },

  /**
   * Agrega un producto (o suma cantidad si ya estaba).
   * @param {object} producto - {id_producto, codigo_producto, descripcion, precio}
   * @param {number} cantidad - Unidades a agregar.
   */
  agregar(producto, cantidad) {
    const items = Carrito.obtener();
    const existente = items.find((i) => i.id_producto === producto.id_producto);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        id_producto: producto.id_producto,
        codigo_producto: producto.codigo_producto,
        descripcion: producto.descripcion,
        precio: producto.precio,
        cantidad
      });
    }
    Carrito.guardar(items);
  },

  /** Cantidad total de unidades en el carrito. */
  cantidadTotal() {
    return Carrito.obtener().reduce((s, i) => s + i.cantidad, 0);
  }
};

/**
 * Da formato de moneda argentina a un importe.
 * @param {number} n - Importe.
 * @returns {string} Ej: "$ 850.000,00"
 */
function moneda(n) {
  return '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Muestra un mensaje en un elemento .mensaje.
 * @param {string} idElemento - id del elemento contenedor.
 * @param {string} texto - Texto a mostrar.
 * @param {'error'|'exito'|'info'} tipo - Estilo del mensaje.
 */
function mostrarMensaje(idElemento, texto, tipo) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  if (tipo === 'exito' || tipo === 'info') {
    setTimeout(() => { el.className = 'mensaje'; }, 6000);
  }
}

/**
 * Dibuja la barra de navegación según el tipo de usuario logueado.
 * @param {string} activa - Nombre de la página activa (para resaltarla).
 */
function dibujarBarra(activa) {
  const sesion = Sesion.obtener();
  const barra = document.getElementById('barra');
  if (!barra) return;

  let enlaces = '';
  if (sesion && sesion.tipo === 'cliente') {
    enlaces = `
      <a href="catalogo.html" class="${activa === 'catalogo' ? 'activo' : ''}">Productos</a>
      <a href="carrito.html" class="${activa === 'carrito' ? 'activo' : ''}">Carrito
        <span class="contador-carrito" id="contadorCarrito">0</span></a>
      <a href="mispedidos.html" class="${activa === 'mispedidos' ? 'activo' : ''}">Mis pedidos</a>
      <a href="ayuda.html" class="${activa === 'ayuda' ? 'activo' : ''}">Ayuda</a>
      <span class="usuario">👤 ${sesion.nombre}</span>
      <a href="#" id="btnSalir">Cerrar sesión</a>`;
  } else if (sesion && sesion.tipo === 'interno') {
    enlaces = `
      <a href="admin.html" class="${activa === 'admin' ? 'activo' : ''}">Panel de ventas</a>
      <a href="manual-jefe-ventas.html" class="${activa === 'manual' ? 'activo' : ''}">Manual de uso</a>
      <span class="usuario">👤 ${sesion.nombre} (${sesion.rol})</span>
      <a href="#" id="btnSalir">Cerrar sesión</a>`;
  } else {
    enlaces = `<a href="index.html" class="${activa === 'inicio' ? 'activo' : ''}">Ingresar</a>
               <a href="ayuda.html" class="${activa === 'ayuda' ? 'activo' : ''}">Ayuda</a>`;
  }

  barra.innerHTML = `
    <a class="logo" href="${sesion && sesion.tipo === 'interno' ? 'admin.html' : 'catalogo.html'}">
      <svg viewBox="0 0 24 24" fill="#7fbdec" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.4 19.6 21 12 2.4 4.4v5.9L15.2 12 2.4 13.7z"/></svg>
      <span class="marca">AIR<b>SKY</b></span></a>
    ${enlaces}`;

  actualizarContadorCarrito();

  const btnSalir = document.getElementById('btnSalir');
  if (btnSalir) {
    btnSalir.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/auth/logout'); } catch { /* la sesión local se limpia igual */ }
      Sesion.limpiar();
      Carrito.vaciar();
      location.href = 'index.html';
    });
  }
}

/** Actualiza el numerito del carrito en la barra. */
function actualizarContadorCarrito() {
  const contador = document.getElementById('contadorCarrito');
  if (contador) contador.textContent = Carrito.cantidadTotal();
}

/**
 * Exige que haya una sesión del tipo indicado; si no, redirige al inicio.
 * @param {'cliente'|'interno'} tipo - Tipo de usuario requerido.
 * @returns {object|null} La sesión válida o null (ya redirigido).
 */
function exigirSesion(tipo) {
  const sesion = Sesion.obtener();
  if (!sesion || sesion.tipo !== tipo) {
    location.href = 'index.html';
    return null;
  }
  return sesion;
}
