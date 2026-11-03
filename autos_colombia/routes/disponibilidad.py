"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: PANEL DE DISPONIBILIDAD
Archivo: routes/disponibilidad.py
Responsabilidad: Visualización en tiempo real de las 80 celdas
                 (70 Carros C-01..C-70, 10 Motos M-01..M-10).
==============================================================
"""

from flask import Blueprint, render_template, flash, redirect, url_for
from database import get_db_connection
from services.parqueadero_service import ParqueaderoService

disponibilidad_bp = Blueprint('disponibilidad', __name__)


@disponibilidad_bp.route('/disponibilidad', endpoint='disponibilidad')
def disponibilidad():
    """Genera el panel de ocupación de las 80 celdas del parqueadero mensual."""
    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos.", "danger")
        return redirect(url_for('index'))

    try:
        celdas, estadisticas = ParqueaderoService.obtener_panel_disponibilidad(conn)
        return render_template('disponibilidad.html', celdas=celdas, estadisticas=estadisticas)
    except Exception as err:
        flash(f"Error al cargar el panel de disponibilidad: {str(err)}", "danger")
        return redirect(url_for('index'))
    finally:
        conn.close()
