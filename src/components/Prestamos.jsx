import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import SocioSelect from './common/SocioSelect.jsx';

function Prestamos({ mostrar, cerrar }) {
    const [socios, setSocios] = useState([]);
    const [libros, setLibros] = useState([]);
    const [dniSeleccionado, setDniSeleccionado] = useState('');
    const [libro, setLibro] = useState('');
    const [fechaPrestamo, setFechaPrestamo] = useState('');
    const [fechaDevolucion, setFechaDevolucion] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!mostrar) return;
        Promise.all([apiRequest('/socios'), apiRequest('/libros')])
            .then(([listaSocios, listaLibros]) => {
                setSocios(listaSocios);
                setLibros(listaLibros);
            })
            .catch((error) => alert(error.message));
    }, [mostrar]);

    if (!mostrar) return null;

    async function guardarPrestamo() {
        if (!dniSeleccionado || !libro.trim() || !fechaPrestamo || !fechaDevolucion) {
            alert('Completá todos los campos');
            return;
        }
        if (fechaDevolucion < fechaPrestamo) {
            alert('La fecha de devolución no puede ser anterior al préstamo');
            return;
        }

        const socioObj = socios.find((s) => s.numero_documento === dniSeleccionado);

        setGuardando(true);
        try {
            const creado = await apiRequest('/prestamos', {
                method: 'POST',
                body: JSON.stringify({
                    nombre_socio: socioObj?.nombre_completo || '',
                    numero_documento: dniSeleccionado,
                    titulo_libro: libro.trim(),
                    fecha_prestamo: fechaPrestamo,
                    fecha_devolucion_pactada: fechaDevolucion,
                }),
            });

            alert(`Préstamo #${creado.id_prestamo} de "${creado.libro_titulo}" registrado para ${creado.socio_nombre}`);
            setDniSeleccionado('');
            setLibro('');
            setFechaPrestamo('');
            setFechaDevolucion('');
            cerrar();
        } catch (error) {
            alert(error.message);
        } finally {
            setGuardando(false);
        }
    }

    const footer = (
        <>
            <button className="btn btn-secondary" onClick={cerrar}>
                Cerrar
            </button>
            <button className="btn btn-success" onClick={guardarPrestamo} disabled={guardando}>
                {guardando ? 'Registrando...' : 'Registrar préstamo'}
            </button>
        </>
    );

    return (
        <ModalBase titulo="Registrar nuevo préstamo" cerrar={cerrar} footer={footer}>
            <SocioSelect socios={socios} value={dniSeleccionado} onChange={setDniSeleccionado} />

            <input
                className="form-control mb-3"
                list="catalogo-libros-prestamo"
                placeholder="Título del libro"
                value={libro}
                onChange={(e) => setLibro(e.target.value)}
            />
            <datalist id="catalogo-libros-prestamo">
                {libros.map((l) => (
                    <option key={l.id_libro} value={l.titulo}>
                        {l.titulo} (Disponibles: {l.stock_disponible}/{l.stock_total})
                    </option>
                ))}
            </datalist>

            <label className="mb-1">Fecha del préstamo</label>
            <input
                type="date"
                className="form-control mb-3"
                value={fechaPrestamo}
                onChange={(e) => setFechaPrestamo(e.target.value)}
            />

            <label className="mb-1">Fecha de devolución</label>
            <input
                type="date"
                className="form-control mb-3"
                value={fechaDevolucion}
                onChange={(e) => setFechaDevolucion(e.target.value)}
            />
        </ModalBase>
    );
}

export default Prestamos;
