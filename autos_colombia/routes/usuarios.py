"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR DE GESTIÓN DE USUARIOS
Archivo: routes/usuarios.py
Responsabilidad: Rutas administrativas para CRUD de usuarios,
                  búsquedas, asignación de roles y activación/desactivación.
Control de Acceso: EXCLUSIVO para rol ADMINISTRADOR (@admin_required).
==============================================================
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from routes.helpers import admin_required
from services.usuario_service import UsuarioService, UsuarioServiceException

usuarios_bp = Blueprint('usuarios', __name__, url_prefix='/usuarios')


@usuarios_bp.route('', methods=['GET'])
@admin_required
def listar():
    """
    RF-04: Consultar usuarios.
    RF-05: Buscar usuarios por nombre, identificación o nombre de usuario.
    """
    busqueda = request.args.get('q', '').strip()
    try:
        usuarios = UsuarioService.listar_usuarios(busqueda=busqueda)
        resumen = UsuarioService.obtener_resumen()
        return render_template(
            'usuarios/index.html',
            usuarios=usuarios,
            busqueda=busqueda,
            resumen=resumen
        )
    except UsuarioServiceException as e:
        flash(str(e), "danger")
        return render_template('usuarios/index.html', usuarios=[], busqueda=busqueda, resumen={})


@usuarios_bp.route('/nuevo', methods=['GET', 'POST'])
@admin_required
def crear():
    """
    RF-03: Registrar nuevo usuario en el sistema.
    """
    if request.method == 'POST':
        datos = {
            'nombres': request.form.get('nombres', ''),
            'apellidos': request.form.get('apellidos', ''),
            'identificacion': request.form.get('identificacion', ''),
            'correo': request.form.get('correo', ''),
            'nombre_usuario': request.form.get('nombre_usuario', ''),
            'password': request.form.get('password', ''),
            'rol': request.form.get('rol', 'EMPLEADO'),
            'estado': request.form.get('estado', 'ACTIVO')
        }

        try:
            id_nuevo = UsuarioService.crear_usuario(datos)
            flash(f"Usuario '{datos['nombres']} {datos['apellidos']}' ({datos['nombre_usuario']}) registrado exitosamente con rol {datos['rol']}.", "success")
            return redirect(url_for('usuarios.listar'))
        except UsuarioServiceException as e:
            flash(str(e), "danger")
            return render_template('usuarios/form.html', modo='crear', usuario=datos)

    return render_template('usuarios/form.html', modo='crear', usuario={
        'rol': 'EMPLEADO',
        'estado': 'ACTIVO'
    })


@usuarios_bp.route('/<int:id_usuario>/editar', methods=['GET', 'POST'])
@admin_required
def editar(id_usuario):
    """
    RF-06: Modificar información de usuarios existentes.
    RF-08: Asignar o cambiar roles (ADMINISTRADOR / EMPLEADO).
    """
    try:
        usuario_actual = UsuarioService.obtener_por_id(id_usuario)
    except UsuarioServiceException as e:
        flash(str(e), "danger")
        return redirect(url_for('usuarios.listar'))

    if request.method == 'POST':
        datos = {
            'nombres': request.form.get('nombres', ''),
            'apellidos': request.form.get('apellidos', ''),
            'identificacion': request.form.get('identificacion', ''),
            'correo': request.form.get('correo', ''),
            'nombre_usuario': request.form.get('nombre_usuario', ''),
            'password': request.form.get('password', ''),  # Opcional en edición
            'rol': request.form.get('rol', usuario_actual['rol']),
            'estado': request.form.get('estado', usuario_actual['estado'])
        }

        try:
            admin_actual_id = session.get('usuario_id')
            UsuarioService.actualizar_usuario(id_usuario, datos, usuario_actual_sesion_id=admin_actual_id)
            
            # Si el admin editó su propio usuario, actualizar datos en la sesión activa
            if admin_actual_id and int(admin_actual_id) == id_usuario:
                session['nombres'] = datos['nombres']
                session['apellidos'] = datos['apellidos']
                session['nombre_completo'] = f"{datos['nombres']} {datos['apellidos']}"
                session['nombre_usuario'] = datos['nombre_usuario']
                session['correo'] = datos['correo']
                session['rol'] = datos['rol']

            flash(f"La información del usuario '{datos['nombre_usuario']}' fue actualizada correctamente.", "success")
            return redirect(url_for('usuarios.listar'))

        except UsuarioServiceException as e:
            flash(str(e), "danger")
            datos['id_usuario'] = id_usuario
            return render_template('usuarios/form.html', modo='editar', usuario=datos)

    return render_template('usuarios/form.html', modo='editar', usuario=usuario_actual)


@usuarios_bp.route('/<int:id_usuario>/cambiar-estado', methods=['POST'])
@admin_required
def cambiar_estado(id_usuario):
    """
    RF-07: Activar o desactivar cuenta de usuario.
    No elimina el registro de la base de datos (eliminación lógica).
    """
    nuevo_estado = request.form.get('nuevo_estado', '').strip().upper()
    admin_actual_id = session.get('usuario_id')

    try:
        UsuarioService.cambiar_estado(id_usuario, nuevo_estado, usuario_actual_sesion_id=admin_actual_id)
        mensaje_estado = "activada" if nuevo_estado == 'ACTIVO' else "desactivada"
        flash(f"La cuenta del usuario ha sido {mensaje_estado} correctamente.", "success")
    except UsuarioServiceException as e:
        flash(str(e), "danger")

    return redirect(url_for('usuarios.listar'))
