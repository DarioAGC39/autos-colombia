"""
==============================================================
AUTOS COLOMBIA - DAO: NOTIFICACIÓN DE VENCIMIENTOS (ITERACIÓN 3 - RN06)
Archivo: dao/notificacion_dao.py
Responsabilidad: Consultas y persistencia para la tabla 'notificacion'.
==============================================================
"""


class NotificacionDAO:
    """Objeto de Acceso a Datos (DAO) para recordatorios de vencimiento."""

    @staticmethod
    def existe_para_ciclo(cursor, placa, fecha_vencimiento_ref, tipo_notificacion='VENCIMIENTO_PROXIMO'):
        """Evita duplicar notificaciones para un mismo vehículo y ciclo de vencimiento."""
        sql = """
            SELECT id_notificacion
            FROM notificacion
            WHERE placa = %s
              AND fecha_vencimiento_ref = %s
              AND tipo_notificacion = %s
            LIMIT 1
        """
        cursor.execute(sql, (placa, fecha_vencimiento_ref, tipo_notificacion))
        return cursor.fetchone() is not None

    @staticmethod
    def insertar(
        cursor,
        placa,
        id_propietario,
        id_pago,
        mensaje,
        fecha_vencimiento_ref,
        canal_objetivo='SISTEMA',
        estado_envio='GENERADA_PENDIENTE_CANAL',
        detalle_canal=None,
        tipo_notificacion='VENCIMIENTO_PROXIMO'
    ):
        """Registra una notificación de vencimiento próximo."""
        sql = """
            INSERT INTO notificacion (
                placa, id_propietario, id_pago, tipo_notificacion,
                canal_objetivo, mensaje, fecha_vencimiento_ref,
                estado_envio, detalle_canal
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql, (
            placa,
            id_propietario,
            id_pago,
            tipo_notificacion,
            canal_objetivo,
            mensaje,
            fecha_vencimiento_ref,
            estado_envio,
            detalle_canal
        ))
        return cursor.lastrowid

    @staticmethod
    def listar_todas(cursor):
        """Lista todas las notificaciones con datos del propietario y vehículo."""
        sql = """
            SELECT n.*,
                   pr.nombre_completo AS propietario_nombre,
                   pr.identificacion AS propietario_identificacion,
                   pr.celular AS propietario_celular,
                   pr.correo AS propietario_correo,
                   v.tipo AS vehiculo_tipo,
                   v.marca AS vehiculo_marca,
                   v.modelo AS vehiculo_modelo
            FROM notificacion n
            INNER JOIN propietario pr ON n.id_propietario = pr.id_propietario
            INNER JOIN vehiculo v ON n.placa = v.placa
            ORDER BY
                CASE WHEN n.estado_envio = 'GENERADA_PENDIENTE_CANAL' THEN 0 ELSE 1 END,
                n.fecha_generacion DESC
        """
        cursor.execute(sql)
        return cursor.fetchall()

    @staticmethod
    def marcar_revisada(cursor, id_notificacion):
        """Marca una notificación interna como revisada/gestionada por el operador."""
        sql = """
            UPDATE notificacion
            SET estado_envio = 'REVISADA',
                detalle_canal = COALESCE(detalle_canal, 'Revisada manualmente en panel de control')
            WHERE id_notificacion = %s
        """
        cursor.execute(sql, (id_notificacion,))

    @staticmethod
    def contar_pendientes(cursor):
        """Cuenta las notificaciones pendientes de revisión o despacho externo."""
        sql = "SELECT COUNT(*) AS total FROM notificacion WHERE estado_envio = 'GENERADA_PENDIENTE_CANAL'"
        cursor.execute(sql)
        res = cursor.fetchone()
        return int(res['total']) if res else 0
