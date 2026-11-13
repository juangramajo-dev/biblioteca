import React from 'react';

function DataTable({
    columns,
    data,
    keyField,
    emptyMessage = 'No hay registros para mostrar.',
    loading = false,
    loadingMessage = 'Cargando...',
    tableClassName = 'table table-hover table-bordered align-middle small mb-0',
    theadClassName = 'table-light',
    maxHeight,
}) {
    const containerStyle = maxHeight ? { maxHeight, overflowY: 'auto' } : undefined;

    return (
        <div className="table-responsive text-start" style={containerStyle}>
            <table className={tableClassName}>
                <thead className={theadClassName}>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={col.key || idx} className={col.headerClassName || ''}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="text-center text-muted py-3">
                                {loading ? loadingMessage : emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr key={row[keyField]}>
                                {columns.map((col, idx) => (
                                    <td key={col.key || idx} className={col.cellClassName || ''}>
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;

