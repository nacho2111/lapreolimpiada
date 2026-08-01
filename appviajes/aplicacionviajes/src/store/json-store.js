'use strict';

const fs = require('fs');
const path = require('path');
const { CLAVES_PRIMARIAS } = require('./tablas');
const { generarDatosIniciales } = require('../seed');

const CARPETA_DATOS = path.join(__dirname, '..', '..', 'data');

let datos = {};

function archivoDe(tabla) {
  return path.join(CARPETA_DATOS, `${tabla}.json`);
}

function guardar(tabla) {
  fs.writeFileSync(archivoDe(tabla), JSON.stringify(datos[tabla], null, 2), 'utf8');
}

// la primera vez crea los archivos con datos de prueba, despues los lee y listo
async function init() {
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

async function all(tabla) {
  return datos[tabla].map((f) => ({ ...f }));
}

async function get(tabla, id) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[pk]) === String(id));
  return fila ? { ...fila } : null;
}

async function insert(tabla, fila) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const nueva = { ...fila };
  // el id lo genero yo, busco el mas alto y le sumo uno
  if (pk !== 'clave' && nueva[pk] === undefined) {
    const maxId = datos[tabla].reduce((m, f) => Math.max(m, Number(f[pk]) || 0), 0);
    nueva[pk] = maxId + 1;
  }
  datos[tabla].push(nueva);
  guardar(tabla);
  return { ...nueva };
}

async function update(tabla, id, cambios) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[pk]) === String(id));
  if (!fila) return false;
  Object.assign(fila, cambios);
  guardar(tabla);
  return true;
}

async function remove(tabla, id) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const antes = datos[tabla].length;
  datos[tabla] = datos[tabla].filter((f) => String(f[pk]) !== String(id));
  guardar(tabla);
  return datos[tabla].length < antes;
}

module.exports = { init, all, get, insert, update, remove, tipo: 'json' };
