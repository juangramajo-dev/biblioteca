from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Pago, Persona, Prestamo, Socio
from ..schemas import SocioCreate, SocioOut, SocioUpdate

router = APIRouter(prefix="/api/socios", tags=["Socios"])


def separar_nombre_apellido(nombre_completo: Optional[str], nombre: Optional[str], apellido: Optional[str]):
    if nombre and apellido:
        return nombre.strip(), apellido.strip()
    texto = (nombre_completo or nombre or "").strip()
    partes = texto.split(" ", 1)
    if len(partes) == 2:
        return partes[0].strip(), partes[1].strip()
    return partes[0] if partes else "Sin Nombre", "-"


def serializar_socio(socio: Socio) -> SocioOut:
    p = socio.persona
    prestamos_activos = [
        pr for pr in (socio.prestamos or []) if pr.estado != "DEVUELTO"
    ]
    libros_prestamo = [
        pr.libro.titulo for pr in prestamos_activos if pr.libro
    ]
    return SocioOut(
        id_socio=socio.id_socio,
        numero_socio=socio.numero_socio,
        fecha_alta=socio.fecha_alta,
        estado=socio.estado,
        numero_documento=p.numero_documento,
        nombre=p.nombre,
        apellido=p.apellido,
        nombre_completo=f"{p.nombre} {p.apellido}".strip(),
        telefono=p.telefono,
        direccion=p.direccion,
        correo_electronico=p.correo_electronico,
        observaciones=socio.observaciones,
        tiene_prestamo_activo=len(prestamos_activos) > 0,
        prestamos_activos_count=len(prestamos_activos),
        libros_en_prestamo=libros_prestamo,
    )


async def _cargar_socio_completo(db: AsyncSession, id_socio: int) -> Optional[Socio]:
    stmt = (
        select(Socio)
        .options(
            selectinload(Socio.persona),
            selectinload(Socio.prestamos).selectinload(Prestamo.libro),
        )
        .where(Socio.id_socio == id_socio)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


@router.get("", response_model=List[SocioOut])
async def listar_socios(
    buscar: Optional[str] = Query(None, description="Buscar por DNI, nombre o apellido"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Socio)
        .join(Persona)
        .options(
            selectinload(Socio.persona),
            selectinload(Socio.prestamos).selectinload(Prestamo.libro),
        )
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
    stmt = stmt.order_by(Socio.numero_socio.desc())
    result = await db.execute(stmt)
    socios = result.scalars().all()
    return [serializar_socio(s) for s in socios]


@router.get("/dni/{dni}", response_model=SocioOut)
async def obtener_socio_por_dni(dni: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Socio)
        .join(Persona)
        .options(
            selectinload(Socio.persona),
            selectinload(Socio.prestamos).selectinload(Prestamo.libro),
        )
        .where(Persona.numero_documento == dni.strip())
    )
    result = await db.execute(stmt)
    socio = result.scalar_one_or_none()
    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró un socio con DNI {dni}",
        )
    return serializar_socio(socio)


@router.post("", response_model=SocioOut, status_code=status.HTTP_201_CREATED)
async def registrar_socio(datos: SocioCreate, db: AsyncSession = Depends(get_db)):
    dni = datos.numero_documento.strip()
    nombre, apellido = separar_nombre_apellido(datos.nombre_completo, datos.nombre, datos.apellido)

    stmt_persona = (
        select(Persona)
        .options(selectinload(Persona.socio))
        .where(Persona.numero_documento == dni)
    )
    persona = (await db.execute(stmt_persona)).scalar_one_or_none()

    if persona:
        if persona.socio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La persona con DNI {dni} ya está registrada como socio (#{persona.socio.numero_socio}).",
            )
        persona.nombre = nombre
        persona.apellido = apellido
        if datos.telefono:
            persona.telefono = datos.telefono
        if datos.direccion:
            persona.direccion = datos.direccion
        if datos.correo_electronico:
            persona.correo_electronico = datos.correo_electronico
    else:
        persona = Persona(
            numero_documento=dni,
            nombre=nombre,
            apellido=apellido,
            telefono=datos.telefono,
            direccion=datos.direccion,
            correo_electronico=datos.correo_electronico,
        )
        db.add(persona)
        await db.flush()

    max_num = (await db.execute(select(func.max(Socio.numero_socio)))).scalar() or 1000
    nuevo_socio = Socio(
        id_persona=persona.id_persona,
        numero_socio=max_num + 1,
        estado="ACTIVO",
        observaciones=datos.observaciones,
    )
    db.add(nuevo_socio)
    await db.flush()

    cuota_inicial = Pago(
        id_socio=nuevo_socio.id_socio,
        periodo="2026-11",
        monto=5000.00,
        fecha_pago=None,
        estado="PENDIENTE",
    )
    db.add(cuota_inicial)

    await db.commit()
    socio_completo = await _cargar_socio_completo(db, nuevo_socio.id_socio)
    return serializar_socio(socio_completo)


@router.put("/{id_socio}", response_model=SocioOut)
async def actualizar_socio(
    id_socio: int,
    datos: SocioUpdate,
    db: AsyncSession = Depends(get_db),
):
    socio = await _cargar_socio_completo(db, id_socio)
    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El socio indicado no existe.",
        )

    dni_limpio = datos.numero_documento.strip()
    otra_persona = (
        await db.execute(
            select(Persona).where(
                Persona.numero_documento == dni_limpio,
                Persona.id_persona != socio.id_persona,
            )
        )
    ).scalar_one_or_none()
    if otra_persona:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Otro registro ya utiliza el DNI {dni_limpio}.",
        )

    socio.persona.nombre = datos.nombre.strip()
    socio.persona.apellido = datos.apellido.strip()
    socio.persona.numero_documento = dni_limpio
    socio.persona.telefono = datos.telefono.strip() if datos.telefono else None
    socio.persona.direccion = datos.direccion.strip() if datos.direccion else None
    socio.persona.correo_electronico = datos.correo_electronico
    socio.estado = datos.estado
    socio.observaciones = datos.observaciones.strip() if datos.observaciones else None

    await db.commit()
    socio_actualizado = await _cargar_socio_completo(db, id_socio)
    return serializar_socio(socio_actualizado)


@router.delete("/{id_socio}")
async def eliminar_socio(id_socio: int, db: AsyncSession = Depends(get_db)):
    socio = await _cargar_socio_completo(db, id_socio)
    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El socio indicado no existe.",
        )

    prestamos_activos = [pr for pr in (socio.prestamos or []) if pr.estado != "DEVUELTO"]
    if prestamos_activos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar ni dar de baja al socio porque tiene préstamos activos.",
        )

    tiene_historial_prestamos = len(socio.prestamos or []) > 0
    pagos_socio = (
        await db.execute(select(Pago).where(Pago.id_socio == id_socio))
    ).scalars().all()
    tiene_pagos_cobrados = any(pg.estado == "PAGADO" for pg in pagos_socio)

    if tiene_historial_prestamos or tiene_pagos_cobrados:
        socio.estado = "INACTIVO"
        await db.commit()
        return {
            "mensaje": f"El socio #{socio.numero_socio} ({socio.persona.nombre} {socio.persona.apellido}) pasó a estado INACTIVO porque posee historial registrado."
        }

    for pg in pagos_socio:
        await db.delete(pg)
    nombre_completo = f"{socio.persona.nombre} {socio.persona.apellido}".strip()
    numero = socio.numero_socio
    await db.delete(socio)
    await db.commit()
    return {"mensaje": f"Socio #{numero} ({nombre_completo}) eliminado correctamente."}
