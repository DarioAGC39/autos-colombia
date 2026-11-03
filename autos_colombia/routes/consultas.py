"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: CONSULTAS E HISTORIAL
Archivo: routes/consultas.py
Responsabilidad: Consulta de estado de vehículos e historial cronológico.
==============================================================
"""

from flask import Blueprint, render_template, request, flash
from database import get_db_connection
from services.parqueadero_service import ParqueaderoService, ReglaNegocioException

consultas_bp = Blueprint('consultas', __name__)


@consultas_bp.route('/consultar-vehiculo', methods=['GET'], endpoint='consultar_vehiculo')
def consultar_vehiculo():
    """Consulta de datos de vehículo y estado (En parqueadero / Fuera del parqueadero)."""
    placa_busqueda = request.args.get('placa', '').strip().upper()
    if not placa_busqueda:
        return render_template('consultar_vehiculo.html', placa_busqueda='', vehiculo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)

    try:
        vehiculo, movimiento_activo = ParqueaderoService.consultar_estado(conn, placa_busqueda)
        if not vehiculo:
            flash(f"No se encontró ningún vehículo con la placa '{placa_busqueda}'. Verifica los datos ingresados.", "danger")
            return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)

        return render_template(
            'consultar_vehiculo.html',
            placa_busqueda=placa_busqueda,
            vehiculo=vehiculo,
            movimiento_activo=movimiento_activo
        )
    except Exception as err:
        flash(f"Error al consultar el vehículo: {str(err)}", "danger")
        return render_template('consultar_vehiculo.html', placa_busqueda=placa_busqueda, vehiculo=None)
    finally:
        conn.close()


@consultas_bp.route('/historial', methods=['GET'], endpoint='historial')
def historial():
    """Consulta el historial de movimientos de un vehículo ordenado del más reciente al más antiguo."""
    placa_busqueda = request.args.get('placa', '').strip().upper()
    if not placa_busqueda:
        return render_template('historial.html', placa_busqueda='', movimientos=None, vehiculo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('historial.html', placa_busqueda=placa_busqueda, movimientos=None, vehiculo=None)

    try:
        vehiculo, movimientos = ParqueaderoService.consultar_historial(conn, placa_busqueda)
        return render_template(
            'historial.html',
            placa_busqueda=placa_busqueda,
            vehiculo=vehiculo,
            movimientos=movimientos
        )
    except Exception as err:
        flash(f"Error al consultar el historial: {str(err)}", "danger")
        return render_template('historial.html', placa_busqueda=placa_busqueda, movimientos=None, vehiculo=None)
    finally:
        conn.close()
