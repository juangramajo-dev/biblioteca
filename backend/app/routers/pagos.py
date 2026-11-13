from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Pago, Persona, Socio
from ..schemas import PagoCreate, PagoOut

router = APIRouter(prefix="/api/pagos", tags=["Pagos"])


def serializar_pago(pago: Pago) -> PagoOut:
    persona = pago.socio.persona
    return PagoOut(
        id_pago=pago.id_pago,
        id_socio=pago.id_socio,
        socio_nombre=f"{persona.nombre} {persona.apellido}".strip(),
        socio_dni=persona.numero_documento,
        periodo=pago.periodo,
        monto=float(pago.monto),
        fecha_pago=pago.fecha_pago,
        estado=pago.estado,
    )


async def _cargar_pago(db: AsyncSession, id_pago: int) -> Optional[Pago]:
    stmt = (
        select(Pago)
        .options(selectinload(Pago.socio).selectinload(Socio.persona))
        .where(Pago.id_pago == id_pago)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=List[PagoOut])
async def listar_pagos(
    buscar: Optional[str] = Query(None, description="Buscar socio por nombre, apellido o DNI"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Pago)
        .join(Socio)
        .join(Persona)
        .options(selectinload(Pago.socio).selectinload(Socio.persona))
    )
    if buscar and buscar.strip():
        termino = f"%{buscar.strip()}%"
        stmt = stmt.where(
            or_(
                Persona.numero_documento.ilike(termino),
                Persona.nombre.ilike(termino),
                Persona.apellido.ilike(termino),
            )
        )
    stmt = stmt.order_by(Pago.id_pago.desc())
    pagos = (await db.execute(stmt)).scalars().all()
    return [serializar_pago(p) for p in pagos]


@router.post("", response_model=PagoOut, status_code=status.HTTP_201_CREATED)
async def registrar_pago(datos: PagoCreate, db: AsyncSession = Depends(get_db)):
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
            detail=f"No se encontró un socio con DNI {datos.numero_documento}.",
        )

    pago_pendiente = (
        await db.execute(
            select(Pago)
            .options(selectinload(Pago.socio).selectinload(Socio.persona))
            .where(Pago.id_socio == socio.id_socio, Pago.estado == "PENDIENTE")
        )
    ).scalars().first()
    if pago_pendiente:
        pago_pendiente.estado = "PAGADO"
        pago_pendiente.fecha_pago = date.today()
        pago_pendiente.monto = datos.monto
        await db.commit()
        pago_cargado = await _cargar_pago(db, pago_pendiente.id_pago)
        return serializar_pago(pago_cargado)

    nuevo_pago = Pago(
        id_socio=socio.id_socio,
        periodo=datos.periodo,
        monto=datos.monto,
        fecha_pago=date.today() if datos.pagado else None,
        estado="PAGADO" if datos.pagado else "PENDIENTE",
    )
    db.add(nuevo_pago)
    await db.commit()
    pago_cargado = await _cargar_pago(db, nuevo_pago.id_pago)
    return serializar_pago(pago_cargado)


@router.patch("/{id_pago}/pagar", response_model=PagoOut)
async def marcar_pago_como_pagado(id_pago: int, db: AsyncSession = Depends(get_db)):
    pago = await _cargar_pago(db, id_pago)
    if not pago:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El registro de pago no existe.",
        )

    pago.estado = "PAGADO"
    pago.fecha_pago = date.today()
    await db.commit()
    pago_cargado = await _cargar_pago(db, pago.id_pago)
    return serializar_pago(pago_cargado)
