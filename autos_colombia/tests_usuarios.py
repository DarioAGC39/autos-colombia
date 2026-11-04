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


if __name__ == '__main__':
    unittest.main()
