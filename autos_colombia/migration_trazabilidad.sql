-- ==============================================================
-- PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
-- MIGRACIÓN ITERACIÓN 2 (MEJORA): TRAZABILIDAD DE RESPONSABLES ENTRADA/SALIDA
-- Archivo: migration_trazabilidad.sql
-- Base de datos: MySQL 8+ / MariaDB
-- ==============================================================

USE autos_colombia;

-- 1. Agregar columnas para auditar qué usuario registró la entrada y qué usuario registró la salida
-- Se declaran como INT NULL para respetar los registros históricos anteriores (RF-06)
ALTER TABLE movimiento
  ADD COLUMN id_usuario_entrada INT NULL AFTER placa,
  ADD COLUMN id_usuario_salida INT NULL AFTER id_usuario_entrada;

-- 2. Establecer restricciones de integridad referencial hacia la tabla 'usuario'
-- ON DELETE SET NULL: Si un usuario es eliminado o desactivado, el movimiento histórico se conserva intacto
ALTER TABLE movimiento
  ADD CONSTRAINT fk_movimiento_usuario_entrada
    FOREIGN KEY (id_usuario_entrada) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT fk_movimiento_usuario_salida
    FOREIGN KEY (id_usuario_salida) REFERENCES usuario(id_usuario)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. Índices de optimización para consultas de auditoría por responsable
CREATE INDEX idx_movimiento_usuario_entrada ON movimiento(id_usuario_entrada);
CREATE INDEX idx_movimiento_usuario_salida ON movimiento(id_usuario_salida);
