"""
Módulo de Configuración: config.py
Proyecto: Autos Colombia - Parqueadero Mensual

Este archivo se encarga de cargar las variables de entorno de forma segura
utilizando la librería 'python-dotenv', evitando escribir contraseñas
directamente en el código fuente.
"""

import os
from dotenv import load_dotenv

# Cargar las variables desde el archivo .env si existe
load_dotenv()

class Config:
    """Configuración principal de la aplicación Flask."""
    
    # Clave de seguridad para mensajes flash y formularios
    SECRET_KEY = os.getenv('SECRET_KEY', 'clave_por_defecto_desarrollo_seguro')
    
    # Parámetros de conexión a la base de datos MySQL
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'autos_colombia')

    @classmethod
    def get_db_config(cls):
        """Retorna un diccionario listo para usar con mysql.connector.connect()"""
        return {
            'host': cls.MYSQL_HOST,
            'port': cls.MYSQL_PORT,
            'user': cls.MYSQL_USER,
            'password': cls.MYSQL_PASSWORD,
            'database': cls.MYSQL_DATABASE,
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_spanish_ci',
            'autocommit': False  # Se manejan transacciones explícitas para seguridad
        }
