"""
==============================================================
AUTOS COLOMBIA - SERVICIO DE NOTIFICACIONES (ITERACIÓN 3 - RN06)
Archivo: services/notificacion_service.py
Responsabilidad: Generación automática de recordatorios 5 días antes
                 del vencimiento y preparación de adaptadores para
                 canales externos (Correo SMTP / SMS Gateway).
==============================================================
"""

import smtplib
from email.message import EmailMessage
from datetime import date, datetime
from config import Config
from dao.pago_dao import PagoDAO
from dao.notificacion_dao import NotificacionDAO


MESES_ES = [
    '', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]


def formatear_fecha_es(fecha_val):
    """Formatea una fecha (date/datetime/str) como '15 de diciembre'."""
    if not fecha_val:
        return ''
    if isinstance(fecha_val, datetime):
        d = fecha_val.date()
    elif isinstance(fecha_val, date):
        d = fecha_val
    else:
        try:
            d = datetime.strptime(str(fecha_val)[:10], '%Y-%m-%d').date()
        except ValueError:
            return str(fecha_val)
    return f"{d.day} de {MESES_ES[d.month]}"


class CanalNotificacionExterno:
    """
    Adaptador preparado para integración con servicios reales de Correo (SMTP) o SMS.
    No simula envíos reales cuando no existen credenciales configuradas en el entorno.
    """

    @staticmethod
    def estado_canales():
        return Config.notificaciones_externas_configuradas()

    @staticmethod
    def intentar_envio_correo(destinatario, asunto, cuerpo):
        """
        Envía un correo real vía SMTP solo si MAIL_SERVER, MAIL_USERNAME y MAIL_PASSWORD
        están configurados. De lo contrario retorna estado honesto de canal no configurado.
        """
        canales = Config.notificaciones_externas_configuradas()
        if not canales['correo_smtp']:
            return {
                'enviado': False,
                'motivo': 'Servicio SMTP no configurado en variables de entorno (.env). Notificación conservada en sistema.'
            }

        try:
            msg = EmailMessage()
            msg['Subject'] = asunto
            msg['From'] = Config.MAIL_FROM
            msg['To'] = destinatario
            msg.set_content(cuerpo)

            with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT, timeout=10) as smtp:
                smtp.starttls()
                smtp.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
                smtp.send_message(msg)

            return {'enviado': True, 'motivo': f'Correo enviado vía SMTP a {destinatario}'}
        except Exception as err:
            return {'enviado': False, 'motivo': f'Error SMTP al enviar correo: {str(err)}'}

    @staticmethod
    def intentar_envio_sms(celular, mensaje):
        """
        Punto de extensión preparado para proveedor SMS (Twilio / Hablame / AWS SNS).
        Retorna estado honesto si no existe gateway SMS configurado.
        """
        canales = Config.notificaciones_externas_configuradas()
        if not canales['sms_gateway']:
            return {
                'enviado': False,
                'motivo': 'Proveedor SMS externo no configurado en .env. Recordatorio disponible en el panel interno.'
            }

        # Aquí se conectaría la petición HTTP POST al SMS_PROVIDER_URL con SMS_API_KEY
        return {
            'enviado': False,
            'motivo': f'Gateway SMS ({Config.SMS_PROVIDER_URL}) listo para integración HTTP con número {celular}.'
        }


class NotificacionService:
    """Lógica de negocio para recordatorios de vencimiento (RN06)."""

    DIAS_ANTICIPACION = 5

    @classmethod
    def construir_mensaje_recordatorio(cls, placa, fecha_vencimiento):
        """Construye exactamente el mensaje oficial definido en RN06."""
        fecha_legible = formatear_fecha_es(fecha_vencimiento)
        return (
            f"Estimado cliente, le informamos que su mensualidad de parqueadero del vehículo "
            f"{placa} está próxima a vencer el día {fecha_legible}. "
            f"Le recomendamos realizar su pago antes de esa fecha. "
            f"Gracias por utilizar Autos Colombia."
        )

    @classmethod
    def sincronizar_recordatorios_vencimiento(cls, conn, fecha_referencia=None):
        """
        Revisa los vehículos con mensualidad vigente cuyo vencimiento ocurra dentro
        de los próximos 5 días (0 <= dias_restantes <= 5) y genera los recordatorios
        en la tabla 'notificacion' sin duplicarlos.
        """
        hoy = fecha_referencia or date.today()
        cursor = conn.cursor(dictionary=True)
        generadas = 0
        try:
            registros = PagoDAO.listar_estado_mensualidades_vehiculos(cursor)
            for reg in registros:
                fecha_venc = reg.get('fecha_vencimiento')
                id_prop = reg.get('id_propietario')
                if not fecha_venc or not id_prop:
                    continue

                if isinstance(fecha_venc, datetime):
                    fecha_venc_d = fecha_venc.date()
                elif isinstance(fecha_venc, date):
                    fecha_venc_d = fecha_venc
                else:
                    fecha_venc_d = datetime.strptime(str(fecha_venc)[:10], '%Y-%m-%d').date()

                dias_restantes = (fecha_venc_d - hoy).days
                if 0 <= dias_restantes <= cls.DIAS_ANTICIPACION:
                    ya_existe = NotificacionDAO.existe_para_ciclo(
                        cursor, reg['placa'], fecha_venc_d, 'VENCIMIENTO_PROXIMO'
                    )
                    if not ya_existe:
                        mensaje = cls.construir_mensaje_recordatorio(reg['placa'], fecha_venc_d)
                        canales = CanalNotificacionExterno.estado_canales()
                        detalle = (
                            "Generada automáticamente (5 días antes). "
                            + ("SMTP configurado." if canales['correo_smtp'] else "Canal externo correo/SMS no configurado en este entorno.")
                        )
                        NotificacionDAO.insertar(
                            cursor=cursor,
                            placa=reg['placa'],
                            id_propietario=id_prop,
                            id_pago=reg.get('id_pago'),
                            mensaje=mensaje,
                            fecha_vencimiento_ref=fecha_venc_d,
                            canal_objetivo='SISTEMA',
                            estado_envio='GENERADA_PENDIENTE_CANAL',
                            detalle_canal=detalle,
                            tipo_notificacion='VENCIMIENTO_PROXIMO'
                        )
                        generadas += 1

            conn.commit()
            return generadas
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()

    @classmethod
    def listar_notificaciones(cls, conn):
        """Retorna todas las notificaciones del sistema."""
        cursor = conn.cursor(dictionary=True)
        try:
            return NotificacionDAO.listar_todas(cursor)
        finally:
            cursor.close()

    @classmethod
    def marcar_como_revisada(cls, conn, id_notificacion):
        """Marca una alerta como revisada por el personal del parqueadero."""
        cursor = conn.cursor(dictionary=True)
        try:
            NotificacionDAO.marcar_revisada(cursor, id_notificacion)
            conn.commit()
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()
