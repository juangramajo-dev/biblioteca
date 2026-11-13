import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import AutorTabla from './autores/AutorTabla.jsx';
import AutorForm from './autores/AutorForm.jsx';

function Autores({ cerrar, esAdmin = false }) {
    const [pestana, setPestana] = useState('lista');
    const [autores, setAutores] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [autorEditando, setAutorEditando] = useState(null);
    const [cargando, setCargando] = useState(false);

    const cargarAutores = async (termino = '') => {
        setCargando(true);
        try {
            const query = termino.trim() ? `?buscar=${encodeURIComponent(termino.trim())}` : '';
            setAutores(await apiRequest(`/autores${query}`));
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarAutores();
    }, []);

    const iniciarEdicion = (autor) => {
        setAutorEditando(autor);
        setPestana('formulario');
    };

    const eliminarAutor = async (autor) => {
        const confirmar = window.confirm(
            `¿Seguro que deseás eliminar a "${autor.nombre} ${autor.apellido}"?`
        );
        if (!confirmar) return;

        try {
            const resp = await apiRequest(`/autores/${autor.id_autor}`, { method: 'DELETE' });
            alert(resp.mensaje);
            await cargarAutores(busqueda);
        } catch (error) {
            alert(error.message);
        }
    };

    const tabs = [
        { id: 'lista', label: `Listado de autores (${autores.length})` },
        { id: 'formulario', label: autorEditando ? 'Modificar autor' : '+ Agregar autor' },
    ];

    const cambiarPestana = (id) => {
        setPestana(id);
        if (id === 'lista') {
            setAutorEditando(null);
            cargarAutores(busqueda);
        }
    };

    return (
        <ModalBase
            titulo="Gestión de autores"
            cerrar={cerrar}
            size="modal-lg"
            headerExtra={
                esAdmin ? <NavTabs tabs={tabs} activeTab={pestana} onChange={cambiarPestana} /> : null
            }
        >
            {(!esAdmin || pestana === 'lista') ? (
                <AutorTabla
                    autores={autores}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    onBuscar={() => cargarAutores(busqueda)}
                    onEditar={iniciarEdicion}
                    onEliminar={eliminarAutor}
                    cargando={cargando}
                    esAdmin={esAdmin}
                />
            ) : (
                <AutorForm
                    autorEditando={autorEditando}
                    onCancelar={() => {
                        setAutorEditando(null);
                        setPestana('lista');
                    }}
                    onSuccess={async () => {
                        setAutorEditando(null);
                        await cargarAutores(busqueda);
                        setPestana('lista');
                    }}
                />
            )}
        </ModalBase>
    );
}

export default Autores;

