"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: API REST JSON
Archivo: routes/api.py
Responsabilidad: Endpoint JSON para autocompletado en JavaScript puro
                 y consumo asíncrono desde el frontend.
==============================================================
"""

from datetime import datetime
from flask import Blueprint, jsonify
from database import get_db_connection
from dao.vehiculo_dao import VehiculoDAO
from dao.movimiento_dao import MovimientoDAO

api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/vehiculo/<placa>', endpoint='buscar_vehiculo')
def buscar_vehiculo(placa):
    """Retorna información en JSON para autocompletar formularios en JS puro."""
    placa_limpia = (placa or '').strip().upper()
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'No hay conexión con la base de datos MySQL'}), 500

    cursor = conn.cursor(dictionary=True)
    try:
        vehiculo = VehiculoDAO.obtener_por_placa(cursor, placa_limpia)
        movimiento_activo = MovimientoDAO.obtener_activo_por_placa(cursor, placa_limpia)

        if vehiculo:
            if movimiento_activo and isinstance(movimiento_activo.get('fecha_hora_entrada'), datetime):
                movimiento_activo['fecha_hora_entrada'] = movimiento_activo['fecha_hora_entrada'].strftime('%Y-%m-%d %H:%M:%S')

            return jsonify({
                'encontrado': True,
                'vehiculo': vehiculo,
                'tiene_activo': bool(movimiento_activo),
                'movimiento_activo': movimiento_activo
            })
        else:
            return jsonify({'encontrado': False})
    except Exception as err:
        return jsonify({'error': str(err)}), 500
    finally:
        cursor.close()
        conn.close()
