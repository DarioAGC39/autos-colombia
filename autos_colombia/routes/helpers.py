"""
==============================================================
AUTOS COLOMBIA - DECORADORES Y AYUDAS DE CONTROL DE ACCESO (RF-09)
Archivo: routes/helpers.py
Responsabilidad: Middleware y decoradores para proteger rutas
                  según autenticación y rol del usuario.
==============================================================
"""

from functools import wraps
from flask import session, redirect, url_for, flash, request


def login_required(f):
    """
    Decorador que restringe el acceso a usuarios autenticados.
    Si el usuario no ha iniciado sesión, es redirigido a la pantalla de login.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('usuario_id'):
            flash("Debes iniciar sesión para acceder al sistema.", "warning")
            return redirect(url_for('auth.login', next=request.path))
        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """
    Decorador que restringe el acceso EXCLUSIVAMENTE al rol ADMINISTRADOR.
    Si un empleado intenta acceder a una ruta administrativa protegida,
    se bloquea la petición y se le redirige al inicio con un mensaje explicativo.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('usuario_id'):
            flash("Debes iniciar sesión para acceder al sistema.", "warning")
            return redirect(url_for('auth.login', next=request.path))

        if session.get('rol') != 'ADMINISTRADOR':
            flash("Acceso denegado: Esta acción requiere permisos de Administrador.", "danger")
            return redirect(url_for('dashboard.index'))

        return f(*args, **kwargs)
    return decorated_function


def get_current_user():
    """Retorna un diccionario con los datos del usuario en sesión o None."""
    if not session.get('usuario_id'):
        return None
    return {
        'id_usuario': session.get('usuario_id'),
        'nombres': session.get('nombres'),
        'apellidos': session.get('apellidos'),
        'nombre_completo': session.get('nombre_completo'),
        'nombre_usuario': session.get('nombre_usuario'),
        'correo': session.get('correo'),
        'rol': session.get('rol')
    }
