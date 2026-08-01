'use strict';

// fecha tipo 2026-07-31 15:40:00, asi se ordena bien
function fechaHoraActual() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// deja los importes con 2 decimales
function redondear(n) {
  return Math.round(Number(n) * 100) / 100;
}

module.exports = { fechaHoraActual, redondear };
