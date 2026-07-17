/**
 * servicio-pedidos.js
 * Lógica de negocio de los pedidos (capa Servidor de la aplicación):
 *  - Armado del pedido con su número, detalle, pago y venta.
 *  - Envío (simulado y registrado en la tabla EMAIL) de correos al cliente
 *    y al sector de la empresa que corresponda según la categoría.
 *  - Entrega y anulación de pedidos con pase a la tabla HISTORIAL_PEDIDOS.
 *
 * El "cobro" se realiza mediante una pasarela de pago de terceros SIMULADA
 * (en producción se integraría, por ejemplo, la API de Mercado Pago).
 */

'use strict';

const { fechaHoraActual, redondear } = require('./util');
const correo = require('./correo');

/**
 * Registra un correo en la tabla EMAIL y, si el envío real está configurado
 * (config.correo.json), lo manda de verdad por SMTP. El envío real nunca
 * interrumpe la compra: si falla, el correo queda igual registrado en la tabla.
 * @param {object} store - Capa de datos.
 * @param {object} datos - Fila de la tabla email { destinatario, asunto, mensaje, ... }.
 */
async function registrarEmail(store, datos) {
  await store.insert('email', datos);
  await correo.enviar({
    destinatario: datos.destinatario,
    asunto: datos.asunto,
    mensaje: datos.mensaje
  });
}

/**
 * Valida los renglones de un carrito y calcula los importes.
 * @param {object} store - Capa de datos.
 * @param {Array<{id_producto:number, cantidad:number}>} items - Renglones del carrito.
 * @returns {Promise<{detalles:Array, total:number}>} Detalles valorizados y total.
 * @throws {Error} Si un producto no existe, está inactivo o no hay stock.
 */
async function valorizarCarrito(store, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El carrito está vacío.');
  }
  const detalles = [];
  let total = 0;

  for (const item of items) {
    const cantidad = parseInt(item.cantidad, 10);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error('Las cantidades deben ser números enteros mayores a cero.');
    }
    const producto = await store.get('producto', item.id_producto);
    if (!producto || producto.estado !== 'Activo') {
      throw new Error(`El producto solicitado (id ${item.id_producto}) no está disponible.`);
    }
    if (producto.stock < cantidad) {
      throw new Error(`Stock insuficiente para "${producto.codigo_producto}" (disponible: ${producto.stock}).`);
    }
    const subtotal = redondear(producto.precio * cantidad);
    detalles.push({ producto, cantidad, precio_unitario: producto.precio, subtotal });
    total = redondear(total + subtotal);
  }
  return { detalles, total };
}

/**
 * Registra en la tabla EMAIL los correos de un pedido confirmado:
 * uno para el cliente y uno para cada sector involucrado.
 * @param {object} store - Capa de datos.
 * @param {object} pedido - Pedido recién creado.
 * @param {object} cliente - Cliente que realizó la compra.
 * @param {Array} detalles - Detalles valorizados del pedido.
 */
