'use strict';

const { fechaHoraActual, redondear } = require('./util');
const correo = require('./correo');

// guarda el mail en la tabla EMAIL y despues lo intenta mandar
async function registrarEmail(almacen, datos) {
  await almacen.insertar('email', datos);
  await correo.enviar({
    destinatario: datos.destinatario,
    asunto: datos.asunto,
    mensaje: datos.mensaje
  });
}

// controla stock y precios, y calcula el total del carrito
async function valorizarCarrito(almacen, items) {
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
    const producto = await almacen.obtener('producto', item.id_producto);
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

async function enviarEmailsDeConfirmacion(almacen, pedido, cliente, detalles) {
  const fecha = fechaHoraActual();
  const listado = detalles
    .map((d) => ` - ${d.producto.codigo_producto} | ${d.producto.descripcion} | Cant: ${d.cantidad} | Subtotal: $${d.subtotal}`)
    .join('\n');

  // primero el mail al cliente
  await registrarEmail(almacen, {
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

  // despues uno por cada sector que tenga productos en el pedido
  const sectores = new Map();
  for (const d of detalles) {
    const categoria = await almacen.obtener('categoria', d.producto.id_categoria);
    const direccion = categoria ? categoria.email_sector : 'ventas@airsky.com.ar';
    if (!sectores.has(direccion)) sectores.set(direccion, []);
    sectores.get(direccion).push(d);
  }

  for (const [direccion, renglones] of sectores) {
    const detalleSector = renglones
      .map((d) => ` - ${d.producto.codigo_producto} | ${d.producto.descripcion} | Cant: ${d.cantidad}`)
      .join('\n');
    await registrarEmail(almacen, {
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

async function crearPedido(almacen, idCliente, items, medioPago) {
  const cliente = await almacen.obtener('cliente', idCliente);
  if (!cliente || cliente.estado !== 'Activo') throw new Error('Cliente inexistente o inactivo.');

  const medios = ['Tarjeta', 'Transferencia', 'Otro'];
  const medio = medios.includes(medioPago) ? medioPago : 'Otro';

  const { detalles, total } = await valorizarCarrito(almacen, items);
  const fecha = fechaHoraActual();

  // 1) cabecera del pedido, queda pendiente de entrega
  const pedido = await almacen.insertar('pedido', {
    fecha_pedido: fecha,
    estado: 'Pendiente',
    total,
    id_cliente: cliente.id_cliente
  });

  // 2) un renglon de detalle por producto
  for (const d of detalles) {
    await almacen.insertar('detalle_pedido', {
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
      id_pedido: pedido.id_pedido,
      id_producto: d.producto.id_producto
    });
    // le descuento el stock al producto
    await almacen.actualizar('producto', d.producto.id_producto, { stock: d.producto.stock - d.cantidad });
  }

  // 3) el cobro es simulado, siempre sale aprobado
  const pago = await almacen.insertar('pago', {
    fecha_pago: fecha,
    monto: total,
    medio_pago: medio,
    estado: 'Aprobado',
    id_pedido: pedido.id_pedido
  });

  // 4) la venta, que despues sale en el estado de cuenta
  await almacen.insertar('venta', {
    fecha_venta: fecha,
    total,
    id_pago: pago.id_pago,
    id_pedido: pedido.id_pedido
  });

  // 5) y por ultimo los correos
  await enviarEmailsDeConfirmacion(almacen, pedido, cliente, detalles);

  return { pedido, detalles };
}

async function modificarPedido(almacen, pedido, items) {
  // 1) borro el detalle viejo y le devuelvo el stock a cada producto
  const detallesViejos = (await almacen.todos('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
  for (const d of detallesViejos) {
    const producto = await almacen.obtener('producto', d.id_producto);
    if (producto) await almacen.actualizar('producto', producto.id_producto, { stock: producto.stock + d.cantidad });
    await almacen.eliminar('detalle_pedido', d.id_detalle);
  }

  // 2) grabo el detalle nuevo
  const { detalles, total } = await valorizarCarrito(almacen, items);
  for (const d of detalles) {
    await almacen.insertar('detalle_pedido', {
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      subtotal: d.subtotal,
      id_pedido: pedido.id_pedido,
      id_producto: d.producto.id_producto
    });
    await almacen.actualizar('producto', d.producto.id_producto, { stock: d.producto.stock - d.cantidad });
  }

  // 3) el total cambia, asi que el pago y la venta tienen que quedar igual
  await almacen.actualizar('pedido', pedido.id_pedido, { total });
  const pago = (await almacen.todos('pago')).find((p) => p.id_pedido === pedido.id_pedido);
  if (pago) await almacen.actualizar('pago', pago.id_pago, { monto: total });
  const venta = (await almacen.todos('venta')).find((v) => v.id_pedido === pedido.id_pedido);
  if (venta) await almacen.actualizar('venta', venta.id_venta, { total });

  return { ...pedido, total };
}

// cierra el pedido: entregado o anulado
async function cerrarPedido(almacen, pedido, estadoFinal) {
  const fecha = fechaHoraActual();

  // si se anula hay que devolver lo que se habia descontado
  if (estadoFinal === 'Anulado') {
    const detalles = (await almacen.todos('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
    for (const d of detalles) {
      const producto = await almacen.obtener('producto', d.id_producto);
      if (producto) await almacen.actualizar('producto', producto.id_producto, { stock: producto.stock + d.cantidad });
    }
  }

  // deja de estar pendiente y queda anotado en el historial
  await almacen.actualizar('pedido', pedido.id_pedido, { estado: estadoFinal });
  await almacen.insertar('historial_pedidos', {
    fecha_entrega: fecha,
    estado_final: estadoFinal,
    id_pedido: pedido.id_pedido
  });

  // aviso al cliente
  const cliente = await almacen.obtener('cliente', pedido.id_cliente);
  if (cliente) {
    const texto = estadoFinal === 'Entregado'
      ? `Tu pedido N° ${pedido.id_pedido} fue ENTREGADO el ${fecha}. ¡Buen viaje!`
      : `Tu pedido N° ${pedido.id_pedido} fue ANULADO el ${fecha}. Si abonaste, el reintegro se gestionará por el mismo medio de pago.`;
    await registrarEmail(almacen, {
      destinatario: cliente.email,
      asunto: `Pedido N° ${pedido.id_pedido} ${estadoFinal.toLowerCase()}`,
      mensaje: `Hola ${cliente.nombre}:\n\n${texto}\n\nAIRSKY`,
      fecha_envio: fecha,
      tipo: 'Pedido',
      id_pedido: pedido.id_pedido
    });
  }
}

// le agrega a cada renglon el codigo y la descripcion del producto
async function pedidoConDetalle(almacen, pedido) {
  const detalles = (await almacen.todos('detalle_pedido')).filter((d) => d.id_pedido === pedido.id_pedido);
  const productos = await almacen.todos('producto');
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
