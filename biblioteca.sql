-- phpMyAdmin SQL Dump
-- Base de datos: `biblioteca`
-- Script completo listo para importar en MySQL / MariaDB (XAMPP)

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `biblioteca` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `biblioteca`;

-- --------------------------------------------------------
-- 1. ESTRUCTURA DE TABLAS DE PERSONAS, ROLES, SOCIOS Y USUARIOS
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `persona` (
  `id_persona` int(11) NOT NULL AUTO_INCREMENT,
  `numero_documento` varchar(20) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `telefono` varchar(25) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_persona`),
  UNIQUE KEY `numero_documento` (`numero_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(30) NOT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `socio` (
  `id_socio` int(11) NOT NULL AUTO_INCREMENT,
  `id_persona` int(11) NOT NULL,
  `numero_socio` int(11) NOT NULL,
  `fecha_alta` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` varchar(15) NOT NULL DEFAULT 'ACTIVO',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_socio`),
  UNIQUE KEY `numero_socio` (`numero_socio`),
  UNIQUE KEY `uk_socio_persona` (`id_persona`),
  CONSTRAINT `fk_socio_persona` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_persona` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `nombre_usuario` varchar(50) NOT NULL,
  `clave_hash` varchar(255) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `id_persona` (`id_persona`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  KEY `id_rol` (`id_rol`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_persona`) REFERENCES `persona` (`id_persona`) ON UPDATE CASCADE,
  CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 2. TABLAS MAESTRAS (CATÁLOGOS) Y LIBROS
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `editorial` (
  `id_editorial` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `pais` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_editorial`),
  UNIQUE KEY `uk_editorial_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `genero` (
  `id_genero` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` text DEFAULT NULL,
  PRIMARY KEY (`id_genero`),
  UNIQUE KEY `uk_genero_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `autor` (
  `id_autor` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `nacionalidad` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_autor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `libro` (
  `id_libro` int(11) NOT NULL AUTO_INCREMENT,
  `isbn` varchar(20) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `anio_publicacion` int(11) NOT NULL,
  `id_editorial` int(11) NOT NULL,
  `id_genero` int(11) NOT NULL,
  `stock_total` int(11) NOT NULL DEFAULT 1,
  `stock_disponible` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_libro`),
  UNIQUE KEY `uk_libro_isbn` (`isbn`),
  KEY `fk_libro_editorial` (`id_editorial`),
  KEY `fk_libro_genero` (`id_genero`),
  CONSTRAINT `fk_libro_editorial` FOREIGN KEY (`id_editorial`) REFERENCES `editorial` (`id_editorial`) ON UPDATE CASCADE,
  CONSTRAINT `fk_libro_genero` FOREIGN KEY (`id_genero`) REFERENCES `genero` (`id_genero`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 3. TABLA INTERMEDIA N:M (LIBRO_AUTOR)
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `libro_autor` (
  `id_libro` int(11) NOT NULL,
  `id_autor` int(11) NOT NULL,
  PRIMARY KEY (`id_libro`, `id_autor`),
  KEY `fk_libroautor_autor` (`id_autor`),
  CONSTRAINT `fk_libroautor_libro` FOREIGN KEY (`id_libro`) REFERENCES `libro` (`id_libro`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_libroautor_autor` FOREIGN KEY (`id_autor`) REFERENCES `autor` (`id_autor`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. TABLAS OPERATIVAS: PRÉSTAMOS/DEVOLUCIONES Y PAGOS
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `prestamo` (
  `id_prestamo` int(11) NOT NULL AUTO_INCREMENT,
  `id_socio` int(11) NOT NULL,
  `id_libro` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `fecha_prestamo` date NOT NULL,
  `fecha_devolucion_pactada` date NOT NULL,
  `fecha_devolucion_real` date DEFAULT NULL,
  `estado` enum('ACTIVO','DEVUELTO','VENCIDO') NOT NULL DEFAULT 'ACTIVO',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_prestamo`),
  KEY `fk_prestamo_socio` (`id_socio`),
  KEY `fk_prestamo_libro` (`id_libro`),
  KEY `fk_prestamo_usuario` (`id_usuario`),
  CONSTRAINT `fk_prestamo_socio` FOREIGN KEY (`id_socio`) REFERENCES `socio` (`id_socio`) ON UPDATE CASCADE,
  CONSTRAINT `fk_prestamo_libro` FOREIGN KEY (`id_libro`) REFERENCES `libro` (`id_libro`) ON UPDATE CASCADE,
  CONSTRAINT `fk_prestamo_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pago` (
  `id_pago` int(11) NOT NULL AUTO_INCREMENT,
  `id_socio` int(11) NOT NULL,
  `periodo` varchar(20) NOT NULL DEFAULT '2026-11',
  `monto` decimal(10,2) NOT NULL DEFAULT 5000.00,
  `fecha_pago` date DEFAULT NULL,
  `estado` enum('PENDIENTE','PAGADO','ANULADO') NOT NULL DEFAULT 'PENDIENTE',
  PRIMARY KEY (`id_pago`),
  KEY `fk_pago_socio` (`id_socio`),
  CONSTRAINT `fk_pago_socio` FOREIGN KEY (`id_socio`) REFERENCES `socio` (`id_socio`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. DATOS INICIALES DE PRUEBA (SEED)
-- --------------------------------------------------------

INSERT INTO `rol` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'ADMIN', 'Administrador general del sistema'),
(2, 'BIBLIOTECARIO', 'Atención de socios, préstamos y devoluciones');

INSERT INTO `persona` (`id_persona`, `numero_documento`, `nombre`, `apellido`, `direccion`, `telefono`, `correo_electronico`) VALUES
(1, '30000000', 'Administrador', 'UTN', 'Av. Universidad 100', '3814000000', 'admin@biblioteca.utn.edu.ar'),
(2, '40111222', 'Matias', 'Brizuela', 'San Martín 450', '3815111222', 'matias@mail.com'),
(3, '41222333', 'Juan', 'Gramajo', 'Belgrano 820', '3815222333', 'juan@mail.com'),
(4, '42333444', 'Missael', 'Carrizo', 'Rivadavia 120', '3815333444', 'missael@mail.com'),
(5, '43444555', 'Pablo', 'Fuentes', 'Mitre 310', '3815444555', 'pablo@mail.com');

-- Usuario por defecto: admin / 1234 (SHA-256 de '1234')
INSERT INTO `usuario` (`id_usuario`, `id_persona`, `id_rol`, `nombre_usuario`, `clave_hash`, `activo`) VALUES
(1, 1, 1, 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 1);

INSERT INTO `socio` (`id_socio`, `id_persona`, `numero_socio`, `estado`, `observaciones`) VALUES
(1, 2, 1001, 'ACTIVO', 'Socio fundador'),
(2, 3, 1002, 'ACTIVO', NULL),
(3, 4, 1003, 'ACTIVO', NULL),
(4, 5, 1004, 'ACTIVO', NULL);

INSERT INTO `editorial` (`id_editorial`, `nombre`, `pais`) VALUES
(1, 'Editorial Sudamericana', 'Argentina'),
(2, 'Editorial Planeta', 'España'),
(3, 'Pearson Educación', 'México'),
(4, 'Minotauro', 'España');

INSERT INTO `genero` (`id_genero`, `nombre`, `descripcion`) VALUES
(1, 'Novela', 'Ficción narrativa en prosa'),
(2, 'Ciencia Ficción', 'Relatos especulativos y futuristas'),
(3, 'Informática y Sistemas', 'Ingeniería de software, bases de datos y programación'),
(4, 'Fantasía', 'Ficción épica y fantástica');

INSERT INTO `autor` (`id_autor`, `nombre`, `apellido`, `nacionalidad`) VALUES
(1, 'Gabriel', 'García Márquez', 'Colombiana'),
(2, 'Jorge Luis', 'Borges', 'Argentina'),
(3, 'Isaac', 'Asimov', 'Rusa-Estadounidense'),
(4, 'Abraham', 'Silberschatz', 'Estadounidense'),
(5, 'Henry', 'Korth', 'Estadounidense');

INSERT INTO `libro` (`id_libro`, `isbn`, `titulo`, `anio_publicacion`, `id_editorial`, `id_genero`, `stock_total`, `stock_disponible`) VALUES
(1, '978-950-07-1234-5', 'Cien años de soledad', 1967, 1, 1, 3, 2),
(2, '978-950-04-2345-6', 'Ficciones', 1944, 1, 4, 2, 2),
(3, '978-84-450-3456-7', 'Fundación', 1951, 4, 2, 4, 4),
(4, '978-84-481-4567-8', 'Fundamentos de Bases de Datos', 2014, 3, 3, 5, 5);

-- Relación N:M libro_autor (El libro 4 tiene dos coautores)
INSERT INTO `libro_autor` (`id_libro`, `id_autor`) VALUES
(1, 1),
(2, 2),
(3, 3),
(4, 4),
(4, 5);

INSERT INTO `prestamo` (`id_prestamo`, `id_socio`, `id_libro`, `id_usuario`, `fecha_prestamo`, `fecha_devolucion_pactada`, `fecha_devolucion_real`, `estado`) VALUES
(1, 1, 1, 1, '2026-11-05', '2026-11-19', NULL, 'ACTIVO');

INSERT INTO `pago` (`id_pago`, `id_socio`, `periodo`, `monto`, `fecha_pago`, `estado`) VALUES
(1, 1, '2026-11', 5000.00, '2026-11-05', 'PAGADO'),
(2, 2, '2026-11', 5000.00, '2026-11-05', 'PAGADO'),
(3, 3, '2026-11', 5000.00, NULL, 'PENDIENTE'),
(4, 4, '2026-11', 5000.00, '2026-11-02', 'PAGADO');

COMMIT;

-- --------------------------------------------------------
-- 6. PROCEDIMIENTOS ALMACENADOS TRANSACCIONALES
-- --------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_registrar_prestamo`;
DROP PROCEDURE IF EXISTS `sp_registrar_devolucion`;

DELIMITER $$

CREATE PROCEDURE `sp_registrar_prestamo`(
  IN `p_id_socio` INT,
  IN `p_id_libro` INT,
  IN `p_id_usuario` INT,
  IN `p_fecha_prestamo` DATE,
  IN `p_fecha_devolucion_pactada` DATE,
  IN `p_observaciones` TEXT,
  OUT `p_id_prestamo` INT
)
BEGIN
  DECLARE v_estado_socio VARCHAR(15) DEFAULT NULL;
  DECLARE v_stock_disponible INT DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  IF p_fecha_devolucion_pactada < p_fecha_prestamo THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'La fecha de devolución no puede ser anterior al préstamo.';
  END IF;

  SELECT `estado` INTO v_estado_socio
  FROM `socio`
  WHERE `id_socio` = p_id_socio
  FOR UPDATE;

  IF v_estado_socio IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El socio indicado no existe.';
  END IF;

  IF v_estado_socio <> 'ACTIVO' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El socio no se encuentra en estado ACTIVO.';
  END IF;

  SELECT `stock_disponible` INTO v_stock_disponible
  FROM `libro`
  WHERE `id_libro` = p_id_libro
  FOR UPDATE;

  IF v_stock_disponible IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El libro indicado no existe.';
  END IF;

  IF v_stock_disponible <= 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'No hay ejemplares disponibles para este libro.';
  END IF;

  UPDATE `libro`
  SET `stock_disponible` = `stock_disponible` - 1
  WHERE `id_libro` = p_id_libro;

  INSERT INTO `prestamo` (
    `id_socio`,
    `id_libro`,
    `id_usuario`,
    `fecha_prestamo`,
    `fecha_devolucion_pactada`,
    `estado`,
    `observaciones`
  ) VALUES (
    p_id_socio,
    p_id_libro,
    p_id_usuario,
    p_fecha_prestamo,
    p_fecha_devolucion_pactada,
    'ACTIVO',
    p_observaciones
  );

  SET p_id_prestamo = LAST_INSERT_ID();
  COMMIT;
END$$

CREATE PROCEDURE `sp_registrar_devolucion`(
  IN `p_id_prestamo` INT,
  IN `p_fecha_devolucion_real` DATE
)
BEGIN
  DECLARE v_id_libro INT DEFAULT NULL;
  DECLARE v_estado VARCHAR(15) DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT `id_libro`, `estado` INTO v_id_libro, v_estado
  FROM `prestamo`
  WHERE `id_prestamo` = p_id_prestamo
  FOR UPDATE;

  IF v_id_libro IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'El préstamo indicado no existe.';
  END IF;

  IF v_estado = 'DEVUELTO' THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Este préstamo ya fue devuelto anteriormente.';
  END IF;

  UPDATE `prestamo`
  SET `estado` = 'DEVUELTO',
      `fecha_devolucion_real` = p_fecha_devolucion_real
  WHERE `id_prestamo` = p_id_prestamo;

  UPDATE `libro`
  SET `stock_disponible` = LEAST(`stock_total`, `stock_disponible` + 1)
  WHERE `id_libro` = v_id_libro;

  COMMIT;
END$$

DELIMITER ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

