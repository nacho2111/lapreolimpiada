'use strict';

exigirSesion('cliente');
dibujarBarra('carrito');

const modalPago = document.getElementById('modalPago');

function totalDelCarrito() {
  return Carrito.obtener().reduce((s, i) => s + i.precio * i.cantidad, 0);
}

function dibujarCarrito() {
  const items = Carrito.obtener();
  const cuerpo = document.getElementById('cuerpoCarrito');

  if (items.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="centrado">El carrito está vacío. ' +
      '<a href="catalogo.html">Ir al catálogo</a></td></tr>';
  } else {
    cuerpo.innerHTML = items.map((i, indice) => `
      <tr>
        <td class="cod">${i.codigo_producto}</td>
        <td>${i.descripcion}</td>
        <td class="derecha">${moneda(i.precio)}</td>
        <td><input type="number" class="cantidad" min="1" value="${i.cantidad}" data-indice="${indice}"></td>
        <td class="derecha">${moneda(i.precio * i.cantidad)}</td>
        <td><button class="boton linea rojo" data-quitar="${indice}">Quitar</button></td>
      </tr>`).join('');
  }

  document.getElementById('totalCarrito').textContent = 'Total: ' + moneda(totalDelCarrito());
  document.getElementById('btnConfirmar').disabled = items.length === 0;
  actualizarContadorCarrito();

  // cambiar la cantidad de un renglon
  cuerpo.querySelectorAll('input[data-indice]').forEach((campo) => {
    campo.addEventListener('change', () => {
      const cantidad = parseInt(campo.value, 10);
      if (Number.isInteger(cantidad) && cantidad > 0) {
        items[Number(campo.dataset.indice)].cantidad = cantidad;
        Carrito.guardar(items);
      }
      dibujarCarrito();
    });
  });

  cuerpo.querySelectorAll('button[data-quitar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      items.splice(Number(boton.dataset.quitar), 1);
      Carrito.guardar(items);
      dibujarCarrito();
    });
  });
}

// abre la ventana para elegir el medio de pago
document.getElementById('btnConfirmar').addEventListener('click', () => {
  if (Carrito.obtener().length === 0) return;
  document.getElementById('totalPago').textContent = moneda(totalDelCarrito());
  modalPago.classList.add('visible');
});

document.getElementById('btnCancelarPago').addEventListener('click', () => {
  modalPago.classList.remove('visible');
});

// aca se manda el pedido, el servidor hace todo lo demas
document.getElementById('btnPagar').addEventListener('click', async () => {
  const boton = document.getElementById('btnPagar');
  boton.disabled = true;
  try {
    const respuesta = await api('POST', '/api/pedidos', {
      items: Carrito.obtener().map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
      medio_pago: document.getElementById('medioPago').value
    });
    Carrito.vaciar();
    dibujarCarrito();
    mostrarMensaje('mensaje', respuesta.mensaje + ' Podés verlo en "Mis pedidos".', 'exito');
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  } finally {
    modalPago.classList.remove('visible');
    boton.disabled = false;
  }
});

dibujarCarrito();
