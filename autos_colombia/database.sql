-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- SISTEMA DE CONTROL DE ENTRADA Y SALIDA - PARQUEADERO MENSUAL
-- Base de datos: MySQL
-- ==============================================================

-- 1. CreaciÃ³n de la base de datos (con codificaciÃ³n UTF-8 para espaÃ±ol)
CREATE DATABASE IF NOT EXISTS autos_colombia
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE autos_colombia;

-- 2. Tabla: vehiculo
-- Almacena los datos maestros de cada vehÃ­culo registrado
CREATE TABLE IF NOT EXISTS vehiculo (
    placa VARCHAR(10) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    color VARCHAR(30) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    PRIMARY KEY (placa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 3. Tabla: movimiento
-- Registra cada ingreso y salida de los vehÃ­culos
CREATE TABLE IF NOT EXISTS movimiento (
    id_movimiento INT AUTO_INCREMENT NOT NULL,
    fecha_hora_entrada DATETIME NOT NULL,
    fecha_hora_salida DATETIME NULL,
    estado ENUM('ACTIVO', 'FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
    observaciones VARCHAR(255) NULL,
    celda VARCHAR(10) NULL,
    placa VARCHAR(10) NOT NULL,
    PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_movimiento_vehiculo 
        FOREIGN KEY (placa) 
        REFERENCES vehiculo(placa) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 4. Ãndices para optimizar las consultas frecuentes por placa y estado
-- Este Ã­ndice agiliza enormemente la verificaciÃ³n de movimientos activos y el historial
CREATE INDEX idx_movimiento_placa_estado ON movimiento(placa, estado);
CREATE INDEX idx_movimiento_entrada ON movimiento(fecha_hora_entrada DESC);

-- ==============================================================
-- DATOS DE PRUEBA (Para demostraciÃ³n acadÃ©mica)
-- Identificados claramente para que puedas probar el sistema
-- ==============================================================

-- Insertar vehÃ­culo de ejemplo mostrado en los mockups (KLM482)
INSERT INTO vehiculo (placa, tipo, color, marca, modelo) VALUES
('KLM482', 'AutomÃ³vil', 'Gris plata', 'Renault', 'Logan 2022'),
('ABC123', 'AutomÃ³vil', 'Rojo escarlata', 'Mazda', 'Mazda 3 2021'),
('XYZ789', 'Camioneta', 'Blanco', 'Toyota', 'Prado 2023'),
('MOT101', 'Motocicleta', 'Negro', 'Yamaha', 'FZ 250 2022')
ON DUPLICATE KEY UPDATE placa=placa;

-- Insertar historial previo de movimientos para KLM482 (con Celda C-14 activa)
INSERT INTO movimiento (fecha_hora_entrada, fecha_hora_salida, estado, observaciones, celda, placa) VALUES
('2026-10-19 08:10:00', '2026-10-19 17:51:00', 'FINALIZADO', 'Jornada laboral completa', 'C-14', 'KLM482'),
('2026-10-20 07:58:00', '2026-10-20 17:32:00', 'FINALIZADO', 'Salida puntual', 'C-14', 'KLM482'),
('2026-10-21 08:26:00', '2026-10-21 18:04:00', 'FINALIZADO', 'Horas extra autorizadas', 'C-14', 'KLM482'),
('2026-10-22 08:15:00', '2026-10-22 17:38:00', 'FINALIZADO', 'Salida normal', 'C-14', 'KLM482'),
('2026-10-23 08:32:00', NULL, 'ACTIVO', 'VehÃ­culo actualmente en el parqueadero', 'C-14', 'KLM482');

-- ==============================================================
-- 5. TABLA: usuario (IteraciÃ³n 2: GestiÃ³n de Usuarios y Roles)
-- ==============================================================
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

CREATE INDEX idx_usuario_login ON usuario(nombre_usuario, correo, estado);
CREATE INDEX idx_usuario_busqueda ON usuario(nombres, apellidos, identificacion);

-- InserciÃ³n de usuarios iniciales de demostraciÃ³n acadÃ©mica
-- ContraseÃ±a para ambos: Admin123* (Hash seguro con werkzeug)
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

