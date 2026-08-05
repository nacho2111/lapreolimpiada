'use strict';

const path = require('path');
const express = require('express');
const config = require('./config.json');
const { crearStore } = require('./src/store');
const { crearRutas } = require('./src/rutas');

async function iniciar() {
  const store = await crearStore();

  const app = express();
  app.use(express.json());

  // la API, todo lo que arranca con /api
  app.use('/api', crearRutas(store));

  // las paginas, el css y las imagenes
  app.use(express.static(path.join(__dirname, 'public')));

  
  app.use((error, req, res, next) => {
    console.error('[Error]', error.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  const puerto = process.env.PORT || config.puerto || 3000;
  app.listen(puerto, () => {
    console.log(`  Servidor iniciado en:  http://localhost:${puerto}`);
    console.log('  Almacenamiento:        Archivos JSON (carpeta data/)');
    console.log('──────────────────────────────────────────────────────────');
    console.log('  Credenciales de prueba:');
    console.log('   · Jefe de Ventas -> usuario: jefeventas | contraseña: Ventas2026!');
    
  });
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar la aplicación:', error.message);
  process.exit(1);
});
