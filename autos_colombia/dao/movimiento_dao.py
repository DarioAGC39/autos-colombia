"""
==============================================================
AUTOS COLOMBIA - DAO: MOVIMIENTO
Archivo: dao/movimiento_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'movimiento'.
==============================================================
"""

import mysql.connector

class MovimientoDAO:
    """Objeto de Acceso a Datos (DAO) para la entidad Movimiento."""

    @staticmethod
    def obtener_activo_por_placa(cursor, placa, for_update=False):
        """
        Busca el movimiento con estado 'ACTIVO' de una placa dada.
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            placa (str): Placa del vehículo.
            for_update (bool): Si True, aplica bloqueo pesimista FOR UPDATE.
            
        Retorna:
            dict | None: Movimiento activo o None si no se encuentra en el parqueadero.
        """
        sql = """
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, observaciones, celda, placa
            FROM movimiento
            WHERE placa = %s AND estado = 'ACTIVO'
        """
        if for_update:
            sql += " FOR UPDATE"
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def registrar_entrada(cursor, placa, celda, observaciones=""):
        """
        Inserta un nuevo movimiento en estado 'ACTIVO' con fecha y hora actual (NOW()).
        
        Retorna:
            int: ID generado autoincremental del movimiento.
        """
        sql = """
            INSERT INTO movimiento (fecha_hora_entrada, estado, observaciones, celda, placa)
            VALUES (NOW(), 'ACTIVO', %s, %s, %s)
        """
        cursor.execute(sql, (observaciones, celda, placa))
        return cursor.lastrowid

    @staticmethod
    def registrar_salida(cursor, id_movimiento, observaciones=None):
        """
        Finaliza un movimiento registrando fecha_hora_salida = NOW() y estado = 'FINALIZADO'.
        """
        if observaciones:
            sql = """
                UPDATE movimiento
                SET fecha_hora_salida = NOW(), estado = 'FINALIZADO', observaciones = %s
                WHERE id_movimiento = %s
            """
            cursor.execute(sql, (observaciones, id_movimiento))
        else:
            sql = """
                UPDATE movimiento
                SET fecha_hora_salida = NOW(), estado = 'FINALIZADO'
                WHERE id_movimiento = %s
            """
            cursor.execute(sql, (id_movimiento,))

    @staticmethod
    def obtener_por_id(cursor, id_movimiento):
        """Consulta un movimiento por su ID primario."""
        sql = """
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, observaciones, celda, placa
            FROM movimiento
            WHERE id_movimiento = %s
        """
        cursor.execute(sql, (id_movimiento,))
        return cursor.fetchone()

    @staticmethod
    def listar_historial_por_placa(cursor, placa):
        """
        Retorna el historial completo de movimientos de un vehículo,
        ordenado descendentemente (del más reciente al más antiguo).
        """
        sql = """
            SELECT id_movimiento, fecha_hora_entrada, fecha_hora_salida, estado, observaciones, celda, placa
            FROM movimiento
            WHERE placa = %s
            ORDER BY fecha_hora_entrada DESC
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
        """Obtiene los últimos N movimientos con datos del vehículo."""
        sql = """
            SELECT m.id_movimiento, m.placa, m.fecha_hora_entrada, m.fecha_hora_salida, 
                   m.estado, m.celda, v.tipo, v.marca, v.modelo, v.color
            FROM movimiento m
            INNER JOIN vehiculo v ON m.placa = v.placa
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
