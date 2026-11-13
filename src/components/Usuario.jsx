import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import UsuarioTabla from './usuarios/UsuarioTabla.jsx';
import UsuarioForm from './usuarios/UsuarioForm.jsx';
import UsuarioBuscarDni from './usuarios/UsuarioBuscarDni.jsx';

export function Usuario({ cerrar }) {
    const [pestana, setPestana] = useState('lista');
    const [usuarios, setUsuarios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [roles, setRoles] = useState([]);

    const cargarUsuarios = async (termino = '') => {
        setCargando(true);
        try {
            const query = termino.trim() ? `?buscar=${encodeURIComponent(termino.trim())}` : '';
            setUsuarios(await apiRequest(`/usuarios${query}`));
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        apiRequest('/usuarios/roles')
            .then(setRoles)
            .catch(() =>
                setRoles([
                    { id_rol: 1, nombre_rol: 'ADMIN' },
                    { id_rol: 2, nombre_rol: 'BIBLIOTECARIO' },
                ])
            );
        cargarUsuarios();
    }, []);

    const iniciarEdicion = (usuario) => {
        setUsuarioEditando(usuario);
        setPestana('registrar');
    };

    const eliminarUsuarioPorDni = async (dni) => {
        const dniLimpio = (dni || '').trim();
        if (!dniLimpio) {
            alert('Ingresá el DNI del usuario a eliminar.');
            return false;
        }
        try {
            const resp = await apiRequest(`/usuarios/dni/${encodeURIComponent(dniLimpio)}`, {
                method: 'DELETE',
            });
            alert(resp.mensaje);
            await cargarUsuarios(busqueda);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    };

    const tabs = [
        { id: 'lista', label: `Listado de usuarios (${usuarios.length})` },
        { id: 'registrar', label: usuarioEditando ? 'Modificar usuario' : 'Registrar usuario' },
        { id: 'buscar', label: 'Buscar usuario' },
    ];

    const cambiarPestana = (id) => {
        setPestana(id);
        if (id === 'lista') {
            setUsuarioEditando(null);
            cargarUsuarios(busqueda);
        }
    };

    return (
        <ModalBase
            titulo="Gestión de usuarios"
            cerrar={cerrar}
            size="modal-xl"
            overlayClassName="usuario-overlay"
            headerExtra={<NavTabs tabs={tabs} activeTab={pestana} onChange={cambiarPestana} />}
        >
            <div className="text-center">
                {pestana === 'lista' && (
                    <UsuarioTabla
                        usuarios={usuarios}
                        busqueda={busqueda}
                        onBusquedaChange={setBusqueda}
                        onBuscar={() => cargarUsuarios(busqueda)}
                        onEditar={iniciarEdicion}
                        onEliminar={eliminarUsuarioPorDni}
                        cargando={cargando}
                    />
                )}

                {pestana === 'registrar' && (
                    <UsuarioForm
                        roles={roles}
                        usuarioEditando={usuarioEditando}
                        onCancelar={() => {
                            setUsuarioEditando(null);
                            setPestana('lista');
                        }}
                        onSuccess={async () => {
                            setUsuarioEditando(null);
                            await cargarUsuarios(busqueda);
                            setPestana('lista');
                        }}
                    />
                )}

                {pestana === 'buscar' && (
                    <UsuarioBuscarDni onEliminar={eliminarUsuarioPorDni} />
                )}
            </div>
        </ModalBase>
    );
}
