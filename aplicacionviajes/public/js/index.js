'use strict';

dibujarBarra('inicio');

// botones "Reservar" de los destacados: van derecho al carrito
document.querySelectorAll('.reservar').forEach((b) => {
  b.addEventListener('click', () => reservarDesdeTarjeta(b));
});
