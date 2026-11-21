-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- MIGRACIÓN ITERACIÓN 3: MÓDULO DE GESTIÓN DE PAGOS, PROPIETARIOS Y NOTIFICACIONES
-- Archivo: migration_pagos.sql
-- Base de datos: MySQL 8+ / MariaDB
-- ==============================================================
-- Nota: Esta migración es NO DESTRUCTIVA. Conserva intactos todos los
--       vehículos, movimientos históricos, celdas y usuarios existentes.
-- ==============================================================

USE autos_colombia;

-- 1. Tabla: propietario (RN07)
-- Registra los datos del propietario evitando duplicados por cédula (identificacion)
CREATE TABLE IF NOT EXISTS propietario (
    id_propietario INT AUTO_INCREMENT NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    identificacion VARCHAR(20) NOT NULL,
    celular VARCHAR(20) NOT NULL,
    correo VARCHAR(120) NOT NULL,
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_propietario),
    CONSTRAINT uq_propietario_identificacion UNIQUE (identificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE INDEX idx_propietario_nombre ON propietario(nombre_completo);
CREATE INDEX idx_propietario_correo ON propietario(correo);

-- 2. Relación Propietario (1) -> Vehículos (N) (RN07)
-- Se agrega columna nullable id_propietario en 'vehiculo' para no romper registros previos
SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vehiculo'
      AND COLUMN_NAME = 'id_propietario'
);

SET @sql_add_col := IF(
    @col_exists = 0,
    'ALTER TABLE vehiculo ADD COLUMN id_propietario INT NULL AFTER modelo',
    'SELECT "Columna id_propietario ya existe en vehiculo" AS info'
);
PREPARE stmt_col FROM @sql_add_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

SET @fk_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'vehiculo'
      AND CONSTRAINT_NAME = 'fk_vehiculo_propietario'
);

SET @sql_add_fk := IF(
    @fk_exists = 0,
    'ALTER TABLE vehiculo ADD CONSTRAINT fk_vehiculo_propietario FOREIGN KEY (id_propietario) REFERENCES propietario(id_propietario) ON UPDATE CASCADE ON DELETE SET NULL',
    'SELECT "FK fk_vehiculo_propietario ya existe" AS info'
);
PREPARE stmt_fk FROM @sql_add_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- 3. Tabla: pago (RN01, RN02, RN03, RN04, RN05)
-- Almacena únicamente pagos de mensualidades sin cobro de mora
CREATE TABLE IF NOT EXISTS pago (
    id_pago INT AUTO_INCREMENT NOT NULL,
    numero_comprobante VARCHAR(30) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    id_propietario INT NOT NULL,
    id_usuario_registro INT NULL,
    concepto VARCHAR(120) NOT NULL DEFAULT 'Mensualidad de parqueadero',
    tipo_vehiculo_tarifa VARCHAR(20) NOT NULL,
    valor_mensualidad INT NOT NULL,
    valor_mora INT NOT NULL DEFAULT 0,
    valor_pagado INT NOT NULL,
    fecha_pago DATE NOT NULL,
    fecha_inicio_periodo DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    metodo_pago VARCHAR(40) NOT NULL DEFAULT 'Efectivo',
    estado_pago ENUM('CONFIRMADO', 'ANULADO') NOT NULL DEFAULT 'CONFIRMADO',
    observaciones VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_pago),
    CONSTRAINT uq_pago_comprobante UNIQUE (numero_comprobante),
    CONSTRAINT fk_pago_vehiculo
        FOREIGN KEY (placa) REFERENCES vehiculo(placa)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pago_propietario
        FOREIGN KEY (id_propietario) REFERENCES propietario(id_propietario)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pago_usuario
        FOREIGN KEY (id_usuario_registro) REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_pago_sin_mora CHECK (valor_mora = 0),
    CONSTRAINT chk_pago_fechas CHECK (fecha_vencimiento > fecha_inicio_periodo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE INDEX idx_pago_placa_fecha ON pago(placa, fecha_pago DESC, fecha_vencimiento DESC);
CREATE INDEX idx_pago_propietario ON pago(id_propietario);
CREATE INDEX idx_pago_vencimiento ON pago(fecha_vencimiento);

-- 4. Tabla: notificacion (RN06 + Sección 7)
-- Almacena los recordatorios generados 5 días antes del vencimiento
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion INT AUTO_INCREMENT NOT NULL,
    placa VARCHAR(10) NOT NULL,
    id_propietario INT NOT NULL,
    id_pago INT NULL,
    tipo_notificacion VARCHAR(50) NOT NULL DEFAULT 'VENCIMIENTO_PROXIMO',
    canal_objetivo ENUM('SISTEMA', 'CORREO', 'SMS') NOT NULL DEFAULT 'SISTEMA',
    mensaje TEXT NOT NULL,
    fecha_vencimiento_ref DATE NOT NULL,
    estado_envio ENUM('GENERADA_PENDIENTE_CANAL', 'REVISADA', 'ENVIADA_EXTERNO') NOT NULL DEFAULT 'GENERADA_PENDIENTE_CANAL',
    detalle_canal VARCHAR(255) NULL,
    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion),
    CONSTRAINT uq_notificacion_ciclo UNIQUE (placa, fecha_vencimiento_ref, tipo_notificacion),
    CONSTRAINT fk_notif_vehiculo
        FOREIGN KEY (placa) REFERENCES vehiculo(placa)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notif_propietario
        FOREIGN KEY (id_propietario) REFERENCES propietario(id_propietario)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notif_pago
        FOREIGN KEY (id_pago) REFERENCES pago(id_pago)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

