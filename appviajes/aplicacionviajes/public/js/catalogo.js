'use strict';

exigirSesion('cliente');
dibujarBarra('catalogo');

let productos = [];

async function cargarProductos() {
  try {
    productos = await api('GET', '/api/productos');
    dibujarLista();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

function dibujarLista() {
  const lista = document.getElementById('lista');

  if (productos.length === 0) {
    lista.innerHTML = '<p class="vacio">Por ahora no hay paquetes disponibles.</p>';
    return;
  }

  lista.innerHTML = productos.map((p) => `
    <div class="item-paquete ${p.stock === 0 ? 'sin-stock' : ''}">
      <div>
        <div class="nombre">${p.descripcion}</div>
        <div class="datos">
          <span class="tipo-tag">${p.tipo_producto}</span>
          <span class="cod">${p.codigo_producto}</span>
          <span>${p.stock > 0 ? p.stock + ' lugares disponibles' : 'Sin disponibilidad'}</span>
        </div>
      </div>
      <div class="valor">${moneda(p.precio)}<small>por persona</small></div>
      <div class="compra">
        <input type="number" min="1" max="${p.stock}" value="1"
               id="cant-${p.id_producto}" ${p.stock === 0 ? 'disabled' : ''}>
        <button class="boton chico" data-id="${p.id_producto}" ${p.stock === 0 ? 'disabled' : ''}>
          Agregar</button>
      </div>
    </div>`).join('');

  lista.querySelectorAll('button[data-id]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const producto = productos.find((p) => p.id_producto === Number(boton.dataset.id));
      const cantidad = parseInt(document.getElementById(`cant-${producto.id_producto}`).value, 10);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return mostrarMensaje('mensaje', 'Ingrese una cantidad válida.', 'error');
      }
      if (cantidad > producto.stock) {
        return mostrarMensaje('mensaje', `Solo quedan ${producto.stock} lugares.`, 'error');
      }
      Carrito.agregar(producto, cantidad);
      actualizarContadorCarrito();
      avisoFlotante('Listo, lo agregamos a tu carrito.');
    });
  });
}

cargarProductos();
