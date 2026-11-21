"""
==============================================================
AUTOS COLOMBIA - CONTROLADOR: GESTIÓN DE PAGOS (ITERACIÓN 3)
Archivo: routes/pagos.py
Responsabilidad: Rutas HTTP para panel general de mensualidades,
                 registro de pagos sin mora, control de vencimientos,
                 comprobantes imprimibles, propietarios y notificaciones.
==============================================================
"""

from datetime import date
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from database import get_db_connection
from routes.helpers import login_required
from services.pago_service import PagoService, PagoException
from services.notificacion_service import NotificacionService, CanalNotificacionExterno

pagos_bp = Blueprint('pagos', __name__, url_prefix='/pagos')


def _formatear_cop(valor):
    """Formatea un entero como moneda colombiana ($250.000)."""
    try:
        return f"${int(valor):,}".replace(',', '.')
    except (ValueError, TypeError):
        return "$0"


@pagos_bp.route('', methods=['GET'], endpoint='index')
@login_required
def index():
    """
    Vista principal del módulo Gestión de Pagos (Secciones A, B, C, D, E, F).
    """
    tab = request.args.get('tab', 'registro').strip()
    placa = request.args.get('placa', '').strip().upper()
    fecha_pago = request.args.get('fecha_pago', date.today().strftime('%Y-%m-%d')).strip()
    filtro_estado = request.args.get('filtro_estado', 'TODOS').strip().upper()
    busqueda = request.args.get('q', '').strip()

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a la base de datos MySQL.", "danger")
        return render_template(
            'pagos/index.html',
            tab=tab,
            placa=placa,
            fecha_pago=fecha_pago,
            filtro_estado=filtro_estado,
            busqueda=busqueda,
            kpis={'total_pagadas': 0, 'ingresos_totales': 0, 'al_dia': 0, 'proximas_vencer': 0, 'vencidas': 0, 'sin_mensualidad': 0},
            control_vencimientos=[],
            pagos=[],
            propietarios=[],
            notificaciones=[],
            resultado_busqueda=None,
            metodos_pago=PagoService.METODOS_PAGO,
            canales_externos=CanalNotificacionExterno.estado_canales(),
            formatear_cop=_formatear_cop
        )

    try:
        panel = PagoService.obtener_panel_pagos(conn, filtro_estado=filtro_estado, busqueda=busqueda)
        resultado_busqueda = None
        no_encontrado = False

        if placa:
            resultado_busqueda = PagoService.buscar_vehiculo_para_pago(conn, placa, fecha_pago_str=fecha_pago)
            if not resultado_busqueda:
                no_encontrado = True
                flash(
                    f"No se encontró ningún vehículo registrado con la placa '{placa}'. "
                    f"Registra primero el vehículo desde 'Registrar entrada'.",
                    "warning"
                )

        return render_template(
            'pagos/index.html',
            tab=tab,
            placa=placa,
            fecha_pago=fecha_pago,
            filtro_estado=filtro_estado,
            busqueda=busqueda,
            kpis=panel['kpis'],
            control_vencimientos=panel['control_vencimientos'],
            pagos=panel['pagos'],
            propietarios=panel['propietarios'],
            notificaciones=panel['notificaciones'],
            resultado_busqueda=resultado_busqueda,
            no_encontrado=no_encontrado,
            metodos_pago=PagoService.METODOS_PAGO,
            canales_externos=CanalNotificacionExterno.estado_canales(),
            formatear_cop=_formatear_cop
        )
    except PagoException as pe:
        flash(str(pe), "danger")
        return redirect(url_for('pagos.index'))
    except Exception as err:
        flash(f"Error al cargar Gestión de Pagos: {str(err)}", "danger")
        return redirect(url_for('dashboard.index'))
    finally:
        conn.close()


@pagos_bp.route('/confirmar', methods=['POST'], endpoint='confirmar')
@login_required
def confirmar():
    """
    Confirma el pago de una mensualidad (RN01, RN02, RN03), genera el comprobante (RN04)
    y redirige a la vista de comprobante imprimible/PDF.
    """
    datos = {
        'placa': request.form.get('placa', '').strip().upper(),
        'fecha_pago': request.form.get('fecha_pago', '').strip(),
        'metodo_pago': request.form.get('metodo_pago', 'Efectivo').strip(),
        'observaciones': request.form.get('observaciones', '').strip(),
        'nombre_propietario': request.form.get('nombre_propietario', '').strip(),
        'identificacion_propietario': request.form.get('identificacion_propietario', '').strip(),
        'celular_propietario': request.form.get('celular_propietario', '').strip(),
        'correo_propietario': request.form.get('correo_propietario', '').strip(),
    }

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a MySQL al confirmar el pago.", "danger")
        return redirect(url_for('pagos.index', placa=datos['placa']))

    try:
        id_usuario_actual = session.get('usuario_id')
        comprobante = PagoService.confirmar_pago(conn, datos, id_usuario_registro=id_usuario_actual)
        flash(
            f"Pago confirmado exitosamente ({comprobante['numero_comprobante']}). "
            f"Nueva mensualidad vigente hasta {comprobante['fecha_vencimiento']}. Mora aplicada: $0.",
            "success"
        )
        return redirect(url_for('pagos.comprobante', id_pago=comprobante['id_pago']))
    except PagoException as pe:
        flash(str(pe), "danger")
        return redirect(url_for('pagos.index', placa=datos['placa'], fecha_pago=datos['fecha_pago']))
    except Exception as err:
        flash(f"Error inesperado al confirmar el pago: {str(err)}", "danger")
        return redirect(url_for('pagos.index', placa=datos['placa']))
    finally:
        conn.close()