async function enviarEmailsDeConfirmacion(store, pedido, cliente, detalles) {
  const fecha = fechaHoraActual();
  const listado = detalles
    .map((d) => ` - ${d.producto.codigo_producto} | ${d.producto.descripcion} | Cant: ${d.cantidad} | Subtotal: $${d.subtotal}`)
    .join('\n');

  // Correo de confirmación para el cliente.
  await registrarEmail(store, {
    destinatario: cliente.email,
    asunto: `Confirmación de compra - Pedido N° ${pedido.id_pedido}`,
    mensaje:
      `Hola ${cliente.nombre} ${cliente.apellido}:\n\n` +
      `Tu compra fue registrada con éxito. Pedido N° ${pedido.id_pedido} (${pedido.fecha_pedido}).\n\n` +
      `Detalle:\n${listado}\n\nTotal abonado: $${pedido.total}\n\n` +
      `El pedido se encuentra PENDIENTE DE ENTREGA. Te avisaremos cuando sea entregado.\n\n` +
      `Gracias por confiar en nosotros.\nAIRSKY`,
    fecha_envio: fecha,
    tipo: 'Confirmación',
    id_pedido: pedido.id_pedido
  });

  // Correo para cada sector de la empresa involucrado en el pedido
  // (la dirección del sector está guardada en la tabla CATEGORIA).
  const sectores = new Map();
  for (const d of detalles) {
    const categoria = await store.get('categoria', d.producto.id_categoria);
    const direccion = categoria ? categoria.email_sector : 'ventas@agenciadeviajes.com.ar';
    if (!sectores.has(direccion)) sectores.set(direccion, []);
    sectores.get(direccion).push(d);
  }

  for (const [direccion, renglones] of sectores) {
    const detalleSector = renglones
      .map((d) => ` - ${d.producto.codigo_producto} | ${d.producto.descripcion} | Cant: ${d.cantidad}`)
      .join('\n');
    await registrarEmail(store, {
      destinatario: direccion,
      asunto: `Nuevo pedido N° ${pedido.id_pedido} pendiente de entrega`,
      mensaje:
        `Se registró el pedido N° ${pedido.id_pedido} del cliente ${cliente.apellido}, ${cliente.nombre} ` +
        `(DNI ${cliente.dni}, ${cliente.email}).\n\nProductos del sector:\n${detalleSector}\n\n` +
        `Total del pedido: $${pedido.total}\nEstado: PENDIENTE DE ENTREGA.`,
      fecha_envio: fecha,
      tipo: 'Pedido',
      id_pedido: pedido.id_pedido
    });
  }
}

/**
 * Crea un pedido completo a partir del carrito de un cliente:
 * PEDIDO + DETALLE_PEDIDO + PAGO (aprobado por la pasarela simulada)
 * + VENTA + EMAILs. Además descuenta el stock de los productos.
 * @param {object} store - Capa de datos.
 * @param {number} idCliente - Id del cliente autenticado.
 * @param {Array} items - Renglones {id_producto, cantidad}.
 * @param {string} medioPago - 'Tarjeta' | 'Transferencia' | 'Otro'.
 * @returns {Promise<object>} El pedido creado con su detalle.
 */
async function crearPedido(store, idCliente, items, medioPago) {
  const cliente = await store.get('cliente', idCliente);
  if (!cliente || cliente.estado !== 'Activo') throw new Error('Cliente inexistente o inactivo.');

  const medios = ['Tarjeta', 'Transferencia', 'Otro'];
  const medio = medios.includes(medioPago) ? medioPago : 'Otro';

  const { detalles, total } = await valorizarCarrito(store, items);
  const fecha = fechaHoraActual();

  // 1) Cabecera del pedido (queda PENDIENTE de entrega).
  const pedido = await store.insert('pedido', {
    fecha_pedido: fecha,
    estado: 'Pendiente',
    total,
    id_cliente: cliente.id_cliente
  });

  // 2) Detalle: cada artículo lleva el número de pedido.
  for (const d of detalles) {
    await store.insert('detalle_pedido', {
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
      id_pedido: pedido.id_pedido,
      id_producto: d.producto.id_producto
    });
    // Descuento de stock.
    await store.update('producto', d.producto.id_producto, { stock: d.producto.stock - d.cantidad });
  }

  // 3) Cobro mediante herramienta de terceros (simulada: siempre aprueba).
  const pago = await store.insert('pago', {
    fecha_pago: fecha,
    monto: total,
    medio_pago: medio,
    estado: 'Aprobado',
    id_pedido: pedido.id_pedido
  });

  // 4) Registro de la venta.
  await store.insert('venta', {
    fecha_venta: fecha,
    total,
    id_pago: pago.id_pago,
    id_pedido: pedido.id_pedido
  });

  // 5) Correos al cliente y a los sectores correspondientes.
  await enviarEmailsDeConfirmacion(store, pedido, cliente, detalles);

  return { pedido, detalles };
}

/**
 * Reemplaza el detalle de un pedido PENDIENTE por uno nuevo,
 * reponiendo el stock anterior y recalculando totales, pago y venta.
 * @param {object} store - Capa de datos.
 * @param {object} pedido - Pedido a modificar (debe estar Pendiente).
 * @param {Array} items - Nuevos renglones {id_producto, cantidad}.
 * @returns {Promise<object>} Pedido actualizado.
 */
