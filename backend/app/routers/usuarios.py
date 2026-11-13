from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Persona, Rol, Usuario
from ..schemas import UsuarioCreate, UsuarioOut, UsuarioUpdate
from .auth import hash_password
from .socios import separar_nombre_apellido

router = APIRouter(prefix="/api/usuarios", tags=["Usuarios"])


def serializar_usuario(usuario: Usuario) -> UsuarioOut:
    p = usuario.persona
    return UsuarioOut(
        id_usuario=usuario.id_usuario,
        nombre_usuario=usuario.nombre_usuario,
        numero_documento=p.numero_documento if p else "",
        nombre=p.nombre if p else "",
        apellido=p.apellido if p else "",
        nombre_completo=f"{p.nombre} {p.apellido}".strip() if p else usuario.nombre_usuario,
        id_rol=usuario.id_rol,
        rol=usuario.rol.nombre_rol if usuario.rol else "BIBLIOTECARIO",
        activo=bool(usuario.activo),
        ultimo_acceso=usuario.ultimo_acceso,
    )


async def _cargar_usuario(db: AsyncSession, id_usuario: int) -> Optional[Usuario]:
    stmt = (
        select(Usuario)
        .options(selectinload(Usuario.persona), selectinload(Usuario.rol))
        .where(Usuario.id_usuario == id_usuario)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=List[UsuarioOut])
async def listar_usuarios(
    buscar: Optional[str] = Query(None, description="Buscar por DNI, nombre, apellido o usuario"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Usuario)
        .join(Persona)
        .options(selectinload(Usuario.persona), selectinload(Usuario.rol))
    )
    if buscar and buscar.strip():
        termino = f"%{buscar.strip()}%"
        stmt = stmt.where(
            or_(
                Persona.numero_documento.ilike(termino),
                Persona.nombre.ilike(termino),
                Persona.apellido.ilike(termino),
                Usuario.nombre_usuario.ilike(termino),
            )
        )
    stmt = stmt.order_by(Usuario.id_usuario.asc())
    usuarios = (await db.execute(stmt)).scalars().all()
    return [serializar_usuario(u) for u in usuarios]


@router.get("/roles")
async def listar_roles(db: AsyncSession = Depends(get_db)):
    roles = (await db.execute(select(Rol).order_by(Rol.id_rol.asc()))).scalars().all()
    return [
        {
            "id_rol": r.id_rol,
            "nombre_rol": r.nombre_rol,
            "descripcion": r.descripcion,
        }
        for r in roles
    ]


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
async def registrar_usuario(datos: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    dni = datos.numero_documento.strip()
    username = datos.nombre_usuario.strip()

    existente = (
        await db.execute(select(Usuario).where(Usuario.nombre_usuario == username))
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El nombre de usuario '{username}' ya está en uso.",
        )

    nombre, apellido = separar_nombre_apellido(datos.nombre_completo, datos.nombre, datos.apellido)

    persona = (
        await db.execute(
            select(Persona)
            .options(selectinload(Persona.usuario))
            .where(Persona.numero_documento == dni)
        )
    ).scalar_one_or_none()

    if persona:
        if persona.usuario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La persona con DNI {dni} ya posee un usuario ('{persona.usuario.nombre_usuario}').",
            )
    else:
        persona = Persona(
            numero_documento=dni,
            nombre=nombre,
            apellido=apellido,
        )
        db.add(persona)
        await db.flush()

    rol = (
        await db.execute(select(Rol).where(Rol.id_rol == datos.id_rol))
    ).scalar_one_or_none()
    if not rol:
        rol = (await db.execute(select(Rol))).scalars().first()
        if not rol:
            rol = Rol(nombre_rol="ADMIN", descripcion="Administrador del sistema")
            db.add(rol)
            await db.flush()

    nuevo_usuario = Usuario(
        id_persona=persona.id_persona,
        id_rol=rol.id_rol,
        nombre_usuario=username,
        clave_hash=hash_password(datos.clave),
        activo=True,
    )
    db.add(nuevo_usuario)
    await db.commit()

    usuario_cargado = await _cargar_usuario(db, nuevo_usuario.id_usuario)
    return serializar_usuario(usuario_cargado)


@router.put("/{id_usuario}", response_model=UsuarioOut)
async def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
):
    usuario = await _cargar_usuario(db, id_usuario)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El usuario indicado no existe.",
        )

    username = datos.nombre_usuario.strip()
    otro_username = (
        await db.execute(
            select(Usuario).where(
                Usuario.nombre_usuario == username,
                Usuario.id_usuario != id_usuario,
            )
        )
    ).scalar_one_or_none()
    if otro_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El nombre de usuario '{username}' ya está siendo utilizado por otra cuenta.",
        )

    dni_limpio = datos.numero_documento.strip()
    otra_persona = (
        await db.execute(
            select(Persona).where(
                Persona.numero_documento == dni_limpio,
                Persona.id_persona != usuario.id_persona,
            )
        )
    ).scalar_one_or_none()
    if otra_persona:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Otro registro ya utiliza el DNI {dni_limpio}.",
        )

    rol = (
        await db.execute(select(Rol).where(Rol.id_rol == datos.id_rol))
    ).scalar_one_or_none()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol seleccionado no existe.",
        )

    if usuario.nombre_usuario == "admin":
        if not datos.activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede desactivar el usuario administrador principal.",
            )
        if rol.nombre_rol != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede quitar el rol ADMIN al usuario principal.",
            )

    usuario.persona.nombre = datos.nombre.strip()
    usuario.persona.apellido = datos.apellido.strip()
    usuario.persona.numero_documento = dni_limpio
    usuario.nombre_usuario = username
    usuario.id_rol = rol.id_rol
    usuario.activo = datos.activo
    if datos.clave:
        usuario.clave_hash = hash_password(datos.clave)

    await db.commit()
    usuario_actualizado = await _cargar_usuario(db, id_usuario)
    return serializar_usuario(usuario_actualizado)


@router.get("/dni/{dni}", response_model=UsuarioOut)
async def buscar_usuario_por_dni(dni: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Usuario)
        .join(Persona)
        .options(selectinload(Usuario.persona), selectinload(Usuario.rol))
        .where(Persona.numero_documento == dni.strip())
    )
    usuario = (await db.execute(stmt)).scalar_one_or_none()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún usuario con DNI {dni}.",
        )
    return serializar_usuario(usuario)


@router.delete("/dni/{dni}")
async def eliminar_usuario_por_dni(dni: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Usuario)
        .join(Persona)
        .where(Persona.numero_documento == dni.strip())
    )
    usuario = (await db.execute(stmt)).scalar_one_or_none()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ningún usuario con DNI {dni}.",
        )
    if usuario.nombre_usuario == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el usuario administrador principal.",
        )

    await db.delete(usuario)
    await db.commit()
    return {"mensaje": f"Usuario con DNI {dni} eliminado correctamente."}
