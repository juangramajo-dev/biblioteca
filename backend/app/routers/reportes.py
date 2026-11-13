from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db

router = APIRouter(prefix="/api/reportes", tags=["Reportes y Consultas SQL"])


@router.get("/resumen")
async def obtener_resumen_general(db: AsyncSession = Depends(get_db)):
    sql = text(
        """
        SELECT
            (SELECT COUNT(*) FROM socio WHERE estado = 'ACTIVO') AS socios_activos,
            (SELECT COALESCE(SUM(stock_total), 0) FROM libro) AS ejemplares_totales,
            (SELECT COALESCE(SUM(stock_disponible), 0) FROM libro) AS ejemplares_disponibles,
            (SELECT COUNT(*) FROM prestamo WHERE estado <> 'DEVUELTO') AS prestamos_activos,
            (SELECT COALESCE(SUM(monto), 0) FROM pago WHERE estado = 'PAGADO') AS recaudacion_total,
            (SELECT COALESCE(SUM(monto), 0) FROM pago WHERE estado = 'PENDIENTE') AS deuda_pendiente_total
        """
    )
    row = (await db.execute(sql)).mappings().first()
    return {
        "socios_activos": int(row["socios_activos"] or 0),
        "ejemplares_totales": int(row["ejemplares_totales"] or 0),
        "ejemplares_disponibles": int(row["ejemplares_disponibles"] or 0),
        "prestamos_activos": int(row["prestamos_activos"] or 0),
        "recaudacion_total": float(row["recaudacion_total"] or 0),
        "deuda_pendiente_total": float(row["deuda_pendiente_total"] or 0),
    }


@router.get("/prestamos-por-genero")
async def reporte_prestamos_por_genero(db: AsyncSession = Depends(get_db)):
    """Consulta 1: INNER JOIN + GROUP BY para analizar la demanda por género."""
    sql = text(
        """
        SELECT
            g.nombre AS genero,
            COUNT(p.id_prestamo) AS total_prestamos,
            SUM(CASE WHEN p.estado = 'ACTIVO' THEN 1 ELSE 0 END) AS prestamos_activos,
            SUM(CASE WHEN p.estado = 'DEVUELTO' THEN 1 ELSE 0 END) AS prestamos_devueltos,
            COUNT(DISTINCT p.id_socio) AS socios_distintos
        FROM prestamo p
        INNER JOIN libro l ON l.id_libro = p.id_libro
        INNER JOIN genero g ON g.id_genero = l.id_genero
        GROUP BY g.id_genero, g.nombre
        ORDER BY total_prestamos DESC, g.nombre ASC
        """
    )
    rows = (await db.execute(sql)).mappings().all()
    return [
        {
            "genero": r["genero"],
            "total_prestamos": int(r["total_prestamos"] or 0),
            "prestamos_activos": int(r["prestamos_activos"] or 0),
            "prestamos_devueltos": int(r["prestamos_devueltos"] or 0),
            "socios_distintos": int(r["socios_distintos"] or 0),
        }
        for r in rows
    ]


@router.get("/socios-atencion")
async def reporte_socios_con_deuda_o_prestamo(db: AsyncSession = Depends(get_db)):
    """Consulta 2: INNER JOIN + Subconsultas + GROUP BY para seguimiento de socios con deuda o préstamo activo."""
    sql = text(
        """
        SELECT
            s.numero_socio,
            CONCAT(pe.nombre, ' ', pe.apellido) AS socio,
            pe.numero_documento AS dni,
            s.estado AS estado_socio,
            (
                SELECT COUNT(*)
                FROM prestamo pr
                WHERE pr.id_socio = s.id_socio AND pr.estado <> 'DEVUELTO'
            ) AS prestamos_activos,
            COALESCE(SUM(CASE WHEN pg.estado = 'PENDIENTE' THEN pg.monto ELSE 0 END), 0) AS deuda_pendiente,
            COALESCE(SUM(CASE WHEN pg.estado = 'PAGADO' THEN pg.monto ELSE 0 END), 0) AS total_abonado
        FROM socio s
        INNER JOIN persona pe ON pe.id_persona = s.id_persona
        INNER JOIN pago pg ON pg.id_socio = s.id_socio
        WHERE s.id_socio IN (
            SELECT pg2.id_socio
            FROM pago pg2
            WHERE pg2.estado = 'PENDIENTE'
            UNION
            SELECT pr2.id_socio
            FROM prestamo pr2
            WHERE pr2.estado <> 'DEVUELTO'
        )
        GROUP BY s.id_socio, s.numero_socio, pe.nombre, pe.apellido, pe.numero_documento, s.estado
        ORDER BY deuda_pendiente DESC, prestamos_activos DESC
        """
    )
    rows = (await db.execute(sql)).mappings().all()
    return [
        {
            "numero_socio": int(r["numero_socio"]),
            "socio": r["socio"],
            "dni": r["dni"],
            "estado_socio": r["estado_socio"],
            "prestamos_activos": int(r["prestamos_activos"] or 0),
            "deuda_pendiente": float(r["deuda_pendiente"] or 0),
            "total_abonado": float(r["total_abonado"] or 0),
        }
        for r in rows
    ]


@router.get("/libros-destacados")
async def reporte_libros_destacados(db: AsyncSession = Depends(get_db)):
    """Consulta 3: INNER JOIN múltiple (incluyendo libro_autor N:M) + GROUP BY + Subconsulta HAVING AVG."""
    sql = text(
        """
        SELECT
            l.isbn,
            l.titulo,
            e.nombre AS editorial,
            g.nombre AS genero,
            GROUP_CONCAT(
                DISTINCT CONCAT(a.nombre, ' ', a.apellido)
                ORDER BY a.apellido
                SEPARATOR ', '
            ) AS autores,
            l.stock_disponible,
            l.stock_total,
            (
                SELECT COUNT(*)
                FROM prestamo pr
                WHERE pr.id_libro = l.id_libro
            ) AS veces_prestado
        FROM libro l
        INNER JOIN editorial e ON e.id_editorial = l.id_editorial
        INNER JOIN genero g ON g.id_genero = l.id_genero
        INNER JOIN libro_autor la ON la.id_libro = l.id_libro
        INNER JOIN autor a ON a.id_autor = la.id_autor
        GROUP BY l.id_libro, l.isbn, l.titulo, e.nombre, g.nombre, l.stock_disponible, l.stock_total
        HAVING veces_prestado >= (
            SELECT COALESCE(AVG(cnt), 0)
            FROM (
                SELECT COUNT(*) AS cnt
                FROM prestamo
                GROUP BY id_libro
            ) AS promedio_prestamos
        )
        ORDER BY veces_prestado DESC, l.titulo ASC
        """
    )
    rows = (await db.execute(sql)).mappings().all()
    return [
        {
            "isbn": r["isbn"],
            "titulo": r["titulo"],
            "editorial": r["editorial"],
            "genero": r["genero"],
            "autores": r["autores"] or "-",
            "stock_disponible": int(r["stock_disponible"] or 0),
            "stock_total": int(r["stock_total"] or 0),
            "veces_prestado": int(r["veces_prestado"] or 0),
        }
        for r in rows
    ]

