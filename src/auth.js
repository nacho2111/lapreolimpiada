/**
 * auth.js
 * Módulo de autenticación y seguridad.
 * - Hash de contraseñas con scrypt (sal aleatoria, sin dependencias externas).
 * - Manejo de sesiones en memoria mediante tokens aleatorios.
 *
 * Proyecto: Portal de venta de paquetes turísticos (ONETP - Programación)
 */

'use strict';

const crypto = require('crypto');

/** Sesiones activas: token -> { tipo: 'cliente'|'interno', id, nombre, rol } */
const sesiones = new Map();

/**
 * Genera el hash de una contraseña en formato "sal:hash".
 * @param {string} contrasena - Contraseña en texto plano.
 * @returns {string} Cadena "sal:hash" en hexadecimal.
 */
function hashContrasena(contrasena) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(contrasena), sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

/**
 * Verifica una contraseña contra un hash almacenado.
 * @param {string} contrasena - Contraseña ingresada por el usuario.
 * @param {string} almacenada - Cadena "sal:hash" guardada en la base de datos.
 * @returns {boolean} true si la contraseña es correcta.
 */
function verificarContrasena(contrasena, almacenada) {
  if (!almacenada || !almacenada.includes(':')) return false;
  const [sal, hashGuardado] = almacenada.split(':');
  const hash = crypto.scryptSync(String(contrasena), sal, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashGuardado, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Crea una sesión nueva y devuelve el token generado.
 * @param {object} datos - Datos del usuario autenticado.
 * @returns {string} Token de sesión.
 */
function crearSesion(datos) {
  const token = crypto.randomUUID();
  sesiones.set(token, datos);
  return token;
}

/**
 * Obtiene la sesión asociada a un token.
 * @param {string} token - Token enviado por el cliente.
 * @returns {object|null} Datos de la sesión o null si no existe.
 */
function obtenerSesion(token) {
  return sesiones.get(token) || null;
}

/**
 * Cierra (elimina) una sesión.
 * @param {string} token - Token de la sesión a cerrar.
 */
function cerrarSesion(token) {
  sesiones.delete(token);
}

/**
 * Middleware de Express: exige un usuario autenticado (cliente o interno).
 */
function requiereSesion(req, res, next) {
  const token = req.headers['x-auth-token'];
  const sesion = obtenerSesion(token);
  if (!sesion) {
    return res.status(401).json({ error: 'Debe iniciar sesión para realizar esta acción.' });
  }
  req.sesion = sesion;
  next();
}

/**
 * Middleware de Express: exige un usuario interno (Jefe de Ventas / Personal de Ventas).
 */
function requiereInterno(req, res, next) {
  requiereSesion(req, res, () => {
    if (req.sesion.tipo !== 'interno') {
      return res.status(403).json({ error: 'Acceso restringido al personal autorizado de la empresa.' });
    }
    next();
  });
}

/**
 * Middleware de Express: exige un usuario de tipo cliente.
 */
function requiereCliente(req, res, next) {
  requiereSesion(req, res, () => {
    if (req.sesion.tipo !== 'cliente') {
      return res.status(403).json({ error: 'Esta función es exclusiva de los clientes.' });
    }
    next();
  });
}

module.exports = {
  hashContrasena,
  verificarContrasena,
  crearSesion,
  obtenerSesion,
  cerrarSesion,
  requiereSesion,
  requiereInterno,
  requiereCliente
};
