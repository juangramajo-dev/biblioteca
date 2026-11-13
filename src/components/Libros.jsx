import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import LibroTabla from './libros/LibroTabla.jsx';
import LibroForm from './libros/LibroForm.jsx';

export default function Libro({ cerrar, alBuscar, esAdmin = false }) {
    const [pestana, setPestana] = useState('lista');
    const [terminoBusqueda, setTerminoBusqueda] = useState('');
    const [libros, setLibros] = useState([]);
    const [catalogos, setCatalogos] = useState({ editoriales: [], generos: [], autores: [] });
    const [libroEditando, setLibroEditando] = useState(null);
    const [cargando, setCargando] = useState(false);

    const cargarLibros = async (termino = '') => {
        setCargando(true);
        try {
            const query = termino.trim() ? `?q=${encodeURIComponent(termino.trim())}` : '';
            setLibros(await apiRequest(`/libros${query}`));
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarLibros();
        if (esAdmin) {
            apiRequest('/libros/catalogos')
                .then(setCatalogos)
                .catch(() => {});
        }
    }, [esAdmin]);

    const manejarBusqueda = () => {
        if (alBuscar) alBuscar(terminoBusqueda);
        cargarLibros(terminoBusqueda);
    };

    const iniciarEdicion = (libro) => {
        setLibroEditando(libro);
        setPestana('formulario');
    };

    const eliminarLibro = async (libro) => {
        const confirmar = window.confirm(`¿Seguro que deseás eliminar "${libro.titulo}"?`);
        if (!confirmar) return;

        try {
            const resp = await apiRequest(`/libros/${libro.id_libro}`, { method: 'DELETE' });
            alert(resp.mensaje);
            await cargarLibros(terminoBusqueda);
        } catch (error) {
            alert(error.message);
        }
    };

    const tabs = [
        { id: 'lista', label: `Catálogo de libros (${libros.length})` },
        { id: 'formulario', label: libroEditando ? 'Modificar libro' : '+ Agregar libro' },
    ];

    const cambiarPestana = (id) => {
        setPestana(id);
        if (id === 'lista') {
            setLibroEditando(null);
            cargarLibros(terminoBusqueda);
        }
    };

    return (
        <ModalBase
            titulo="Gestión de libros"
            cerrar={cerrar}
            size="modal-xl"
            headerExtra={
                esAdmin ? <NavTabs tabs={tabs} activeTab={pestana} onChange={cambiarPestana} /> : null
            }
        >
            {(!esAdmin || pestana === 'lista') ? (
                <LibroTabla
                    libros={libros}
                    busqueda={terminoBusqueda}
                    onBusquedaChange={setTerminoBusqueda}
                    onBuscar={manejarBusqueda}
                    onEditar={iniciarEdicion}
                    onEliminar={eliminarLibro}
                    cargando={cargando}
                    esAdmin={esAdmin}
                />
            ) : (
                <LibroForm
                    catalogos={catalogos}
                    libroEditando={libroEditando}
                    onCancelar={() => {
                        setLibroEditando(null);
                        setPestana('lista');
                    }}
                    onSuccess={async () => {
                        setLibroEditando(null);
                        await cargarLibros(terminoBusqueda);
                        setPestana('lista');
                    }}
                />
            )}
        </ModalBase>
    );
}
