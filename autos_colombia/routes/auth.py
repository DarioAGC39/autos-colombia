"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR DE AUTENTICACIÓN (RF-01, RF-02)
Archivo: routes/auth.py
Responsabilidad: Rutas HTTP para inicio y cierre de sesión.
==============================================================
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from services.auth_service import AuthService, AuthException

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    RF-01: Inicio de sesión con nombre de usuario o correo y contraseña.
    Valida credenciales contra MySQL y estado activo de la cuenta.
    """
    # Si ya tiene una sesión activa válida, redirigir al panel principal
    if session.get('usuario_id'):
        return redirect(url_for('dashboard.index'))

    if request.method == 'POST':
        identificador = request.form.get('identificador', '').strip()
        password = request.form.get('password', '')
        siguiente = request.args.get('next') or request.form.get('next')

        try:
            usuario = AuthService.autenticar(identificador, password)
            AuthService.iniciar_sesion(session, usuario)

            flash(f"¡Bienvenido, {usuario['nombres']}! Has ingresado como {usuario['rol'].capitalize()}.", "success")

            # Redirigir a la URL solicitada originalmente o al inicio
            if siguiente and siguiente.startswith('/'):
                return redirect(siguiente)
            return redirect(url_for('dashboard.index'))

        except AuthException as err:
            flash(str(err), "danger")
            return render_template('usuarios/login.html', identificador=identificador)

    return render_template('usuarios/login.html')


@auth_bp.route('/logout', methods=['GET', 'POST'])
def logout():
    """
    RF-02: Cierre de sesión y destrucción segura del contexto autenticado.
    """
    AuthService.cerrar_sesion(session)
    flash("Has cerrado sesión exitosamente.", "info")
    return redirect(url_for('auth.login'))
