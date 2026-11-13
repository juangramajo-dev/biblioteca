import React from 'react';
import DataTable from '../common/DataTable.jsx';
import SearchBar from '../common/SearchBar.jsx';

function LibroTabla({
    libros,
    busqueda,
    onBusquedaChange,
    onBuscar,
    onEditar,
    onEliminar,
    cargando,
    esAdmin,
}) {
    const columnas = [
        { key: 'isbn', header: 'ISBN', cellClassName: 'small text-muted' },
        {
            key: 'titulo',
            header: 'Título',
            cellClassName: 'fw-semibold',
            render: (libro) => `${libro.titulo} (${libro.anio_publicacion})`,
        },
        {
            key: 'autores',
            header: 'Autor(es)',
            render: (libro) => libro.autores.join(', ') || 'Sin autor',
        },
        { key: 'editorial', header: 'Editorial' },
        { key: 'genero', header: 'Género' },
        {
            key: 'stock_disponible',
            header: 'Disponibles',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (libro) => (
                <span className={`badge ${libro.stock_disponible > 0 ? 'bg-success' : 'bg-danger'}`}>
                    {libro.stock_disponible} / {libro.stock_total}
                </span>
            ),
        },
    ];

    if (esAdmin) {
        columnas.push({
            key: 'acciones',
            header: 'Acciones',
            headerClassName: 'text-center',
            cellClassName: 'text-center text-nowrap',
            render: (libro) => (
                <div className="d-flex justify-content-center gap-1">
                    <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onEditar(libro)}
                    >
                        Editar
                    </button>
                    <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onEliminar(libro)}
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
                placeholder="Escribe el título, autor, género o ISBN..."
                loading={cargando}
            />
            <DataTable
                columns={columnas}
                data={libros}
                keyField="id_libro"
                loading={cargando}
                loadingMessage="Buscando libros..."
                emptyMessage="No se encontraron libros para esta búsqueda."
                maxHeight="380px"
            />
        </>
    );
}

export default LibroTabla;

