"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: REGISTRAR SALIDA
Archivo: routes/salidas.py
Responsabilidad: Manejo en DOS PASOS del registro de salida.
                 Paso 1: Búsqueda y consulta de vehículo sin mutación.
                 Paso 2: Confirmación explícita del empleado para finalizar.
==============================================================
"""

from datetime import datetime
from flask import Blueprint, render_template, request, flash
from database import get_db_connection
from services.parqueadero_service import ParqueaderoService, ReglaNegocioException

salidas_bp = Blueprint('salidas', __name__)


@salidas_bp.route('/registrar-salida', methods=['GET', 'POST'], endpoint='registrar_salida')
def registrar_salida():
    """
    Controlador de salida con flujo en dos fases estrictas:
    - Búsqueda (GET / POST buscar): Solo consulta datos sin alterar el estado.
    - Confirmación (POST confirmar_salida): Registra fecha/hora de salida y finaliza.
    """
    placa_busqueda = request.args.get('placa', '').strip().upper() or request.form.get('placa', '').strip().upper()
    accion = request.form.get('accion', '').strip()

    if not placa_busqueda:
        return render_template('registrar_salida.html', placa_busqueda='', vehiculo=None, movimiento_activo=None)

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)

    try:
        # ==============================================================
        # PASO 2: CONFIRMACIÓN EXPLÍCITA DEL EMPLEADO (Solo con botón 'Registrar salida')
        # ==============================================================
        if request.method == 'POST' and accion == 'confirmar_salida':
            vehiculo, resumen_salida = ParqueaderoService.confirmar_salida(conn, placa_busqueda)
            fecha_salida = resumen_salida['fecha_hora_salida']
            fecha_str = fecha_salida.strftime('%d de %B de %Y a las %H:%M') if isinstance(fecha_salida, datetime) else str(fecha_salida)

            flash(f"Se registró la salida de {placa_busqueda} el {fecha_str}. La celda {resumen_salida.get('codigo_celda', '')} ha sido liberada.", "success")
            return render_template(
                'registrar_salida.html',
                placa_busqueda=placa_busqueda,
                vehiculo=vehiculo,
                movimiento_activo=None,
                resumen_salida=resumen_salida,
                salida_exitosa=True
            )

        # ==============================================================
        # PASO 1: BÚSQUEDA Y CONSULTA PREVIA (Idempotente, NO finaliza movimiento)
        # ==============================================================
        vehiculo, movimiento_activo = ParqueaderoService.consultar_salida_por_placa(conn, placa_busqueda)

        if not movimiento_activo:
            flash(f"El vehículo {placa_busqueda} está registrado, pero actualmente no tiene un movimiento activo (se encuentra fuera del parqueadero).", "info")

        return render_template(
            'registrar_salida.html',
            placa_busqueda=placa_busqueda,
            vehiculo=vehiculo,
            movimiento_activo=movimiento_activo
        )

    except ReglaNegocioException as rn_err:
        flash(str(rn_err), "danger")
        return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)
    except Exception as err:
        flash(f"Error al procesar la operación de salida: {str(err)}", "danger")
        return render_template('registrar_salida.html', placa_busqueda=placa_busqueda, vehiculo=None, movimiento_activo=None)
    finally:
        conn.close()
