"""
==============================================================
AUTOS COLOMBIA - CAPA DE CONEXIÓN A BASE DE DATOS
Archivo: database.py
Tecnología: mysql-connector-python
==============================================================
Centraliza la conexión a MySQL con manejo seguro de excepciones
y soporte para transacciones.
"""

import mysql.connector
from mysql.connector import errorcode
from config import Config


def get_db_connection():
    """
    Establece y retorna una conexión activa con la base de datos MySQL autos_colombia
    usando los parámetros de configuración de config.py y variables de entorno (.env).
    
    Retorna:
        connection: Conexión MySQL si es exitosa, None si falla.
    """
    try:
        connection = mysql.connector.connect(**Config.get_db_config())
        return connection
    except mysql.connector.Error as err:
        print(f"[ERROR DE BASE DE DATOS]: {err.msg} (Código: {err.errno})")
        return None
