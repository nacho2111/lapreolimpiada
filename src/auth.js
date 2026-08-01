'use strict';

const crypto = require('crypto');

// las sesiones quedan en memoria, si reinicio el server hay que entrar de nuevo
const sesiones = new Map();

// la contraseña se guarda como "sal:hash", nunca en texto plano
function hashContrasena(contrasena) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(contrasena), sal, 64).toString('hex');
  return `${sal}:${hash}`;
}

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

function crearSesion(datos) {
  const token = crypto.randomUUID();
  sesiones.set(token, datos);
  return token;
}

function obtenerSesion(token) {
  return sesiones.get(token) || null;
}

function cerrarSesion(token) {
  sesiones.delete(token);
}

// se usan antes de cada ruta, para ver quien puede entrar
function requiereSesion(req, res, next) {
  const token = req.headers['x-auth-token'];
  const sesion = obtenerSesion(token);
  if (!sesion) {
    return res.status(401).json({ error: 'Debe iniciar sesión para realizar esta acción.' });
  }
  req.sesion = sesion;
  next();
}

function requiereInterno(req, res, next) {
  requiereSesion(req, res, () => {
    if (req.sesion.tipo !== 'interno') {
      return res.status(403).json({ error: 'Acceso restringido al personal autorizado de la empresa.' });
    }
    next();
  });
}

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
