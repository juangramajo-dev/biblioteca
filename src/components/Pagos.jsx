import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import ModalBase from './common/ModalBase.jsx';
import NavTabs from './common/NavTabs.jsx';
import SearchBar from './common/SearchBar.jsx';
import DataTable from './common/DataTable.jsx';
import SocioSelect from './common/SocioSelect.jsx';

function Pagos({ cerrar }) {
    const [pestana, setPestana] = useState('lista');
    const [pagos, setPagos] = useState([]);
    const [socios, setSocios] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);

    // Estado para registrar pago
    const [dniNuevoPago, setDniNuevoPago] = useState('');
    const [periodo, setPeriodo] = useState('2026-11');
    const [monto, setMonto] = useState('5000');
    const [guardando, setGuardando] = useState(false);

    const cargarPagos = async (termino = '') => {
        setCargando(true);
        try {
            const query = termino.trim() ? `?buscar=${encodeURIComponent(termino.trim())}` : '';
            setPagos(await apiRequest(`/pagos${query}`));
        } catch (error) {
            alert(error.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarPagos();
        apiRequest('/socios')
            .then(setSocios)
            .catch(() => setSocios([]));
    }, []);

    const marcarPagado = async (idPago) => {
        try {
            await apiRequest(`/pagos/${idPago}/pagar`, { method: 'PATCH' });
            await cargarPagos(busqueda);
        } catch (error) {
            alert(error.message);
        }
    };

    const registrarPago = async () => {
        if (!dniNuevoPago.trim()) {
            alert('Seleccioná un socio para registrar el pago.');
            return;
        }
        setGuardando(true);
        try {
            await apiRequest('/pagos', {
                method: 'POST',
                body: JSON.stringify({
                    numero_documento: dniNuevoPago.trim(),
                    periodo: periodo.trim() || '2026-11',
                    monto: Number(monto) || 5000.0,
                    pagado: true,
                }),
            });
            alert('Pago registrado con éxito.');
            setDniNuevoPago('');
            await cargarPagos(busqueda);
            setPestana('lista');
        } catch (error) {
            alert(error.message);
        } finally {
            setGuardando(false);
        }
    };

    const columnas = [
        { key: 'socio_nombre', header: 'Socio', cellClassName: 'fw-semibold' },
        { key: 'socio_dni', header: 'DNI' },
        { key: 'periodo', header: 'Período' },
        {
            key: 'monto',
            header: 'Monto',
            render: (p) => `$${Number(p.monto || 0).toLocaleString('es-AR')}`,
        },
        { key: 'fecha_pago', header: 'Fecha de pago', render: (p) => p.fecha_pago || '—' },
        {
            key: 'estado',
            header: 'Estado',
            cellClassName: 'text-center',
            render: (p) => (
                <span className={`badge ${p.estado === 'PAGADO' ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {p.estado === 'PAGADO' ? 'Pagado' : 'Pendiente'}
                </span>
            ),
        },
        {
            key: 'accion',
            header: 'Acción',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (p) =>
                p.estado !== 'PAGADO' ? (
                    <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => marcarPagado(p.id_pago)}
                    >
                        Cobrar
                    </button>
                ) : (
                    <span className="text-muted small">Al día</span>
                ),
        },
    ];

    const tabs = [
        { id: 'lista', label: `Control de pagos (${pagos.length})` },
        { id: 'registrar', label: '+ Registrar pago' },
    ];

    const cambiarPestana = (id) => {
        setPestana(id);
        if (id === 'lista') cargarPagos(busqueda);
    };

    const footer = (
        <>
            <button type="button" className="btn btn-secondary" onClick={cerrar}>
                Cerrar
            </button>
            {pestana === 'registrar' && (
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={registrarPago}
                    disabled={guardando}
                >
                    {guardando ? 'Registrando...' : 'Confirmar pago'}
                </button>
            )}
        </>
    );

    return (
        <ModalBase
            titulo="Control de pagos"
            cerrar={cerrar}
            size="modal-xl"
            headerExtra={<NavTabs tabs={tabs} activeTab={pestana} onChange={cambiarPestana} />}
            footer={footer}
        >
            {pestana === 'lista' ? (
                <>
                    <SearchBar
                        value={busqueda}
                        onChange={setBusqueda}
                        onSearch={() => cargarPagos(busqueda)}
                        placeholder="Buscar socio por nombre o DNI..."
                        loading={cargando}
                    />
                    <DataTable
                        columns={columnas}
                        data={pagos}
                        keyField="id_pago"
                        loading={cargando}
                        loadingMessage="Cargando pagos..."
                        emptyMessage="No hay pagos registrados."
                    />
                </>
            ) : (
                <>
                    <SocioSelect
                        socios={socios}
                        value={dniNuevoPago}
                        onChange={setDniNuevoPago}
                        onlyActive={false}
                    />

                    <div className="row g-2">
                        <div className="col-md-6">
                            <label className="form-label">Período</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: 2026-11"
                                value={periodo}
                                onChange={(e) => setPeriodo(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Monto ($)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                    </div>
                </>
            )}
        </ModalBase>
    );
}

export default Pagos;
