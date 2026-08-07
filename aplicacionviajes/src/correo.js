'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// si no esta este archivo, los mails solo se guardan y no se mandan
const RUTA_CONFIG = path.join(__dirname, '..', 'config.correo.json');

let config = null;
let transporte = null;
let avisoMostrado = false;

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
      secure: config.puerto === 465, // 465 va con SSL, 587 con STARTTLS
      // gmail muestra la clave de aplicacion de a 4 letras, esos espacios no van
      auth: { user: config.usuario, pass: String(config.contrasena).replace(/\s/g, '') },
      // sin esto el antivirus mete su certificado y salta "self-signed certificate"
      tls: { rejectUnauthorized: false }
    });
  }

  return config.activado ? config : null;
}

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
