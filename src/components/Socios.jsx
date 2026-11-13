import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import SocioTabla from './socios/SocioTabla.jsx';
import SocioForm from './socios/SocioForm.jsx';

function Socios({ mostrar, cerrar }) {
    const [pestana, setPestana] = useState('lista');
    const [socios, setSocios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [socioEditando, setSocioEditando] = useState(null);
    const [cargando, setCargando] = useState(false);

    const cargarSocios = async (termino = '') => {
        setCargando(true);
        try {
            const query = termino.trim() ? `?buscar=${encodeURIComponent(termino.trim())}` : '';
            setSocios(await apiRequest(`/socios${query}`));
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        if (mostrar) cargarSocios();
    }, [mostrar]);

    if (!mostrar) return null;

    const iniciarEdicion = (socio) => {
        setSocioEditando(socio);
        setPestana('registrar');
    };

    const eliminarSocio = async (socio) => {
        const confirmar = window.confirm(
            `¿Seguro que deseás dar de baja / eliminar al socio #${socio.numero_socio} (${socio.nombre_completo})?`
        );
        if (!confirmar) return;

        try {
            const resp = await apiRequest(`/socios/${socio.id_socio}`, { method: 'DELETE' });
            alert(resp.mensaje);
            await cargarSocios(busqueda);
        } catch (error) {
            alert(error.message);
        }
    };

    const tabs = [
        { id: 'lista', label: `Listado de socios (${socios.length})` },
        { id: 'registrar', label: socioEditando ? 'Modificar socio' : '+ Registrar nuevo socio' },
    ];

    const cambiarPestana = (id) => {
        setPestana(id);
        if (id === 'lista') {
            setSocioEditando(null);
            cargarSocios(busqueda);
        }
    };

    return (
        <ModalBase
            titulo="Gestión de socios"
            cerrar={cerrar}
            size="modal-xl"
            headerExtra={<NavTabs tabs={tabs} activeTab={pestana} onChange={cambiarPestana} />}
        >
            {pestana === 'lista' ? (
                <SocioTabla
                    socios={socios}
                    busqueda={busqueda}
                    onBusquedaChange={setBusqueda}
                    onBuscar={() => cargarSocios(busqueda)}
                    onEditar={iniciarEdicion}
                    onEliminar={eliminarSocio}
                    cargando={cargando}
                />
            ) : (
                <SocioForm
                    socioEditando={socioEditando}
                    onCancelar={() => {
                        setSocioEditando(null);
                        setPestana('lista');
                    }}
                    onSuccess={async () => {
                        setSocioEditando(null);
                        await cargarSocios(busqueda);
                        setPestana('lista');
                    }}
                />
            )}
        </ModalBase>
    );
}

export default Socios;
