"""
==============================================================
PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
SISTEMA DE CONTROL DE ENTRADA Y SALIDA - PARQUEADERO MENSUAL
Archivo: app.py
Tecnología: Python 3 + Flask + MySQL
Arquitectura: 3 Capas (Controladores/Blueprints -> Servicios -> DAO)
==============================================================

Guía académica para el estudiante y evaluador:
Este archivo actúa como el punto de entrada de la aplicación (Application Factory).
Cumple estrictamente con el principio de Separación de Responsabilidades:
  1. Base de Datos:    database.py (gestión de conexiones seguras y transacciones)
  2. Capa DAO:        dao/ (aislamiento de sentencias SQL para Vehículo, Movimiento y Celdas)
  3. Capa de Negocio: services/ (validaciones, asignación de 80 celdas, tarifas de mensualidad)
  4. Controladores:   routes/ (Blueprints para Entradas, Salidas en 2 fases, Consultas y Panel)
"""

from flask import Flask, url_for
from config import Config

# Importación de Blueprints modulares
from routes.auth import auth_bp
from routes.usuarios import usuarios_bp
from routes.dashboard import dashboard_bp
from routes.entradas import entradas_bp
from routes.salidas import salidas_bp
from routes.consultas import consultas_bp
from routes.disponibilidad import disponibilidad_bp
from routes.pagos import pagos_bp
from routes.api import api_bp


def create_app():
    """
    Fábrica de la aplicación Flask (Application Factory Pattern).
    Configura y ensambla todas las capas del sistema.
    """
    app = Flask(__name__)
    app.config.from_object(Config)

    # Inyector de contexto global para plantillas Jinja2
    @app.context_processor
    def inject_user_context():
        from flask import session
        return {
            'usuario_autenticado': bool(session.get('usuario_id')),
            'sesion_usuario_id': session.get('usuario_id'),
            'sesion_nombre': session.get('nombre_completo', 'Usuario'),
            'sesion_username': session.get('nombre_usuario', ''),
            'sesion_rol': session.get('rol', 'EMPLEADO'),
            'es_admin': session.get('rol') == 'ADMINISTRADOR'
        }

    # Registro de módulos (Blueprints)
    app.register_blueprint(auth_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(entradas_bp)
    app.register_blueprint(salidas_bp)
    app.register_blueprint(consultas_bp)
    app.register_blueprint(disponibilidad_bp)
    app.register_blueprint(pagos_bp)
    app.register_blueprint(api_bp)

    # Mapeo de compatibilidad global de endpoints para plantillas Jinja2.
    # url_for() resuelve contra las reglas del url_map, no contra view_functions:
    # por eso se registran reglas alias reales (mismo pattern y mismo view func).
    # Esto permite url_for('index') y url_for('dashboard.index') indistintamente.
    with app.app_context():
        rutas_compatibilidad = {
            'index': 'dashboard.index',
            'login': 'auth.login',
            'logout': 'auth.logout',
            'usuarios': 'usuarios.listar',
            'pagos': 'pagos.index',
            'registrar_entrada': 'entradas.registrar_entrada',
            'registrar_salida': 'salidas.registrar_salida',
            'consultar_vehiculo': 'consultas.consultar_vehiculo',
            'historial': 'consultas.historial',
            'disponibilidad': 'disponibilidad.disponibilidad',
        }
        reglas_por_endpoint = {rule.endpoint: rule for rule in app.url_map.iter_rules()}
        for alias, original in rutas_compatibilidad.items():
            regla = reglas_por_endpoint.get(original)
            if regla is None or alias in reglas_por_endpoint:
                continue
            metodos = sorted(regla.methods - {'HEAD', 'OPTIONS'})
            app.add_url_rule(
                regla.rule,
                endpoint=alias,
                view_func=app.view_functions[original],
                methods=metodos,
                defaults=regla.defaults,
            )

    return app


# Instancia principal de la aplicación
app = create_app()


# ==============================================================
# INICIO DEL SERVIDOR FLASK (Ejecución local en Visual Studio Code)
# ==============================================================
if __name__ == '__main__':
    print("\n" + "="*65)
    print("  AUTOS COLOMBIA - SISTEMA DE CONTROL DE PARQUEADERO MENSUAL")
    print("  Arquitectura: 3 Capas (Blueprints -> Servicios -> DAO -> MySQL)")
    print("  Capacidad: 80 celdas (70 Carros C-01..C-70 | 10 Motos M-01..M-10)")
    print("  Tarifas: Carro $250.000/mes | Moto $100.000/mes")
    print("  Servidor iniciado localmente.")
    print("  Abre en tu navegador: http://127.0.0.1:5000")
    print("="*65 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
