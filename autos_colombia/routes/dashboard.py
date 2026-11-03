"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: DASHBOARD / INICIO
Archivo: routes/dashboard.py
Responsabilidad: Vista principal y KPIs del parqueadero.
==============================================================
"""

from flask import Blueprint, render_template, flash
from database import get_db_connection
from services.parqueadero_service import ParqueaderoService

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/', endpoint='index')
def index():
    """Muestra el resumen operativo y los últimos 5 movimientos."""
    conn = get_db_connection()
    if not conn:
        flash("No fue posible conectar con la base de datos MySQL. Revisa el servicio MySQL y el archivo .env.", "danger")
        return render_template('index.html', stats={'activos': 0, 'vehiculos': 0, 'hoy': 0}, ultimos_movimientos=[])

    try:
        stats, ultimos_movimientos = ParqueaderoService.obtener_resumen_dashboard(conn)
        return render_template('index.html', stats=stats, ultimos_movimientos=ultimos_movimientos)
    except Exception as err:
        flash(f"Error al cargar el resumen operativo: {str(err)}", "danger")
        return render_template('index.html', stats={'activos': 0, 'vehiculos': 0, 'hoy': 0}, ultimos_movimientos=[])
    finally:
        conn.close()
