'use strict';

dibujarBarra('inicio');

// si ya inicio sesion, lo mando a su pagina
const sesionActual = Sesion.obtener();
if (sesionActual) {
  location.href = sesionActual.tipo === 'interno' ? 'admin.html' : 'index.html';
}

function activarPestana(nombre) {
  document.querySelectorAll('.pestana').forEach((b) => b.classList.remove('activa'));
  document.querySelectorAll('.panel-pestana').forEach((p) => p.classList.remove('visible'));
  const boton = document.querySelector(`[data-panel="${nombre}"]`);
  boton.classList.add('activa');
  document.getElementById(nombre).classList.add('visible');
}

document.querySelectorAll('.pestana').forEach((boton) => {
  boton.addEventListener('click', () => activarPestana(boton.dataset.panel));
});

// si vino con #registro (desde el boton "Registrarse"), abre esa pestaña
if (location.hash === '#registro') activarPestana('panelRegistro');

document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const datos = await api('POST', '/api/auth/login', {
      usuario: document.getElementById('loginUsuario').value,
      contrasena: document.getElementById('loginContrasena').value
    });
    Sesion.guardar(datos);
    location.href = datos.tipo === 'interno' ? 'admin.html' : 'index.html';
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
});

document.getElementById('formRegistro').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const respuesta = await api('POST', '/api/auth/registro', {
      nombre: document.getElementById('regNombre').value,
      apellido: document.getElementById('regApellido').value,
      dni: document.getElementById('regDni').value,
      telefono: document.getElementById('regTelefono').value,
      email: document.getElementById('regEmail').value,
      direccion: document.getElementById('regDireccion').value,
      usuario: document.getElementById('regUsuario').value,
      contrasena: document.getElementById('regContrasena').value
    });
    mostrarMensaje('mensaje', respuesta.mensaje, 'exito');
    document.getElementById('formRegistro').reset();
    activarPestana('panelLogin');
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
});
