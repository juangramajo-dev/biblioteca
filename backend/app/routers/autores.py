from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Autor, Usuario
from ..schemas import AutorCreate, AutorDetalleOut, AutorUpdate
from .auth import requerir_admin

router = APIRouter(prefix="/api/autores", tags=["Autores"])


def serializar_autor(autor: Autor) -> AutorDetalleOut:
    return AutorDetalleOut(
        id_autor=autor.id_autor,
        nombre=autor.nombre,
        apellido=autor.apellido,
        nacionalidad=autor.nacionalidad,
        libros_count=len(autor.libros or []),
    )


async def _cargar_autor(db: AsyncSession, id_autor: int) -> Optional[Autor]:
    stmt = (
        select(Autor)
        .options(selectinload(Autor.libros))
        .where(Autor.id_autor == id_autor)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=List[AutorDetalleOut])
async def listar_autores(
    buscar: Optional[str] = Query(None, description="Buscar por nombre, apellido o nacionalidad"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Autor).options(selectinload(Autor.libros))
    if buscar and buscar.strip():
        termino = f"%{buscar.strip()}%"
        stmt = stmt.where(
            or_(
                Autor.nombre.ilike(termino),
                Autor.apellido.ilike(termino),
                Autor.nacionalidad.ilike(termino),
            )
        )
    stmt = stmt.order_by(Autor.apellido.asc(), Autor.nombre.asc())
    autores = (await db.execute(stmt)).scalars().all()
    return [serializar_autor(a) for a in autores]


@router.post("", response_model=AutorDetalleOut, status_code=status.HTTP_201_CREATED)
async def crear_autor(
    datos: AutorCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()
    if not nombre or not apellido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre y apellido son obligatorios.",
        )

    nuevo_autor = Autor(
        nombre=nombre,
        apellido=apellido,
        nacionalidad=datos.nacionalidad.strip() if datos.nacionalidad else None,
    )
    db.add(nuevo_autor)
    await db.commit()
    autor_cargado = await _cargar_autor(db, nuevo_autor.id_autor)
    return serializar_autor(autor_cargado)


@router.put("/{id_autor}", response_model=AutorDetalleOut)
async def actualizar_autor(
    id_autor: int,
    datos: AutorUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    autor = await _cargar_autor(db, id_autor)
    if not autor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El autor indicado no existe.",
        )

    nombre = datos.nombre.strip()
    apellido = datos.apellido.strip()
    if not nombre or not apellido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre y apellido son obligatorios.",
        )

    autor.nombre = nombre
    autor.apellido = apellido
    autor.nacionalidad = datos.nacionalidad.strip() if datos.nacionalidad else None

    await db.commit()
    autor_cargado = await _cargar_autor(db, autor.id_autor)
    return serializar_autor(autor_cargado)


@router.delete("/{id_autor}")
async def eliminar_autor(
    id_autor: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    autor = await _cargar_autor(db, id_autor)
    if not autor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El autor indicado no existe.",
        )

    if autor.libros:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar a '{autor.nombre} {autor.apellido}' porque tiene {len(autor.libros)} libro(s) asociado(s).",
        )

    nombre_completo = f"{autor.nombre} {autor.apellido}".strip()
    await db.delete(autor)
    await db.commit()
    return {"mensaje": f"Autor '{nombre_completo}' eliminado correctamente."}
