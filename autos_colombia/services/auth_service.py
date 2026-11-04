"""
==============================================================
AUTOS COLOMBIA - SERVICIO DE AUTENTICACIÓN
Archivo: services/auth_service.py
Responsabilidad: Gestión de credenciales, hashing seguro con Werkzeug,
                  validación de estado de cuenta y ciclo de vida de sesión.
==============================================================
"""

from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection
from dao.usuario_dao import UsuarioDAO


class AuthException(Exception):
    """Excepción para errores de autenticación y control de acceso."""
    pass


class AuthService:
    """
    Servicio de Autenticación y Seguridad para Autos Colombia.
    Asegura que nunca se procesen ni guarden contraseñas en texto plano.
    """

    @staticmethod
    def hashear_password(password_plana):
        """
        Genera un hash criptográfico robusto (scrypt / pbkdf2) para la contraseña.
        
        Args:
            password_plana (str): Contraseña en texto plano ingresada.
            
        Retorna:
            str: Hash de contraseña seguro para persistencia en MySQL.
        """
        if not password_plana or len(password_plana.strip()) < 6:
            raise AuthException("La contraseña debe tener al menos 6 caracteres.")
        return generate_password_hash(password_plana.strip())

    @staticmethod
    def verificar_password(password_hash, password_plana):
        """
        Comprueba una contraseña en texto plano contra el hash almacenado.
        """
        if not password_hash or not password_plana:
            return False
        return check_password_hash(password_hash, password_plana)

    @classmethod
    def autenticar(cls, identificador, password_plana):
        """
        Autentica a un usuario mediante su nombre de usuario o correo electrónico.
        Valida que la contraseña coincida y que la cuenta se encuentre ACTIVA.
        
        Args:
            identificador (str): Nombre de usuario o correo electrónico.
            password_plana (str): Contraseña ingresada.
            
        Retorna:
            dict: Datos del usuario autenticado (sin el hash de contraseña).
            
        Lanza:
            AuthException: Si las credenciales son inválidas o la cuenta está inactiva.
        """
        if not identificador or not identificador.strip():
            raise AuthException("Ingresa tu nombre de usuario o correo electrónico.")
        
        if not password_plana:
            raise AuthException("Ingresa tu contraseña.")

        conn = get_db_connection()
        if not conn:
            raise AuthException("Error de conexión con la base de datos MySQL.")

        try:
            cursor = conn.cursor(dictionary=True)
            usuario = UsuarioDAO.obtener_por_identificador(cursor, identificador)

            # Para mitigar ataques de enumeración de usuarios, usamos mensaje unificado
            if not usuario:
                raise AuthException("Usuario o contraseña incorrectos.")

            # Comprobación de estado de cuenta
            if usuario['estado'] != 'ACTIVO':
                raise AuthException("Tu cuenta se encuentra inactiva. Comunícate con un administrador.")

            # Comprobación del hash de contraseña
            if not cls.verificar_password(usuario['password_hash'], password_plana):
                raise AuthException("Usuario o contraseña incorrectos.")

            # Eliminamos el hash antes de retornar el diccionario del usuario a la sesión
            usuario.pop('password_hash', None)
            return usuario

        finally:
            if conn.is_connected():
                cursor.close()
                conn.close()

    @staticmethod
    def iniciar_sesion(session_obj, usuario):
        """
        Registra la información del usuario autenticado en la sesión de Flask.
        """
        session_obj.clear()
        session_obj['usuario_id'] = usuario['id_usuario']
        session_obj['nombres'] = usuario['nombres']
        session_obj['apellidos'] = usuario['apellidos']
        session_obj['nombre_completo'] = f"{usuario['nombres']} {usuario['apellidos']}"
        session_obj['nombre_usuario'] = usuario['nombre_usuario']
        session_obj['correo'] = usuario['correo']
        session_obj['rol'] = usuario['rol']
        session_obj.permanent = True

    @staticmethod
    def cerrar_sesion(session_obj):
        """
        Limpia todos los datos de la sesión activa del usuario.
        """
        session_obj.clear()
