/**
 * util.js
 * Funciones utilitarias compartidas por toda la aplicación.
 */

'use strict';

/**
 * Devuelve la fecha y hora actual en formato "YYYY-MM-DD HH:MM:SS".
 * @returns {string} Fecha y hora formateada.
 */
function fechaHoraActual() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/**
 * Redondea un número a 2 decimales (para importes monetarios).
 * @param {number} n - Valor a redondear.
 * @returns {number} Valor redondeado.
 */
function redondear(n) {
  return Math.round(Number(n) * 100) / 100;
}

module.exports = { fechaHoraActual, redondear };
