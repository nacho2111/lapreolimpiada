/**
 * json-store.js
 * Capa de datos de la aplicación: persistencia en archivos JSON.
 * Cada tabla se guarda como un archivo dentro de la carpeta data/.
 *
 * Interfaz que expone:
 *   init(), all(), get(), insert(), update(), remove(), tipo
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { CLAVES_PRIMARIAS } = require('./tablas');
const { generarDatosIniciales } = require('../seed');

const CARPETA_DATOS = path.join(__dirname, '..', '..', 'data');

/** Datos en memoria: { tabla: [filas] } */
let datos = {};

/**
 * Devuelve la ruta del archivo JSON de una tabla.
 * @param {string} tabla - Nombre de la tabla.
 */
function archivoDe(tabla) {
  return path.join(CARPETA_DATOS, `${tabla}.json`);
}

/**
 * Guarda una tabla en su archivo JSON.
 * @param {string} tabla - Nombre de la tabla.
 */
function guardar(tabla) {
  fs.writeFileSync(archivoDe(tabla), JSON.stringify(datos[tabla], null, 2), 'utf8');
}

/**
 * Inicializa el almacenamiento: crea la carpeta data/ y, si es la primera
 * ejecución, genera los archivos con los datos semilla.
 */
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

/**
 * Devuelve todas las filas de una tabla.
 * @param {string} tabla - Nombre de la tabla.
 * @returns {Promise<Array>} Copia de las filas.
 */
async function all(tabla) {
  return datos[tabla].map((f) => ({ ...f }));
}

/**
 * Busca una fila por su clave primaria.
 * @param {string} tabla - Nombre de la tabla.
 * @param {*} id - Valor de la clave primaria.
 * @returns {Promise<object|null>} La fila encontrada o null.
 */
async function get(tabla, id) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[pk]) === String(id));
  return fila ? { ...fila } : null;
}

/**
 * Inserta una fila. Si la tabla es autonumérica asigna el próximo id.
 * @param {string} tabla - Nombre de la tabla.
 * @param {object} fila - Datos a insertar (sin el id).
 * @returns {Promise<object>} La fila insertada, con su id asignado.
 */
async function insert(tabla, fila) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const nueva = { ...fila };
  if (pk !== 'clave' && nueva[pk] === undefined) {
    const maxId = datos[tabla].reduce((m, f) => Math.max(m, Number(f[pk]) || 0), 0);
    nueva[pk] = maxId + 1;
  }
  datos[tabla].push(nueva);
  guardar(tabla);
  return { ...nueva };
}

/**
 * Actualiza una fila existente.
 * @param {string} tabla - Nombre de la tabla.
 * @param {*} id - Clave primaria de la fila.
 * @param {object} cambios - Campos a modificar.
 * @returns {Promise<boolean>} true si la fila existía.
 */
async function update(tabla, id, cambios) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const fila = datos[tabla].find((f) => String(f[pk]) === String(id));
  if (!fila) return false;
  Object.assign(fila, cambios);
  guardar(tabla);
  return true;
}

/**
 * Elimina una fila por su clave primaria.
 * @param {string} tabla - Nombre de la tabla.
 * @param {*} id - Clave primaria de la fila.
 * @returns {Promise<boolean>} true si la fila existía.
 */
async function remove(tabla, id) {
  const pk = CLAVES_PRIMARIAS[tabla];
  const antes = datos[tabla].length;
  datos[tabla] = datos[tabla].filter((f) => String(f[pk]) !== String(id));
  guardar(tabla);
  return datos[tabla].length < antes;
}

module.exports = { init, all, get, insert, update, remove, tipo: 'json' };
