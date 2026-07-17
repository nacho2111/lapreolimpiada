/**
 * seed.js
 * Datos iniciales (semilla) de la aplicación.
 * Se cargan automáticamente la primera vez que se inicia el servidor
 * (cuando la carpeta data/ todavía no tiene los archivos JSON).
 *
 * Incluye:
 *  - Categorías de productos turísticos (con el email del sector correspondiente).
 *  - Catálogo inicial de productos.
 *  - Usuario interno "Jefe de Ventas" (credenciales del entregable N°7).
 *  - Un cliente de demostración.
 *  - Configuración general del sistema.
 */

'use strict';

const { hashContrasena } = require('./auth');
const { fechaHoraActual } = require('./util');

/**
 * Construye el conjunto completo de datos iniciales.
 * @returns {object} Objeto con una propiedad por tabla.
 */
function generarDatosIniciales() {
  const ahora = fechaHoraActual();

  return {
    categoria: [
      { id_categoria: 1, nombre_categoria: 'Paquetes completos', tipo_categoria: 'Paquete', descripcion: 'Paquetes turísticos con todo el servicio incluido', email_sector: 'paquetes@airsky.com.ar', estado: 'Activo' },
      { id_categoria: 2, nombre_categoria: 'Estadías', tipo_categoria: 'Estadía', descripcion: 'Estadías en hoteles y cabañas', email_sector: 'estadias@airsky.com.ar', estado: 'Activo' },
      { id_categoria: 3, nombre_categoria: 'Pasajes aéreos', tipo_categoria: 'Pasaje', descripcion: 'Pasajes aéreos nacionales e internacionales', email_sector: 'pasajes@airsky.com.ar', estado: 'Activo' },
      { id_categoria: 4, nombre_categoria: 'Alquiler de autos', tipo_categoria: 'Alquiler', descripcion: 'Alquiler de vehículos', email_sector: 'alquileres@airsky.com.ar', estado: 'Activo' },
      { id_categoria: 5, nombre_categoria: 'Otros servicios', tipo_categoria: 'Otro', descripcion: 'Seguros, excursiones y servicios adicionales', email_sector: 'ventas@airsky.com.ar', estado: 'Activo' }
    ],

    producto: [
      { id_producto: 1, codigo_producto: 'PAQ-001', descripcion: 'Paquete Bariloche 7 noches - hotel 4 estrellas, aéreo y traslados incluidos', tipo_producto: 'Paquete', precio: 850000, stock: 20, estado: 'Activo', id_categoria: 1 },
      { id_producto: 2, codigo_producto: 'PAQ-002', descripcion: 'Paquete Cataratas del Iguazú 5 noches - media pensión y excursiones', tipo_producto: 'Paquete', precio: 620000, stock: 15, estado: 'Activo', id_categoria: 1 },
      { id_producto: 3, codigo_producto: 'PAQ-003', descripcion: 'Paquete Río de Janeiro 7 noches - all inclusive con aéreo', tipo_producto: 'Paquete', precio: 1450000, stock: 10, estado: 'Activo', id_categoria: 1 },
      { id_producto: 4, codigo_producto: 'EST-001', descripcion: 'Estadía Hotel 4 estrellas en Mendoza - 3 noches con desayuno', tipo_producto: 'Estadía', precio: 380000, stock: 25, estado: 'Activo', id_categoria: 2 },
      { id_producto: 5, codigo_producto: 'EST-002', descripcion: 'Estadía en cabaña Villa La Angostura - 5 noches para 4 personas', tipo_producto: 'Estadía', precio: 540000, stock: 8, estado: 'Activo', id_categoria: 2 },
      { id_producto: 6, codigo_producto: 'PAS-001', descripcion: 'Pasaje aéreo Buenos Aires - Bariloche ida y vuelta', tipo_producto: 'Pasaje', precio: 210000, stock: 50, estado: 'Activo', id_categoria: 3 },
      { id_producto: 7, codigo_producto: 'PAS-002', descripcion: 'Pasaje aéreo Buenos Aires - Madrid ida y vuelta', tipo_producto: 'Pasaje', precio: 1980000, stock: 30, estado: 'Activo', id_categoria: 3 },
      { id_producto: 8, codigo_producto: 'ALQ-001', descripcion: 'Alquiler de auto compacto por 7 días - kilometraje libre', tipo_producto: 'Alquiler', precio: 175000, stock: 12, estado: 'Activo', id_categoria: 4 },
      { id_producto: 9, codigo_producto: 'ALQ-002', descripcion: 'Alquiler de SUV por 7 días - kilometraje libre y seguro total', tipo_producto: 'Alquiler', precio: 260000, stock: 6, estado: 'Activo', id_categoria: 4 },
      { id_producto: 10, codigo_producto: 'OTR-001', descripcion: 'Seguro de viaje internacional - cobertura 15 días', tipo_producto: 'Otro', precio: 45000, stock: 100, estado: 'Activo', id_categoria: 5 },
      { id_producto: 11, codigo_producto: 'OTR-002', descripcion: 'Excursión Glaciar Perito Moreno con guía - día completo', tipo_producto: 'Otro', precio: 95000, stock: 40, estado: 'Activo', id_categoria: 5 }
    ],

    usuario_interno: [
      {
        id_usuario: 1,
        nombre: 'Marcela',
        apellido: 'Domínguez',
        email: 'jefe.ventas@airsky.com.ar',
        usuario: 'jefeventas',
        contrasena: hashContrasena('Ventas2026!'),
        rol: 'Jefe de Ventas',
        estado: 'Activo'
      },
      {
        id_usuario: 2,
        nombre: 'Carlos',
        apellido: 'Ríos',
        email: 'carlos.rios@airsky.com.ar',
        usuario: 'cventas',
        contrasena: hashContrasena('Ventas2026!'),
        rol: 'Personal de Ventas',
        estado: 'Activo'
      }
    ],

    cliente: [
      {
        id_cliente: 1,
        nombre: 'Juan',
        apellido: 'Pérez',
        dni: '35123456',
        telefono: '011-4555-1234',
        email: 'juan.perez@gmail.com',
        direccion: 'Av. Rivadavia 1250, CABA',
        usuario: 'juanperez',
        contrasena: hashContrasena('Cliente2026!'),
        fecha_registro: ahora,
        estado: 'Activo'
      }
    ],

    pedido: [],
    detalle_pedido: [],
    pago: [],
    venta: [],
    email: [],
    historial_pedidos: [],

    configuracion: [
      { clave: 'nombre_empresa', valor: 'AIRSKY' },
      { clave: 'email_empresa', valor: 'ventas@airsky.com.ar' }
    ]
  };
}

module.exports = { generarDatosIniciales };
