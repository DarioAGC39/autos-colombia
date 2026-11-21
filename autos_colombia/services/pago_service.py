"""
==============================================================
AUTOS COLOMBIA - SERVICIO DE GESTIÓN DE PAGOS (ITERACIÓN 3)
Archivo: services/pago_service.py
Responsabilidad: Reglas de negocio RN01 a RN07 para mensualidades,
                 propietarios (1:N), renovación sin mora, cálculo de
                 vencimientos y generación de comprobantes.
==============================================================
"""

import calendar
import re
from datetime import date, datetime
from dao.vehiculo_dao import VehiculoDAO
from dao.propietario_dao import PropietarioDAO
from dao.pago_dao import PagoDAO
from services.parqueadero_service import ParqueaderoService
from services.notificacion_service import NotificacionService


class PagoException(Exception):
    """Excepción de negocio para operaciones de pagos y propietarios."""
    pass


class PagoService:
    """
    Capa de Servicios para Gestión de Pagos (Iteración 3).
    Reglas obligatorias:
    - RN01: Exclusivamente mensualidades ($250.000 Carro / $100.000 Moto).
    - RN02: Sin cobro de mora ($0 de recargo por retraso).
    - RN03: Renovación inicia en fecha_pago y vence 1 mes después.
    - RN04: Comprobante oficial con consecutivo y datos completos.
    - RN05: Historial de pagos por vehículo y general.
    - RN06: Recordatorios 5 días antes de vencer.
    - RN07: Propietarios sin duplicar cédula, relación 1:N con vehículos.
    """

    METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta Débito/Crédito', 'Nequi / Daviplata']
    DIAS_ALERTA_PROXIMA = 5

    @staticmethod
    def sumar_un_mes(fecha_base):
        """
        RN03: Calcula exactamente un mes calendario después de fecha_base.
        Maneja correctamente finales de mes (ej: 31 ene -> 28/29 feb, 15 nov -> 15 dic).
        """
        if isinstance(fecha_base, datetime):
            fecha_base = fecha_base.date()
        anio = fecha_base.year
        mes = fecha_base.month + 1
        if mes > 12:
            mes = 1
            anio += 1
        ultimo_dia_mes = calendar.monthrange(anio, mes)[1]
        dia = min(fecha_base.day, ultimo_dia_mes)
        return date(anio, mes, dia)

    @classmethod
    def clasificar_estado_mensualidad(cls, fecha_vencimiento, fecha_referencia=None):
        """
        Clasifica una mensualidad según Control de Vencimientos:
        - AL_DIA: vence en más de 5 días.
        - PROXIMA_A_VENCER: vence hoy o dentro de los próximos 5 días (0 <= diff <= 5).
        - VENCIDA: fecha_vencimiento < hoy (diff < 0).
        - SIN_MENSUALIDAD: no registra pagos confirmados aún.
        """
        if not fecha_vencimiento:
            return {
                'codigo': 'SIN_MENSUALIDAD',
                'etiqueta': 'Sin mensualidad',
                'dias_restantes': None
            }

        hoy = fecha_referencia or date.today()
        if isinstance(fecha_vencimiento, datetime):
            fv = fecha_vencimiento.date()
        elif isinstance(fecha_vencimiento, date):
            fv = fecha_vencimiento
        else:
            fv = datetime.strptime(str(fecha_vencimiento)[:10], '%Y-%m-%d').date()

        diff = (fv - hoy).days
        if diff < 0:
            return {
                'codigo': 'VENCIDA',
                'etiqueta': f'Vencida (hace {abs(diff)} día{"s" if abs(diff) != 1 else ""})',
                'dias_restantes': diff
            }
        elif diff <= cls.DIAS_ALERTA_PROXIMA:
            texto = 'Vence hoy' if diff == 0 else f'Vence en {diff} día{"s" if diff != 1 else ""}'
            return {
                'codigo': 'PROXIMA_A_VENCER',
                'etiqueta': f'Próxima a vencer ({texto})',
                'dias_restantes': diff
            }
        else:
            return {
                'codigo': 'AL_DIA',
                'etiqueta': f'Al día ({diff} días restantes)',
                'dias_restantes': diff
            }

    @staticmethod
    def validar_datos_propietario(datos):
        """Valida los campos obligatorios del propietario (RN07)."""
        nombre = (datos.get('nombre_completo') or '').strip()
        identificacion = (datos.get('identificacion') or '').strip()
        celular = (datos.get('celular') or '').strip()
        correo = (datos.get('correo') or '').strip().lower()

        if len(nombre) < 3:
            raise PagoException("El nombre completo del propietario es obligatorio (mínimo 3 caracteres).")
        if not re.match(r'^[0-9A-Za-z\-]{5,20}$', identificacion):
            raise PagoException("El número de cédula/identificación debe tener entre 5 y 20 caracteres alfanuméricos.")
        if not re.match(r'^[0-9+\-\s]{7,20}$', celular):
            raise PagoException("El número de celular del propietario no tiene un formato válido.")
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', correo):
            raise PagoException("El correo electrónico del propietario no es válido.")

        return {
            'nombre_completo': nombre,
            'identificacion': identificacion,
            'celular': celular,
            'correo': correo
        }

    @classmethod
    def registrar_o_vincular_propietario(cls, conn, datos_prop, placa_vincular=None):
        """
        RN07: Registra un propietario si su cédula no existe.
        Si la identificación ya existe, reutiliza el registro evitando duplicados
        y opcionalmente actualiza sus datos o le vincula un vehículo (relación 1:N).
        """
        limpios = cls.validar_datos_propietario(datos_prop)
        placa = (placa_vincular or '').strip().upper()

        cursor = conn.cursor(dictionary=True)
        try:
            conn.start_transaction()
            existente = PropietarioDAO.obtener_por_identificacion(cursor, limpios['identificacion'])

            if existente:
                id_prop = existente['id_propietario']
                # Actualizamos contacto si es necesario sin duplicar cédula
                PropietarioDAO.actualizar(
                    cursor,
                    id_prop,
                    limpios['nombre_completo'],
                    limpios['identificacion'],
                    limpios['celular'],
                    limpios['correo']
                )
                creado = False
            else:
                id_prop = PropietarioDAO.insertar(
                    cursor,
                    limpios['nombre_completo'],
                    limpios['identificacion'],
                    limpios['celular'],
                    limpios['correo']
                )
                creado = True

            if placa:
                veh = VehiculoDAO.obtener_por_placa(cursor, placa)
                if not veh:
                    raise PagoException(
                        f"El vehículo con placa {placa} no está registrado aún. "
                        f"Puedes registrarlo desde 'Registrar entrada' o al registrar el vehículo con propietario."
                    )
                PropietarioDAO.asociar_vehiculo(cursor, placa, id_prop)

            conn.commit()
            return {'id_propietario': id_prop, 'creado': creado, **limpios}
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()

    @classmethod
    def buscar_vehiculo_para_pago(cls, conn, placa, fecha_pago_str=None):
        """
        Consulta un vehículo por placa para mostrar en el formulario de Registro de Pagos:
        - Datos del vehículo y propietario asociado.
        - Estado actual de mensualidad (Al día / Próxima / Vencida / Sin mensualidad).
        - Tarifa oficial ($250.000 Carro / $100.000 Moto) y Mora = $0 (RN02).
        - Cálculo automático del nuevo periodo (fecha_pago -> fecha_pago + 1 mes, RN03).
        - Historial de pagos de esa placa (RN05).
        """
        placa_limpia = (placa or '').strip().upper()
        if not placa_limpia:
            raise PagoException("Ingresa una placa para consultar.")

        fecha_pago = cls._parsear_fecha(fecha_pago_str) if fecha_pago_str else date.today()

        cursor = conn.cursor(dictionary=True)
        try:
            vehiculo = VehiculoDAO.obtener_con_propietario(cursor, placa_limpia)
            if not vehiculo:
                return None

            ultimo_pago = PagoDAO.obtener_ultimo_pago_por_placa(cursor, placa_limpia)
            estado_actual = cls.clasificar_estado_mensualidad(
                ultimo_pago['fecha_vencimiento'] if ultimo_pago else None
            )
            tarifa = ParqueaderoService.obtener_tarifa_mensual(vehiculo['tipo'])
            tipo_tarifa = ParqueaderoService.normalizar_tipo(vehiculo['tipo']) or 'Carro'
            nueva_fecha_vencimiento = cls.sumar_un_mes(fecha_pago)
            historial_vehiculo = PagoDAO.listar_historial_por_placa(cursor, placa_limpia)

            return {
                'vehiculo': vehiculo,
                'ultimo_pago': ultimo_pago,
                'estado_mensualidad': estado_actual,
                'tipo_tarifa': tipo_tarifa,
                'valor_mensualidad': tarifa,
                'valor_mora': 0,  # RN02: Nunca se cobra mora
                'valor_total': tarifa,
                'fecha_pago_propuesta': fecha_pago.strftime('%Y-%m-%d'),
                'fecha_vencimiento_propuesta': nueva_fecha_vencimiento.strftime('%Y-%m-%d'),
                'historial_vehiculo': historial_vehiculo
            }
        finally:
            cursor.close()

    @classmethod
    def confirmar_pago(cls, conn, datos, id_usuario_registro=None):
        """
        Confirma y persiste un pago mensual en una transacción segura:
        - Valida existencia del vehículo.
        - Valida o registra/reutiliza al propietario sin duplicar su identificación (RN07).
        - Evita pagos duplicados en la misma fecha para el mismo vehículo.
        - Aplica tarifa mensual oficial según tipo (Carro $250.000 / Moto $100.000) (RN01).
        - Garantiza mora = $0 (RN02).
        - Calcula periodo desde fecha_pago hasta fecha_pago + 1 mes (RN03).
        - Genera número de comprobante consecutivo y único (RN04).
        """
        placa = (datos.get('placa') or '').strip().upper()
        if not placa:
            raise PagoException("La placa del vehículo es obligatoria.")

        fecha_pago = cls._parsear_fecha(datos.get('fecha_pago'))
        fecha_inicio = fecha_pago
        fecha_vencimiento = cls.sumar_un_mes(fecha_pago)

        if fecha_vencimiento <= fecha_inicio:
            raise PagoException("Inconsistencia en las fechas: el vencimiento debe ser posterior al inicio.")

        metodo_pago = (datos.get('metodo_pago') or 'Efectivo').strip()
        if metodo_pago not in cls.METODOS_PAGO:
            metodo_pago = 'Efectivo'

        observaciones = (datos.get('observaciones') or '').strip()

        cursor = conn.cursor(dictionary=True)
        try:
            conn.start_transaction()

            # 1. Bloquear vehículo
            vehiculo = VehiculoDAO.obtener_por_placa_bloqueado(cursor, placa)
            if not vehiculo:
                raise PagoException(f"El vehículo con placa {placa} no se encuentra registrado.")

            # 2. Resolver propietario (reutilizar existente por cédula o usar el ya vinculado)
            identificacion_prop = (datos.get('identificacion_propietario') or '').strip()
            id_propietario = vehiculo.get('id_propietario')

            if identificacion_prop:
                datos_prop = cls.validar_datos_propietario({
                    'nombre_completo': datos.get('nombre_propietario', ''),
                    'identificacion': identificacion_prop,
                    'celular': datos.get('celular_propietario', ''),
                    'correo': datos.get('correo_propietario', '')
                })
                prop_existente = PropietarioDAO.obtener_por_identificacion(cursor, datos_prop['identificacion'])
                if prop_existente:
                    id_propietario = prop_existente['id_propietario']
                    PropietarioDAO.actualizar(
                        cursor,
                        id_propietario,
                        datos_prop['nombre_completo'],
                        datos_prop['identificacion'],
                        datos_prop['celular'],
                        datos_prop['correo']
                    )
                else:
                    id_propietario = PropietarioDAO.insertar(
                        cursor,
                        datos_prop['nombre_completo'],
                        datos_prop['identificacion'],
                        datos_prop['celular'],
                        datos_prop['correo']
                    )
                PropietarioDAO.asociar_vehiculo(cursor, placa, id_propietario)
            elif not id_propietario:
                raise PagoException(
                    f"El vehículo {placa} aún no tiene propietario asociado. "
                    f"Completa los datos del propietario antes de confirmar el pago."
                )

            # 3. Validar contra pagos duplicados en la misma fecha
            duplicado = PagoDAO.existe_pago_misma_fecha(cursor, placa, fecha_pago)
            if duplicado:
                raise PagoException(
                    f"Ya existe un pago confirmado para la placa {placa} en la fecha {fecha_pago.strftime('%Y-%m-%d')} "
                    f"(Comprobante {duplicado['numero_comprobante']}). No se permiten pagos duplicados."
                )

            # 4. Calcular tarifa estricta (RN01, RN02)
            tipo_tarifa = ParqueaderoService.normalizar_tipo(vehiculo['tipo']) or 'Carro'
            valor_mensualidad = ParqueaderoService.obtener_tarifa_mensual(vehiculo['tipo'])
            valor_mora = 0
            valor_pagado = valor_mensualidad

            # 5. Generar número de comprobante consecutivo
            numero_comprobante = PagoDAO.generar_siguiente_numero_comprobante(cursor, fecha_pago.year)

            obs_final = observaciones or "Renovación mensual sin recargos por mora ($0)"
            id_pago = PagoDAO.insertar(
                cursor=cursor,
                numero_comprobante=numero_comprobante,
                placa=placa,
                id_propietario=id_propietario,
                id_usuario_registro=id_usuario_registro,
                concepto='Mensualidad de parqueadero',
                tipo_vehiculo_tarifa=tipo_tarifa,
                valor_mensualidad=valor_mensualidad,
                valor_mora=valor_mora,
                valor_pagado=valor_pagado,
                fecha_pago=fecha_pago,
                fecha_inicio_periodo=fecha_inicio,
                fecha_vencimiento=fecha_vencimiento,
                metodo_pago=metodo_pago,
                observaciones=obs_final
            )

            comprobante = PagoDAO.obtener_por_id(cursor, id_pago)
            conn.commit()

            # Sincronizar recordatorios por si el pago renovado cae o salió de ventana de 5 días
            try:
                NotificacionService.sincronizar_recordatorios_vencimiento(conn)
            except Exception:
                pass

            return comprobante
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()

    @classmethod
    def obtener_panel_pagos(cls, conn, filtro_estado='TODOS', busqueda=''):
        """
        Obtiene toda la información para el módulo de Gestión de Pagos:
        - Sincroniza recordatorios de vencimiento (5 días antes).
        - KPIs del panel general.
        - Control de vencimientos por vehículo.
        - Historial general de pagos.
        - Listado de propietarios y sus vehículos.
        - Notificaciones generadas.
        """
        # 1. Sincronizar recordatorios automáticos (RN06)
        NotificacionService.sincronizar_recordatorios_vencimiento(conn)

        cursor = conn.cursor(dictionary=True)
        try:
            totales = PagoDAO.obtener_totales_recaudo(cursor)
            estados_raw = PagoDAO.listar_estado_mensualidades_vehiculos(cursor)

            al_dia = 0
            proximas = 0
            vencidas = 0
            sin_mensualidad = 0
            control_vencimientos = []

            for item in estados_raw:
                clasif = cls.clasificar_estado_mensualidad(item.get('fecha_vencimiento'))
                item['estado_clasificacion'] = clasif
                item['tarifa_mensual'] = ParqueaderoService.obtener_tarifa_mensual(item['tipo'])

                if clasif['codigo'] == 'AL_DIA':
                    al_dia += 1
                elif clasif['codigo'] == 'PROXIMA_A_VENCER':
                    proximas += 1
                elif clasif['codigo'] == 'VENCIDA':
                    vencidas += 1
                else:
                    sin_mensualidad += 1

                if filtro_estado == 'TODOS' or clasif['codigo'] == filtro_estado:
                    control_vencimientos.append(item)

            pagos = PagoDAO.listar_todos_con_detalle(cursor, busqueda=busqueda or None)
            propietarios = PropietarioDAO.listar_con_vehiculos(cursor, busqueda=busqueda or None)
            notificaciones = NotificacionService.listar_notificaciones(conn)

            kpis = {
                'total_pagadas': totales['total_pagos'],
                'ingresos_totales': totales['ingresos_totales'],
                'al_dia': al_dia,
                'proximas_vencer': proximas,
                'vencidas': vencidas,
                'sin_mensualidad': sin_mensualidad,
            }

            return {
                'kpis': kpis,
                'control_vencimientos': control_vencimientos,
                'pagos': pagos,
                'propietarios': propietarios,
                'notificaciones': notificaciones,
            }
        finally:
            cursor.close()

    @staticmethod
    def obtener_comprobante(conn, id_pago):
        """Retorna los datos completos de un comprobante de pago (RN04)."""
        cursor = conn.cursor(dictionary=True)
        try:
            comprobante = PagoDAO.obtener_por_id(cursor, id_pago)
            if not comprobante:
                raise PagoException("El comprobante de pago solicitado no existe.")
            return comprobante
        finally:
            cursor.close()

    @staticmethod
    def _parsear_fecha(fecha_str):
        """Convierte string YYYY-MM-DD a date o retorna date.today()."""
        if not fecha_str:
            return date.today()
        if isinstance(fecha_str, date):
            return fecha_str
        try:
            return datetime.strptime(str(fecha_str).strip()[:10], '%Y-%m-%d').date()
        except ValueError:
            raise PagoException("Formato de fecha inválido. Usa AAAA-MM-DD.")
