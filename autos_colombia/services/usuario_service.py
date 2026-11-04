"""
==============================================================
AUTOS COLOMBIA - SERVICIO DE GESTIÓN DE USUARIOS
Archivo: services/usuario_service.py
Responsabilidad: Reglas de negocio para administración de cuentas,
                  validaciones de unicidad, roles y estados.
==============================================================
"""

import re
from database import get_db_connection
from dao.usuario_dao import UsuarioDAO
from services.auth_service import AuthService


class UsuarioServiceException(Exception):
    """Excepción para errores en las reglas de negocio de usuarios."""
    pass


class UsuarioService:
    """
    Capa de Servicios para la Administración de Usuarios y Roles.
    Garantiza la integridad y reglas de acceso del sistema Autos Colombia.
    """

    ROLES_PERMITIDOS = ['ADMINISTRADOR', 'EMPLEADO']
    ESTADOS_PERMITIDOS = ['ACTIVO', 'INACTIVO']

    @staticmethod
    def _validar_correo(correo):
        """Valida que el correo tenga una estructura sintáctica válida."""
        patron = r'^[\w\.-]+@([\w-]+\.)+[\w-]{2,4}$'
        return bool(re.match(patron, correo))

    @classmethod
    def validar_datos_usuario(cls, datos, es_edicion=False, usuario_existente=None):
        """
        Valida exhaustivamente los datos de entrada de un usuario.
        
        Args:
            datos (dict): Diccionario con los campos del formulario.
            es_edicion (bool): True si es actualización, False si es creación.
            usuario_existente (dict | None): Datos actuales en caso de edición.
            
        Retorna:
            dict: Datos limpios y normalizados.
        """
        nombres = datos.get('nombres', '').strip()
        apellidos = datos.get('apellidos', '').strip()
        identificacion = datos.get('identificacion', '').strip()
        correo = datos.get('correo', '').strip().lower()
        nombre_usuario = datos.get('nombre_usuario', '').strip()
        rol = datos.get('rol', 'EMPLEADO').strip().upper()
        estado = datos.get('estado', 'ACTIVO').strip().upper()
        password = datos.get('password', '').strip()

        # 1. Campos obligatorios
        if not nombres or len(nombres) < 2:
            raise UsuarioServiceException("El campo Nombres es obligatorio y debe tener al menos 2 letras.")
        
        if not apellidos or len(apellidos) < 2:
            raise UsuarioServiceException("El campo Apellidos es obligatorio y debe tener al menos 2 letras.")

        if not identificacion or len(identificacion) < 5:
            raise UsuarioServiceException("El número de identificación debe tener al menos 5 dígitos o caracteres.")

        if not correo or not cls._validar_correo(correo):
            raise UsuarioServiceException("Ingresa una dirección de correo electrónico válida (ej: usuario@autoscolombia.com).")

        if not nombre_usuario or len(nombre_usuario) < 3:
            raise UsuarioServiceException("El nombre de usuario debe tener al menos 3 caracteres.")

        if not re.match(r'^[a-zA-Z0-9_\.-]+$', nombre_usuario):
            raise UsuarioServiceException("El nombre de usuario solo puede contener letras, números, puntos y guiones.")

        # 2. Rol y estado
        if rol not in cls.ROLES_PERMITIDOS:
            raise UsuarioServiceException(f"Rol no válido. Opciones permitidas: {', '.join(cls.ROLES_PERMITIDOS)}.")

        if estado not in cls.ESTADOS_PERMITIDOS:
            raise UsuarioServiceException(f"Estado no válido. Opciones permitidas: {', '.join(cls.ESTADOS_PERMITIDOS)}.")

        # 3. Contraseña (obligatoria al crear, opcional al editar)
        if not es_edicion:
            if not password or len(password) < 6:
                raise UsuarioServiceException("La contraseña es obligatoria y debe tener al menos 6 caracteres.")
        else:
            if password and len(password) < 6:
                raise UsuarioServiceException("Si deseas cambiar la contraseña, debe tener al menos 6 caracteres.")

        return {
            'nombres': nombres,
            'apellidos': apellidos,
            'identificacion': identificacion,
            'correo': correo,
            'nombre_usuario': nombre_usuario,
            'rol': rol,
            'estado': estado,
            'password': password
        }

    @classmethod
    def listar_usuarios(cls, busqueda=None):
        """Retorna todos los usuarios registrados con opción de filtrado."""
        conn = get_db_connection()
        if not conn:
            raise UsuarioServiceException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)
            return UsuarioDAO.listar_todos(cursor, busqueda)
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @classmethod
    def obtener_por_id(cls, id_usuario):
        """Busca y retorna un usuario por su id."""
        conn = get_db_connection()
        if not conn:
            raise UsuarioServiceException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)
            usuario = UsuarioDAO.obtener_por_id(cursor, id_usuario)
            if not usuario:
                raise UsuarioServiceException("El usuario consultado no existe en el sistema.")
            return usuario
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @classmethod
    def crear_usuario(cls, datos):
        """
        Valida, verifica unicidad y registra un nuevo usuario en la base de datos.
        """
        datos_validados = cls.validar_datos_usuario(datos, es_edicion=False)

        conn = get_db_connection()
        if not conn:
            raise UsuarioServiceException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)

            # Validar unicidad de identificación
            if UsuarioDAO.existe_identificacion(cursor, datos_validados['identificacion']):
                raise UsuarioServiceException(f"Ya existe un usuario con la identificación '{datos_validados['identificacion']}'.")

            # Validar unicidad de correo
            if UsuarioDAO.existe_correo(cursor, datos_validados['correo']):
                raise UsuarioServiceException(f"El correo electrónico '{datos_validados['correo']}' ya se encuentra registrado.")

            # Validar unicidad de nombre de usuario
            if UsuarioDAO.existe_nombre_usuario(cursor, datos_validados['nombre_usuario']):
                raise UsuarioServiceException(f"El nombre de usuario '{datos_validados['nombre_usuario']}' ya está en uso.")

            # Generar hash seguro
            password_hash = AuthService.hashear_password(datos_validados['password'])

            id_nuevo = UsuarioDAO.crear_usuario(
                cursor=cursor,
                nombres=datos_validados['nombres'],
                apellidos=datos_validados['apellidos'],
                identificacion=datos_validados['identificacion'],
                correo=datos_validados['correo'],
                nombre_usuario=datos_validados['nombre_usuario'],
                password_hash=password_hash,
                rol=datos_validados['rol'],
                estado=datos_validados['estado']
            )

            conn.commit()
            return id_nuevo

        except Exception as e:
            conn.rollback()
            if isinstance(e, UsuarioServiceException):
                raise e
            raise UsuarioServiceException(f"Error al registrar el usuario: {str(e)}")

        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @classmethod
    def actualizar_usuario(cls, id_usuario, datos, usuario_actual_sesion_id=None):
        """
        Actualiza la información de un usuario existente garantizando reglas de seguridad.
        """
        conn = get_db_connection()
        if not conn:
            raise UsuarioServiceException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)
            usuario_actual = UsuarioDAO.obtener_por_id(cursor, id_usuario)
            if not usuario_actual:
                raise UsuarioServiceException("El usuario a modificar no existe.")

            datos_validados = cls.validar_datos_usuario(datos, es_edicion=True, usuario_existente=usuario_actual)

            # Validar unicidad excluyendo el registro actual
            if UsuarioDAO.existe_identificacion(cursor, datos_validados['identificacion'], excluir_id=id_usuario):
                raise UsuarioServiceException(f"La identificación '{datos_validados['identificacion']}' ya pertenece a otro usuario.")

            if UsuarioDAO.existe_correo(cursor, datos_validados['correo'], excluir_id=id_usuario):
                raise UsuarioServiceException(f"El correo '{datos_validados['correo']}' ya pertenece a otro usuario.")

            if UsuarioDAO.existe_nombre_usuario(cursor, datos_validados['nombre_usuario'], excluir_id=id_usuario):
                raise UsuarioServiceException(f"El nombre de usuario '{datos_validados['nombre_usuario']}' ya está ocupado.")

            # Regla de protección del último administrador
            if usuario_actual['rol'] == 'ADMINISTRADOR':
                cambia_a_empleado = (datos_validados['rol'] != 'ADMINISTRADOR')
                cambia_a_inactivo = (datos_validados['estado'] != 'ACTIVO')
                
                if cambia_a_empleado or cambia_a_inactivo:
                    admins_activos = UsuarioDAO.contar_administradores_activos(cursor)
                    if admins_activos <= 1:
                        raise UsuarioServiceException(
                            "Operación denegada: Este usuario es el único Administrador activo del sistema. "
                            "No puedes cambiar su rol ni desactivarlo sin asignar antes otro Administrador."
                        )

            # Actualizar datos generales
            UsuarioDAO.actualizar_usuario(
                cursor=cursor,
                id_usuario=id_usuario,
                nombres=datos_validados['nombres'],
                apellidos=datos_validados['apellidos'],
                identificacion=datos_validados['identificacion'],
                correo=datos_validados['correo'],
                nombre_usuario=datos_validados['nombre_usuario'],
                rol=datos_validados['rol'],
                estado=datos_validados['estado']
            )

            # Actualizar contraseña si se proporcionó una nueva
            if datos_validados['password']:
                nuevo_hash = AuthService.hashear_password(datos_validados['password'])
                UsuarioDAO.actualizar_password(cursor, id_usuario, nuevo_hash)

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            if isinstance(e, UsuarioServiceException):
                raise e
            raise UsuarioServiceException(f"Error al actualizar el usuario: {str(e)}")

        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @classmethod
    def cambiar_estado(cls, id_usuario, nuevo_estado, usuario_actual_sesion_id=None):
        """
        Cambia el estado de un usuario entre ACTIVO e INACTIVO (RF-07).
        Aplica la regla de salvaguarda para evitar que el administrador se desactive
        a sí mismo dejando al sistema sin acceso administrativo.
        """
        if nuevo_estado not in cls.ESTADOS_PERMITIDOS:
            raise UsuarioServiceException("Estado no permitido.")

        conn = get_db_connection()
        if not conn:
            raise UsuarioServiceException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)
            usuario = UsuarioDAO.obtener_por_id(cursor, id_usuario)
            if not usuario:
                raise UsuarioServiceException("El usuario indicado no existe.")

            # Validación de seguridad para desactivaciones
            if nuevo_estado == 'INACTIVO':
                # Si es administrador, comprobar cuántos administradores activos quedan
                if usuario['rol'] == 'ADMINISTRADOR':
                    admins_activos = UsuarioDAO.contar_administradores_activos(cursor)
                    if admins_activos <= 1:
                        raise UsuarioServiceException(
                            "No se puede desactivar este usuario porque es el único Administrador activo del sistema. "
                            "Registra o activa otro Administrador antes de realizar esta acción."
                        )
                    
                    if usuario_actual_sesion_id and int(usuario_actual_sesion_id) == int(id_usuario):
                        # Auto-desactivación del propio admin
                        if admins_activos <= 1:
                            raise UsuarioServiceException(
                                "No puedes desactivar tu propia cuenta si eso deja al sistema sin acceso administrativo."
                            )

            UsuarioDAO.cambiar_estado(cursor, id_usuario, nuevo_estado)
            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            if isinstance(e, UsuarioServiceException):
                raise e
            raise UsuarioServiceException(f"Error al cambiar el estado del usuario: {str(e)}")

        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @classmethod
    def obtener_resumen(cls):
        """Retorna estadísticas generales de usuarios para paneles y métricas."""
        conn = get_db_connection()
        if not conn:
            return {'total': 0, 'activos': 0, 'inactivos': 0, 'administradores': 0, 'empleados': 0}

        try:
            cursor = conn.cursor(dictionary=True)
            return UsuarioDAO.contar_resumen(cursor)
        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()
