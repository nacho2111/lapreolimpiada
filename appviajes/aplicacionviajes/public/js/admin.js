/**
 * admin.js
 * Panel del Jefe de Ventas / Personal de Ventas:
 *  CU-08: Administrar Productos (alta, modificación, baja).
 *  CU-09: Consultar Pedidos Pendientes (y por estado).
 *  CU-10: Registrar Entrega de pedidos.
 *  1.4.6: Anular pedidos.
 *  CU-11: Consultar Estado de Cuenta (por fecha y por cliente).
 *  Además: historial de pedidos cerrados, tabla EMAIL y
 *  configuración de los correos de sector por categoría.
 */

'use strict';

exigirSesion('interno');
dibujarBarra('admin');

/** Datos en memoria del panel. */
let productosAdmin = [];
let categorias = [];
let emails = [];
/** Producto en edición (null = alta). */
let productoEnEdicion = null;

// ────────────────────────── Pestañas principales ──────────────────────────

document.querySelectorAll('.pestana[data-panel]').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.pestana[data-panel]').forEach((b) => b.classList.remove('activa'));
    document.querySelectorAll('.panel-pestana').forEach((p) => p.classList.remove('visible'));
    boton.classList.add('activa');
    document.getElementById(boton.dataset.panel).classList.add('visible');
    // Refrescar los datos de la pestaña elegida.
    if (boton.dataset.panel === 'panelProductos') cargarProductos();
    if (boton.dataset.panel === 'panelPedidos') cargarPedidos();
    if (boton.dataset.panel === 'panelCuenta') cargarEstadoCuenta();
    if (boton.dataset.panel === 'panelHistorial') cargarHistorial();
    if (boton.dataset.panel === 'panelEmails') cargarEmails();
    if (boton.dataset.panel === 'panelConfig') cargarCategorias();
  });
});

// Sub-pestañas del estado de cuenta.
document.querySelectorAll('.pestana[data-vista]').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.pestana[data-vista]').forEach((b) => b.classList.remove('activa'));
    boton.classList.add('activa');
    document.getElementById('vistaFecha').classList.toggle('oculto', boton.dataset.vista !== 'vistaFecha');
    document.getElementById('vistaCliente').classList.toggle('oculto', boton.dataset.vista !== 'vistaCliente');
  });
});

// ────────────────────────── CU-08: Productos ──────────────────────────

