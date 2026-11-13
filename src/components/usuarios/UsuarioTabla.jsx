import React from 'react';
import DataTable from '../common/DataTable.jsx';
import SearchBar from '../common/SearchBar.jsx';

const formatearFechaHora = (fechaIso) => {
    if (!fechaIso) return '—';
    const fecha = new Date(fechaIso);
    return Number.isNaN(fecha.getTime()) ? fechaIso : fecha.toLocaleString('es-AR');
};

function UsuarioTabla({
    usuarios,
    busqueda,
    onBusquedaChange,
    onBuscar,
    onEditar,
    onEliminar,
    cargando,
}) {
    const columnas = [
        { key: 'id_usuario', header: 'ID', cellClassName: 'fw-bold' },
        { key: 'nombre_completo', header: 'Nombre y Apellido', cellClassName: 'fw-semibold' },
        { key: 'numero_documento', header: 'DNI' },
        {
            key: 'nombre_usuario',
            header: 'Usuario',
            render: (u) => <code>{u.nombre_usuario}</code>,
        },
        {
            key: 'rol',
            header: 'Rol',
            render: (u) => (
                <span className={`badge ${u.rol === 'ADMIN' ? 'bg-dark' : 'bg-info text-dark'}`}>
                    {u.rol}
                </span>
            ),
        },
        {
            key: 'activo',
            header: 'Estado',
            render: (u) => (
                <span className={`badge ${u.activo ? 'bg-success' : 'bg-secondary'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'ultimo_acceso',
            header: 'Último acceso',
            render: (u) => formatearFechaHora(u.ultimo_acceso),
        },
        {
            key: 'accion',
            header: 'Acciones',
            headerClassName: 'text-center',
            cellClassName: 'text-center text-nowrap',
            render: (u) => (
                <div className="d-flex justify-content-center gap-1">
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(u)}
                    >
                        Editar
                    </button>
                    {u.nombre_usuario !== 'admin' ? (
                        <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => onEliminar(u.numero_documento)}
                        >
                            Eliminar
                        </button>
                    ) : (
                        <span className="badge bg-light text-muted border align-self-center">
                            Principal
                        </span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <h5 className="card-title mb-3">Usuarios registrados</h5>
            <SearchBar
                value={busqueda}
                onChange={onBusquedaChange}
                onSearch={onBuscar}
                placeholder="Filtrar por DNI, nombre o usuario..."
                loading={cargando}
                buttonClassName="btn btn-primary"
            />
            <DataTable
                columns={columnas}
                data={usuarios}
                keyField="id_usuario"
                loading={cargando}
                loadingMessage="Cargando usuarios..."
                emptyMessage="No se encontraron usuarios."
                maxHeight="360px"
            />
        </>
    );
}

export default UsuarioTabla;
