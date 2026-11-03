"""
==============================================================
AUTOS COLOMBIA - DAO: VEHÍCULO
Archivo: dao/vehiculo_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'vehiculo'.
==============================================================
"""

import mysql.connector

class VehiculoDAO:
    """Objeto de Acceso a Datos (DAO) para la entidad Vehículo."""

    @staticmethod
    def obtener_por_placa(cursor, placa):
        """
        Busca un vehículo por su clave primaria (placa).
        
        Args:
            cursor: Cursor activo de MySQL (dictionary=True).
            placa (str): Placa del vehículo.
            
        Retorna:
            dict | None: Registro del vehículo si existe, o None.
        """
        sql = "SELECT placa, tipo, color, marca, modelo FROM vehiculo WHERE placa = %s"
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def obtener_por_placa_bloqueado(cursor, placa):
        """
        Busca un vehículo aplicando FOR UPDATE para control de concurrencia.
        """
        sql = "SELECT placa, tipo, color, marca, modelo FROM vehiculo WHERE placa = %s FOR UPDATE"
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def insertar(cursor, placa, tipo, color, marca, modelo):
        """
        Registra un nuevo vehículo en la base de datos con consulta parametrizada.
        """
        sql = """
            INSERT INTO vehiculo (placa, tipo, color, marca, modelo)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (placa, tipo, color, marca, modelo))

    @staticmethod
    def actualizar(cursor, placa, tipo, color, marca, modelo):
        """
        Actualiza los datos técnicos/estéticos de un vehículo existente.
        """
        sql = """
            UPDATE vehiculo
            SET tipo = %s, color = %s, marca = %s, modelo = %s
            WHERE placa = %s
        """
        cursor.execute(sql, (tipo, color, marca, modelo, placa))

    @staticmethod
    def contar_todos(cursor):
        """Retorna el número total de vehículos registrados."""
        cursor.execute("SELECT COUNT(*) AS total FROM vehiculo")
        res = cursor.fetchone()
        return res['total'] if res else 0
