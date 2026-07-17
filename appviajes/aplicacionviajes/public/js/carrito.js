/**
 * carrito.js
 * CU-05: Modificar Carrito (cambiar cantidades / quitar productos).
 * CU-06: Confirmar Compra (pago mediante pasarela de terceros simulada).
 */

'use strict';

exigirSesion('cliente');
dibujarBarra('carrito');

/** Vuelve a dibujar la tabla del carrito y el total. */
function dibujarCarrito() {
  const items = Carrito.obtener();
  const cuerpo = document.getElementById('cuerpoCarrito');
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  if (items.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6" class="centrado">El carrito está vacío. ' +
      '<a href="catalogo.html">Ir al catálogo</a></td></tr>';
  } else {
    cuerpo.innerHTML = items.map((i, indice) => `
      <tr>
        <td><strong>${i.codigo_producto}</strong></td>
        <td>${i.descripcion}</td>
        <td class="derecha">${moneda(i.precio)}</td>
        <td><input type="number" min="1" value="${i.cantidad}" style="width:80px" data-indice="${indice}"></td>
        <td class="derecha">${moneda(i.precio * i.cantidad)}</td>
        <td><button class="boton chico peligro" data-quitar="${indice}">Quitar</button></td>
      </tr>`).join('');
  }

  document.getElementById('totalCarrito').textContent = 'Total: ' + moneda(total);
  document.getElementById('btnConfirmar').disabled = items.length === 0;
  actualizarContadorCarrito();

  // CU-05: modificar cantidades.
  cuerpo.querySelectorAll('input[data-indice]').forEach((campo) => {
    campo.addEventListener('change', () => {
      const items2 = Carrito.obtener();
      const cantidad = parseInt(campo.value, 10);
      if (!Number.isInteger(cantidad) || cantidad <= 0) { dibujarCarrito(); return; }
      items2[Number(campo.dataset.indice)].cantidad = cantidad;
      Carrito.guardar(items2);
      dibujarCarrito();
    });
  });

  // CU-05: quitar productos.
  cuerpo.querySelectorAll('button[data-quitar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const items2 = Carrito.obtener();
      items2.splice(Number(boton.dataset.quitar), 1);
      Carrito.guardar(items2);
      dibujarCarrito();
    });
  });
}

// CU-06: abrir la pasarela de pago.
document.getElementById('btnConfirmar').addEventListener('click', () => {
  const items = Carrito.obtener();
  if (items.length === 0) return;
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  document.getElementById('totalPago').textContent = moneda(total);
  document.getElementById('modalPago').classList.add('visible');
});

document.getElementById('btnCancelarPago').addEventListener('click', () => {
  document.getElementById('modalPago').classList.remove('visible');
});

// CU-06: pagar y registrar el pedido en el servidor.
document.getElementById('btnPagar').addEventListener('click', async () => {
  const boton = document.getElementById('btnPagar');
  boton.disabled = true;
  try {
    const items = Carrito.obtener().map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad }));
    const respuesta = await api('POST', '/api/pedidos', {
      items,
      medio_pago: document.getElementById('medioPago').value
    });
    Carrito.vaciar();
    document.getElementById('modalPago').classList.remove('visible');
    dibujarCarrito();
    mostrarMensaje('mensaje', respuesta.mensaje + ' Podés verlo en "Mis pedidos".', 'exito');
  } catch (error) {
    document.getElementById('modalPago').classList.remove('visible');
    mostrarMensaje('mensaje', error.message, 'error');
  } finally {
    boton.disabled = false;
  }
});

dibujarCarrito();
