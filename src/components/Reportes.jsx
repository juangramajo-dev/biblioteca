import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import DataTable from './common/DataTable.jsx';
import { exportarExcel, exportarPDF } from '../utils/exportReport.js';

function Reportes({ cerrar }) {
    const [pestana, setPestana] = useState('generos');
    const [resumen, setResumen] = useState(null);
    const [porGenero, setPorGenero] = useState([]);
    const [sociosAtencion, setSociosAtencion] = useState([]);
    const [librosDestacados, setLibrosDestacados] = useState([]);
    const [cargando, setCargando] = useState(false);

    const cargarReportes = async () => {
        setCargando(true);
        try {
            const [res, gen, soc, lib] = await Promise.all([
                apiRequest('/reportes/resumen'),
                apiRequest('/reportes/prestamos-por-genero'),
                apiRequest('/reportes/socios-atencion'),
                apiRequest('/reportes/libros-destacados'),
            ]);
            setResumen(res);
            setPorGenero(gen);
            setSociosAtencion(soc);
            setLibrosDestacados(lib);
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarReportes();
    }, []);

    const configuraciones = {
        generos: {
            titulo: 'Reporte: Préstamos por Género Literario',
            //  'Consulta SQL con INNER JOIN y agrupamiento GROUP BY',
            fileName: 'reporte_prestamos_por_genero',
            sheetName: 'Prestamos por Genero',
            data: porGenero,
            keyField: 'genero',
            columns: [
                { key: 'genero', header: 'Género', cellClassName: 'fw-semibold' },
                { key: 'total_prestamos', header: 'Total Préstamos', cellClassName: 'text-center fw-bold' },
                { key: 'prestamos_activos', header: 'Activos', cellClassName: 'text-center' },
                { key: 'prestamos_devueltos', header: 'Devueltos', cellClassName: 'text-center' },
                { key: 'socios_distintos', header: 'Socios Distintos', cellClassName: 'text-center' },
            ],
            toExportRows: (items) =>
                items.map((r) => [
                    r.genero,
                    r.total_prestamos,
                    r.prestamos_activos,
                    r.prestamos_devueltos,
                    r.socios_distintos,
                ]),
        },
        socios: {
            titulo: 'Reporte: Socios con Deuda o Préstamo Activo',
            //  'Consulta SQL con INNER JOIN, Subconsultas y GROUP BY',
            fileName: 'reporte_socios_atencion',
            sheetName: 'Socios Atencion',
            data: sociosAtencion,
            keyField: 'numero_socio',
            columns: [
                {
                    key: 'numero_socio',
                    header: 'N° Socio',
                    cellClassName: 'fw-bold text-center',
                    render: (r) => `#${r.numero_socio}`,
                },
                { key: 'socio', header: 'Socio', cellClassName: 'fw-semibold' },
                { key: 'dni', header: 'DNI' },
                { key: 'estado_socio', header: 'Estado' },
                { key: 'prestamos_activos', header: 'Préstamos Activos', cellClassName: 'text-center' },
                {
                    key: 'deuda_pendiente',
                    header: 'Deuda Pendiente',
                    render: (r) => `$${r.deuda_pendiente.toLocaleString('es-AR')}`,
                },
                {
                    key: 'total_abonado',
                    header: 'Total Abonado',
                    render: (r) => `$${r.total_abonado.toLocaleString('es-AR')}`,
                },
            ],
            toExportRows: (items) =>
                items.map((r) => [
                    `#${r.numero_socio}`,
                    r.socio,
                    r.dni,
                    r.estado_socio,
                    r.prestamos_activos,
                    `$${r.deuda_pendiente.toLocaleString('es-AR')}`,
                    `$${r.total_abonado.toLocaleString('es-AR')}`,
                ]),
        },
        libros: {
            titulo: 'Reporte: Libros Destacados (Demanda >= Promedio)',
            //  'Consulta SQL con INNER JOIN múltiple (N:M), GROUP BY y Subconsulta HAVING AVG',
            fileName: 'reporte_libros_destacados',
            sheetName: 'Libros Destacados',
            data: librosDestacados,
            keyField: 'isbn',
            columns: [
                { key: 'isbn', header: 'ISBN', cellClassName: 'small text-muted' },
                { key: 'titulo', header: 'Título', cellClassName: 'fw-semibold' },
                { key: 'autores', header: 'Autores' },
                { key: 'editorial', header: 'Editorial' },
                { key: 'genero', header: 'Género' },
                {
                    key: 'stock',
                    header: 'Disponibles',
                    cellClassName: 'text-center',
                    render: (r) => `${r.stock_disponible} / ${r.stock_total}`,
                },
                {
                    key: 'veces_prestado',
                    header: 'Veces Prestado',
                    cellClassName: 'text-center fw-bold',
                },
            ],
            toExportRows: (items) =>
                items.map((r) => [
                    r.isbn,
                    r.titulo,
                    r.autores,
                    r.editorial,
                    r.genero,
                    `${r.stock_disponible} / ${r.stock_total}`,
                    r.veces_prestado,
                ]),
        },
    };

    const actual = configuraciones[pestana];
    const headers = actual.columns.map((c) => c.header);
    const exportRows = actual.toExportRows(actual.data);

    const manejarExportarPDF = () => {
        if (actual.data.length === 0) {
            alert('No hay datos para exportar en este reporte.');
            return;
        }
        exportarPDF({
            titulo: actual.titulo,
            subtitulo: actual.subtitulo,
            headers,
            rows: exportRows,
            fileName: actual.fileName,
        });
    };

    const manejarExportarExcel = () => {
        if (actual.data.length === 0) {
            alert('No hay datos para exportar en este reporte.');
            return;
        }
        exportarExcel({
            sheetName: actual.sheetName,
            headers,
            rows: exportRows,
            fileName: actual.fileName,
        });
    };

    const tabs = [
        { id: 'generos', label: `Préstamos por género (${porGenero.length})` },
        { id: 'socios', label: `Socios con deuda / préstamo (${sociosAtencion.length})` },
        { id: 'libros', label: `Libros destacados (${librosDestacados.length})` },
    ];

    return (
        <ModalBase
            titulo="Módulo de Reportes y Estadísticas"
            cerrar={cerrar}
            size="modal-xl"
            headerExtra={<NavTabs tabs={tabs} activeTab={pestana} onChange={setPestana} />}
        >
            {resumen && (
                <div className="row g-2 mb-3 text-center">
                    <div className="col-6 col-md-3">
                        <div className="border rounded p-2 bg-light">
                            <div className="small text-muted">Socios Activos</div>
                            <div className="fs-5 fw-bold text-success">{resumen.socios_activos}</div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="border rounded p-2 bg-light">
                            <div className="small text-muted">Ejemplares Disponibles</div>
                            <div className="fs-5 fw-bold text-primary">
                                {resumen.ejemplares_disponibles} / {resumen.ejemplares_totales}
                            </div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="border rounded p-2 bg-light">
                            <div className="small text-muted">Préstamos Activos</div>
                            <div className="fs-5 fw-bold text-warning text-dark">
                                {resumen.prestamos_activos}
                            </div>
                        </div>
                    </div>
                    <div className="col-6 col-md-3">
                        <div className="border rounded p-2 bg-light">
                            <div className="small text-muted">Recaudación Total</div>
                            <div className="fs-5 fw-bold text-dark">
                                ${resumen.recaudacion_total.toLocaleString('es-AR')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                    <h6 className="mb-0 fw-bold">{actual.titulo}</h6>
                    {actual.subtitulo && <small className="text-muted">{actual.subtitulo}</small>}
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={cargarReportes}
                        disabled={cargando}
                    >
                        {cargando ? 'Actualizando...' : 'Actualizar'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={manejarExportarPDF}
                    >
                        Exportar PDF
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={manejarExportarExcel}
                    >
                        Exportar Excel
                    </button>
                </div>
            </div>

            <DataTable
                columns={actual.columns}
                data={actual.data}
                keyField={actual.keyField}
                loading={cargando}
                loadingMessage="Ejecutando consulta SQL..."
                emptyMessage="No hay resultados para este reporte."
                maxHeight="340px"
            />
        </ModalBase>
    );
}

export default Reportes;
