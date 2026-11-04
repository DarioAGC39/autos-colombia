-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- MIGRACIÃ“N ITERACIÃ“N 2: MÃ“DULO DE GESTIÃ“N DE USUARIOS Y ROLES
-- Archivo: migration_usuarios.sql
-- Base de datos: MySQL 8+ / MariaDB
-- ==============================================================

USE autos_colombia;

-- 1. CreaciÃ³n de la tabla de usuarios
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INT AUTO_INCREMENT NOT NULL,
    nombres VARCHAR(80) NOT NULL,
    apellidos VARCHAR(80) NOT NULL,
    identificacion VARCHAR(20) NOT NULL,
    correo VARCHAR(120) NOT NULL,
    nombre_usuario VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMINISTRADOR', 'EMPLEADO') NOT NULL DEFAULT 'EMPLEADO',
    estado ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuario_identificacion UNIQUE (identificacion),
    CONSTRAINT uq_usuario_correo UNIQUE (correo),
    CONSTRAINT uq_usuario_username UNIQUE (nombre_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 2. Ãndices de optimizaciÃ³n para autenticaciÃ³n y bÃºsquedas
CREATE INDEX idx_usuario_login ON usuario(nombre_usuario, correo, estado);
CREATE INDEX idx_usuario_busqueda ON usuario(nombres, apellidos, identificacion);

-- 3. InserciÃ³n de usuarios iniciales para pruebas acadÃ©micas
-- ContraseÃ±a para ambos usuarios de prueba: Admin123*
-- Hash generado de forma segura con werkzeug.security (pbkdf2:sha256)
INSERT INTO usuario (nombres, apellidos, identificacion, correo, nombre_usuario, password_hash, rol, estado)
VALUES 
(
    'Carlos',
    'Restrepo',
    '1020304050',
    'admin@autoscolombia.com',
    'admin',
    'scrypt:32768:8:1$PMg0RIMywpLU5pkQ$f4dfa7115784f943b156cc67c691f35de9a28fbcf02d996e091df3eb83d457ece95f2559bb943d4d541e91a8486675d9250a84f8f4fea5a0e1517d57a2ffce1c',
    'ADMINISTRADOR',
    'ACTIVO'
),
(
    'Dario',
    'Guerrero',
    '1098765432',
    'empleado@autoscolombia.com',
    'empleado',
    'scrypt:32768:8:1$PMg0RIMywpLU5pkQ$f4dfa7115784f943b156cc67c691f35de9a28fbcf02d996e091df3eb83d457ece95f2559bb943d4d541e91a8486675d9250a84f8f4fea5a0e1517d57a2ffce1c',
    'EMPLEADO',
    'ACTIVO'
)
ON DUPLICATE KEY UPDATE nombres=VALUES(nombres);