CREATE INDEX idx_notif_estado ON notificacion(estado_envio, fecha_generacion DESC);

-- ==============================================================
-- DATOS DE DEMOSTRACIÓN ACADÉMICA (ITERACIÓN 3)
-- ==============================================================

-- Insertar propietarios de prueba (uno con 2 vehículos para demostrar relación 1:N)
INSERT INTO propietario (nombre_completo, identificacion, celular, correo) VALUES
('Andrés Felipe Martínez', '1015423890', '3104567890', 'andres.martinez@correo.com'),
('Laura Sofía Benítez', '1032498123', '3159876543', 'laura.benitez@correo.com'),
('Juan Pablo Ochoa', '79852147', '3007418529', 'juan.ochoa@correo.com')
ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo);

-- Asociar los vehículos iniciales a sus propietarios (KLM482 y MOT101 comparten propietario)
UPDATE vehiculo v
JOIN propietario p ON p.identificacion = '1015423890'
SET v.id_propietario = p.id_propietario
WHERE v.placa IN ('KLM482', 'MOT101') AND v.id_propietario IS NULL;

UPDATE vehiculo v
JOIN propietario p ON p.identificacion = '1032498123'
SET v.id_propietario = p.id_propietario
WHERE v.placa = 'ABC123' AND v.id_propietario IS NULL;

UPDATE vehiculo v
JOIN propietario p ON p.identificacion = '79852147'
SET v.id_propietario = p.id_propietario
WHERE v.placa = 'XYZ789' AND v.id_propietario IS NULL;

-- Insertar pagos de ejemplo cubriendo los 3 estados de vencimiento:
-- 1) KLM482 -> Al día (pagado hoy, vence en 1 mes)
-- 2) ABC123 -> Próxima a vencer (vence en 3 días -> dispara alerta de 5 días!)
-- 3) XYZ789 -> Vencida (venció hace 4 días -> permite probar RN02 mora $0 y RN03 renovación)
-- 4) MOT101 -> Al día (moto $100.000)
INSERT IGNORE INTO pago (
    numero_comprobante, placa, id_propietario, id_usuario_registro,
    concepto, tipo_vehiculo_tarifa, valor_mensualidad, valor_mora, valor_pagado,
    fecha_pago, fecha_inicio_periodo, fecha_vencimiento, metodo_pago, estado_pago, observaciones
)
SELECT
    'AC-2026-00001', 'KLM482', p.id_propietario, 1,
    'Mensualidad de parqueadero', 'Carro', 250000, 0, 250000,
    CURDATE(), CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 'Transferencia', 'CONFIRMADO',
    'Mensualidad inicial registrada en el sistema'
FROM propietario p WHERE p.identificacion = '1015423890';

INSERT IGNORE INTO pago (
    numero_comprobante, placa, id_propietario, id_usuario_registro,
    concepto, tipo_vehiculo_tarifa, valor_mensualidad, valor_mora, valor_pagado,
    fecha_pago, fecha_inicio_periodo, fecha_vencimiento, metodo_pago, estado_pago, observaciones
)
SELECT
    'AC-2026-00002', 'ABC123', p.id_propietario, 2,
    'Mensualidad de parqueadero', 'Carro', 250000, 0, 250000,
    DATE_SUB(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 1 MONTH),
    DATE_SUB(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 1 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 3 DAY),
    'Efectivo', 'CONFIRMADO',
    'Mensualidad próxima a vencer (recordatorio 5 días)'
FROM propietario p WHERE p.identificacion = '1032498123';

INSERT IGNORE INTO pago (
    numero_comprobante, placa, id_propietario, id_usuario_registro,
    concepto, tipo_vehiculo_tarifa, valor_mensualidad, valor_mora, valor_pagado,
    fecha_pago, fecha_inicio_periodo, fecha_vencimiento, metodo_pago, estado_pago, observaciones
)
SELECT
    'AC-2026-00003', 'XYZ789', p.id_propietario, 1,
    'Mensualidad de parqueadero', 'Carro', 250000, 0, 250000,
    DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 4 DAY), INTERVAL 1 MONTH),
    DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 4 DAY), INTERVAL 1 MONTH),
    DATE_SUB(CURDATE(), INTERVAL 4 DAY),
    'Tarjeta', 'CONFIRMADO',
    'Mensualidad vencida para demostración de renovación sin mora (RN02/RN03)'
FROM propietario p WHERE p.identificacion = '79852147';

INSERT IGNORE INTO pago (
    numero_comprobante, placa, id_propietario, id_usuario_registro,
    concepto, tipo_vehiculo_tarifa, valor_mensualidad, valor_mora, valor_pagado,
    fecha_pago, fecha_inicio_periodo, fecha_vencimiento, metodo_pago, estado_pago, observaciones
)
SELECT
    'AC-2026-00004', 'MOT101', p.id_propietario, 2,
    'Mensualidad de parqueadero', 'Moto', 100000, 0, 100000,
    DATE_SUB(CURDATE(), INTERVAL 5 DAY),
    DATE_SUB(CURDATE(), INTERVAL 5 DAY),
    DATE_ADD(DATE_SUB(CURDATE(), INTERVAL 5 DAY), INTERVAL 1 MONTH),
    'Efectivo', 'CONFIRMADO',
    'Segundo vehículo del propietario Andrés Felipe Martínez (RN07)'
FROM propietario p WHERE p.identificacion = '1015423890';