/** Carga el catálogo completo (incluye inactivos). */
async function cargarProductos() {
  try {
    productosAdmin = await api('GET', '/api/admin/productos');
    const cuerpo = document.getElementById('cuerpoProductosAdmin');
    if (productosAdmin.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="7" class="centrado">No hay productos cargados.</td></tr>';
      return;
    }
    cuerpo.innerHTML = productosAdmin.map((p) => `
      <tr>
        <td><strong>${p.codigo_producto}</strong></td>
        <td>${p.descripcion}</td>
        <td>${p.tipo_producto}</td>
        <td class="derecha">${moneda(p.precio)}</td>
        <td class="derecha">${p.stock}</td>
        <td><span class="chip ${p.estado.toLowerCase()}">${p.estado}</span></td>
        <td>
          <button class="boton chico" data-editar="${p.id_producto}">Modificar</button>
          ${p.estado === 'Activo'
            ? `<button class="boton chico peligro" data-baja="${p.id_producto}">Dar de baja</button>`
            : `<button class="boton chico exito" data-alta="${p.id_producto}">Reactivar</button>`}
        </td>
      </tr>`).join('');

    cuerpo.querySelectorAll('button[data-editar]').forEach((b) =>
      b.addEventListener('click', () => abrirModalProducto(Number(b.dataset.editar))));
    cuerpo.querySelectorAll('button[data-baja]').forEach((b) =>
      b.addEventListener('click', () => bajaProducto(Number(b.dataset.baja))));
    cuerpo.querySelectorAll('button[data-alta]').forEach((b) =>
      b.addEventListener('click', () => reactivarProducto(Number(b.dataset.alta))));
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

/**
 * Abre el modal de producto para alta (sin id) o edición.
 * @param {number} [idProducto] - Producto a editar.
 */
async function abrirModalProducto(idProducto) {
  if (categorias.length === 0) {
    categorias = await api('GET', '/api/categorias');
  }
  document.getElementById('prodCategoria').innerHTML = categorias
    .map((c) => `<option value="${c.id_categoria}">${c.nombre_categoria}</option>`)
    .join('');

  productoEnEdicion = idProducto ? productosAdmin.find((p) => p.id_producto === idProducto) : null;
  document.getElementById('tituloModalProducto').textContent =
    productoEnEdicion ? `Modificar producto ${productoEnEdicion.codigo_producto}` : 'Cargar producto nuevo';

  document.getElementById('prodCodigo').value = productoEnEdicion ? productoEnEdicion.codigo_producto : '';
  document.getElementById('prodCodigo').disabled = Boolean(productoEnEdicion);
  document.getElementById('prodDescripcion').value = productoEnEdicion ? productoEnEdicion.descripcion : '';
  document.getElementById('prodTipo').value = productoEnEdicion ? productoEnEdicion.tipo_producto : 'Paquete';
  document.getElementById('prodPrecio').value = productoEnEdicion ? productoEnEdicion.precio : '';
  document.getElementById('prodStock').value = productoEnEdicion ? productoEnEdicion.stock : 0;
  document.getElementById('prodCategoria').value = productoEnEdicion ? productoEnEdicion.id_categoria : categorias[0].id_categoria;
  document.getElementById('prodEstado').value = productoEnEdicion ? productoEnEdicion.estado : 'Activo';

  document.getElementById('modalProducto').classList.add('visible');
}

document.getElementById('btnNuevoProducto').addEventListener('click', () => abrirModalProducto());
document.getElementById('btnCerrarProducto').addEventListener('click', () =>
  document.getElementById('modalProducto').classList.remove('visible'));

document.getElementById('formProducto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = {
    codigo_producto: document.getElementById('prodCodigo').value,
    descripcion: document.getElementById('prodDescripcion').value,
    tipo_producto: document.getElementById('prodTipo').value,
    precio: document.getElementById('prodPrecio').value,
    stock: document.getElementById('prodStock').value,
    id_categoria: document.getElementById('prodCategoria').value,
    estado: document.getElementById('prodEstado').value
  };
  try {
    const respuesta = productoEnEdicion
      ? await api('PUT', `/api/admin/productos/${productoEnEdicion.id_producto}`, datos)
      : await api('POST', '/api/admin/productos', datos);
    document.getElementById('modalProducto').classList.remove('visible');
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarProductos();
  } catch (error) {
    document.getElementById('modalProducto').classList.remove('visible');
    mostrarMensaje('mensaje', error.message, 'error');
  }
});

