'use strict';

const fs = require('fs');
const path = require('path');
const { CLAVES_PRIMARIAS } = require('./tablas');
const { generarDatosIniciales } = require('../datos-iniciales');

const CARPETA_DATOS = path.join(__dirname, '..', '..', 'data');

let datos = {};

function archivoDe(tabla) {
  return path.join(CARPETA_DATOS, `${tabla}.json`);
}

function guardar(tabla) {
  fs.writeFileSync(archivoDe(tabla), JSON.stringify(datos[tabla], null, 2), 'utf8');
}

// la primera vez crea los archivos con datos de prueba, despues los lee y listo
async function iniciar() {
  if (!fs.existsSync(CARPETA_DATOS)) fs.mkdirSync(CARPETA_DATOS, { recursive: true });

  const semilla = generarDatosIniciales();
  for (const tabla of Object.keys(CLAVES_PRIMARIAS)) {
    const archivo = archivoDe(tabla);
    if (fs.existsSync(archivo)) {
      datos[tabla] = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } else {
      datos[tabla] = semilla[tabla] || [];
      guardar(tabla);
    }
  }
}

async function todos(tabla) {
  return datos[tabla].map((f) => ({ ...f }));
}

async function obtener(tabla, id) {
  const clave = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[clave]) === String(id));
  return fila ? { ...fila } : null;
}

async function insertar(tabla, fila) {
  const clave = CLAVES_PRIMARIAS[tabla];
  const nueva = { ...fila };
  // el id lo genero yo, busco el mas alto y le sumo uno
  if (nueva[clave] === undefined) {
    const ultimoId = datos[tabla].reduce((m, f) => Math.max(m, Number(f[clave]) || 0), 0);
    nueva[clave] = ultimoId + 1;
  }
  datos[tabla].push(nueva);
  guardar(tabla);
  return { ...nueva };
}

async function actualizar(tabla, id, cambios) {
  const clave = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[clave]) === String(id));
  if (!fila) return false;
  Object.assign(fila, cambios);
  guardar(tabla);
  return true;
}

async function eliminar(tabla, id) {
  const clave = CLAVES_PRIMARIAS[tabla];
  const antes = datos[tabla].length;
  datos[tabla] = datos[tabla].filter((f) => String(f[clave]) !== String(id));
  guardar(tabla);
  return datos[tabla].length < antes;
}

module.exports = { iniciar, todos, obtener, insertar, actualizar, eliminar, tipo: 'json' };
