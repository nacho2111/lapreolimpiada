/**
 * index.js
 * Página de inicio: registro de clientes (CU-01) e inicio de sesión (CU-02).
 */

'use strict';

dibujarBarra('inicio');

// Si ya hay sesión, redirigir a la página que corresponda.
const sesionActual = Sesion.obtener();
if (sesionActual) {
  location.href = sesionActual.tipo === 'interno' ? 'admin.html' : 'catalogo.html';
}

// Cambio de pestañas Iniciar sesión / Registrarse.
document.querySelectorAll('.pestana').forEach((boton) => {
  boton.addEventListener('click', () => {
    document.querySelectorAll('.pestana').forEach((b) => b.classList.remove('activa'));
    document.querySelectorAll('.panel-pestana').forEach((p) => p.classList.remove('visible'));
    boton.classList.add('activa');
    document.getElementById(boton.dataset.panel).classList.add('visible');
  });
});

// CU-02: Iniciar Sesión.
document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const datos = await api('POST', '/api/auth/login', {
      usuario: document.getElementById('loginUsuario').value,
      contrasena: document.getElementById('loginContrasena').value
    });
    Sesion.guardar(datos);
    location.href = datos.tipo === 'interno' ? 'admin.html' : 'catalogo.html';
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
});

// CU-01: Registrar Cliente.
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
    // Volver a la pestaña de inicio de sesión.
    document.querySelector('[data-panel="panelLogin"]').click();
  } catch (error) {
    mostrarMensaje('mensaje', error.message, 'error');
  }
});
