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

    # Configuración opcional para canales externos de notificación (RN06 - Sección 7)
    MAIL_SERVER = os.getenv('MAIL_SERVER', '').strip()
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '').strip()
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '').strip()
    MAIL_FROM = os.getenv('MAIL_FROM', 'notificaciones@autoscolombia.com').strip()
    SMS_PROVIDER_URL = os.getenv('SMS_PROVIDER_URL', '').strip()
    SMS_API_KEY = os.getenv('SMS_API_KEY', '').strip()

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

    @classmethod
    def notificaciones_externas_configuradas(cls):
        """Indica qué canales externos reales están configurados en el entorno."""
        return {
            'correo_smtp': bool(cls.MAIL_SERVER and cls.MAIL_USERNAME and cls.MAIL_PASSWORD),
            'sms_gateway': bool(cls.SMS_PROVIDER_URL and cls.SMS_API_KEY),
        }
