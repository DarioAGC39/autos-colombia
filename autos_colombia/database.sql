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

-- 2. Tabla: propietario (Iteración 3: Datos del Propietario - RN07)
-- Un propietario se identifica de forma única por su cédula y puede tener 1 o varios vehículos
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

-- 3. Tabla: vehiculo
-- Almacena los datos maestros de cada vehículo registrado y su relación con propietario (1:N)
CREATE TABLE IF NOT EXISTS vehiculo (
    placa VARCHAR(10) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    color VARCHAR(30) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    id_propietario INT NULL,
    PRIMARY KEY (placa),
    CONSTRAINT fk_vehiculo_propietario
        FOREIGN KEY (id_propietario)
        REFERENCES propietario(id_propietario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- 4. Tabla: usuario (Iteración 2: Gestión de Usuarios y Roles)
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

-- 5. Tabla: movimiento (Con Trazabilidad de Responsables de Entrada y Salida)
-- Registra cada ingreso y salida de los vehículos y los usuarios responsables
CREATE TABLE IF NOT EXISTS movimiento (
    id_movimiento INT AUTO_INCREMENT NOT NULL,
    fecha_hora_entrada DATETIME NOT NULL,
    fecha_hora_salida DATETIME NULL,
    estado ENUM('ACTIVO', 'FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
    observaciones VARCHAR(255) NULL,
    celda VARCHAR(10) NULL,
    placa VARCHAR(10) NOT NULL,
    id_usuario_entrada INT NULL,
    id_usuario_salida INT NULL,
    PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_movimiento_vehiculo 
        FOREIGN KEY (placa) 
        REFERENCES vehiculo(placa) 
        ON UPDATE CASCADE 
        ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_usuario_entrada
        FOREIGN KEY (id_usuario_entrada)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_movimiento_usuario_salida
        FOREIGN KEY (id_usuario_salida)
        REFERENCES usuario(id_usuario)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

-- Índices para optimizar las consultas frecuentes por placa, estado y responsables
CREATE INDEX idx_movimiento_placa_estado ON movimiento(placa, estado);
CREATE INDEX idx_movimiento_entrada ON movimiento(fecha_hora_entrada DESC);
CREATE INDEX idx_movimiento_usuario_entrada ON movimiento(id_usuario_entrada);
CREATE INDEX idx_movimiento_usuario_salida ON movimiento(id_usuario_salida);

-- 6. Tabla: pago (Iteración 3: Gestión de Mensualidades - RN01 a RN05)
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

-- 7. Tabla: notificacion (Iteración 3: Alertas 5 días antes de vencer - RN06)
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
-- DATOS DE PRUEBA (Para demostración académica)
-- ==============================================================

-- Inserción de usuarios iniciales de demostración
-- Contraseña para ambos: Admin123* (Hash seguro con werkzeug)
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

-- Insertar propietarios de ejemplo (1 propietario puede tener varios vehículos)
INSERT INTO propietario (nombre_completo, identificacion, celular, correo) VALUES
('Andrés Felipe Martínez', '1015423890', '3104567890', 'andres.martinez@correo.com'),
('Laura Sofía Benítez', '1032498123', '3159876543', 'laura.benitez@correo.com'),
('Juan Pablo Ochoa', '79852147', '3007418529', 'juan.ochoa@correo.com')
ON DUPLICATE KEY UPDATE nombre_completo=VALUES(nombre_completo);

-- Insertar vehículos de ejemplo asociados a sus propietarios
INSERT INTO vehiculo (placa, tipo, color, marca, modelo, id_propietario) VALUES
('KLM482', 'Automóvil', 'Gris plata', 'Renault', 'Logan 2022', (SELECT id_propietario FROM propietario WHERE identificacion='1015423890')),
('ABC123', 'Automóvil', 'Rojo escarlata', 'Mazda', 'Mazda 3 2021', (SELECT id_propietario FROM propietario WHERE identificacion='1032498123')),
('XYZ789', 'Camioneta', 'Blanco', 'Toyota', 'Prado 2023', (SELECT id_propietario FROM propietario WHERE identificacion='79852147')),
('MOT101', 'Motocicleta', 'Negro', 'Yamaha', 'FZ 250 2022', (SELECT id_propietario FROM propietario WHERE identificacion='1015423890'))
ON DUPLICATE KEY UPDATE placa=placa;

-- Insertar historial previo de movimientos para KLM482 (con Celda C-14 activa)
INSERT INTO movimiento (fecha_hora_entrada, fecha_hora_salida, estado, observaciones, celda, placa, id_usuario_entrada, id_usuario_salida) VALUES
('2026-10-19 08:10:00', '2026-10-19 17:51:00', 'FINALIZADO', 'Jornada laboral completa', 'C-14', 'KLM482', NULL, NULL),
('2026-10-20 07:58:00', '2026-10-20 17:32:00', 'FINALIZADO', 'Salida puntual', 'C-14', 'KLM482', NULL, NULL),
('2026-10-21 08:26:00', '2026-10-21 18:04:00', 'FINALIZADO', 'Horas extra autorizadas', 'C-14', 'KLM482', NULL, NULL),
('2026-10-22 08:15:00', '2026-10-22 17:38:00', 'FINALIZADO', 'Salida normal', 'C-14', 'KLM482', NULL, NULL),
('2026-10-23 08:32:00', NULL, 'ACTIVO', 'Vehículo actualmente en el parqueadero', 'C-14', 'KLM482', NULL, NULL);

-- Insertar pagos de demostración cubriendo estados Al día, Próxima a vencer (3 días) y Vencida
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
