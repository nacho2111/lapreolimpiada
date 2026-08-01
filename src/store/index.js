'use strict';

const jsonStore = require('./json-store');

// los datos se guardan en archivos JSON dentro de data/
async function crearStore() {
  await jsonStore.init();
  return jsonStore;
}

module.exports = { crearStore };
