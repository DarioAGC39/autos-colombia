"""
==============================================================
AUTOS COLOMBIA - SERVICIO DE PARQUEADERO
Archivo: services/parqueadero_service.py
Responsabilidad: Implementación estricta de las reglas de negocio
                 del parqueadero mensual y orquestación de DAOs.
==============================================================
"""

import re
from datetime import datetime
from dao.vehiculo_dao import VehiculoDAO
from dao.movimiento_dao import MovimientoDAO
from dao.celda_dao import CeldaDAO


class ReglaNegocioException(Exception):
    """Excepción personalizada para infracciones de las reglas de negocio."""
    pass


class ParqueaderoService:
    """
    Capa de Servicios del Parqueadero Autos Colombia.
    Aísla las decisiones de negocio de los controladores HTTP (Blueprints).
    """

    # Tarifas de Mensualidad Oficiales del Parqueadero
    TARIFA_MENSUAL_CARRO = 250000  # $250.000 COP / mes
    TARIFA_MENSUAL_MOTO = 100000   # $100.000 COP / mes

    # Tipos permitidos
    TIPOS_PERMITIDOS = ['Carro', 'Moto']

    @classmethod
    def validar_formato_placa(cls, placa):
        """
        Valida que la placa cumpla con el formato legal de Colombia:
        - Carro: 3 letras y 3 números (Ej: KLM482).
        - Moto: 3 letras, 2 números y 1 letra (Ej: ABC12D).
        """
        if not placa:
            return False
        placa_limpia = placa.strip().upper()
        patron = r'^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}$'
        return bool(re.match(patron, placa_limpia))

    @classmethod
    def normalizar_tipo(cls, tipo_raw):
        """Normaliza el tipo de vehículo a 'Carro' o 'Moto'."""
        if not tipo_raw:
            return None
        t = tipo_raw.strip().lower()
        if 'moto' in t:
            return 'Moto'
        if 'carro' in t or 'auto' in t:
            return 'Carro'
        return None

    @classmethod
    def obtener_tarifa_mensual(cls, tipo):
        """Retorna el canon de arrendamiento mensual según la categoría."""
        tipo_norm = cls.normalizar_tipo(tipo)
        if tipo_norm == 'Moto':
            return cls.TARIFA_MENSUAL_MOTO
        return cls.TARIFA_MENSUAL_CARRO

    @classmethod
    def registrar_ingreso(cls, conn, datos):
        """
        Regla A: Registrar entrada de vehículo.
        - Valida campos obligatorios y formato de placa.
        - Si el vehículo ya existe, actualiza su ficha sin duplicar.
        - Comprueba transaccionalmente que no tenga un movimiento activo.
        - Asigna celda automáticamente o valida la celda seleccionada.
        - Registra fecha y hora automáticas (NOW()).
        """
        placa = (datos.get('placa') or '').strip().upper()
        tipo = cls.normalizar_tipo(datos.get('tipo'))
        color = (datos.get('color') or '').strip()
        marca = (datos.get('marca') or '').strip()
        modelo = (datos.get('modelo') or '').strip()
        celda = (datos.get('celda') or '').strip().upper()

        # 1. Validaciones de presencia
        if not placa:
            raise ReglaNegocioException("La placa es obligatoria.")
        if not cls.validar_formato_placa(placa):
            raise ReglaNegocioException("Formato de placa inválido. Ejemplo Carro: KLM482, Moto: ABC12D.")
        if not tipo:
            raise ReglaNegocioException("El parqueadero solo admite tipos 'Carro' o 'Moto'.")
        if not color or not marca or not modelo:
            raise ReglaNegocioException("Color, marca y modelo son campos obligatorios.")

        cursor = conn.cursor(dictionary=True)
        try:
            conn.start_transaction()

            # 2. Control de concurrencia: verificar si el vehículo ya existe
            vehiculo_existente = VehiculoDAO.obtener_por_placa_bloqueado(cursor, placa)
            if not vehiculo_existente:
                VehiculoDAO.insertar(cursor, placa, tipo, color, marca, modelo)
            else:
                VehiculoDAO.actualizar(cursor, placa, tipo, color, marca, modelo)

            # 3. Comprobar si ya tiene movimiento activo
            movimiento_activo = MovimientoDAO.obtener_activo_por_placa(cursor, placa, for_update=True)
            if movimiento_activo:
                conn.rollback()
                raise ReglaNegocioException(
                    f"El vehículo con placa {placa} ya tiene una entrada activa registrada. "
                    f"No se puede duplicar el ingreso hasta que se registre su salida."
                )

            # 4. Asignación y validación de Celda (Capacidad: 70 Carros, 10 Motos)
            ocupadas = CeldaDAO.obtener_celdas_ocupadas(cursor)
            if celda:
                if celda in ocupadas:
                    conn.rollback()
                    raise ReglaNegocioException(f"La celda {celda} ya se encuentra ocupada por otro vehículo.")
            else:
                celda = CeldaDAO.obtener_primera_celda_libre(cursor, tipo)
                if not celda:
                    conn.rollback()
                    raise ReglaNegocioException(f"No hay celdas disponibles para {tipo} en este momento (Capacidad completa).")

            # 5. Insertar movimiento con estado ACTIVO
            obs = f"Ingreso mensual registrado en celda {celda}"
            id_mov = MovimientoDAO.registrar_entrada(cursor, placa, celda, obs)
            nuevo_mov = MovimientoDAO.obtener_por_id(cursor, id_mov)

            conn.commit()
            return nuevo_mov

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

    @classmethod
    def consultar_salida_por_placa(cls, conn, placa):
        """
        Regla B - Paso 1: Consultar estado de salida SIN finalizar movimiento.
        Permite buscar por placa y visualizar los datos del vehículo y su entrada activa.
        NO realiza cambios en la base de datos (búsqueda idempotente).
        """
        placa_limpia = (placa or '').strip().upper()
        if not placa_limpia:
            raise ReglaNegocioException("Ingresa una placa para buscar el vehículo.")

        cursor = conn.cursor(dictionary=True)
        try:
            vehiculo = VehiculoDAO.obtener_por_placa(cursor, placa_limpia)
            if not vehiculo:
                raise ReglaNegocioException(f"No se encontró ningún vehículo registrado con la placa {placa_limpia}.")

            movimiento_activo = MovimientoDAO.obtener_activo_por_placa(cursor, placa_limpia)
            return vehiculo, movimiento_activo
        finally:
            cursor.close()

    @classmethod
    def confirmar_salida(cls, conn, placa):
        """
        Regla B - Paso 2: Finalizar movimiento explícitamente tras confirmación del empleado.
        - Verifica que el vehículo exista.
        - Comprueba que tenga un movimiento activo.
        - Registra fecha_hora_salida automática (NOW()).
        - Cambia estado a 'FINALIZADO' y libera la celda asignada.
        """
        placa_limpia = (placa or '').strip().upper()
        if not placa_limpia:
            raise ReglaNegocioException("La placa es obligatoria para confirmar la salida.")

        cursor = conn.cursor(dictionary=True)
        try:
            conn.start_transaction()

            vehiculo = VehiculoDAO.obtener_por_placa_bloqueado(cursor, placa_limpia)
            if not vehiculo:
                conn.rollback()
                raise ReglaNegocioException(f"El vehículo {placa_limpia} no existe en la base de datos.")

            mov = MovimientoDAO.obtener_activo_por_placa(cursor, placa_limpia, for_update=True)
            if not mov:
                conn.rollback()
                raise ReglaNegocioException(f"El vehículo {placa_limpia} no tiene un movimiento activo (ya está fuera del parqueadero).")

            # Finalizar movimiento
            obs = f"Salida confirmada. Celda {mov.get('celda', 'N/A')} liberada."
            MovimientoDAO.registrar_salida(cursor, mov['id_movimiento'], obs)

            resumen = MovimientoDAO.obtener_por_id(cursor, mov['id_movimiento'])
            conn.commit()
            return vehiculo, resumen

        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

    @classmethod
    def consultar_estado(cls, conn, placa):
        """
        Regla C: Consultar datos y determinar si está 'En parqueadero' o 'Fuera del parqueadero'.
        """
        placa_limpia = (placa or '').strip().upper()
        if not placa_limpia:
            raise ReglaNegocioException("Ingresa una placa para consultar.")

        cursor = conn.cursor(dictionary=True)
        try:
            vehiculo = VehiculoDAO.obtener_por_placa(cursor, placa_limpia)
            if not vehiculo:
                return None, None
            movimiento_activo = MovimientoDAO.obtener_activo_por_placa(cursor, placa_limpia)
            return vehiculo, movimiento_activo
        finally:
            cursor.close()

    @classmethod
    def consultar_historial(cls, conn, placa):
        """
        Regla D: Consultar historial de movimientos ordenados DESC (más reciente al más antiguo).
        """
        placa_limpia = (placa or '').strip().upper()
        if not placa_limpia:
            raise ReglaNegocioException("Ingresa una placa para ver su historial.")

        cursor = conn.cursor(dictionary=True)
        try:
            vehiculo = VehiculoDAO.obtener_por_placa(cursor, placa_limpia)
            movimientos = MovimientoDAO.listar_historial_por_placa(cursor, placa_limpia)
            return vehiculo, movimientos
        finally:
            cursor.close()

    @classmethod
    def obtener_resumen_dashboard(cls, conn):
        """Genera los indicadores clave de rendimiento (KPIs) del dashboard."""
        cursor = conn.cursor(dictionary=True)
        try:
            total_activos = MovimientoDAO.contar_activos(cursor)
            total_vehiculos = VehiculoDAO.contar_todos(cursor)
            salidas_hoy = MovimientoDAO.contar_salidas_hoy(cursor)
            ultimos = MovimientoDAO.listar_ultimos_movimientos(cursor, 5)

            stats = {
                'activos': total_activos,
                'vehiculos': total_vehiculos,
                'hoy': salidas_hoy
            }
            return stats, ultimos
        finally:
            cursor.close()

    @classmethod
    def obtener_panel_disponibilidad(cls, conn):
        """
        Construye la matriz de las 80 celdas (70 carros, 10 motos)
        con su estado de ocupación actual y vehículo asociado.
        """
        cursor = conn.cursor(dictionary=True)
        try:
            activos = MovimientoDAO.listar_movimientos_activos_con_vehiculo(cursor)
            mapa_activos = {}
            for act in activos:
                c = act.get('celda')
                if c:
                    if isinstance(act.get('fecha_hora_entrada'), datetime):
                        act['fecha_hora_entrada'] = act['fecha_hora_entrada'].strftime('%Y-%m-%d %H:%M:%S')
                    mapa_activos[c] = act

            catalogo = CeldaDAO.generar_catalogo_celdas()
            celdas_con_estado = []
            for item in catalogo:
                codigo = item['codigo']
                mov = mapa_activos.get(codigo)
                celdas_con_estado.append({
                    'codigo': codigo,
                    'tipo': item['tipo'],
                    'numero': item['numero'],
                    'ocupada': bool(mov),
                    'movimiento': mov
                })

            total_ocupadas = len(mapa_activos)
            total_libres = CeldaDAO.TOTAL_CELDAS - total_ocupadas
            carros_ocupados = sum(1 for c in celdas_con_estado if c['tipo'] == 'CARRO' and c['ocupada'])
            carros_libres = CeldaDAO.TOTAL_CARROS - carros_ocupados
            motos_ocupadas = sum(1 for c in celdas_con_estado if c['tipo'] == 'MOTO' and c['ocupada'])
            motos_libres = CeldaDAO.TOTAL_MOTOS - motos_ocupadas
            porcentaje = round((total_ocupadas / CeldaDAO.TOTAL_CELDAS) * 100, 1)

            estadisticas = {
                'total_celdas': CeldaDAO.TOTAL_CELDAS,
                'total_ocupadas': total_ocupadas,
                'total_libres': total_libres,
                'carros_ocupados': carros_ocupados,
                'carros_libres': carros_libres,
                'motos_ocupadas': motos_ocupadas,
                'motos_libres': motos_libres,
                'porcentaje_ocupacion': porcentaje
            }

            return celdas_con_estado, estadisticas
        finally:
            cursor.close()
