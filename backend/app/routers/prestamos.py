from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Libro, Persona, Prestamo, Socio, Usuario
from ..schemas import PrestamoCreate, PrestamoOut
from .auth import obtener_usuario_actual

router = APIRouter(prefix="/api/prestamos", tags=["Préstamos y Devoluciones"])


def extraer_mensaje_sql(exc: DBAPIError) -> str:
    orig = getattr(exc, "orig", None)
    if orig and getattr(orig, "args", None) and len(orig.args) >= 2:
        return str(orig.args[1])
    return str(exc)


def serializar_prestamo(p: Prestamo) -> PrestamoOut:
    persona = p.socio.persona
    return PrestamoOut(
        id_prestamo=p.id_prestamo,
        id_socio=p.id_socio,
        numero_socio=p.socio.numero_socio,
        socio_nombre=f"{persona.nombre} {persona.apellido}".strip(),
        socio_dni=persona.numero_documento,
        id_libro=p.id_libro,
        libro_titulo=p.libro.titulo if p.libro else "-",
        fecha_prestamo=p.fecha_prestamo,
        fecha_devolucion_pactada=p.fecha_devolucion_pactada,
        fecha_devolucion_real=p.fecha_devolucion_real,
        estado=p.estado,
    )


async def _cargar_prestamo(db: AsyncSession, id_prestamo: int) -> Optional[Prestamo]:
    stmt = (
        select(Prestamo)
        .options(
            selectinload(Prestamo.socio).selectinload(Socio.persona),
            selectinload(Prestamo.libro),
        )
        .where(Prestamo.id_prestamo == id_prestamo)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=List[PrestamoOut])
async def listar_prestamos(
    dni: Optional[str] = Query(None, description="Filtrar por DNI del socio"),
    estado: Optional[str] = Query(None, description="ACTIVO, DEVUELTO o VENCIDO"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Prestamo)
        .join(Socio)
        .join(Persona)
        .join(Libro)
        .options(
            selectinload(Prestamo.socio).selectinload(Socio.persona),
            selectinload(Prestamo.libro),
        )
    )
    if dni and dni.strip():
        stmt = stmt.where(Persona.numero_documento == dni.strip())
    if estado and estado.strip():
        stmt = stmt.where(Prestamo.estado == estado.strip().upper())

    stmt = stmt.order_by(Prestamo.id_prestamo.desc())
    prestamos = (await db.execute(stmt)).scalars().all()
    return [serializar_prestamo(p) for p in prestamos]


@router.get("/activos", response_model=List[PrestamoOut])
async def listar_prestamos_activos_por_dni(
    dni: str = Query(..., description="DNI del socio para control de devoluciones"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Prestamo)
        .join(Socio)
        .join(Persona)
        .join(Libro)
        .options(
            selectinload(Prestamo.socio).selectinload(Socio.persona),
            selectinload(Prestamo.libro),
        )
        .where(
            Persona.numero_documento == dni.strip(),
            Prestamo.estado == "ACTIVO",
        )
        .order_by(Prestamo.fecha_prestamo.asc())
    )
    prestamos = (await db.execute(stmt)).scalars().all()
    return [serializar_prestamo(p) for p in prestamos]


@router.post("", response_model=PrestamoOut, status_code=status.HTTP_201_CREATED)
async def registrar_prestamo(
    datos: PrestamoCreate,
    db: AsyncSession = Depends(get_db),
    usuario_actual: Usuario = Depends(obtener_usuario_actual),
):
    socio = (
        await db.execute(
            select(Socio)
            .join(Persona)
            .where(Persona.numero_documento == datos.numero_documento.strip())
        )
    ).scalar_one_or_none()
    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un socio registrado con el DNI {datos.numero_documento}.",
        )

    libro = None
    if datos.id_libro:
        libro = (
            await db.execute(select(Libro).where(Libro.id_libro == datos.id_libro))
        ).scalar_one_or_none()
    elif datos.titulo_libro:
        libro = (
            await db.execute(
                select(Libro).where(Libro.titulo.ilike(f"%{datos.titulo_libro.strip()}%"))
            )
        ).scalars().first()

    if not libro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el libro '{datos.titulo_libro or datos.id_libro}' en el catálogo.",
        )

    try:
        await db.execute(
            text(
                """
                CALL sp_registrar_prestamo(
                    :id_socio,
                    :id_libro,
                    :id_usuario,
                    :fecha_prestamo,
                    :fecha_devolucion_pactada,
                    :observaciones,
                    @id_prestamo_out
                )
                """
            ),
            {
                "id_socio": socio.id_socio,
                "id_libro": libro.id_libro,
                "id_usuario": datos.id_usuario or usuario_actual.id_usuario,
                "fecha_prestamo": datos.fecha_prestamo,
                "fecha_devolucion_pactada": datos.fecha_devolucion_pactada,
                "observaciones": datos.observaciones,
            },
        )
        id_prestamo_nuevo = (await db.execute(text("SELECT @id_prestamo_out"))).scalar()
        await db.commit()
    except DBAPIError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=extraer_mensaje_sql(exc),
        )

    db.expire_all()
    nuevo_prestamo = await _cargar_prestamo(db, id_prestamo_nuevo)
    return serializar_prestamo(nuevo_prestamo)


@router.patch("/{id_prestamo}/devolver", response_model=PrestamoOut)
async def registrar_devolucion(id_prestamo: int, db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(
            text("CALL sp_registrar_devolucion(:id_prestamo, :fecha_devolucion_real)"),
            {
                "id_prestamo": id_prestamo,
                "fecha_devolucion_real": date.today(),
            },
        )
        await db.commit()
    except DBAPIError as exc:
        await db.rollback()
        mensaje = extraer_mensaje_sql(exc)
        codigo = (
            status.HTTP_404_NOT_FOUND
            if "no existe" in mensaje.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=codigo, detail=mensaje)

    db.expire_all()
    prestamo = await _cargar_prestamo(db, id_prestamo)
    return serializar_prestamo(prestamo)
