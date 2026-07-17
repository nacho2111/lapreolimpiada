/**
 * catalogo.js
 * CU-03: Consultar Productos (lista sin imágenes, con filtro y búsqueda).
 * CU-04: Agregar Producto al Carrito.
 */

'use strict';

exigirSesion('cliente');
dibujarBarra('catalogo');

/** Lista completa de productos traída del servidor. */
let productos = [];

/** Carga el catálogo desde la API. */
async function cargarProductos() {
  try {
    productos = await api('GET', '/api/productos');
    dibujarTabla();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

/** Dibuja la tabla aplicando los filtros de búsqueda y tipo. */
function dibujarTabla() {
  const texto = document.getElementById('filtroTexto').value.trim().toLowerCase();
  const tipo = document.getElementById('filtroTipo').value;
  const cuerpo = document.getElementById('cuerpoProductos');

  const visibles = productos.filter((p) => {
    const coincideTexto = !texto ||
      p.codigo_producto.toLowerCase().includes(texto) ||
      p.descripcion.toLowerCase().includes(texto);
    const coincideTipo = !tipo || p.tipo_producto === tipo;
    return coincideTexto && coincideTipo;
  });

  if (visibles.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="7" class="centrado">No se encontraron productos.</td></tr>';
    return;
  }

  cuerpo.innerHTML = visibles.map((p) => `
    <tr>
      <td><strong>${p.codigo_producto}</strong></td>
      <td>${p.descripcion}</td>
      <td>${p.tipo_producto}</td>
      <td class="derecha">${moneda(p.precio)}</td>
      <td class="derecha">${p.stock}</td>
      <td><input type="number" min="1" max="${p.stock}" value="1" style="width:80px"
                 id="cant-${p.id_producto}" ${p.stock === 0 ? 'disabled' : ''}></td>
      <td><button class="boton chico" data-id="${p.id_producto}" ${p.stock === 0 ? 'disabled' : ''}>
            Agregar al carrito</button></td>
    </tr>`).join('');

  // CU-04: Agregar Producto al Carrito.
  cuerpo.querySelectorAll('button[data-id]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const producto = productos.find((p) => p.id_producto === Number(boton.dataset.id));
      const cantidad = parseInt(document.getElementById(`cant-${producto.id_producto}`).value, 10);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return mostrarMensaje('mensaje', 'Ingrese una cantidad válida.', 'error');
      }
      if (cantidad > producto.stock) {
        return mostrarMensaje('mensaje', `Stock disponible: ${producto.stock}.`, 'error');
      }
      Carrito.agregar(producto, cantidad);
      actualizarContadorCarrito();
      mostrarMensaje('mensaje', `Se agregó "${producto.descripcion}" (x${cantidad}) al carrito.`, 'exito');
    });
  });
}

document.getElementById('filtroTexto').addEventListener('input', dibujarTabla);
document.getElementById('filtroTipo').addEventListener('change', dibujarTabla);

cargarProductos();