async function modificarPedido(store, pedido, items) {
  // 1) Reponer el stock del detalle anterior y eliminarlo.
  const detallesViejos = (await store.all('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
  for (const d of detallesViejos) {
    const producto = await store.get('producto', d.id_producto);
    if (producto) await store.update('producto', producto.id_producto, { stock: producto.stock + d.cantidad });
    await store.remove('detalle_pedido', d.id_detalle);
  }

  // 2) Valorizar y grabar el nuevo detalle.
  const { detalles, total } = await valorizarCarrito(store, items);
  for (const d of detalles) {
    await store.insert('detalle_pedido', {
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
      id_pedido: pedido.id_pedido,
      id_producto: d.producto.id_producto
    });
    await store.update('producto', d.producto.id_producto, { stock: d.producto.stock - d.cantidad });
  }

  // 3) Actualizar total del pedido y sincronizar pago y venta.
  await store.update('pedido', pedido.id_pedido, { total });
  const pago = (await store.all('pago')).find((p) => p.id_pedido === pedido.id_pedido);
  if (pago) await store.update('pago', pago.id_pago, { monto: total });
  const venta = (await store.all('venta')).find((v) => v.id_pedido === pedido.id_pedido);
  if (venta) await store.update('venta', venta.id_venta, { total });

  return { ...pedido, total };
}

/**
 * Cierra un pedido pendiente como Entregado o Anulado:
 * cambia su estado, lo registra en HISTORIAL_PEDIDOS y envía el
 * correo correspondiente. Si se anula, repone el stock.
 * @param {object} store - Capa de datos.
 * @param {object} pedido - Pedido pendiente.
 * @param {'Entregado'|'Anulado'} estadoFinal - Estado final del pedido.
 */
async function cerrarPedido(store, pedido, estadoFinal) {
  const fecha = fechaHoraActual();

  if (estadoFinal === 'Anulado') {
    const detalles = (await store.all('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
    for (const d of detalles) {
      const producto = await store.get('producto', d.id_producto);
      if (producto) await store.update('producto', producto.id_producto, { stock: producto.stock + d.cantidad });
    }
  }

  // El pedido sale de "pendientes" y pasa a la tabla histórica.
  await store.update('pedido', pedido.id_pedido, { estado: estadoFinal });
  await store.insert('historial_pedidos', {
    fecha_entrega: fecha,
    estado_final: estadoFinal,
    id_pedido: pedido.id_pedido
  });

  // Aviso por correo al cliente.
  const cliente = await store.get('cliente', pedido.id_cliente);
  if (cliente) {
    const texto = estadoFinal === 'Entregado'
      ? `Tu pedido N° ${pedido.id_pedido} fue ENTREGADO el ${fecha}. ¡Buen viaje!`
      : `Tu pedido N° ${pedido.id_pedido} fue ANULADO el ${fecha}. Si abonaste, el reintegro se gestionará por el mismo medio de pago.`;
    await registrarEmail(store, {
      destinatario: cliente.email,
      asunto: `Pedido N° ${pedido.id_pedido} ${estadoFinal.toLowerCase()}`,
      mensaje: `Hola ${cliente.nombre}:\n\n${texto}\n\nAIRSKY`,
      fecha_envio: fecha,
      tipo: 'Pedido',
      id_pedido: pedido.id_pedido
    });
  }
}

/**
 * Devuelve un pedido con su detalle "expandido" (datos de productos incluidos).
 * @param {object} store - Capa de datos.
 * @param {object} pedido - Fila de la tabla pedido.
 * @returns {Promise<object>} Pedido con arreglo `detalles`.
 */
async function pedidoConDetalle(store, pedido) {
  const detalles = (await store.all('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
  const productos = await store.all('producto');
  const expandidos = detalles.map((d) => {
    const p = productos.find((x) => x.id_producto === d.id_producto) || {};
    return {
      ...d,
      codigo_producto: p.codigo_producto || '(eliminado)',
      descripcion: p.descripcion || '(producto eliminado)'
    };
  });
  return { ...pedido, detalles: expandidos };
}

module.exports = { valorizarCarrito, crearPedido, modificarPedido, cerrarPedido, pedidoConDetalle };
