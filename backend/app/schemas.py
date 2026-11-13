import re
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


def _validar_dni_valor(v: str) -> str:
    limpio = v.strip()
    if not re.fullmatch(r"\d{7,15}", limpio):
        raise ValueError("El DNI debe contener entre 7 y 15 dígitos numéricos.")
    return limpio


def _validar_email_opcional(v: Optional[str]) -> Optional[str]:
    if v is None or not v.strip():
        return None
    limpio = v.strip()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", limpio):
        raise ValueError("El formato del correo electrónico no es válido.")
    return limpio


def _validar_texto_obligatorio(v: str, campo: str) -> str:
    limpio = v.strip()
    if len(limpio) < 2:
        raise ValueError(f"El campo '{campo}' debe tener al menos 2 caracteres.")
    return limpio


# ==========================
# AUTH (JWT - 5 minutos)
# ==========================
class LoginRequest(BaseModel):
    nombre_usuario: str = Field(..., min_length=1)
    clave: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 300  # 5 minutos en segundos
    id_usuario: int
    nombre_usuario: str
    nombre_completo: str
    rol: str


# ==========================
# SOCIOS
# ==========================
class SocioCreate(BaseModel):
    nombre_completo: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    numero_documento: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo_electronico: Optional[str] = None
    observaciones: Optional[str] = None

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)

    @field_validator("correo_electronico")
    @classmethod
    def validar_correo(cls, v: Optional[str]) -> Optional[str]:
        return _validar_email_opcional(v)


class SocioUpdate(BaseModel):
    nombre: str
    apellido: str
    numero_documento: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo_electronico: Optional[str] = None
    estado: str = "ACTIVO"
    observaciones: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def validar_apellido(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "apellido")

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)

    @field_validator("correo_electronico")
    @classmethod
    def validar_correo(cls, v: Optional[str]) -> Optional[str]:
        return _validar_email_opcional(v)

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: str) -> str:
        estado_upper = v.strip().upper()
        if estado_upper not in {"ACTIVO", "INACTIVO", "SUSPENDIDO"}:
            raise ValueError("El estado del socio debe ser ACTIVO, INACTIVO o SUSPENDIDO.")
        return estado_upper


class SocioOut(BaseModel):
    id_socio: int
    numero_socio: int
    fecha_alta: Optional[datetime] = None
    estado: str
    numero_documento: str
    nombre: str
    apellido: str
    nombre_completo: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    correo_electronico: Optional[str] = None
    observaciones: Optional[str] = None
    tiene_prestamo_activo: bool = False
    prestamos_activos_count: int = 0
    libros_en_prestamo: List[str] = []


# ==========================
# USUARIOS
# ==========================
class UsuarioCreate(BaseModel):
    nombre_completo: Optional[str] = None
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    numero_documento: str
    nombre_usuario: str
    clave: str
    id_rol: int = 2

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)

    @field_validator("nombre_usuario")
    @classmethod
    def validar_username(cls, v: str) -> str:
        limpio = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,50}", limpio):
            raise ValueError("El nombre de usuario debe tener 3-50 caracteres sin espacios (letras, números, _, ., -).")
        return limpio

    @field_validator("clave")
    @classmethod
    def validar_clave(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("La contraseña debe tener al menos 4 caracteres.")
        return v


class UsuarioUpdate(BaseModel):
    nombre: str
    apellido: str
    numero_documento: str
    nombre_usuario: str
    id_rol: int
    activo: bool = True
    clave: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def validar_apellido(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "apellido")

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)

    @field_validator("nombre_usuario")
    @classmethod
    def validar_username(cls, v: str) -> str:
        limpio = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9_.-]{3,50}", limpio):
            raise ValueError("El nombre de usuario debe tener 3-50 caracteres sin espacios.")
        return limpio

    @field_validator("clave")
    @classmethod
    def validar_clave_opcional(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if len(v) < 4:
            raise ValueError("La nueva contraseña debe tener al menos 4 caracteres.")
        return v


class UsuarioOut(BaseModel):
    id_usuario: int
    nombre_usuario: str
    numero_documento: str
    nombre: str
    apellido: str
    nombre_completo: str
    id_rol: int
    rol: str
    activo: bool
    ultimo_acceso: Optional[datetime] = None


# ==========================
# LIBROS Y CATÁLOGOS
# ==========================
class AutorCreate(BaseModel):
    nombre: str
    apellido: str
    nacionalidad: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "nombre")

    @field_validator("apellido")
    @classmethod
    def validar_apellido(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "apellido")


