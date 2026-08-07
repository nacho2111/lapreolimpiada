'use strict';

const almacenJson = require('./almacen-json');

// los datos se guardan en archivos JSON dentro de data/
async function crearAlmacen() {
  await almacenJson.iniciar();
  return almacenJson;
}

module.exports = { crearAlmacen };