@pagos_bp.route('/comprobante/<int:id_pago>', methods=['GET'], endpoint='comprobante')
@login_required
def comprobante(id_pago):
    """
    RN04: Visualiza el comprobante oficial de pago listo para imprimir o descargar en PDF.
    """
    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a MySQL.", "danger")
        return redirect(url_for('pagos.index'))

    try:
        comp = PagoService.obtener_comprobante(conn, id_pago)
        return render_template('pagos/comprobante.html', comp=comp, formatear_cop=_formatear_cop)
    except PagoException as pe:
        flash(str(pe), "danger")
        return redirect(url_for('pagos.index', tab='historial'))
    finally:
        conn.close()


@pagos_bp.route('/propietarios/guardar', methods=['POST'], endpoint='guardar_propietario')
@login_required
def guardar_propietario():
    """
    RN07: Registra o actualiza un propietario evitando duplicados por cédula
    y opcionalmente le asocia una placa (un propietario puede tener 1 o varios vehículos).
    """
    datos_prop = {
        'nombre_completo': request.form.get('nombre_completo', '').strip(),
        'identificacion': request.form.get('identificacion', '').strip(),
        'celular': request.form.get('celular', '').strip(),
        'correo': request.form.get('correo', '').strip(),
    }
    placa_vincular = request.form.get('placa_vincular', '').strip().upper()

    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a MySQL.", "danger")
        return redirect(url_for('pagos.index', tab='propietarios'))

    try:
        res = PagoService.registrar_o_vincular_propietario(conn, datos_prop, placa_vincular=placa_vincular)
        accion = "registrado" if res['creado'] else "actualizado (cédula existente reutilizada sin duplicar)"
        msg = f"Propietario {res['nombre_completo']} ({res['identificacion']}) {accion}."
        if placa_vincular:
            msg += f" Vehículo {placa_vincular} asociado correctamente."
        flash(msg, "success")
    except PagoException as pe:
        flash(str(pe), "danger")
    except Exception as err:
        flash(f"Error al guardar propietario: {str(err)}", "danger")
    finally:
        conn.close()

    return redirect(url_for('pagos.index', tab='propietarios'))


@pagos_bp.route('/notificaciones/<int:id_notificacion>/revisar', methods=['POST'], endpoint='revisar_notificacion')
@login_required
def revisar_notificacion(id_notificacion):
    """Marca un recordatorio de vencimiento como revisado."""
    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a MySQL.", "danger")
        return redirect(url_for('pagos.index', tab='notificaciones'))

    try:
        NotificacionService.marcar_como_revisada(conn, id_notificacion)
        flash("Notificación marcada como revisada en el sistema.", "success")
    except Exception as err:
        flash(f"Error al actualizar notificación: {str(err)}", "danger")
    finally:
        conn.close()

    return redirect(url_for('pagos.index', tab='notificaciones'))


@pagos_bp.route('/notificaciones/sincronizar', methods=['POST'], endpoint='sincronizar_notificaciones')
@login_required
def sincronizar_notificaciones():
    """Ejecuta manualmente la verificación de vencimientos a 5 días."""
    conn = get_db_connection()
    if not conn:
        flash("Error de conexión a MySQL.", "danger")
        return redirect(url_for('pagos.index', tab='notificaciones'))

    try:
        nuevas = NotificacionService.sincronizar_recordatorios_vencimiento(conn)
        if nuevas > 0:
            flash(f"Se generaron {nuevas} recordatorio(s) nuevo(s) para mensualidades que vencen en los próximos 5 días.", "success")
        else:
            flash("Verificación completada: todas las mensualidades próximas a vencer (≤ 5 días) ya tienen su recordatorio generado.", "info")
    except Exception as err:
        flash(f"Error al sincronizar recordatorios: {str(err)}", "danger")
    finally:
        conn.close()

    return redirect(url_for('pagos.index', tab='notificaciones'))
