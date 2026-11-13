from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import Autor, Editorial, Genero, Libro, Prestamo, Usuario
from ..schemas import AutorOut, EditorialOut, GeneroOut, LibroCreate, LibroOut, LibroUpdate
from .auth import requerir_admin

router = APIRouter(prefix="/api/libros", tags=["Libros y Catálogos"])


def serializar_libro(libro: Libro) -> LibroOut:
    return LibroOut(
        id_libro=libro.id_libro,
        isbn=libro.isbn,
        titulo=libro.titulo,
        anio_publicacion=libro.anio_publicacion,
        id_editorial=libro.id_editorial,
        id_genero=libro.id_genero,
        autores_ids=[a.id_autor for a in libro.autores],
        editorial=libro.editorial.nombre if libro.editorial else "-",
        genero=libro.genero.nombre if libro.genero else "-",
        autores=[f"{a.nombre} {a.apellido}".strip() for a in libro.autores],
        stock_total=libro.stock_total,
        stock_disponible=libro.stock_disponible,
    )


async def _cargar_libro_completo(db: AsyncSession, id_libro: int) -> Optional[Libro]:
    stmt = (
        select(Libro)
        .options(
            selectinload(Libro.editorial),
            selectinload(Libro.genero),
            selectinload(Libro.autores),
        )
        .where(Libro.id_libro == id_libro)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


@router.get("", response_model=List[LibroOut])
async def buscar_libros(
    q: Optional[str] = Query(None, description="Buscar por título, autor, género o ISBN"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Libro)
        .outerjoin(Editorial)
        .outerjoin(Genero)
        .outerjoin(Libro.autores)
        .options(
            selectinload(Libro.editorial),
            selectinload(Libro.genero),
            selectinload(Libro.autores),
        )
    )
    if q and q.strip():
        termino = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Libro.titulo.ilike(termino),
                Libro.isbn.ilike(termino),
                Genero.nombre.ilike(termino),
                Editorial.nombre.ilike(termino),
                Autor.nombre.ilike(termino),
                Autor.apellido.ilike(termino),
            )
        ).distinct()

    stmt = stmt.order_by(Libro.titulo.asc())
    libros = (await db.execute(stmt)).scalars().unique().all()
    return [serializar_libro(l) for l in libros]


@router.get("/catalogos")
async def obtener_catalogos(db: AsyncSession = Depends(get_db)):
    editoriales = (await db.execute(select(Editorial).order_by(Editorial.nombre))).scalars().all()
    generos = (await db.execute(select(Genero).order_by(Genero.nombre))).scalars().all()
    autores = (await db.execute(select(Autor).order_by(Autor.apellido))).scalars().all()
    return {
        "editoriales": [EditorialOut.model_validate(e) for e in editoriales],
        "generos": [GeneroOut.model_validate(g) for g in generos],
        "autores": [AutorOut.model_validate(a) for a in autores],
    }


@router.post("", response_model=LibroOut, status_code=status.HTTP_201_CREATED)
async def crear_libro(
    datos: LibroCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    if datos.stock_total < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El stock total debe ser al menos 1.",
        )

    existente = (
        await db.execute(select(Libro).where(Libro.isbn == datos.isbn.strip()))
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un libro con el ISBN {datos.isbn}.",
        )

    autores = (
        await db.execute(select(Autor).where(Autor.id_autor.in_(datos.autores_ids)))
    ).scalars().all()
    if not autores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debés seleccionar al menos un autor válido.",
        )

    nuevo_libro = Libro(
        isbn=datos.isbn.strip(),
        titulo=datos.titulo.strip(),
        anio_publicacion=datos.anio_publicacion,
        id_editorial=datos.id_editorial,
        id_genero=datos.id_genero,
        stock_total=datos.stock_total,
        stock_disponible=datos.stock_total,
        autores=list(autores),
    )
    db.add(nuevo_libro)
    await db.commit()
    libro_cargado = await _cargar_libro_completo(db, nuevo_libro.id_libro)
    return serializar_libro(libro_cargado)


@router.put("/{id_libro}", response_model=LibroOut)
async def actualizar_libro(
    id_libro: int,
    datos: LibroUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    libro = await _cargar_libro_completo(db, id_libro)
    if not libro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El libro solicitado no existe.",
        )

    isbn_limpio = datos.isbn.strip()
    otro_isbn = (
        await db.execute(
            select(Libro).where(Libro.isbn == isbn_limpio, Libro.id_libro != id_libro)
        )
    ).scalar_one_or_none()
    if otro_isbn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Otro libro ya utiliza el ISBN {isbn_limpio}.",
        )

    prestados_actuales = max(0, libro.stock_total - libro.stock_disponible)
    if datos.stock_total < prestados_actuales:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No podés fijar un stock menor a los {prestados_actuales} ejemplares actualmente prestados.",
        )

    autores = (
        await db.execute(select(Autor).where(Autor.id_autor.in_(datos.autores_ids)))
    ).scalars().all()
    if not autores:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debés seleccionar al menos un autor válido.",
        )

    libro.isbn = isbn_limpio
    libro.titulo = datos.titulo.strip()
    libro.anio_publicacion = datos.anio_publicacion
    libro.id_editorial = datos.id_editorial
    libro.id_genero = datos.id_genero
    libro.stock_total = datos.stock_total
    libro.stock_disponible = datos.stock_total - prestados_actuales
    libro.autores = list(autores)

    await db.commit()
    libro_cargado = await _cargar_libro_completo(db, libro.id_libro)
    return serializar_libro(libro_cargado)


@router.delete("/{id_libro}")
async def eliminar_libro(
    id_libro: int,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(requerir_admin),
):
    libro = (
        await db.execute(select(Libro).where(Libro.id_libro == id_libro))
    ).scalar_one_or_none()
    if not libro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El libro solicitado no existe.",
        )

    prestamo_activo = (
        await db.execute(
            select(Prestamo).where(Prestamo.id_libro == id_libro, Prestamo.estado != "DEVUELTO")
        )
    ).scalars().first()
    if prestamo_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el libro porque tiene préstamos activos.",
        )

    prestamo_historico = (
        await db.execute(select(Prestamo).where(Prestamo.id_libro == id_libro))
    ).scalars().first()
    if prestamo_historico:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el libro porque tiene historial de préstamos registrados.",
        )

    await db.delete(libro)
    await db.commit()
    return {"mensaje": f"Libro '{libro.titulo}' eliminado correctamente."}
