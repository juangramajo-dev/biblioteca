import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Usuario
from ..schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Configuración JWT (Duración estricta de 5 minutos por sesión)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "clave_secreta_biblioteca_utn_2026_jwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 5

security = HTTPBearer()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, stored_hash: str) -> bool:
    return hash_password(plain_password) == stored_hash or plain_password == stored_hash


def crear_token_jwt(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        id_usuario: Optional[str] = payload.get("sub")
        if id_usuario is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de autenticación inválido.",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu sesión de 5 minutos ha expirado. Por favor, volvé a iniciar sesión.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación inválido o corrupto.",
        )

    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.persona), selectinload(Usuario.rol))
        .where(Usuario.id_usuario == int(id_usuario))
    )
    result = await db.execute(stmt)
    usuario = result.scalar_one_or_none()
    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario ya no existe o está inactivo.",
        )
    return usuario


async def requerir_admin(
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
) -> Usuario:
    rol_nombre = usuario_actual.rol.nombre_rol if usuario_actual.rol else ""
    if rol_nombre.upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: esta acción requiere rol ADMIN.",
        )
    return usuario_actual


@router.post("/login", response_model=LoginResponse)
async def login(datos: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.persona), selectinload(Usuario.rol))
        .where(Usuario.nombre_usuario == datos.nombre_usuario)
    )
    result = await db.execute(stmt)
    usuario = result.scalar_one_or_none()

    if not usuario or not verify_password(datos.clave, usuario.clave_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos.",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo.",
        )

    usuario.ultimo_acceso = datetime.now()
    await db.commit()

    persona = usuario.persona
    nombre_completo = (
        f"{persona.nombre} {persona.apellido}".strip()
        if persona
        else usuario.nombre_usuario
    )
    rol_nombre = usuario.rol.nombre_rol if usuario.rol else "BIBLIOTECARIO"

    access_token = crear_token_jwt(
        data={
            "sub": str(usuario.id_usuario),
            "username": usuario.nombre_usuario,
            "rol": rol_nombre,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        id_usuario=usuario.id_usuario,
        nombre_usuario=usuario.nombre_usuario,
        nombre_completo=nombre_completo,
        rol=rol_nombre,
    )


@router.get("/me")
async def verificar_sesion(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    persona = usuario_actual.persona
    return {
        "id_usuario": usuario_actual.id_usuario,
        "nombre_usuario": usuario_actual.nombre_usuario,
        "nombre_completo": (
            f"{persona.nombre} {persona.apellido}".strip()
            if persona
            else usuario_actual.nombre_usuario
        ),
        "rol": usuario_actual.rol.nombre_rol if usuario_actual.rol else "BIBLIOTECARIO",
    }
