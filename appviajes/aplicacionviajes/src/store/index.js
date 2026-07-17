/**
 * store/index.js
 * Selector de la capa de datos.
 *
 * Esta aplicación persiste toda la información en archivos JSON dentro de la
 * carpeta data/. No requiere instalar ningún motor de base de datos: funciona
 * en cualquier computadora que tenga Node.js.
 */

'use strict';

const jsonStore = require('./json-store');

/**
 * Inicializa y devuelve la capa de datos a utilizar.
 * @param {object} config - Contenido de config.json (no se usa por ahora).
 * @returns {Promise<object>} Store listo para usar (init ya ejecutado).
 */
async function crearStore(config) {
  await jsonStore.init();
  return jsonStore;
}

module.exports = { crearStore };
