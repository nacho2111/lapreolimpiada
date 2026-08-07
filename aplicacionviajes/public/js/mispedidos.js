'use strict';

exigirSesion('cliente');
dibujarBarra('mispedidos');

let pedidos = [];

let edicion = { id_pedido: null, items: [] };

async function cargarPedidos() {
  const lista = document.getElementById('listaPedidos');
  try {
    pedidos = await api('GET', '/api/pedidos');
    if (pedidos.length === 0) {
      lista.innerHTML = '<p class="centrado">Todavía no realizaste pedidos. <a href="catalogo.html">Ir al catálogo</a></p>';
      return;
    }
    lista.innerHTML = pedidos.map((p) => `
      <div class="tarjeta plana">
        <h2>Pedido N° ${p.id_pedido}
          <span class="chip ${p.estado.toLowerCase()}">${p.estado}</span></h2>
        <p class="texto-chico">Fecha: ${p.fecha_pedido}</p>
        <div class="tabla-envoltura mt">
          <table>
            <thead><tr><th>Código</th><th>Descripción</th><th class="derecha">Precio unit.</th>
                       <th class="derecha">Cantidad</th><th class="derecha">Subtotal</th></tr></thead>
            <tbody>
              ${p.detalles.map((d) => `
                <tr>
                  <td class="cod">${d.codigo_producto}</td>
                  <td>${d.descripcion}</td>
                  <td class="derecha">${moneda(d.precio_unitario)}</td>
                  <td class="derecha">${d.cantidad}</td>
                  <td class="derecha">${moneda(d.subtotal)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="acciones separadas">
          <span class="total-grande">Total: ${moneda(p.total)}</span>
          ${p.estado === 'Pendiente' ? `
            <span>
              <button class="boton linea" data-editar="${p.id_pedido}">Modificar</button>
              <button class="boton linea rojo" data-cancelar="${p.id_pedido}">Cancelar pedido</button>
            </span>` : ''}
        </div>
      </div>`).join('');

    lista.querySelectorAll('button[data-editar]').forEach((b) =>
      b.addEventListener('click', () => abrirEdicion(Number(b.dataset.editar))));
    lista.querySelectorAll('button[data-cancelar]').forEach((b) =>
      b.addEventListener('click', () => cancelarPedido(Number(b.dataset.cancelar))));
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

function abrirEdicion(idPedido) {
  const pedido = pedidos.find((p) => p.id_pedido === idPedido);
  if (!pedido) return;
  edicion = {
    id_pedido: idPedido,
    items: pedido.detalles.map((d) => ({
      id_producto: d.id_producto,
      codigo: d.codigo_producto,
      descripcion: d.descripcion,
      cantidad: d.cantidad
    }))
  };
  document.getElementById('tituloEditar').textContent = `Modificar pedido N° ${idPedido}`;
  dibujarEdicion();
  document.getElementById('modalEditar').classList.add('visible');
}

function dibujarEdicion() {
  const cuerpo = document.getElementById('cuerpoEditar');
  if (edicion.items.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="4" class="centrado">Sin productos. Si guardás así, cancelá el pedido en su lugar.</td></tr>';
    return;
  }
  cuerpo.innerHTML = edicion.items.map((i, indice) => `
    <tr>
      <td>${i.codigo}</td>
      <td>${i.descripcion}</td>
      <td><input type="number" class="cantidad" min="1" value="${i.cantidad}" data-indice="${indice}"></td>
      <td><button class="boton linea rojo" data-quitar="${indice}">Quitar</button></td>
    </tr>`).join('');

  cuerpo.querySelectorAll('input[data-indice]').forEach((campo) => {
    campo.addEventListener('change', () => {
      const cantidad = parseInt(campo.value, 10);
      if (Number.isInteger(cantidad) && cantidad > 0) {
        edicion.items[Number(campo.dataset.indice)].cantidad = cantidad;
      }
      dibujarEdicion();
    });
  });
  cuerpo.querySelectorAll('button[data-quitar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      edicion.items.splice(Number(boton.dataset.quitar), 1);
      dibujarEdicion();
    });
  });
}

document.getElementById('btnGuardarEdicion').addEventListener('click', async () => {
  if (edicion.items.length === 0) {
    return mostrarMensaje('mensaje', 'El pedido no puede quedar vacío: usá "Cancelar pedido".', 'error');
  }
  try {
    const respuesta = await api('PUT', `/api/pedidos/${edicion.id_pedido}`, {
      items: edicion.items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad }))
    });
    document.getElementById('modalEditar').classList.remove('visible');
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarPedidos();
  } catch (error) {
    document.getElementById('modalEditar').classList.remove('visible');
    mostrarMensaje('mensaje', error.message, 'error');
  }
});

document.getElementById('btnCerrarEdicion').addEventListener('click', () => {
  document.getElementById('modalEditar').classList.remove('visible');
});

async function cancelarPedido(idPedido) {
  if (!confirm(`¿Confirmás la cancelación del pedido N° ${idPedido}?`)) return;
  try {
    const respuesta = await api('DELETE', `/api/pedidos/${idPedido}`);
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    cargarPedidos();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
}

cargarPedidos();
