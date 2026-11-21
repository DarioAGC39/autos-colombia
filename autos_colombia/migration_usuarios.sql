-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- MIGRACIÓN ITERACIÓN 2: MÓDULO DE GESTIÓN DE USUARIOS Y ROLES
-- Archivo: migration_usuarios.sql
-- Base de datos: MySQL 8+ / MariaDB
-- ==============================================================

USE autos_colombia;

-- 1. Creación de la tabla de usuarios
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

-- 2. Índices de optimización para autenticación y búsquedas
CREATE INDEX idx_usuario_login ON usuario(nombre_usuario, correo, estado);
CREATE INDEX idx_usuario_busqueda ON usuario(nombres, apellidos, identificacion);

-- 3. Inserción de usuarios iniciales para pruebas académicas
-- Contraseña para ambos usuarios de prueba: Admin123*
-- Hash generado de forma segura con werkzeug.security (pbkdf2:sha256)
INSERT INTO usuario (nombres, apellidos, identificacion, correo, nombre_usuario, password_hash, rol, estado)
VALUES 
(
    'Carlos',
    'Restrepo',
    '1020304050',
    'admin@autoscolombia.com',
    'admin',
    'scrypt:32768:8:1$i8m9z5yZqgR0jXWl$9d7ef1a4c9b271d4bf18e69d27f8a70c538cb336b955a1db4bce430f81d19ca708d7a18bb1b9319b22a019487c6f059cb2ec9e76fa7b120cfd770c67993a4087',
    'ADMINISTRADOR',
    'ACTIVO'
),
(
    'Dario',
    'Guerrero',
    '1098765432',
    'empleado@autoscolombia.com',
    'empleado',
    'scrypt:32768:8:1$i8m9z5yZqgR0jXWl$9d7ef1a4c9b271d4bf18e69d27f8a70c538cb336b955a1db4bce430f81d19ca708d7a18bb1b9319b22a019487c6f059cb2ec9e76fa7b120cfd770c67993a4087',
    'EMPLEADO',
    'ACTIVO'
)
ON DUPLICATE KEY UPDATE nombres=VALUES(nombres);
