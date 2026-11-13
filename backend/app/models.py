from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    Boolean,
    Numeric,
    ForeignKey,
    Table,
    func,
)
from sqlalchemy.orm import relationship
from .database import Base

# Tabla intermedia Muchos a Muchos (N:M) entre Libro y Autor
libro_autor = Table(
    "libro_autor",
    Base.metadata,
    Column(
        "id_libro",
        Integer,
        ForeignKey("libro.id_libro", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "id_autor",
        Integer,
        ForeignKey("autor.id_autor", onupdate="CASCADE"),
        primary_key=True,
    ),
)


class Persona(Base):
    __tablename__ = "persona"

    id_persona = Column(Integer, primary_key=True, index=True, autoincrement=True)
    numero_documento = Column(String(20), unique=True, nullable=False, index=True)
    nombre = Column(String(50), nullable=False)
    apellido = Column(String(50), nullable=False)
    direccion = Column(String(150), nullable=True)
    telefono = Column(String(25), nullable=True)
    correo_electronico = Column(String(100), nullable=True)
    fecha_registro = Column(DateTime, server_default=func.now(), nullable=False)

    socio = relationship("Socio", back_populates="persona", uselist=False)
    usuario = relationship("Usuario", back_populates="persona", uselist=False)


class Rol(Base):
    __tablename__ = "rol"

    id_rol = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre_rol = Column(String(30), unique=True, nullable=False)
    descripcion = Column(String(150), nullable=True)

    usuarios = relationship("Usuario", back_populates="rol")


class Socio(Base):
    __tablename__ = "socio"

    id_socio = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_persona = Column(
        Integer, ForeignKey("persona.id_persona", onupdate="CASCADE"), unique=True, nullable=False
    )
    numero_socio = Column(Integer, unique=True, nullable=False)
    fecha_alta = Column(DateTime, server_default=func.now(), nullable=False)
    estado = Column(String(15), nullable=False, default="ACTIVO")
    observaciones = Column(Text, nullable=True)

    persona = relationship("Persona", back_populates="socio")
    prestamos = relationship("Prestamo", back_populates="socio")
    pagos = relationship("Pago", back_populates="socio")


class Usuario(Base):
    __tablename__ = "usuario"

    id_usuario = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_persona = Column(
        Integer, ForeignKey("persona.id_persona", onupdate="CASCADE"), unique=True, nullable=False
    )
    id_rol = Column(Integer, ForeignKey("rol.id_rol", onupdate="CASCADE"), nullable=False)
    nombre_usuario = Column(String(50), unique=True, nullable=False, index=True)
    clave_hash = Column(String(255), nullable=False)
    activo = Column(Boolean, nullable=False, default=True)
    ultimo_acceso = Column(DateTime, nullable=True)

    persona = relationship("Persona", back_populates="usuario")
    rol = relationship("Rol", back_populates="usuarios")
    prestamos_registrados = relationship("Prestamo", back_populates="usuario")


class Editorial(Base):
    __tablename__ = "editorial"

    id_editorial = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), unique=True, nullable=False)
    pais = Column(String(50), nullable=True)

    libros = relationship("Libro", back_populates="editorial")


class Genero(Base):
    __tablename__ = "genero"

    id_genero = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(Text, nullable=True)

    libros = relationship("Libro", back_populates="genero")


class Autor(Base):
    __tablename__ = "autor"

    id_autor = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(50), nullable=False)
    apellido = Column(String(50), nullable=False)
    nacionalidad = Column(String(50), nullable=True)

    libros = relationship("Libro", secondary=libro_autor, back_populates="autores")


class Libro(Base):
    __tablename__ = "libro"

    id_libro = Column(Integer, primary_key=True, index=True, autoincrement=True)
    isbn = Column(String(20), unique=True, nullable=False, index=True)
    titulo = Column(String(150), nullable=False, index=True)
    anio_publicacion = Column(Integer, nullable=False)
    id_editorial = Column(
        Integer, ForeignKey("editorial.id_editorial", onupdate="CASCADE"), nullable=False
    )
    id_genero = Column(
        Integer, ForeignKey("genero.id_genero", onupdate="CASCADE"), nullable=False
    )
    stock_total = Column(Integer, nullable=False, default=1)
    stock_disponible = Column(Integer, nullable=False, default=1)

    editorial = relationship("Editorial", back_populates="libros")
    genero = relationship("Genero", back_populates="libros")
    autores = relationship("Autor", secondary=libro_autor, back_populates="libros")
    prestamos = relationship("Prestamo", back_populates="libro")


class Prestamo(Base):
    __tablename__ = "prestamo"

    id_prestamo = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_socio = Column(Integer, ForeignKey("socio.id_socio", onupdate="CASCADE"), nullable=False)
    id_libro = Column(Integer, ForeignKey("libro.id_libro", onupdate="CASCADE"), nullable=False)
    id_usuario = Column(
        Integer, ForeignKey("usuario.id_usuario", ondelete="SET NULL", onupdate="CASCADE"), nullable=True
    )
    fecha_prestamo = Column(Date, nullable=False)
    fecha_devolucion_pactada = Column(Date, nullable=False)
    fecha_devolucion_real = Column(Date, nullable=True)
    estado = Column(String(15), nullable=False, default="ACTIVO")
    observaciones = Column(Text, nullable=True)

    socio = relationship("Socio", back_populates="prestamos")
    libro = relationship("Libro", back_populates="prestamos")
    usuario = relationship("Usuario", back_populates="prestamos_registrados")


class Pago(Base):
    __tablename__ = "pago"

    id_pago = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id_socio = Column(Integer, ForeignKey("socio.id_socio", onupdate="CASCADE"), nullable=False)
    periodo = Column(String(20), nullable=False, default="2026-11")
    monto = Column(Numeric(10, 2), nullable=False, default=5000.00)
    fecha_pago = Column(Date, nullable=True)
    estado = Column(String(15), nullable=False, default="PENDIENTE")

    socio = relationship("Socio", back_populates="pagos")

