import React from 'react';
import DataTable from '../common/DataTable.jsx';
import SearchBar from '../common/SearchBar.jsx';

const formatearFecha = (fechaIso) => {
    if (!fechaIso) return '—';
    const fecha = new Date(fechaIso);
    return Number.isNaN(fecha.getTime()) ? fechaIso : fecha.toLocaleDateString('es-AR');
};

const badgeEstado = (estado) => {
    if (estado === 'ACTIVO') return 'bg-success';
    if (estado === 'SUSPENDIDO') return 'bg-warning text-dark';
    return 'bg-secondary';
};

function SocioTabla({
    socios,
    busqueda,
    onBusquedaChange,
    onBuscar,
    onEditar,
    onEliminar,
    cargando,
}) {
    const columnas = [
        {
            key: 'numero_socio',
            header: 'N° Socio',
            cellClassName: 'fw-bold text-center',
            render: (s) => `#${s.numero_socio}`,
        },
        { key: 'nombre_completo', header: 'Nombre y Apellido', cellClassName: 'fw-semibold' },
        { key: 'numero_documento', header: 'DNI' },
        { key: 'telefono', header: 'Teléfono', render: (s) => s.telefono || '—' },
        { key: 'direccion', header: 'Dirección', render: (s) => s.direccion || '—' },
        { key: 'correo_electronico', header: 'Correo', render: (s) => s.correo_electronico || '—' },
        {
            key: 'fecha_alta',
            header: 'Fecha Alta',
            render: (s) => formatearFecha(s.fecha_alta),
        },
        {
            key: 'estado',
            header: 'Estado',
            cellClassName: 'text-center',
            render: (s) => <span className={`badge ${badgeEstado(s.estado)}`}>{s.estado}</span>,
        },
        {
            key: 'prestamo',
            header: 'Libro en préstamo',
            render: (s) =>
                s.tiene_prestamo_activo ? (
                    <div>
                        <span className="badge bg-primary mb-1">
                            Sí ({s.prestamos_activos_count})
                        </span>
                        <div className="text-muted">{s.libros_en_prestamo.join(', ')}</div>
                    </div>
                ) : (
                    <span className="badge bg-light text-dark border">No</span>
                ),
        },
        { key: 'observaciones', header: 'Observaciones', render: (s) => s.observaciones || '—' },
        {
            key: 'acciones',
            header: 'Acciones',
            headerClassName: 'text-center',
            cellClassName: 'text-center text-nowrap',
            render: (s) => (
                <div className="d-flex justify-content-center gap-1">
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(s)}
                    >
                        Editar
                    </button>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onEliminar(s)}
                    >
                        Eliminar
                    </button>
                </div>
            ),
        },
    ];

    return (
        <>
            <SearchBar
                value={busqueda}
                onChange={onBusquedaChange}
                onSearch={onBuscar}
                placeholder="Buscar por DNI, nombre o apellido..."
                loading={cargando}
            />
            <DataTable
                columns={columnas}
                data={socios}
                keyField="id_socio"
                loading={cargando}
                loadingMessage="Cargando socios..."
                emptyMessage="No hay socios registrados para mostrar."
            />
        </>
    );
}

export default SocioTabla;
