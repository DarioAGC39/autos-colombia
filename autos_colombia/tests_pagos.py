"""
==============================================================
AUTOS COLOMBIA - SUITE DE PRUEBAS AUTOMATIZADAS (ITERACIÓN 3)
Archivo: tests_pagos.py
Responsabilidad: Validación de reglas de negocio RN01 a RN07:
                 - Mensualidades sin mora ($250k carro / $100k moto)
                 - Renovación +1 mes desde la fecha de pago
                 - Clasificación de vencimientos (Al día / Próxima / Vencida)
                 - Generación exacta del recordatorio 5 días antes
                 - Validación de propietarios sin duplicados
                 - Adaptador honesto para canales externos no configurados
==============================================================
"""

import unittest
from datetime import date
from services.pago_service import PagoService, PagoException
from services.notificacion_service import NotificacionService, CanalNotificacionExterno
from services.parqueadero_service import ParqueaderoService


class TestModuloPagos(unittest.TestCase):
    """Pruebas unitarias para las reglas de negocio de Gestión de Pagos."""

    def test_rn01_tarifas_exclusivamente_mensuales(self):
        """RN01: Tarifas oficiales de $250.000 Carro y $100.000 Moto."""
        self.assertEqual(ParqueaderoService.obtener_tarifa_mensual('Automóvil'), 250000)
        self.assertEqual(ParqueaderoService.obtener_tarifa_mensual('Camioneta'), 250000)
        self.assertEqual(ParqueaderoService.obtener_tarifa_mensual('Motocicleta'), 100000)
        self.assertEqual(ParqueaderoService.obtener_tarifa_mensual('Moto'), 100000)

    def test_rn03_renovacion_desde_fecha_pago(self):
        """RN03: Ejemplo oficial 15 de noviembre -> 15 de diciembre y fin de mes."""
        fecha_pago = date(2026, 11, 15)
        vencimiento = PagoService.sumar_un_mes(fecha_pago)
        self.assertEqual(vencimiento, date(2026, 12, 15))

        # Cambio de año (15 diciembre -> 15 enero año siguiente)
        self.assertEqual(PagoService.sumar_un_mes(date(2026, 12, 15)), date(2027, 1, 15))

        # Fin de mes (31 enero -> 28 febrero en año no bisiesto)
        self.assertEqual(PagoService.sumar_un_mes(date(2026, 1, 31)), date(2026, 2, 28))

    def test_clasificacion_vencimientos(self):
        """Control de vencimientos: Al día, Próxima a vencer (<=5 días) y Vencida."""
        hoy = date(2026, 11, 10)

        # Al día (vence en 10 días)
        est_al_dia = PagoService.clasificar_estado_mensualidad(date(2026, 11, 20), fecha_referencia=hoy)
        self.assertEqual(est_al_dia['codigo'], 'AL_DIA')

        # Próxima a vencer (exactamente 5 días antes)
        est_proxima = PagoService.clasificar_estado_mensualidad(date(2026, 11, 15), fecha_referencia=hoy)
        self.assertEqual(est_proxima['codigo'], 'PROXIMA_A_VENCER')
        self.assertEqual(est_proxima['dias_restantes'], 5)

        # Vencida (venció hace 3 días)
        est_vencida = PagoService.clasificar_estado_mensualidad(date(2026, 11, 7), fecha_referencia=hoy)
        self.assertEqual(est_vencida['codigo'], 'VENCIDA')
        self.assertEqual(est_vencida['dias_restantes'], -3)

    def test_rn06_formato_mensaje_recordatorio_5_dias(self):
        """RN06: El recordatorio debe contener placa y fecha legible."""
        msg = NotificacionService.construir_mensaje_recordatorio('ABC123', date(2026, 12, 15))
        self.assertIn('ABC123', msg)
        self.assertIn('15 de diciembre', msg)
        self.assertIn('Autos Colombia', msg)

    def test_rn07_validacion_propietario(self):
        """RN07: Validar datos obligatorios del propietario."""
        datos = PagoService.validar_datos_propietario({
            'nombre_completo': 'Andrés Felipe Martínez',
            'identificacion': '1015423890',
            'celular': '3104567890',
            'correo': 'ANDRES@CORREO.COM'
        })
        self.assertEqual(datos['correo'], 'andres@correo.com')

        with self.assertRaises(PagoException):
            PagoService.validar_datos_propietario({
                'nombre_completo': 'AB',
                'identificacion': '123',
                'celular': '12',
                'correo': 'invalido'
            })

    def test_seccion7_no_simular_envio_externo_sin_credenciales(self):
        """Sección 7: Si no hay SMTP/SMS configurado, nunca reportar enviado=True."""
        res_mail = CanalNotificacionExterno.intentar_envio_correo('test@correo.com', 'Asunto', 'Cuerpo')
        res_sms = CanalNotificacionExterno.intentar_envio_sms('3104567890', 'Mensaje')
        self.assertFalse(res_mail['enviado'])
        self.assertFalse(res_sms['enviado'])


if __name__ == '__main__':
    unittest.main()