class AutorUpdate(AutorCreate):
    pass


class AutorOut(BaseModel):
    id_autor: int
    nombre: str
    apellido: str
    nacionalidad: Optional[str] = None

    class Config:
        from_attributes = True


class AutorDetalleOut(AutorOut):
    libros_count: int = 0


class EditorialOut(BaseModel):
    id_editorial: int
    nombre: str
    pais: Optional[str] = None

    class Config:
        from_attributes = True


class GeneroOut(BaseModel):
    id_genero: int
    nombre: str
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True


class LibroCreate(BaseModel):
    isbn: str
    titulo: str
    anio_publicacion: int
    id_editorial: int
    id_genero: int
    autores_ids: List[int]
    stock_total: int = 1

    @field_validator("isbn")
    @classmethod
    def validar_isbn(cls, v: str) -> str:
        limpio = v.strip()
        if len(limpio) < 5 or len(limpio) > 20:
            raise ValueError("El ISBN debe tener entre 5 y 20 caracteres.")
        return limpio

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, v: str) -> str:
        return _validar_texto_obligatorio(v, "título")

    @field_validator("anio_publicacion")
    @classmethod
    def validar_anio(cls, v: int) -> int:
        if v < 1400 or v > 2100:
            raise ValueError("El año de publicación debe estar entre 1400 y 2100.")
        return v

    @field_validator("stock_total")
    @classmethod
    def validar_stock(cls, v: int) -> int:
        if v < 1:
            raise ValueError("El stock total debe ser al menos 1.")
        return v


class LibroUpdate(LibroCreate):
    pass


class LibroOut(BaseModel):
    id_libro: int
    isbn: str
    titulo: str
    anio_publicacion: int
    id_editorial: int
    id_genero: int
    autores_ids: List[int]
    editorial: str
    genero: str
    autores: List[str]
    stock_total: int
    stock_disponible: int


# ==========================
# PRÉSTAMOS Y DEVOLUCIONES
# ==========================
class PrestamoCreate(BaseModel):
    numero_documento: str
    nombre_socio: Optional[str] = None
    id_libro: Optional[int] = None
    titulo_libro: Optional[str] = None
    fecha_prestamo: date
    fecha_devolucion_pactada: date
    id_usuario: Optional[int] = None
    observaciones: Optional[str] = None

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)


class PrestamoOut(BaseModel):
    id_prestamo: int
    id_socio: int
    numero_socio: int
    socio_nombre: str
    socio_dni: str
    id_libro: int
    libro_titulo: str
    fecha_prestamo: date
    fecha_devolucion_pactada: date
    fecha_devolucion_real: Optional[date] = None
    estado: str


# ==========================
# PAGOS
# ==========================
class PagoCreate(BaseModel):
    numero_documento: str
    periodo: str = "2026-11"
    monto: float = Field(default=5000.0, gt=0)
    pagado: bool = True

    @field_validator("numero_documento")
    @classmethod
    def validar_dni(cls, v: str) -> str:
        return _validar_dni_valor(v)


class PagoOut(BaseModel):
    id_pago: int
    id_socio: int
    socio_nombre: str
    socio_dni: str
    periodo: str
    monto: float
    fecha_pago: Optional[date] = None
    estado: str
