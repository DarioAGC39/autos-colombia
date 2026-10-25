-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- SISTEMA DE CONTROL DE ENTRADA Y SALIDA - PARQUEADERO MENSUAL
-- Base de datos: MySQL
-- ==============================================================

-- 1. Creación de la base de datos (con codificación UTF-8 para español)
CREATE DATABASE IF NOT EXISTS autos_colombia
CHARACTER SET utf8mb4
COLLATE utf8mb4_spanish_ci;

USE autos_colombia;

-- 2. Tabla: vehiculo
-- Almacena los datos maestros de cada vehículo registrado
CREATE TABLE IF NOT EXISTS vehiculo (
    placa VARCHAR(10) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    color VARCHAR(30) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    PRIMARY KEY (placa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 3. Tabla: movimiento
-- Registra cada ingreso y salida de los vehículos
CREATE TABLE IF NOT EXISTS movimiento (
    id_movimiento INT AUTO_INCREMENT NOT NULL,
    fecha_hora_entrada DATETIME NOT NULL,
    fecha_hora_salida DATETIME NULL,
    estado ENUM('ACTIVO', 'FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
    observaciones VARCHAR(255) NULL,
    placa VARCHAR(10) NOT NULL,
    PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_movimiento_vehiculo 
        FOREIGN KEY (placa) 
        REFERENCES vehiculo(placa) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 4. Índices para optimizar las consultas frecuentes por placa y estado
-- Este índice agiliza enormemente la verificación de movimientos activos y el historial
CREATE INDEX idx_movimiento_placa_estado ON movimiento(placa, estado);
CREATE INDEX idx_movimiento_entrada ON movimiento(fecha_hora_entrada DESC);

-- ==============================================================
-- DATOS DE PRUEBA (Para demostración académica)
-- Identificados claramente para que puedas probar el sistema
-- ==============================================================

-- Insertar vehículo de ejemplo mostrado en los mockups (KLM482)
INSERT INTO vehiculo (placa, tipo, color, marca, modelo) VALUES
('KLM482', 'Automóvil', 'Gris plata', 'Renault', 'Logan 2022'),
('ABC123', 'Automóvil', 'Rojo escarlata', 'Mazda', 'Mazda 3 2021'),
('XYZ789', 'Camioneta', 'Blanco', 'Toyota', 'Prado 2023'),
('MOT101', 'Motocicleta', 'Negro', 'Yamaha', 'FZ 250 2022')
ON DUPLICATE KEY UPDATE placa=placa;

-- Insertar historial previo de movimientos para KLM482
INSERT INTO movimiento (fecha_hora_entrada, fecha_hora_salida, estado, observaciones, placa) VALUES
('2026-10-19 08:10:00', '2026-10-19 17:51:00', 'FINALIZADO', 'Jornada laboral completa', 'KLM482'),
('2026-10-20 07:58:00', '2026-10-20 17:32:00', 'FINALIZADO', 'Salida puntual', 'KLM482'),
('2026-10-21 08:26:00', '2026-10-21 18:04:00', 'FINALIZADO', 'Horas extra autorizadas', 'KLM482'),
('2026-10-22 08:15:00', '2026-10-22 17:38:00', 'FINALIZADO', 'Salida normal', 'KLM482'),
('2026-10-23 08:32:00', NULL, 'ACTIVO', 'Vehículo actualmente en el parqueadero', 'KLM482');
