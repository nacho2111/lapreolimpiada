/**
 * tablas.js
 * Definición central de las tablas del sistema y sus claves primarias.
 * Los nombres de tablas y campos respetan el Diagrama Entidad-Relación (DER)
 * del proyecto "Sistema de venta de paquetes turísticos por Internet".
 */

'use strict';

/** Mapa: nombre de tabla -> nombre de su clave primaria. */
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
  historial_pedidos: 'id_historial',
  configuracion: 'clave'
};

/** Tablas cuya clave primaria es autonumérica. */
const AUTONUMERICAS = Object.keys(CLAVES_PRIMARIAS).filter((t) => t !== 'configuracion');

module.exports = { CLAVES_PRIMARIAS, AUTONUMERICAS };