/** Baja lógica de un producto (pasa a Inactivo). */
async function bajaProducto(idProducto) {
  const producto = productosAdmin.find((p) => p.id_producto === idProducto);
  if (!confirm(`¿Dar de baja el producto ${producto.codigo_producto}? Dejará de verse en el catálogo.`)) return;
  try {
    const respuesta = await api('DELETE', `/api/admin/productos/${idProducto}`);
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarProductos();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

/** Reactiva un producto dado de baja. */
async function reactivarProducto(idProducto) {
  try {
    const respuesta = await api('PUT', `/api/admin/productos/${idProducto}`, { estado: 'Activo' });
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarProductos();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

// ────────────────── CU-09 / CU-10: Pedidos, entrega y anulación ──────────────────

/** Carga los pedidos según el filtro de estado. */
async function cargarPedidos() {
  const contenedor = document.getElementById('listaPedidosAdmin');
  const estado = document.getElementById('filtroEstadoPedidos').value;
  try {
    const pedidos = await api('GET', `/api/admin/pedidos?estado=${estado}`);
    if (pedidos.length === 0) {
      contenedor.innerHTML = `<p class="centrado">No hay pedidos ${estado === 'Todos' ? '' : 'en estado ' + estado}.</p>`;
      return;
    }
    contenedor.innerHTML = pedidos.map((p) => `
      <div class="tarjeta" style="box-shadow:none; border:1px solid var(--gris-borde);">
        <h2>Pedido N° ${p.id_pedido}
          <span class="chip ${p.estado.toLowerCase()}">${p.estado}</span></h2>
        <p class="texto-chico">Fecha: ${p.fecha_pedido} · Cliente: <strong>${p.cliente}</strong>
           (DNI ${p.dni}) · ${p.email_cliente}</p>
        <div class="tabla-envoltura mt">
          <table>
            <thead><tr><th>Código</th><th>Descripción</th><th class="derecha">Precio unit.</th>
                       <th class="derecha">Cant.</th><th class="derecha">Subtotal</th></tr></thead>
            <tbody>
              ${p.detalles.map((d) => `
                <tr><td>${d.codigo_producto}</td><td>${d.descripcion}</td>
                    <td class="derecha">${moneda(d.precio_unitario)}</td>
                    <td class="derecha">${d.cantidad}</td>
                    <td class="derecha">${moneda(d.subtotal)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="acciones" style="justify-content: space-between; align-items:center;">
          <span class="total-grande">Total: ${moneda(p.total)}</span>
          ${p.estado === 'Pendiente' ? `
            <span>
              <button class="boton chico exito" data-entregar="${p.id_pedido}">Registrar entrega</button>
              <button class="boton chico peligro" data-anular="${p.id_pedido}">Anular pedido</button>
            </span>` : ''}
        </div>
      </div>`).join('');

    contenedor.querySelectorAll('button[data-entregar]').forEach((b) =>
      b.addEventListener('click', () => entregarPedido(Number(b.dataset.entregar))));
    contenedor.querySelectorAll('button[data-anular]').forEach((b) =>
      b.addEventListener('click', () => anularPedido(Number(b.dataset.anular))));
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

document.getElementById('filtroEstadoPedidos').addEventListener('change', cargarPedidos);

/** CU-10: Registrar la entrega de un pedido pendiente. */
async function entregarPedido(idPedido) {
  if (!confirm(`¿Registrar la entrega del pedido N° ${idPedido}? Pasará al historial.`)) return;
  try {
    const respuesta = await api('POST', `/api/admin/pedidos/${idPedido}/entregar`);
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarPedidos();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

/** 1.4.6: Anular un pedido pendiente. */
async function anularPedido(idPedido) {
  if (!confirm(`¿ANULAR el pedido N° ${idPedido}? Se repondrá el stock y se avisará al cliente.`)) return;
  try {
    const respuesta = await api('POST', `/api/admin/pedidos/${idPedido}/anular`);
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarPedidos();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

// ────────────────────────── CU-11: Estado de cuenta ──────────────────────────

/** Carga las dos vistas del estado de cuenta (por fecha y por cliente). */
async function cargarEstadoCuenta() {
  try {
    const cuenta = await api('GET', '/api/admin/estado-cuenta');

    const cuerpoFecha = document.getElementById('cuerpoCuentaFecha');
    cuerpoFecha.innerHTML = cuenta.porFecha.length === 0
      ? '<tr><td colspan="8" class="centrado">Sin ventas registradas.</td></tr>'
      : cuenta.porFecha.map((f) => `
          <tr>
            <td>${f.fecha}</td>
            <td>V-${String(f.id_venta).padStart(5, '0')}</td>
            <td>${f.id_pedido}</td>
            <td>${f.cliente}</td>
            <td class="derecha">${moneda(f.total)}</td>
            <td>${f.medio_pago}</td>
            <td><span class="chip ${f.estado_pago.toLowerCase()}">${f.estado_pago}</span></td>
            <td><span class="chip ${f.estado_pedido.toLowerCase()}">${f.estado_pedido}</span></td>
          </tr>`).join('');

    const contenedorCliente = document.getElementById('cuerpoCuentaCliente');
    contenedorCliente.innerHTML = cuenta.porCliente.length === 0
      ? '<p class="centrado">Sin ventas registradas.</p>'
      : cuenta.porCliente.map((g) => `
          <div class="tarjeta" style="box-shadow:none; border:1px solid var(--gris-borde);">
            <h2>${g.cliente}</h2>
            <p class="texto-chico">${g.cantidad_facturas} factura(s) ·
               Total facturado: <strong>${moneda(g.total_facturado)}</strong></p>
            <div class="tabla-envoltura mt">
              <table>
                <thead><tr><th>Fecha</th><th>Venta N°</th><th>Pedido N°</th>
                           <th class="derecha">Total</th><th>Medio</th><th>Estado pedido</th></tr></thead>
                <tbody>
                  ${g.facturas.map((f) => `
                    <tr><td>${f.fecha}</td><td>V-${String(f.id_venta).padStart(5, '0')}</td>
                        <td>${f.id_pedido}</td><td class="derecha">${moneda(f.total)}</td>
                        <td>${f.medio_pago}</td>
                        <td><span class="chip ${f.estado_pedido.toLowerCase()}">${f.estado_pedido}</span></td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>`).join('');
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

// ────────────────────────── Historial ──────────────────────────

/** Carga la tabla histórica de pedidos entregados/anulados. */
async function cargarHistorial() {
  try {
    const historial = await api('GET', '/api/admin/historial');
    const cuerpo = document.getElementById('cuerpoHistorial');
    cuerpo.innerHTML = historial.length === 0
      ? '<tr><td colspan="7" class="centrado">El historial está vacío.</td></tr>'
      : historial.map((h) => `
          <tr>
            <td>${h.id_historial}</td>
            <td>${h.id_pedido}</td>
            <td>${h.cliente}</td>
            <td>${h.fecha_pedido}</td>
            <td>${h.fecha_entrega}</td>
            <td><span class="chip ${h.estado_final.toLowerCase()}">${h.estado_final}</span></td>
            <td class="derecha">${moneda(h.total)}</td>
          </tr>`).join('');
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

// ────────────────────────── Tabla EMAIL ──────────────────────────

/** Carga los correos registrados por la aplicación. */
async function cargarEmails() {
  try {
    emails = await api('GET', '/api/admin/emails');
    const cuerpo = document.getElementById('cuerpoEmails');
    cuerpo.innerHTML = emails.length === 0
      ? '<tr><td colspan="6" class="centrado">No hay correos registrados todavía.</td></tr>'
      : emails.map((m) => `
          <tr>
            <td>${m.id_email}</td>
            <td>${m.fecha_envio}</td>
            <td>${m.destinatario}</td>
            <td>${m.tipo}</td>
            <td>${m.asunto}</td>
            <td><button class="boton chico secundario" data-ver="${m.id_email}">Ver</button></td>
          </tr>`).join('');

    cuerpo.querySelectorAll('button[data-ver]').forEach((b) =>
      b.addEventListener('click', () => {
        const correo = emails.find((m) => m.id_email === Number(b.dataset.ver));
        document.getElementById('asuntoEmail').textContent = correo.asunto;
        document.getElementById('datosEmail').textContent =
          `Para: ${correo.destinatario} · Enviado: ${correo.fecha_envio} · Tipo: ${correo.tipo}`;
        document.getElementById('mensajeEmail').textContent = correo.mensaje;
        document.getElementById('modalEmail').classList.add('visible');
      }));
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

document.getElementById('btnCerrarEmail').addEventListener('click', () =>
  document.getElementById('modalEmail').classList.remove('visible'));

// ────────────────────────── Configuración de sectores ──────────────────────────

/** Carga las categorías con el email de su sector. */
async function cargarCategorias() {
  try {
    const lista = await api('GET', '/api/admin/categorias');
    const cuerpo = document.getElementById('cuerpoCategorias');
    cuerpo.innerHTML = lista.map((c) => `
      <tr>
        <td>${c.nombre_categoria}</td>
        <td>${c.tipo_categoria}</td>
        <td><input type="email" value="${c.email_sector}" id="sector-${c.id_categoria}"></td>
        <td><button class="boton chico" data-guardar="${c.id_categoria}">Guardar</button></td>
      </tr>`).join('');

    cuerpo.querySelectorAll('button[data-guardar]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          const respuesta = await api('PUT', `/api/admin/categorias/${b.dataset.guardar}`, {
            email_sector: document.getElementById(`sector-${b.dataset.guardar}`).value
          });
          mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
        } catch (error) {
          mostrarMensaje('mensaje', error.message, 'error');
        }
      }));
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

// Carga inicial.
cargarProductos();
