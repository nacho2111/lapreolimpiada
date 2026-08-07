'use strict';

// como se llama el id de cada tabla
const CLAVES_PRIMARIAS = {
  cliente: 'id_cliente',
  usuario_interno: 'id_usuario',
  categoria: 'id_categoria',
  producto: 'id_producto',
  pedido: 'id_pedido',
  detalle_pedido: 'id_detalle',
  pago: 'id_pago',
  venta: 'id_venta',
  email: 'id_email',
  historial_pedidos: 'id_historial'
};

module.exports = { CLAVES_PRIMARIAS };
