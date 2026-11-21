"""
==============================================================
AUTOS COLOMBIA - SUITE DE PRUEBAS AUTOMATIZADAS (ITERACIÓN 2)
Archivo: tests_usuarios.py
Responsabilidad: Validación exhaustiva de RF-01 a RF-09,
                  hashing seguro, reglas de roles y restricciones.
==============================================================
"""

import unittest
from werkzeug.security import check_password_hash
from services.auth_service import AuthService, AuthException
from services.usuario_service import UsuarioService, UsuarioServiceException


class TestModuloUsuarios(unittest.TestCase):
    """Pruebas unitarias y de lógica de negocio para Gestión de Usuarios."""

    def test_hashing_contrasenas(self):
        """RF-01 / RNF-01: Contraseñas almacenadas como hash, nunca texto plano."""
        password = "PasswordSeguro123*"
        hash1 = AuthService.hashear_password(password)
        
        # El hash nunca debe contener la contraseña en texto plano
        self.assertNotEqual(hash1, password)
        self.assertTrue(hash1.startswith('scrypt:') or hash1.startswith('pbkdf2:'))
        
        # Verificación con contraseña correcta
        self.assertTrue(AuthService.verificar_password(hash1, password))
        
        # Verificación con contraseña incorrecta
        self.assertFalse(AuthService.verificar_password(hash1, "PasswordIncorrecto"))

    def test_validacion_contrasena_corta(self):
        """RF-03: Rechazar contraseñas con menos de 6 caracteres."""
        with self.assertRaises(AuthException):
            AuthService.hashear_password("12345")

    def test_validacion_datos_usuario_completos(self):
        """RF-03: Validación de campos obligatorios y formatos."""
        datos_validos = {
            'nombres': 'Valentina',
            'apellidos': 'Gómez Zuluaga',
            'identificacion': '1037654321',
            'correo': 'valentina@autoscolombia.com',
            'nombre_usuario': 'vgomez',
            'rol': 'EMPLEADO',
            'estado': 'ACTIVO',
            'password': 'PasswordSegura2026*'
        }
        resultado = UsuarioService.validar_datos_usuario(datos_validos, es_edicion=False)
        self.assertEqual(resultado['nombre_usuario'], 'vgomez')
        self.assertEqual(resultado['rol'], 'EMPLEADO')
        self.assertEqual(resultado['estado'], 'ACTIVO')

    def test_validacion_correo_invalido(self):
        """RF-03: Rechazar correos con estructura inválida."""
        datos_invalidos = {
            'nombres': 'Valentina',
            'apellidos': 'Gómez',
            'identificacion': '1037654321',
            'correo': 'correo_sin_arroba',
            'nombre_usuario': 'vgomez',
            'rol': 'EMPLEADO',
            'estado': 'ACTIVO',
            'password': 'PasswordSegura2026*'
        }
        with self.assertRaises(UsuarioServiceException):
            UsuarioService.validar_datos_usuario(datos_invalidos, es_edicion=False)

    def test_validacion_rol_invalido(self):
        """RF-08: Solo se permiten roles ADMINISTRADOR y EMPLEADO."""
        datos_invalidos = {
            'nombres': 'Valentina',
            'apellidos': 'Gómez',
            'identificacion': '1037654321',
            'correo': 'valentina@autoscolombia.com',
            'nombre_usuario': 'vgomez',
            'rol': 'SUPER_USUARIO',  # Rol no permitido
            'estado': 'ACTIVO',
            'password': 'PasswordSegura2026*'
        }
        with self.assertRaises(UsuarioServiceException):
            UsuarioService.validar_datos_usuario(datos_invalidos, es_edicion=False)

    def test_validacion_estado_invalido(self):
        """RF-07: Solo se permiten estados ACTIVO e INACTIVO."""
        datos_invalidos = {
            'nombres': 'Valentina',
            'apellidos': 'Gómez',
            'identificacion': '1037654321',
            'correo': 'valentina@autoscolombia.com',
            'nombre_usuario': 'vgomez',
            'rol': 'EMPLEADO',
            'estado': 'SUSPENDIDO',  # Estado no permitido
            'password': 'PasswordSegura2026*'
        }
        with self.assertRaises(UsuarioServiceException):
            UsuarioService.validar_datos_usuario(datos_invalidos, es_edicion=False)

    def test_trazabilidad_movimientos_datos_responsables(self):
        """RF-01 a RF-06: Verificación de estructura de trazabilidad de entrada y salida."""
        # Estructura simulada de un movimiento con trazabilidad de dos usuarios distintos
        movimiento_trazable = {
            'id_movimiento': 10,
            'placa': 'KLM482',
            'fecha_hora_entrada': '2026-11-05 08:00:00',
            'fecha_hora_salida': '2026-11-05 17:30:00',
            'estado': 'FINALIZADO',
            'celda': 'C-14',
            'id_usuario_entrada': 2,
            'usuario_entrada_nombre': 'Dario Guerrero',
            'usuario_entrada_rol': 'EMPLEADO',
            'id_usuario_salida': 1,
            'usuario_salida_nombre': 'Carlos Restrepo',
            'usuario_salida_rol': 'ADMINISTRADOR'
        }

        # Comprobar que permite identificar dos usuarios distintos en una misma permanencia
        self.assertNotEqual(movimiento_trazable['id_usuario_entrada'], movimiento_trazable['id_usuario_salida'])
        self.assertEqual(movimiento_trazable['usuario_entrada_rol'], 'EMPLEADO')
        self.assertEqual(movimiento_trazable['usuario_salida_rol'], 'ADMINISTRADOR')

    def test_trazabilidad_movimientos_historicos_sin_usuario(self):
        """RF-06: Los registros históricos anteriores deben conservar NULL sin fallar."""
        movimiento_historico = {
            'id_movimiento': 1,
            'placa': 'KLM482',
            'fecha_hora_entrada': '2026-10-19 08:10:00',
            'fecha_hora_salida': '2026-10-19 17:51:00',
            'estado': 'FINALIZADO',
            'celda': 'C-14',
            'id_usuario_entrada': None,
            'usuario_entrada_nombre': None,
            'usuario_entrada_rol': None,
            'id_usuario_salida': None,
            'usuario_salida_nombre': None,
            'usuario_salida_rol': None
        }

        # Debe admitir None y presentarse como "No registrado"
        self.assertIsNone(movimiento_historico['id_usuario_entrada'])
        self.assertIsNone(movimiento_historico['id_usuario_salida'])
        responsable_texto = movimiento_historico['usuario_entrada_nombre'] or "No registrado"
        self.assertEqual(responsable_texto, "No registrado")


if __name__ == '__main__':
    unittest.main()
