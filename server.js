/**
 * server.js
 * Punto de entrada de la aplicación.
 *
 * Portal de venta de paquetes turísticos por Internet (carrito de compras)
 * ONETP - Olimpíada Nacional de ETP / Programación - Instancia Institucional
 *
 * Arquitectura Cliente/Servidor:
 *  - Capa Cliente : páginas HTML/CSS/JavaScript servidas desde public/.
 *  - Capa Servidor: API REST (Express) con persistencia en archivos JSON
 *                   (carpeta data/). No requiere instalar base de datos.
 *
 * Ejecución:  npm install  →  npm start  →  http://localhost:3000
 */

'use strict';

const path = require('path');
const express = require('express');
const config = require('./config.json');
const { crearStore } = require('./src/store');
const { crearRutas } = require('./src/rutas');

/**
 * Inicializa la capa de datos, registra las rutas y levanta el servidor HTTP.
 */
async function iniciar() {
  const store = await crearStore(config);

  const app = express();
  app.use(express.json());

  // API REST (capa Servidor).
  app.use('/api', crearRutas(store));

  // Archivos estáticos del frontend (capa Cliente).
  app.use(express.static(path.join(__dirname, 'public')));

  // Manejo centralizado de errores no capturados en la API.
  app.use((error, req, res, next) => {
    console.error('[Error]', error.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  const puerto = config.puerto || 3000;
  app.listen(puerto, () => {
    console.log('══════════════════════════════════════════════════════════');
    console.log('  AIRSKY - Portal de paquetes turísticos');
    console.log(`  Servidor iniciado en:  http://localhost:${puerto}`);
    console.log('  Almacenamiento:        Archivos JSON (carpeta data/)');
    console.log('──────────────────────────────────────────────────────────');
    console.log('  Credenciales de prueba:');
    console.log('   · Jefe de Ventas -> usuario: jefeventas | contraseña: Ventas2026!');
    console.log('   · Cliente demo   -> usuario: juanperez  | contraseña: Cliente2026!');
    console.log('══════════════════════════════════════════════════════════');
  });
}

iniciar().catch((error) => {
  console.error('No se pudo iniciar la aplicación:', error.message);
  process.exit(1);
});
