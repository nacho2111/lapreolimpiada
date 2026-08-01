'use strict';

// sesion guardada en el navegador
const Sesion = {
  obtener() {
    try { return JSON.parse(localStorage.getItem('sesion')); } catch { return null; }
  },
  guardar(datos) { localStorage.setItem('sesion', JSON.stringify(datos)); },
  limpiar() { localStorage.removeItem('sesion'); }
};

// llamada a la API mandando el token si hay sesion
async function api(metodo, ruta, cuerpo) {
  const sesion = Sesion.obtener();
  const opciones = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (sesion && sesion.token) opciones.headers['X-Auth-Token'] = sesion.token;
  if (cuerpo !== undefined) opciones.body = JSON.stringify(cuerpo);

  const respuesta = await fetch(ruta, opciones);
  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401) {
    Sesion.limpiar();
    if (!esPaginaPublica()) location.href = 'ingreso.html';
  }
  if (!respuesta.ok) throw new Error(datos.error || 'Error de comunicación con el servidor.');
  return datos;
}

// paginas que se pueden ver sin estar logueado
function esPaginaPublica() {
  const p = location.pathname;
  return p === '/' || p.endsWith('/') ||
    p.endsWith('index.html') || p.endsWith('ingreso.html');
}

// cartelito abajo a la derecha que se va solo
let avisoTimer = null;
function avisoFlotante(texto) {
  let el = document.getElementById('avisoFlotante');
  if (!el) {
    el = document.createElement('div');
    el.id = 'avisoFlotante';
    el.className = 'aviso';
    document.body.appendChild(el);
  }
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => el.classList.remove('visible'), 3500);
}

// guarda en el carrito el paquete de una tarjeta de la portada
function reservarDesdeTarjeta(boton) {
  Carrito.agregar({
    id_producto: Number(boton.dataset.id),
    codigo_producto: boton.dataset.codigo,
    descripcion: boton.dataset.desc,
    precio: Number(boton.dataset.precio)
  }, 1);
  actualizarContadorCarrito();

  const sesion = Sesion.obtener();
  avisoFlotante(sesion && sesion.tipo === 'cliente'
    ? 'Listo, lo agregamos a tu carrito.'
    : 'Agregado al carrito. Iniciá sesión para terminar la compra.');
}

// carrito guardado en el navegador hasta confirmar la compra
const Carrito = {
  obtener() {
    try { return JSON.parse(localStorage.getItem('carrito')) || []; } catch { return []; }
  },
  guardar(items) { localStorage.setItem('carrito', JSON.stringify(items)); },
  vaciar() { localStorage.removeItem('carrito'); },

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

  cantidadTotal() {
    return Carrito.obtener().reduce((s, i) => s + i.cantidad, 0);
  }
};

// formato de plata en pesos
function moneda(n) {
  return '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// muestra un cartelito en un div .mensaje
function mostrarMensaje(idElemento, texto, tipo) {
  const el = document.getElementById(idElemento);
  if (!el) return;
  el.textContent = texto;
  el.className = `mensaje ${tipo}`;
  if (tipo === 'exito' || tipo === 'info') {
    setTimeout(() => { el.className = 'mensaje'; }, 6000);
  }
}

// arma la barra de navegacion segun quien este logueado
function dibujarBarra(activa) {
  const sesion = Sesion.obtener();
  const barra = document.getElementById('barra');
  if (!barra) return;

  let enlaces = '';
  if (sesion && sesion.tipo === 'cliente') {
    enlaces = `
      <a href="index.html" class="${activa === 'inicio' ? 'activo' : ''}">Inicio</a>
      <a href="catalogo.html" class="${activa === 'catalogo' ? 'activo' : ''}">Paquetes</a>
      <a href="carrito.html" class="${activa === 'carrito' ? 'activo' : ''}">Carrito
        <span class="contador-carrito" id="contadorCarrito">0</span></a>
      <a href="mispedidos.html" class="${activa === 'mispedidos' ? 'activo' : ''}">Mis pedidos</a>
      <a href="ayuda.html" class="${activa === 'ayuda' ? 'activo' : ''}">Ayuda</a>
      <span class="derecha-nav">
        <span class="usuario">${sesion.nombre}</span>
        <a href="#" class="btn-nav" id="btnSalir">Cerrar sesión</a>
      </span>`;
  } else if (sesion && sesion.tipo === 'interno') {
    enlaces = `
      <a href="admin.html" class="${activa === 'admin' ? 'activo' : ''}">Panel de ventas</a>
      <a href="manual-jefe-ventas.html" class="${activa === 'manual' ? 'activo' : ''}">Manual de uso</a>
      <span class="derecha-nav">
        <span class="usuario">${sesion.nombre} (${sesion.rol})</span>
        <a href="#" class="btn-nav" id="btnSalir">Cerrar sesión</a>
      </span>`;
  } else {
    enlaces = `
      <a href="index.html" class="${activa === 'inicio' ? 'activo' : ''}">Inicio</a>
      <a href="catalogo.html" class="${activa === 'catalogo' ? 'activo' : ''}">Paquetes</a>
      <a href="index.html#contacto">Contacto</a>
      <span class="derecha-nav">
        <a href="ingreso.html" class="btn-nav">Ingresar</a>
        <a href="ingreso.html#registro" class="btn-nav lleno">Registrarse</a>
      </span>`;
  }

  const destinoLogo = sesion && sesion.tipo === 'interno' ? 'admin.html' : 'index.html';

  barra.innerHTML = `
    <a class="logo" href="${destinoLogo}">
      <svg viewBox="0 0 24 24" fill="#6fb1e6" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.4 19.6 21 12 2.4 4.4v5.9L15.2 12 2.4 13.7z"/></svg>
      <span class="marca">AIR<b>SKY</b></span></a>
    ${enlaces}`;

  actualizarContadorCarrito();

  const btnSalir = document.getElementById('btnSalir');
  if (btnSalir) {
    btnSalir.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await api('POST', '/api/auth/logout'); } catch {}
      Sesion.limpiar();
      Carrito.vaciar();
      location.href = 'index.html';
    });
  }
}

function actualizarContadorCarrito() {
  const contador = document.getElementById('contadorCarrito');
  if (contador) contador.textContent = Carrito.cantidadTotal();
}

// echa al inicio si no hay sesion del tipo pedido
function exigirSesion(tipo) {
  const sesion = Sesion.obtener();
  if (!sesion || sesion.tipo !== tipo) {
    location.href = 'ingreso.html';
    return null;
  }
  return sesion;
}
