import React from 'react';
import DataTable from '../common/DataTable.jsx';
import SearchBar from '../common/SearchBar.jsx';

function AutorTabla({
    autores,
    busqueda,
    onBusquedaChange,
    onBuscar,
    onEditar,
    onEliminar,
    cargando,
    esAdmin,
}) {
    const columnas = [
        { key: 'id_autor', header: 'ID', cellClassName: 'fw-bold' },
        { key: 'nombre', header: 'Nombre', cellClassName: 'fw-semibold' },
        { key: 'apellido', header: 'Apellido', cellClassName: 'fw-semibold' },
        {
            key: 'nacionalidad',
            header: 'Nacionalidad',
            render: (a) => a.nacionalidad || '—',
        },
        {
            key: 'libros_count',
            header: 'Libros',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (a) => (
                <span className="badge bg-secondary">{a.libros_count}</span>
            ),
        },
    ];

    if (esAdmin) {
        columnas.push({
            key: 'acciones',
            header: 'Acciones',
            headerClassName: 'text-center',
            cellClassName: 'text-center text-nowrap',
            render: (a) => (
                <div className="d-flex justify-content-center gap-1">
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(a)}
                    >
                        Editar
                    </button>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onEliminar(a)}
                    >
                        Eliminar
                    </button>
                </div>
            ),
        });
    }

    return (
        <>
            <SearchBar
                value={busqueda}
                onChange={onBusquedaChange}
                onSearch={onBuscar}
                placeholder="Buscar por nombre, apellido o nacionalidad..."
                loading={cargando}
            />
            <DataTable
                columns={columnas}
                data={autores}
                keyField="id_autor"
                loading={cargando}
                loadingMessage="Cargando autores..."
                emptyMessage="No se encontraron autores."
                maxHeight="360px"
            />
        </>
    );
}

export default AutorTabla;

