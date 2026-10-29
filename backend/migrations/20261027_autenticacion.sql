-- PENDIENTE DE AUTORIZACION EXPRESA. NO SE EJECUTA AUTOMATICAMENTE.
-- Antes: auditoria de solo lectura, destino verificado, cero duplicados de
-- nombre, usuario InnoDB e idUsuario INT compatible con la FK.
-- Ejecutar ALTER solo si no existe ya un indice UNIQUE completo de nombre.
-- No contiene DELETE, UPDATE de usuarios ni cambios de credenciales.

ALTER TABLE usuario ADD CONSTRAINT uq_usuario_nombre UNIQUE (nombre);

CREATE TABLE password_reset_tokens (
  userId INT NOT NULL,
  tokenHash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expiresAt DATETIME(3) NOT NULL,
  requestedAt DATETIME(3) NOT NULL,
  usedAt DATETIME(3) NULL,
  PRIMARY KEY (userId),
  UNIQUE KEY uq_password_reset_token_hash (tokenHash),
  CONSTRAINT fk_password_reset_usuario FOREIGN KEY (userId)
    REFERENCES usuario (idUsuario) ON DELETE CASCADE
) ENGINE = InnoDB;
