"""
==============================================================
AUTOS COLOMBIA - DAO: PROPIETARIO (ITERACIÓN 3 - RN07)
Archivo: dao/propietario_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'propietario'
                 y su relación 1:N con la tabla 'vehiculo'.
==============================================================
"""


class PropietarioDAO:
    """Objeto de Acceso a Datos (DAO) para la entidad Propietario."""

    @staticmethod
    def obtener_por_id(cursor, id_propietario):
        """Retorna un propietario por su llave primaria."""
        sql = """
            SELECT id_propietario, nombre_completo, identificacion, celular, correo, fecha_registro
            FROM propietario
            WHERE id_propietario = %s
        """
        cursor.execute(sql, (id_propietario,))
        return cursor.fetchone()

    @staticmethod
    def obtener_por_identificacion(cursor, identificacion):
        """Busca un propietario por su número de cédula único."""
        sql = """
            SELECT id_propietario, nombre_completo, identificacion, celular, correo, fecha_registro
            FROM propietario
            WHERE identificacion = %s
        """
        cursor.execute(sql, (identificacion,))
        return cursor.fetchone()

    @staticmethod
    def obtener_por_placa(cursor, placa):
        """Obtiene el propietario asociado a un vehículo específico."""
        sql = """
            SELECT p.id_propietario, p.nombre_completo, p.identificacion, p.celular, p.correo, p.fecha_registro
            FROM vehiculo v
            INNER JOIN propietario p ON v.id_propietario = p.id_propietario
            WHERE v.placa = %s
        """
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def insertar(cursor, nombre_completo, identificacion, celular, correo):
        """Inserta un nuevo propietario y retorna su ID generado."""
        sql = """
            INSERT INTO propietario (nombre_completo, identificacion, celular, correo)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (nombre_completo, identificacion, celular, correo))
        return cursor.lastrowid

    @staticmethod
    def actualizar(cursor, id_propietario, nombre_completo, identificacion, celular, correo):
        """Actualiza los datos de contacto de un propietario existente."""
        sql = """
            UPDATE propietario
            SET nombre_completo = %s,
                identificacion = %s,
                celular = %s,
                correo = %s
            WHERE id_propietario = %s
        """
        cursor.execute(sql, (nombre_completo, identificacion, celular, correo, id_propietario))

    @staticmethod
    def asociar_vehiculo(cursor, placa, id_propietario):
        """Asocia un vehículo existente a un propietario (relación 1:N)."""
        sql = "UPDATE vehiculo SET id_propietario = %s WHERE placa = %s"
        cursor.execute(sql, (id_propietario, placa))

    @staticmethod
    def listar_con_vehiculos(cursor, busqueda=None):
        """Lista todos los propietarios junto con las placas asociadas."""
        base_sql = """
            SELECT p.id_propietario, p.nombre_completo, p.identificacion, p.celular, p.correo, p.fecha_registro,
                   COUNT(v.placa) AS total_vehiculos,
                   GROUP_CONCAT(v.placa ORDER BY v.placa SEPARATOR ', ') AS placas_asociadas
            FROM propietario p
            LEFT JOIN vehiculo v ON p.id_propietario = v.id_propietario
        """
        params = []
        if busqueda:
            like = f"%{busqueda}%"
            base_sql += """
                WHERE p.nombre_completo LIKE %s
                   OR p.identificacion LIKE %s
                   OR p.correo LIKE %s
                   OR v.placa LIKE %s
            """
            params.extend([like, like, like, like])

        base_sql += """
            GROUP BY p.id_propietario, p.nombre_completo, p.identificacion, p.celular, p.correo, p.fecha_registro
            ORDER BY p.nombre_completo ASC
        """
        cursor.execute(base_sql, tuple(params))
        return cursor.fetchall()
