"""
==============================================================
AUTOS COLOMBIA - DAO: USUARIO
Archivo: dao/usuario_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'usuario'.
==============================================================
"""

import mysql.connector


class UsuarioDAO:
    """Objeto de Acceso a Datos (DAO) para la entidad Usuario."""

    @staticmethod
    def obtener_por_id(cursor, id_usuario):
        """
        Busca un usuario por su clave primaria (id_usuario).
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            id_usuario (int): Identificador único del usuario.
            
        Retorna:
            dict | None: Registro del usuario si existe, o None.
        """
        sql = """
            SELECT id_usuario, nombres, apellidos, identificacion, 
                   correo, nombre_usuario, password_hash, rol, estado, fecha_creacion
            FROM usuario
            WHERE id_usuario = %s
        """
        cursor.execute(sql, (id_usuario,))
        return cursor.fetchone()

    @staticmethod
    def obtener_por_identificador(cursor, identificador):
        """
        Busca un usuario por su nombre de usuario o por su correo electrónico.
        Útil para el inicio de sesión flexible.
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            identificador (str): Nombre de usuario o correo.
            
        Retorna:
            dict | None: Registro del usuario si existe, o None.
        """
        sql = """
            SELECT id_usuario, nombres, apellidos, identificacion, 
                   correo, nombre_usuario, password_hash, rol, estado, fecha_creacion
            FROM usuario
            WHERE LOWER(nombre_usuario) = LOWER(%s) OR LOWER(correo) = LOWER(%s)
            LIMIT 1
        """
        cursor.execute(sql, (identificador.strip(), identificador.strip()))
        return cursor.fetchone()

    @staticmethod
    def listar_todos(cursor, busqueda=None):
        """
        Lista usuarios registrados en el sistema, permitiendo búsqueda opcional.
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            busqueda (str | None): Término de búsqueda (nombre, identificación, usuario o correo).
            
        Retorna:
            list[dict]: Lista de usuarios ordenados por fecha de creación descendente.
        """
        if busqueda and busqueda.strip():
            filtro = f"%{busqueda.strip()}%"
            sql = """
                SELECT id_usuario, nombres, apellidos, identificacion, 
                       correo, nombre_usuario, rol, estado, fecha_creacion
                FROM usuario
                WHERE nombres LIKE %s 
                   OR apellidos LIKE %s 
                   OR identificacion LIKE %s 
                   OR nombre_usuario LIKE %s
                   OR correo LIKE %s
                ORDER BY fecha_creacion DESC
            """
            cursor.execute(sql, (filtro, filtro, filtro, filtro, filtro))
        else:
            sql = """
                SELECT id_usuario, nombres, apellidos, identificacion, 
                       correo, nombre_usuario, rol, estado, fecha_creacion
                FROM usuario
                ORDER BY fecha_creacion DESC
            """
            cursor.execute(sql)
        return cursor.fetchall()

    @staticmethod
    def crear_usuario(cursor, nombres, apellidos, identificacion, correo, nombre_usuario, password_hash, rol='EMPLEADO', estado='ACTIVO'):
        """
        Inserta un nuevo usuario en la base de datos con contraseña hasheada.
        
        Retorna:
            int: ID autoincremental del usuario recién creado.
        """
        sql = """
            INSERT INTO usuario (
                nombres, apellidos, identificacion, correo, 
                nombre_usuario, password_hash, rol, estado
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            nombres.strip(),
            apellidos.strip(),
            identificacion.strip(),
            correo.strip().lower(),
            nombre_usuario.strip(),
            password_hash,
            rol.strip().upper(),
            estado.strip().upper()
        ))
        return cursor.lastrowid

    @staticmethod
    def actualizar_usuario(cursor, id_usuario, nombres, apellidos, identificacion, correo, nombre_usuario, rol, estado):
        """
        Actualiza los datos personales, rol y estado de un usuario existente.
        No modifica la contraseña (se maneja en método dedicado).
        """
        sql = """
            UPDATE usuario
            SET nombres = %s,
                apellidos = %s,
                identificacion = %s,
                correo = %s,
                nombre_usuario = %s,
                rol = %s,
                estado = %s
            WHERE id_usuario = %s
        """
        cursor.execute(sql, (
            nombres.strip(),
            apellidos.strip(),
            identificacion.strip(),
            correo.strip().lower(),
            nombre_usuario.strip(),
            rol.strip().upper(),
            estado.strip().upper(),
            id_usuario
        ))

    @staticmethod
    def actualizar_password(cursor, id_usuario, password_hash):
        """
        Actualiza el hash de la contraseña de un usuario específico.
        """
        sql = "UPDATE usuario SET password_hash = %s WHERE id_usuario = %s"
        cursor.execute(sql, (password_hash, id_usuario))

    @staticmethod
    def cambiar_estado(cursor, id_usuario, nuevo_estado):
        """
        Activa o desactiva la cuenta de un usuario (Soft state toggle).
        """
        sql = "UPDATE usuario SET estado = %s WHERE id_usuario = %s"
        cursor.execute(sql, (nuevo_estado.strip().upper(), id_usuario))

    @staticmethod
    def cambiar_rol(cursor, id_usuario, nuevo_rol):
        """
        Actualiza el rol de un usuario (ADMINISTRADOR o EMPLEADO).
        """
        sql = "UPDATE usuario SET rol = %s WHERE id_usuario = %s"
        cursor.execute(sql, (nuevo_rol.strip().upper(), id_usuario))

    @staticmethod
    def existe_identificacion(cursor, identificacion, excluir_id=None):
        """
        Verifica si ya existe un usuario con la identificación dada.
        Permite excluir el id actual al editar.
        """
        if excluir_id:
            sql = "SELECT id_usuario FROM usuario WHERE identificacion = %s AND id_usuario != %s LIMIT 1"
            cursor.execute(sql, (identificacion.strip(), excluir_id))
        else:
            sql = "SELECT id_usuario FROM usuario WHERE identificacion = %s LIMIT 1"
            cursor.execute(sql, (identificacion.strip(),))
        return cursor.fetchone() is not None

    @staticmethod
    def existe_correo(cursor, correo, excluir_id=None):
        """
        Verifica si ya existe un usuario con el correo dado.
        """
        if excluir_id:
            sql = "SELECT id_usuario FROM usuario WHERE LOWER(correo) = LOWER(%s) AND id_usuario != %s LIMIT 1"
            cursor.execute(sql, (correo.strip(), excluir_id))
        else:
            sql = "SELECT id_usuario FROM usuario WHERE LOWER(correo) = LOWER(%s) LIMIT 1"
            cursor.execute(sql, (correo.strip(),))
        return cursor.fetchone() is not None

    @staticmethod
    def existe_nombre_usuario(cursor, nombre_usuario, excluir_id=None):
        """
        Verifica si ya existe un usuario con el username dado.
        """
        if excluir_id:
            sql = "SELECT id_usuario FROM usuario WHERE LOWER(nombre_usuario) = LOWER(%s) AND id_usuario != %s LIMIT 1"
            cursor.execute(sql, (nombre_usuario.strip(), excluir_id))
        else:
            sql = "SELECT id_usuario FROM usuario WHERE LOWER(nombre_usuario) = LOWER(%s) LIMIT 1"
            cursor.execute(sql, (nombre_usuario.strip(),))
        return cursor.fetchone() is not None

    @staticmethod
    def contar_administradores_activos(cursor):
        """
        Retorna la cantidad de administradores con cuenta activa en el sistema.
        Previene que el sistema quede sin administradores disponibles.
        """
        sql = "SELECT COUNT(*) AS total FROM usuario WHERE rol = 'ADMINISTRADOR' AND estado = 'ACTIVO'"
        cursor.execute(sql)
        res = cursor.fetchone()
        return res['total'] if res else 0

    @staticmethod
    def contar_resumen(cursor):
        """
        Retorna conteo total, activos, inactivos, administradores y empleados.
        """
        sql = """
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN estado = 'ACTIVO' THEN 1 ELSE 0 END) AS activos,
                SUM(CASE WHEN estado = 'INACTIVO' THEN 1 ELSE 0 END) AS inactivos,
                SUM(CASE WHEN rol = 'ADMINISTRADOR' THEN 1 ELSE 0 END) AS administradores,
                SUM(CASE WHEN rol = 'EMPLEADO' THEN 1 ELSE 0 END) AS empleados
            FROM usuario
        """
        cursor.execute(sql)
        res = cursor.fetchone()
        return {
            'total': res['total'] or 0,
            'activos': res['activos'] or 0,
            'inactivos': res['inactivos'] or 0,
            'administradores': res['administradores'] or 0,
            'empleados': res['empleados'] or 0
        } if res else {'total': 0, 'activos': 0, 'inactivos': 0, 'administradores': 0, 'empleados': 0}
