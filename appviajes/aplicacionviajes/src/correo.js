/**
 * correo.js
 * Envío REAL de correos electrónicos mediante SMTP (nodemailer).
 *
 * Las credenciales se leen del archivo "config.correo.json" (que NO se sube a
 * Git). Si ese archivo no existe o tiene "activado": false, el envío real se
 * omite y la aplicación sigue funcionando igual: los correos se siguen
 * registrando en la tabla EMAIL (requisito de la consigna). Así el sistema
 * anda con o sin envío real configurado.
 *
 * Para activarlo, copiar "config.correo.ejemplo.json" a "config.correo.json"
 * y completar los datos (ver README, sección "Envío real de correos").
 */

'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const RUTA_CONFIG = path.join(__dirname, '..', 'config.correo.json');

/** Configuración cargada (o null si no está activada). */
let config = null;
/** Transporte de nodemailer reutilizable. */
let transporte = null;
/** Evita mostrar el mismo aviso repetidas veces en la consola. */
let avisoMostrado = false;

/**
 * Carga la configuración de correo la primera vez que se la necesita.
 * @returns {object|null} Configuración válida y activada, o null.
 */
function cargarConfig() {
  if (config !== null) return config.activado ? config : null;

  try {
    if (!fs.existsSync(RUTA_CONFIG)) {
      config = { activado: false };
    } else {
      config = JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));
    }
  } catch (error) {
    console.warn('[Correo] No se pudo leer config.correo.json:', error.message);
    config = { activado: false };
  }

  if (config.activado && !transporte) {
    transporte = nodemailer.createTransport({
      host: config.host,
      port: config.puerto,
      secure: config.puerto === 465, // 465 = SSL; 587 = STARTTLS
      // Se quitan los espacios de la contraseña de aplicación (Gmail la muestra
      // en grupos de 4 solo por legibilidad; la clave real no lleva espacios).
      auth: { user: config.usuario, pass: String(config.contrasena).replace(/\s/g, '') },
      // Muchos antivirus/firewalls (ESET, Avast, Kaspersky, etc.) inspeccionan el
      // tráfico TLS insertando su propio certificado, lo que provoca el error
      // "self-signed certificate in certificate chain". Esto le indica a Node que
      // acepte esa cadena de certificados para poder enviar igual.
      tls: { rejectUnauthorized: false }
    });
  }

  return config.activado ? config : null;
}

/**
 * Envía un correo real por SMTP. Nunca lanza excepción: si falla el envío
 * (o no está configurado), devuelve false y la compra continúa normalmente.
 * @param {object} datos - { destinatario, asunto, mensaje }.
 * @returns {Promise<boolean>} true si el correo se envió realmente.
 */
async function enviar({ destinatario, asunto, mensaje }) {
  const cfg = cargarConfig();
  if (!cfg) {
    if (!avisoMostrado) {
      console.log('[Correo] Envío real desactivado: los correos solo se registran en la tabla EMAIL.');
      avisoMostrado = true;
    }
    return false;
  }

  try {
    await transporte.sendMail({
      from: cfg.remitente || cfg.usuario,
      to: destinatario,
      subject: asunto,
      text: mensaje
    });
    console.log(`[Correo] Enviado a ${destinatario}: ${asunto}`);
    return true;
  } catch (error) {
    console.warn(`[Correo] No se pudo enviar a ${destinatario}:`, error.message);
    return false;
  }
}

module.exports = { enviar };
