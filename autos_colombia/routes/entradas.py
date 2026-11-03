"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: REGISTRAR ENTRADA
Archivo: routes/entradas.py
Responsabilidad: Manejo de solicitudes HTTP para ingreso de vehículos.
==============================================================
"""

from datetime import datetime
from flask import Blueprint, render_template, request, flash
from database import get_db_connection
from services.parqueadero_service import ParqueaderoService, ReglaNegocioException

entradas_bp = Blueprint('entradas', __name__)


@entradas_bp.route('/registrar-entrada', methods=['GET', 'POST'], endpoint='registrar_entrada')
def registrar_entrada():
    """Formulario y procesamiento de registro de entrada."""
    if request.method == 'GET':
        return render_template('registrar_entrada.html', datos={}, errores={})

    datos = {
        'placa': request.form.get('placa', '').strip().upper(),
        'tipo': request.form.get('tipo', '').strip(),
        'color': request.form.get('color', '').strip(),
        'marca': request.form.get('marca', '').strip(),
        'modelo': request.form.get('modelo', '').strip(),
        'celda': request.form.get('celda', '').strip()
    }

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL. Intenta nuevamente.", "danger")
        return render_template('registrar_entrada.html', datos=datos, errores={})

    try:
        nuevo_mov = ParqueaderoService.registrar_ingreso(conn, datos)
        fecha_ingreso = nuevo_mov['fecha_hora_entrada']
        fecha_str = fecha_ingreso.strftime('%d de %B de %Y a las %H:%M') if isinstance(fecha_ingreso, datetime) else str(fecha_ingreso)

        flash(f"El vehículo {datos['placa']} ingresó el {fecha_str} en celda {nuevo_mov.get('codigo_celda', 'Asignada')}. Su movimiento está activo.", "success")
        return render_template(
            'registrar_entrada.html',
            datos=datos,
            errores={},
            exito=True,
            movimiento_activo={'placa': datos['placa'], 'fecha_hora_entrada': fecha_ingreso, 'estado': 'ACTIVO', 'codigo_celda': nuevo_mov.get('codigo_celda')}
        )

    except ReglaNegocioException as rn_err:
        mensaje = str(rn_err)
        if "ya tiene una entrada activa" in mensaje:
            flash(mensaje, "warning")
            return render_template('registrar_entrada.html', datos=datos, errores={}, ya_activo=True)
        else:
            flash(mensaje, "danger")
            return render_template('registrar_entrada.html', datos=datos, errores={'general': mensaje})

    except Exception as err:
        flash(f"Error inesperado al registrar entrada: {str(err)}", "danger")
        return render_template('registrar_entrada.html', datos=datos, errores={})
    finally:
        conn.close()
