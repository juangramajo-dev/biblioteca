import React, { useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import SearchBar from './common/SearchBar.jsx';
import DataTable from './common/DataTable.jsx';

function Devoluciones({ cerrar }) {
    const [dni, setDni] = useState('');
    const [prestamosActivos, setPrestamosActivos] = useState([]);
    const [buscado, setBuscado] = useState(false);

    const buscarPrestamos = async () => {
        if (!dni.trim()) {
            alert('Ingresá el DNI del socio.');
            return;
        }
        try {
            const data = await apiRequest(`/prestamos/activos?dni=${encodeURIComponent(dni.trim())}`);
            setPrestamosActivos(data);
            setBuscado(true);
        } catch (error) {
            alert(error.message);
        }
    };

    const devolverLibro = async (idPrestamo) => {
        try {
            await apiRequest(`/prestamos/${idPrestamo}/devolver`, { method: 'PATCH' });
            alert('Devolución registrada correctamente.');
            buscarPrestamos();
        } catch (error) {
            alert(error.message);
        }
    };

    const columnas = [
        { key: 'socio_nombre', header: 'Socio' },
        { key: 'libro_titulo', header: 'Libro' },
        { key: 'fecha_devolucion_pactada', header: 'Vencimiento' },
        {
            key: 'accion',
            header: 'Acción',
            render: (p) => (
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => devolverLibro(p.id_prestamo)}
                >
                    Devolver
                </button>
            ),
        },
    ];

    return (
        <ModalBase
            titulo="Control de devoluciones"
            cerrar={cerrar}
            size="modal-lg"
            overlayClassName="devoluciones-overlay"
        >
            <label className="form-label">Buscar socio por DNI</label>
            <SearchBar
                value={dni}
                onChange={setDni}
                onSearch={buscarPrestamos}
                placeholder="Ingresar DNI..."
            />

            {buscado && (
                <DataTable
                    columns={columnas}
                    data={prestamosActivos}
                    keyField="id_prestamo"
                    emptyMessage="Este socio no tiene préstamos pendientes de devolución."
                    tableClassName="table table-bordered align-middle mb-0"
                />
            )}
        </ModalBase>
    );
}

export default Devoluciones;
