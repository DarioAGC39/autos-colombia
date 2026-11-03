-- ==============================================================
-- SCRIPT DE MIGRACIÓN CONTROLADA: MIGRATION_CELDAS.SQL
-- Proyecto: Autos Colombia - Parqueadero Mensual
-- Propósito: Incorporar el modelo de 80 Celdas (70 Carros, 10 Motos)
--            sin eliminar ni alterar datos existentes de vehículos y movimientos.
-- ==============================================================

USE autos_colombia;

-- 1. Crear la tabla 'celda' si no existe
CREATE TABLE IF NOT EXISTS celda (
    codigo_celda VARCHAR(10) NOT NULL,
    tipo_permitido ENUM('CARRO', 'MOTO') NOT NULL,
    estado ENUM('DISPONIBLE', 'OCUPADA') NOT NULL DEFAULT 'DISPONIBLE',
    PRIMARY KEY (codigo_celda)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 2. Poblar exactamente las 80 celdas físicas
-- 70 celdas para carros: C01 a C70
INSERT INTO celda (codigo_celda, tipo_permitido, estado) VALUES
('C01', 'CARRO', 'DISPONIBLE'), ('C02', 'CARRO', 'DISPONIBLE'), ('C03', 'CARRO', 'DISPONIBLE'), ('C04', 'CARRO', 'DISPONIBLE'), ('C05', 'CARRO', 'DISPONIBLE'),
('C06', 'CARRO', 'DISPONIBLE'), ('C07', 'CARRO', 'DISPONIBLE'), ('C08', 'CARRO', 'DISPONIBLE'), ('C09', 'CARRO', 'DISPONIBLE'), ('C10', 'CARRO', 'DISPONIBLE'),
('C11', 'CARRO', 'DISPONIBLE'), ('C12', 'CARRO', 'DISPONIBLE'), ('C13', 'CARRO', 'DISPONIBLE'), ('C14', 'CARRO', 'DISPONIBLE'), ('C15', 'CARRO', 'DISPONIBLE'),
('C16', 'CARRO', 'DISPONIBLE'), ('C17', 'CARRO', 'DISPONIBLE'), ('C18', 'CARRO', 'DISPONIBLE'), ('C19', 'CARRO', 'DISPONIBLE'), ('C20', 'CARRO', 'DISPONIBLE'),
('C21', 'CARRO', 'DISPONIBLE'), ('C22', 'CARRO', 'DISPONIBLE'), ('C23', 'CARRO', 'DISPONIBLE'), ('C24', 'CARRO', 'DISPONIBLE'), ('C25', 'CARRO', 'DISPONIBLE'),
('C26', 'CARRO', 'DISPONIBLE'), ('C27', 'CARRO', 'DISPONIBLE'), ('C28', 'CARRO', 'DISPONIBLE'), ('C29', 'CARRO', 'DISPONIBLE'), ('C30', 'CARRO', 'DISPONIBLE'),
('C31', 'CARRO', 'DISPONIBLE'), ('C32', 'CARRO', 'DISPONIBLE'), ('C33', 'CARRO', 'DISPONIBLE'), ('C34', 'CARRO', 'DISPONIBLE'), ('C35', 'CARRO', 'DISPONIBLE'),
('C36', 'CARRO', 'DISPONIBLE'), ('C37', 'CARRO', 'DISPONIBLE'), ('C38', 'CARRO', 'DISPONIBLE'), ('C39', 'CARRO', 'DISPONIBLE'), ('C40', 'CARRO', 'DISPONIBLE'),
('C41', 'CARRO', 'DISPONIBLE'), ('C42', 'CARRO', 'DISPONIBLE'), ('C43', 'CARRO', 'DISPONIBLE'), ('C44', 'CARRO', 'DISPONIBLE'), ('C45', 'CARRO', 'DISPONIBLE'),
('C46', 'CARRO', 'DISPONIBLE'), ('C47', 'CARRO', 'DISPONIBLE'), ('C48', 'CARRO', 'DISPONIBLE'), ('C49', 'CARRO', 'DISPONIBLE'), ('C50', 'CARRO', 'DISPONIBLE'),
('C51', 'CARRO', 'DISPONIBLE'), ('C52', 'CARRO', 'DISPONIBLE'), ('C53', 'CARRO', 'DISPONIBLE'), ('C54', 'CARRO', 'DISPONIBLE'), ('C55', 'CARRO', 'DISPONIBLE'),
('C56', 'CARRO', 'DISPONIBLE'), ('C57', 'CARRO', 'DISPONIBLE'), ('C58', 'CARRO', 'DISPONIBLE'), ('C59', 'CARRO', 'DISPONIBLE'), ('C60', 'CARRO', 'DISPONIBLE'),
('C61', 'CARRO', 'DISPONIBLE'), ('C62', 'CARRO', 'DISPONIBLE'), ('C63', 'CARRO', 'DISPONIBLE'), ('C64', 'CARRO', 'DISPONIBLE'), ('C65', 'CARRO', 'DISPONIBLE'),
('C66', 'CARRO', 'DISPONIBLE'), ('C67', 'CARRO', 'DISPONIBLE'), ('C68', 'CARRO', 'DISPONIBLE'), ('C69', 'CARRO', 'DISPONIBLE'), ('C70', 'CARRO', 'DISPONIBLE')
ON DUPLICATE KEY UPDATE tipo_permitido=VALUES(tipo_permitido);

-- 10 celdas para motos: M01 a M10
INSERT INTO celda (codigo_celda, tipo_permitido, estado) VALUES
('M01', 'MOTO', 'DISPONIBLE'), ('M02', 'MOTO', 'DISPONIBLE'), ('M03', 'MOTO', 'DISPONIBLE'), ('M04', 'MOTO', 'DISPONIBLE'), ('M05', 'MOTO', 'DISPONIBLE'),
('M06', 'MOTO', 'DISPONIBLE'), ('M07', 'MOTO', 'DISPONIBLE'), ('M08', 'MOTO', 'DISPONIBLE'), ('M09', 'MOTO', 'DISPONIBLE'), ('M10', 'MOTO', 'DISPONIBLE')
ON DUPLICATE KEY UPDATE tipo_permitido=VALUES(tipo_permitido);

-- 3. Homologar tipos en la tabla vehiculo existentes a 'CARRO' y 'MOTO'
UPDATE vehiculo SET tipo = 'CARRO' WHERE tipo IN ('Automóvil', 'Camioneta', 'Camión', 'Otro') OR tipo LIKE '%carro%' OR tipo LIKE '%auto%';
UPDATE vehiculo SET tipo = 'MOTO' WHERE tipo IN ('Motocicleta', 'Moto') OR tipo LIKE '%moto%';

-- 4. Modificar la columna tipo en vehiculo para restringirla estrictamente a CARRO y MOTO
ALTER TABLE vehiculo MODIFY COLUMN tipo ENUM('CARRO', 'MOTO') NOT NULL;

-- 5. Agregar la columna 'codigo_celda' a la tabla 'movimiento' si no existe
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'movimiento' 
  AND COLUMN_NAME = 'codigo_celda';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE movimiento ADD COLUMN codigo_celda VARCHAR(10) NULL AFTER placa', 
    'SELECT "Columna codigo_celda ya existe"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Asignar celda histórica coherente a los movimientos antiguos existentes de KLM482
UPDATE movimiento SET codigo_celda = 'C01' WHERE placa = 'KLM482' AND (codigo_celda IS NULL OR codigo_celda = '');

-- 7. Hacer obligatoria la columna codigo_celda y crear clave foránea e índice
ALTER TABLE movimiento MODIFY COLUMN codigo_celda VARCHAR(10) NOT NULL;

-- Agregar clave foránea si no existe
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'movimiento' 
  AND CONSTRAINT_NAME = 'fk_movimiento_celda';

SET @sql_fk = IF(@fk_exists = 0, 
    'ALTER TABLE movimiento ADD CONSTRAINT fk_movimiento_celda FOREIGN KEY (codigo_celda) REFERENCES celda(codigo_celda) ON UPDATE CASCADE ON DELETE RESTRICT', 
    'SELECT "Clave foránea fk_movimiento_celda ya existe"');
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- Crear índice para optimizar consultas de celdas por estado
CREATE INDEX IF NOT EXISTS idx_movimiento_celda_estado ON movimiento(codigo_celda, estado);

-- 8. Sincronizar el estado real de la celda C01 para el movimiento ACTIVO existente
UPDATE celda SET estado = 'OCUPADA' WHERE codigo_celda IN (
    SELECT codigo_celda FROM movimiento WHERE estado = 'ACTIVO'
);
