"""
==============================================================
AUTOS COLOMBIA - DAO: PAGO DE MENSUALIDADES (ITERACIÓN 3)
Archivo: dao/pago_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'pago'.
==============================================================
"""


class PagoDAO:
    """Objeto de Acceso a Datos (DAO) para pagos mensuales y comprobantes."""

    @staticmethod
    def generar_siguiente_numero_comprobante(cursor, anio):
        """
        Genera el próximo número consecutivo de comprobante con formato AC-YYYY-NNNNN.
        """
        prefijo = f"AC-{anio}-"
        sql = """
            SELECT numero_comprobante
            FROM pago
            WHERE numero_comprobante LIKE %s
            ORDER BY id_pago DESC
            LIMIT 1
        """
        cursor.execute(sql, (f"{prefijo}%",))
        fila = cursor.fetchone()
        siguiente = 1
        if fila and fila.get('numero_comprobante'):
            try:
                ultimo_num = int(fila['numero_comprobante'].split('-')[-1])
                siguiente = ultimo_num + 1
            except (ValueError, IndexError):
                siguiente = 1
        return f"{prefijo}{siguiente:05d}"

    @staticmethod
    def existe_pago_misma_fecha(cursor, placa, fecha_pago):
        """Verifica si ya existe un pago confirmado para esa placa en la misma fecha."""
        sql = """
            SELECT id_pago, numero_comprobante
            FROM pago
            WHERE placa = %s AND fecha_pago = %s AND estado_pago = 'CONFIRMADO'
            LIMIT 1
        """
        cursor.execute(sql, (placa, fecha_pago))
        return cursor.fetchone()

    @staticmethod
    def insertar(
        cursor,
        numero_comprobante,
        placa,
        id_propietario,
        id_usuario_registro,
        concepto,
        tipo_vehiculo_tarifa,
        valor_mensualidad,
        valor_mora,
        valor_pagado,
        fecha_pago,
        fecha_inicio_periodo,
        fecha_vencimiento,
        metodo_pago='Efectivo',
        observaciones=None
    ):
        """Inserta un pago mensual confirmado y retorna el id_pago."""
        sql = """
            INSERT INTO pago (
                numero_comprobante, placa, id_propietario, id_usuario_registro,
                concepto, tipo_vehiculo_tarifa, valor_mensualidad, valor_mora, valor_pagado,
                fecha_pago, fecha_inicio_periodo, fecha_vencimiento, metodo_pago, estado_pago, observaciones
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'CONFIRMADO', %s)
        """
        cursor.execute(sql, (
            numero_comprobante,
            placa,
            id_propietario,
            id_usuario_registro,
            concepto,
            tipo_vehiculo_tarifa,
            valor_mensualidad,
            valor_mora,
            valor_pagado,
            fecha_pago,
            fecha_inicio_periodo,
            fecha_vencimiento,
            metodo_pago,
            observaciones
        ))
        return cursor.lastrowid

    @staticmethod
    def obtener_por_id(cursor, id_pago):
        """Obtiene todos los datos de un comprobante de pago por su ID."""
        sql = """
            SELECT pg.*,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion,
                   pr.celular AS propietario_celular,
                   pr.correo AS propietario_correo,
                   v.tipo AS vehiculo_tipo,
                   v.marca AS vehiculo_marca,
                   v.modelo AS vehiculo_modelo,
                   v.color AS vehiculo_color,
                   CONCAT(u.nombres, ' ', u.apellidos) AS usuario_registro_nombre,
                   u.rol AS usuario_registro_rol
            FROM pago pg
            INNER JOIN propietario pr ON pg.id_propietario = pr.id_propietario
            INNER JOIN vehiculo v ON pg.placa = v.placa
            LEFT JOIN usuario u ON pg.id_usuario_registro = u.id_usuario
            WHERE pg.id_pago = %s
        """
        cursor.execute(sql, (id_pago,))
        return cursor.fetchone()

    @staticmethod
    def obtener_ultimo_pago_por_placa(cursor, placa):
        """Retorna el pago confirmado más reciente (por fecha_vencimiento) de una placa."""
        sql = """
            SELECT pg.*,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion
            FROM pago pg
            INNER JOIN propietario pr ON pg.id_propietario = pr.id_propietario
            WHERE pg.placa = %s AND pg.estado_pago = 'CONFIRMADO'
            ORDER BY pg.fecha_vencimiento DESC, pg.id_pago DESC
            LIMIT 1
        """
        cursor.execute(sql, (placa,))
        return cursor.fetchone()

    @staticmethod
    def listar_historial_por_placa(cursor, placa):
        """Lista todos los pagos realizados para una placa (RN05)."""
        sql = """
            SELECT pg.*,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion,
                   CONCAT(u.nombres, ' ', u.apellidos) AS usuario_registro_nombre
            FROM pago pg
            INNER JOIN propietario pr ON pg.id_propietario = pr.id_propietario
            LEFT JOIN usuario u ON pg.id_usuario_registro = u.id_usuario
            WHERE pg.placa = %s
            ORDER BY pg.fecha_pago DESC, pg.id_pago DESC
        """
        cursor.execute(sql, (placa,))
        return cursor.fetchall()

    @staticmethod
    def listar_todos_con_detalle(cursor, busqueda=None):
        """Lista todos los pagos realizados con filtros opcionales de búsqueda."""
        sql = """
            SELECT pg.*,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion,
                   pr.celular AS propietario_celular,
                   pr.correo AS propietario_correo,
                   v.tipo AS vehiculo_tipo,
                   v.marca AS vehiculo_marca,
                   v.modelo AS vehiculo_modelo,
                   CONCAT(u.nombres, ' ', u.apellidos) AS usuario_registro_nombre
            FROM pago pg
            INNER JOIN propietario pr ON pg.id_propietario = pr.id_propietario
            INNER JOIN vehiculo v ON pg.placa = v.placa
            LEFT JOIN usuario u ON pg.id_usuario_registro = u.id_usuario
        """
        params = []
        if busqueda:
            like = f"%{busqueda}%"
            sql += """
                WHERE pg.placa LIKE %s
                   OR pg.numero_comprobante LIKE %s
                   OR pr.nombre_completo LIKE %s
                   OR pr.identificacion LIKE %s
            """
            params.extend([like, like, like, like])

        sql += " ORDER BY pg.fecha_pago DESC, pg.id_pago DESC"
        cursor.execute(sql, tuple(params))
        return cursor.fetchall()

    @staticmethod
    def listar_estado_mensualidades_vehiculos(cursor):
        """
        Retorna cada vehículo registrado con su propietario y el último pago confirmado
        para evaluar el control de vencimientos (Al día / Próxima a vencer / Vencida / Sin pago).
        """
        sql = """
            SELECT v.placa, v.tipo, v.color, v.marca, v.modelo, v.id_propietario,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion,
                   pr.celular AS propietario_celular,
                   pr.correo AS propietario_correo,
                   lp.id_pago, lp.numero_comprobante, lp.fecha_pago,
                   lp.fecha_inicio_periodo, lp.fecha_vencimiento,
                   lp.valor_pagado, lp.estado_pago
            FROM vehiculo v
            LEFT JOIN propietario pr ON v.id_propietario = pr.id_propietario
            LEFT JOIN (
                SELECT p1.*
                FROM pago p1
                INNER JOIN (
                    SELECT placa, MAX(id_pago) AS max_id
                    FROM pago
                    WHERE estado_pago = 'CONFIRMADO'
                    GROUP BY placa
                ) p2 ON p1.id_pago = p2.max_id
            ) lp ON v.placa = lp.placa
            ORDER BY
                CASE WHEN lp.fecha_vencimiento IS NULL THEN 1 ELSE 0 END,
                lp.fecha_vencimiento ASC,
                v.placa ASC
        """
        cursor.execute(sql)
        return cursor.fetchall()

    @staticmethod
    def obtener_totales_recaudo(cursor):
        """Retorna el total de pagos confirmados y la suma recaudada."""
        sql = """
            SELECT COUNT(*) AS total_pagos,
                   COALESCE(SUM(valor_pagado), 0) AS ingresos_totales
            FROM pago
            WHERE estado_pago = 'CONFIRMADO'
        """
        cursor.execute(sql)
        res = cursor.fetchone()
        return {
            'total_pagos': int(res['total_pagos']) if res else 0,
            'ingresos_totales': int(res['ingresos_totales']) if res else 0
        }
