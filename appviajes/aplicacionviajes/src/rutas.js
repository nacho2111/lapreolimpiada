/**
 * rutas.js
 * Definición de todos los endpoints de la API REST.
 *
 * Endpoints de la capa Cliente (portal de compras):
 *   POST /api/auth/registro      Alta de nuevos clientes (CU-01)
 *   POST /api/auth/login         Inicio de sesión de clientes y usuarios internos (CU-02)
 *   POST /api/auth/logout        Cierre de sesión
 *   GET  /api/auth/perfil        Datos de la sesión actual
 *   GET  /api/productos          Lista de productos activos (CU-03)
 *   POST /api/pedidos            Confirmar compra: crea pedido, cobra y envía mails (CU-06)
 *   GET  /api/pedidos            Pedidos del cliente autenticado (CU-07)
 *   PUT  /api/pedidos/:id        Modificar un pedido pendiente (CU-07.1)
 *   DELETE /api/pedidos/:id      Cancelar un pedido pendiente (CU-07.2)
 *
 * Endpoints de la capa Servidor / panel del Jefe de Ventas:
 *   GET/POST/PUT/DELETE /api/admin/productos      Administración del catálogo (CU-08)
 *   GET  /api/admin/pedidos                       Pedidos por estado (CU-09)
 *   POST /api/admin/pedidos/:id/entregar          Registrar entrega (CU-10)
 *   POST /api/admin/pedidos/:id/anular            Anular pedido (1.4.6)
 *   GET  /api/admin/estado-cuenta                 Estado de cuenta por fecha y por cliente (CU-11)
 *   GET  /api/admin/historial                     Tabla histórica de pedidos cerrados
 *   GET  /api/admin/emails                        Correos registrados por el sistema
 *   GET/PUT /api/admin/categorias                 Emails de sector por categoría
 */

'use strict';

const express = require('express');
const auth = require('./auth');
const { fechaHoraActual } = require('./util');
const servicio = require('./servicio-pedidos');

/**
 * Crea el router de la API.
 * @param {object} store - Capa de datos ya inicializada (JSON).
 * @returns {express.Router} Router con todos los endpoints.
 */
