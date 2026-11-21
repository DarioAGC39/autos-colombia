"""
==============================================================
AUTOS COLOMBIA - DAO: MOVIMIENTO (CON TRAZABILIDAD DE USUARIOS)
Archivo: dao/movimiento_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'movimiento',
                 incluyendo trazabilidad de responsables de entrada y salida.
==============================================================
"""

import mysql.connector


class MovimientoDAO:
    """Objeto de Acceso a Datos (DAO) para la entidad Movimiento."""

    @staticmethod
    def obtener_activo_por_placa(cursor, placa, for_update=False):
        """
        Busca el movimiento con estado 'ACTIVO' de una placa dada.
        Incluye los datos del usuario que registró la entrada si existe.
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            placa (str): Placa del vehículo.
            for_update (bool): Si True, aplica bloqueo pesimista FOR UPDATE.
            
        Retorna:
            dict | None: Movimiento activo o None si no se encuentra en el parqueadero.
        """
        sql = """
            SELECT m.id_movimiento, m.fecha_hora_entrada, m.fecha_hora_salida, 
                   m.estado, m.observaciones, m.celda, m.placa,
                   m.id_usuario_entrada, m.id_usuario_salida,
                   CONCAT(ue.nombres, ' ', ue.apellidos) AS usuario_entrada_nombre,
                   ue.rol AS usuario_entrada_rol,
                   ue.nombre_usuario AS usuario_entrada_username
            FROM movimiento m
            LEFT JOIN usuario ue ON m.id_usuario_entrada = ue.id_usuario
            WHERE m.placa = %s AND m.estado = 'ACTIVO'
        """
        if for_update:
            sql += " FOR UPDATE"
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def registrar_entrada(cursor, placa, celda, observaciones="", id_usuario_entrada=None):
        """
        Inserta un nuevo movimiento en estado 'ACTIVO' con fecha y hora actual (NOW())
        y guarda automáticamente el ID del usuario responsable que registró la entrada (RF-01, RF-03).
        
        Retorna:
            int: ID generado autoincremental del movimiento.
        """
        sql = """
            INSERT INTO movimiento (
                fecha_hora_entrada, estado, observaciones, celda, placa, id_usuario_entrada
            )
            VALUES (NOW(), 'ACTIVO', %s, %s, %s, %s)
        """
        cursor.execute(sql, (observaciones, celda, placa, id_usuario_entrada))
        return cursor.lastrowid

    @staticmethod
    def registrar_salida(cursor, id_movimiento, observaciones=None, id_usuario_salida=None):
        """
        Finaliza un movimiento registrando fecha_hora_salida = NOW(), estado = 'FINALIZADO'
        y el ID del usuario responsable que confirmó la salida (RF-02, RF-03).
        """
        if observaciones:
            sql = """
                UPDATE movimiento
                SET fecha_hora_salida = NOW(),
                    estado = 'FINALIZADO',
                    observaciones = %s,
                    id_usuario_salida = %s
                WHERE id_movimiento = %s
            """
            cursor.execute(sql, (observaciones, id_usuario_salida, id_movimiento))
        else:
            sql = """
                UPDATE movimiento
                SET fecha_hora_salida = NOW(),
                    estado = 'FINALIZADO',
                    id_usuario_salida = %s
                WHERE id_movimiento = %s
            """
            cursor.execute(sql, (id_usuario_salida, id_movimiento))

    @staticmethod
    def obtener_por_id(cursor, id_movimiento):
        """
        Consulta un movimiento por su ID primario, proyectando los datos
        de los usuarios responsables de entrada y salida mediante LEFT JOIN.
        """
        sql = """
            SELECT m.id_movimiento, m.fecha_hora_entrada, m.fecha_hora_salida, 
                   m.estado, m.observaciones, m.celda, m.placa,
                   m.id_usuario_entrada, m.id_usuario_salida,
                   CONCAT(ue.nombres, ' ', ue.apellidos) AS usuario_entrada_nombre,
                   ue.rol AS usuario_entrada_rol,
                   ue.nombre_usuario AS usuario_entrada_username,
                   CONCAT(us.nombres, ' ', us.apellidos) AS usuario_salida_nombre,
                   us.rol AS usuario_salida_rol,
                   us.nombre_usuario AS usuario_salida_username
            FROM movimiento m
            LEFT JOIN usuario ue ON m.id_usuario_entrada = ue.id_usuario
            LEFT JOIN usuario us ON m.id_usuario_salida = us.id_usuario
            WHERE m.id_movimiento = %s
        """
        cursor.execute(sql, (id_movimiento,))
        return cursor.fetchone()

    @staticmethod
    def listar_historial_por_placa(cursor, placa):
        """
        Retorna el historial completo de movimientos de un vehículo,
        ordenado descendentemente (del más reciente al más antiguo).
        
        Incluye nombres completos y roles del responsable de entrada y del
        responsable de salida mediante LEFT JOIN. Si el registro es anterior a la mejora
        o no tiene responsable asignado, los campos serán NULL (RF-06).
        """
        sql = """
            SELECT m.id_movimiento, m.fecha_hora_entrada, m.fecha_hora_salida, 
                   m.estado, m.observaciones, m.celda, m.placa,
                   m.id_usuario_entrada, m.id_usuario_salida,
                   CONCAT(ue.nombres, ' ', ue.apellidos) AS usuario_entrada_nombre,
                   ue.rol AS usuario_entrada_rol,
                   ue.nombre_usuario AS usuario_entrada_username,
                   CONCAT(us.nombres, ' ', us.apellidos) AS usuario_salida_nombre,
                   us.rol AS usuario_salida_rol,
                   us.nombre_usuario AS usuario_salida_username
            FROM movimiento m
            LEFT JOIN usuario ue ON m.id_usuario_entrada = ue.id_usuario
            LEFT JOIN usuario us ON m.id_usuario_salida = us.id_usuario
            WHERE m.placa = %s
            ORDER BY m.fecha_hora_entrada DESC
        """
        cursor.execute(sql, (placa,))
        return cursor.fetchall()

    @staticmethod
    def contar_activos(cursor):
        """Retorna la cantidad de vehículos actualmente dentro del parqueadero."""
        cursor.execute("SELECT COUNT(*) AS total FROM movimiento WHERE estado = 'ACTIVO'")
        res = cursor.fetchone()
        return res['total'] if res else 0

    @staticmethod
    def contar_salidas_hoy(cursor):
        """Retorna la cantidad de salidas finalizadas hoy."""
        sql = """
            SELECT COUNT(*) AS total 
            FROM movimiento 
            WHERE estado = 'FINALIZADO' AND DATE(fecha_hora_salida) = CURDATE()
        """
        cursor.execute(sql)
        res = cursor.fetchone()
        return res['total'] if res else 0

    @staticmethod
    def listar_ultimos_movimientos(cursor, limite=5):
        """
        Obtiene los últimos N movimientos con datos del vehículo
        y nombres de los usuarios responsables de entrada y salida.
        """
        sql = """
            SELECT m.id_movimiento, m.placa, m.fecha_hora_entrada, m.fecha_hora_salida, 
                   m.estado, m.celda, m.id_usuario_entrada, m.id_usuario_salida,
                   v.tipo, v.marca, v.modelo, v.color,
                   CONCAT(ue.nombres, ' ', ue.apellidos) AS usuario_entrada_nombre,
                   ue.rol AS usuario_entrada_rol,
                   CONCAT(us.nombres, ' ', us.apellidos) AS usuario_salida_nombre,
                   us.rol AS usuario_salida_rol
            FROM movimiento m
            INNER JOIN vehiculo v ON m.placa = v.placa
            LEFT JOIN usuario ue ON m.id_usuario_entrada = ue.id_usuario
            LEFT JOIN usuario us ON m.id_usuario_salida = us.id_usuario
            ORDER BY m.fecha_hora_entrada DESC
            LIMIT %s
        """
        cursor.execute(sql, (limite,))
        return cursor.fetchall()

    @staticmethod
    def listar_movimientos_activos_con_vehiculo(cursor):
        """Obtiene todos los movimientos activos para alimentar el panel de disponibilidad de celdas."""
        sql = """
            SELECT m.id_movimiento, m.placa, m.fecha_hora_entrada, m.celda,
                   v.tipo, v.marca, v.modelo, v.color
            FROM movimiento m
            INNER JOIN vehiculo v ON m.placa = v.placa
            WHERE m.estado = 'ACTIVO'
        """
        cursor.execute(sql)
        return cursor.fetchall()