function crearRutas(store) {
  const router = express.Router();

  /** Envuelve un handler async y deriva los errores al manejador central. */
  const seguro = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      res.status(400).json({ error: error.message || 'Error inesperado.' });
    });
  };

  // ────────────────────────── AUTENTICACIÓN ──────────────────────────

  // CU-01: Registrar Cliente (alta mediante contraseña).
  router.post('/auth/registro', seguro(async (req, res) => {
    const { nombre, apellido, dni, telefono, email, direccion, usuario, contrasena } = req.body || {};

    const obligatorios = { nombre, apellido, dni, email, usuario, contrasena };
    for (const [campo, valor] of Object.entries(obligatorios)) {
      if (!valor || !String(valor).trim()) {
        return res.status(400).json({ error: `El campo "${campo}" es obligatorio.` });
      }
    }
    if (String(contrasena).length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const clientes = await store.all('cliente');
    const internos = await store.all('usuario_interno');
    const nombreUsuario = String(usuario).trim().toLowerCase();
    if (clientes.some((c) => c.usuario === nombreUsuario) || internos.some((u) => u.usuario === nombreUsuario)) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso. Elija otro.' });
    }

    const cliente = await store.insert('cliente', {
      nombre: String(nombre).trim(),
      apellido: String(apellido).trim(),
      dni: String(dni).trim(),
      telefono: String(telefono || '').trim(),
      email: String(email).trim(),
      direccion: String(direccion || '').trim(),
      usuario: nombreUsuario,
      contrasena: auth.hashContrasena(contrasena),
      fecha_registro: fechaHoraActual(),
      estado: 'Activo'
    });

    res.status(201).json({ mensaje: 'Registro exitoso. Ya puede iniciar sesión.', id_cliente: cliente.id_cliente });
  }));

  // CU-02: Iniciar Sesión (valida clientes y usuarios internos).
  // Se puede ingresar con el nombre de usuario O con el correo electrónico,
  // en ambos casos sin distinguir mayúsculas de minúsculas.
  router.post('/auth/login', seguro(async (req, res) => {
    const { usuario, contrasena } = req.body || {};
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Debe ingresar usuario y contraseña.' });
    }
    const identificador = String(usuario).trim().toLowerCase();
    const coincide = (u) =>
      (u.usuario || '').toLowerCase() === identificador ||
      (u.email || '').toLowerCase() === identificador;

    const cliente = (await store.all('cliente')).find((c) => coincide(c) && c.estado === 'Activo');
    if (cliente && auth.verificarContrasena(contrasena, cliente.contrasena)) {
      const token = auth.crearSesion({ tipo: 'cliente', id: cliente.id_cliente, nombre: `${cliente.nombre} ${cliente.apellido}` });
      return res.json({ token, tipo: 'cliente', nombre: `${cliente.nombre} ${cliente.apellido}` });
    }

    const interno = (await store.all('usuario_interno')).find((u) => coincide(u) && u.estado === 'Activo');
    if (interno && auth.verificarContrasena(contrasena, interno.contrasena)) {
      const token = auth.crearSesion({ tipo: 'interno', id: interno.id_usuario, nombre: `${interno.nombre} ${interno.apellido}`, rol: interno.rol });
      return res.json({ token, tipo: 'interno', nombre: `${interno.nombre} ${interno.apellido}`, rol: interno.rol });
    }

    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }));

  router.post('/auth/logout', auth.requiereSesion, (req, res) => {
    auth.cerrarSesion(req.headers['x-auth-token']);
    res.json({ mensaje: 'Sesión cerrada.' });
  });

  router.get('/auth/perfil', auth.requiereSesion, (req, res) => {
    res.json(req.sesion);
  });

  // ────────────────────────── PRODUCTOS (clientes) ──────────────────────────

  // CU-03: Consultar Productos (lista sin imágenes, requiere sesión iniciada).
  router.get('/productos', auth.requiereSesion, seguro(async (req, res) => {
    const productos = (await store.all('producto')).filter((p) => p.estado === 'Activo');
    const categorias = await store.all('categoria');
    const lista = productos.map((p) => {
      const cat = categorias.find((c) => c.id_categoria === p.id_categoria) || {};
      return {
        id_producto: p.id_producto,
        codigo_producto: p.codigo_producto,
        descripcion: p.descripcion,
        tipo_producto: p.tipo_producto,
        precio: p.precio,
        stock: p.stock,
        categoria: cat.nombre_categoria || ''
      };
    });
    res.json(lista);
  }));

  // ────────────────────────── PEDIDOS (clientes) ──────────────────────────

  // CU-06: Confirmar Compra (arma pedido, cobra vía pasarela simulada y envía mails).
  router.post('/pedidos', auth.requiereCliente, seguro(async (req, res) => {
    const { items, medio_pago } = req.body || {};
    const { pedido } = await servicio.crearPedido(store, req.sesion.id, items, medio_pago);
    res.status(201).json({
      mensaje: `Compra confirmada. Pedido N° ${pedido.id_pedido} registrado como pendiente de entrega. Se enviaron los correos de confirmación.`,
      id_pedido: pedido.id_pedido,
      total: pedido.total
    });
  }));

  // CU-07: Consultar Pedidos (cada cliente solo ve los propios).
  router.get('/pedidos', auth.requiereCliente, seguro(async (req, res) => {
    const pedidos = (await store.all('pedido'))
      .filter((p) => p.id_cliente === req.sesion.id)
      .sort((a, b) => b.id_pedido - a.id_pedido);
    const conDetalle = [];
    for (const p of pedidos) conDetalle.push(await servicio.pedidoConDetalle(store, p));
    res.json(conDetalle);
  }));

  // CU-07.1: Modificar Pedido (solo pendientes y del propio cliente).
  router.put('/pedidos/:id', auth.requiereCliente, seguro(async (req, res) => {
    const pedido = await store.get('pedido', req.params.id);
    if (!pedido || pedido.id_cliente !== req.sesion.id) {
      return res.status(404).json({ error: 'Pedido inexistente.' });
    }
    if (pedido.estado !== 'Pendiente') {
      return res.status(400).json({ error: 'Solo se pueden modificar pedidos pendientes de entrega.' });
    }
    const actualizado = await servicio.modificarPedido(store, pedido, (req.body || {}).items);
    res.json({ mensaje: `Pedido N° ${pedido.id_pedido} actualizado.`, total: actualizado.total });
  }));

  // CU-07.2: Cancelar Pedido (solo pendientes y del propio cliente).
  router.delete('/pedidos/:id', auth.requiereCliente, seguro(async (req, res) => {
    const pedido = await store.get('pedido', req.params.id);
    if (!pedido || pedido.id_cliente !== req.sesion.id) {
      return res.status(404).json({ error: 'Pedido inexistente.' });
    }
    if (pedido.estado !== 'Pendiente') {
      return res.status(400).json({ error: 'Solo se pueden cancelar pedidos pendientes de entrega.' });
    }
    await servicio.cerrarPedido(store, pedido, 'Anulado');
    res.json({ mensaje: `Pedido N° ${pedido.id_pedido} cancelado.` });
  }));

  // ────────────────────────── PANEL DEL JEFE DE VENTAS ──────────────────────────

  // CU-08: Administrar Productos.
  router.get('/admin/productos', auth.requiereInterno, seguro(async (req, res) => {
    const productos = await store.all('producto');
    const categorias = await store.all('categoria');
    res.json(productos.map((p) => ({
      ...p,
      categoria: (categorias.find((c) => c.id_categoria === p.id_categoria) || {}).nombre_categoria || ''
    })));
  }));

  router.post('/admin/productos', auth.requiereInterno, seguro(async (req, res) => {
    const { codigo_producto, descripcion, tipo_producto, precio, stock, id_categoria } = req.body || {};
    if (!codigo_producto || !descripcion || precio === undefined) {
      return res.status(400).json({ error: 'Código, descripción y precio unitario son obligatorios.' });
    }
    const existentes = await store.all('producto');
    if (existentes.some((p) => p.codigo_producto === String(codigo_producto).trim().toUpperCase())) {
      return res.status(400).json({ error: 'Ya existe un producto con ese código.' });
    }
    const precioNum = Number(precio);
    const stockNum = parseInt(stock, 10);
    if (!(precioNum > 0)) return res.status(400).json({ error: 'El precio debe ser mayor a cero.' });

    const producto = await store.insert('producto', {
      codigo_producto: String(codigo_producto).trim().toUpperCase(),
      descripcion: String(descripcion).trim(),
      tipo_producto: ['Paquete', 'Estadía', 'Pasaje', 'Alquiler', 'Otro'].includes(tipo_producto) ? tipo_producto : 'Otro',
      precio: precioNum,
      stock: Number.isInteger(stockNum) && stockNum >= 0 ? stockNum : 0,
      estado: 'Activo',
      id_categoria: Number(id_categoria) || 5
    });
    res.status(201).json({ mensaje: 'Producto cargado en el catálogo.', producto });
  }));

  router.put('/admin/productos/:id', auth.requiereInterno, seguro(async (req, res) => {
    const producto = await store.get('producto', req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto inexistente.' });

    const { descripcion, tipo_producto, precio, stock, id_categoria, estado } = req.body || {};
    const cambios = {};
    if (descripcion !== undefined) cambios.descripcion = String(descripcion).trim();
    if (tipo_producto !== undefined && ['Paquete', 'Estadía', 'Pasaje', 'Alquiler', 'Otro'].includes(tipo_producto)) cambios.tipo_producto = tipo_producto;
    if (precio !== undefined) {
      if (!(Number(precio) > 0)) return res.status(400).json({ error: 'El precio debe ser mayor a cero.' });
      cambios.precio = Number(precio);
    }
    if (stock !== undefined) {
      const s = parseInt(stock, 10);
      if (!Number.isInteger(s) || s < 0) return res.status(400).json({ error: 'El stock debe ser un entero mayor o igual a cero.' });
      cambios.stock = s;
    }
    if (id_categoria !== undefined) cambios.id_categoria = Number(id_categoria);
    if (estado !== undefined && ['Activo', 'Inactivo'].includes(estado)) cambios.estado = estado;

    await store.update('producto', producto.id_producto, cambios);
    res.json({ mensaje: 'Producto actualizado.' });
  }));

  // Baja lógica: el producto pasa a Inactivo (no se pierde el historial de ventas).
  router.delete('/admin/productos/:id', auth.requiereInterno, seguro(async (req, res) => {
    const producto = await store.get('producto', req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto inexistente.' });
    await store.update('producto', producto.id_producto, { estado: 'Inactivo' });
    res.json({ mensaje: `Producto ${producto.codigo_producto} dado de baja del catálogo.` });
  }));

  // CU-09: Consultar Pedidos (por estado; por defecto los pendientes).
  router.get('/admin/pedidos', auth.requiereInterno, seguro(async (req, res) => {
    const estado = req.query.estado || 'Pendiente';
    const clientes = await store.all('cliente');
    let pedidos = await store.all('pedido');
    if (estado !== 'Todos') pedidos = pedidos.filter((p) => p.estado === estado);
    pedidos.sort((a, b) => b.id_pedido - a.id_pedido);

    const respuesta = [];
    for (const p of pedidos) {
      const detalle = await servicio.pedidoConDetalle(store, p);
      const c = clientes.find((x) => x.id_cliente === p.id_cliente) || {};
      respuesta.push({ ...detalle, cliente: `${c.apellido || ''}, ${c.nombre || ''}`, dni: c.dni || '', email_cliente: c.email || '' });
    }
    res.json(respuesta);
  }));

  // CU-10: Registrar Entrega (el pedido pasa al historial y se avisa por mail).
  router.post('/admin/pedidos/:id/entregar', auth.requiereInterno, seguro(async (req, res) => {
    const pedido = await store.get('pedido', req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido inexistente.' });
    if (pedido.estado !== 'Pendiente') return res.status(400).json({ error: 'El pedido no está pendiente.' });
    await servicio.cerrarPedido(store, pedido, 'Entregado');
    res.json({ mensaje: `Pedido N° ${pedido.id_pedido} marcado como ENTREGADO y registrado en el historial.` });
  }));

  // 1.4.6: Anular un pedido (desde el panel de ventas).
  router.post('/admin/pedidos/:id/anular', auth.requiereInterno, seguro(async (req, res) => {
    const pedido = await store.get('pedido', req.params.id);
    if (!pedido) return res.status(404).json({ error: 'Pedido inexistente.' });
    if (pedido.estado !== 'Pendiente') return res.status(400).json({ error: 'Solo se anulan pedidos pendientes.' });
    await servicio.cerrarPedido(store, pedido, 'Anulado');
    res.json({ mensaje: `Pedido N° ${pedido.id_pedido} ANULADO.` });
  }));

  // CU-11: Consultar Estado de Cuenta (facturas por fecha y resumen por cliente).
  router.get('/admin/estado-cuenta', auth.requiereInterno, seguro(async (req, res) => {
    const ventas = await store.all('venta');
    const pagos = await store.all('pago');
    const pedidos = await store.all('pedido');
    const clientes = await store.all('cliente');

    const facturas = ventas.map((v) => {
      const pedido = pedidos.find((p) => p.id_pedido === v.id_pedido) || {};
      const pago = pagos.find((p) => p.id_pago === v.id_pago) || {};
      const c = clientes.find((x) => x.id_cliente === pedido.id_cliente) || {};
      return {
        id_venta: v.id_venta,
        fecha: v.fecha_venta,
        id_pedido: v.id_pedido,
        cliente: `${c.apellido || ''}, ${c.nombre || ''}`,
        total: v.total,
        medio_pago: pago.medio_pago || '',
        estado_pago: pago.estado || '',
        estado_pedido: pedido.estado || ''
      };
    });

    // Estado de cuenta 1: facturas a cobrar ordenadas por fecha.
    const porFecha = [...facturas].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

    // Estado de cuenta 2: agrupado y ordenado por cliente.
    const porClienteMapa = new Map();
    for (const f of facturas) {
      if (!porClienteMapa.has(f.cliente)) {
        porClienteMapa.set(f.cliente, { cliente: f.cliente, cantidad_facturas: 0, total_facturado: 0, facturas: [] });
      }
      const grupo = porClienteMapa.get(f.cliente);
      grupo.cantidad_facturas += 1;
      grupo.total_facturado = Math.round((grupo.total_facturado + Number(f.total)) * 100) / 100;
      grupo.facturas.push(f);
    }
    const porCliente = [...porClienteMapa.values()].sort((a, b) => a.cliente.localeCompare(b.cliente));

    res.json({ porFecha, porCliente });
  }));

  // Tabla histórica de pedidos entregados/anulados.
  router.get('/admin/historial', auth.requiereInterno, seguro(async (req, res) => {
    const historial = await store.all('historial_pedidos');
    const pedidos = await store.all('pedido');
    const clientes = await store.all('cliente');
    const respuesta = historial
      .map((h) => {
        const p = pedidos.find((x) => x.id_pedido === h.id_pedido) || {};
        const c = clientes.find((x) => x.id_cliente === p.id_cliente) || {};
        return {
          id_historial: h.id_historial,
          id_pedido: h.id_pedido,
          cliente: `${c.apellido || ''}, ${c.nombre || ''}`,
          fecha_pedido: p.fecha_pedido || '',
          fecha_entrega: h.fecha_entrega,
          estado_final: h.estado_final,
          total: p.total || 0
        };
      })
      .sort((a, b) => b.id_historial - a.id_historial);
    res.json(respuesta);
  }));

  // Correos registrados por el sistema (tabla EMAIL de la aplicación).
  router.get('/admin/emails', auth.requiereInterno, seguro(async (req, res) => {
    const emails = (await store.all('email')).sort((a, b) => b.id_email - a.id_email);
    res.json(emails);
  }));

  // Categorías y emails de sector (configurables sin tocar el código).
  router.get('/admin/categorias', auth.requiereInterno, seguro(async (req, res) => {
    res.json(await store.all('categoria'));
  }));

  router.put('/admin/categorias/:id', auth.requiereInterno, seguro(async (req, res) => {
    const categoria = await store.get('categoria', req.params.id);
    if (!categoria) return res.status(404).json({ error: 'Categoría inexistente.' });
    const { email_sector } = req.body || {};
    if (!email_sector || !String(email_sector).includes('@')) {
      return res.status(400).json({ error: 'Debe indicar una dirección de correo válida.' });
    }
    await store.update('categoria', categoria.id_categoria, { email_sector: String(email_sector).trim() });
    res.json({ mensaje: `Email del sector "${categoria.nombre_categoria}" actualizado.` });
  }));

  // Lista de categorías activas para el formulario de productos.
  router.get('/categorias', auth.requiereSesion, seguro(async (req, res) => {
    const categorias = (await store.all('categoria')).filter((c) => c.estado === 'Activo');
    res.json(categorias.map(({ id_categoria, nombre_categoria, tipo_categoria }) => ({ id_categoria, nombre_categoria, tipo_categoria })));
  }));

  return router;
}

module.exports = { crearRutas };
