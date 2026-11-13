import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import PersonaNombreFields from '../common/PersonaNombreFields.jsx';
import { validarDni, validarEmailOpcional, validarTexto } from '../../utils/validators.js';

function SocioForm({ socioEditando, onSuccess, onCancelar }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [dni, setDni] = useState('');
    const [telefono, setTelefono] = useState('');
    const [direccion, setDireccion] = useState('');
    const [correo, setCorreo] = useState('');
    const [estado, setEstado] = useState('ACTIVO');
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (socioEditando) {
            setNombre(socioEditando.nombre || '');
            setApellido(socioEditando.apellido || '');
            setDni(socioEditando.numero_documento || '');
            setTelefono(socioEditando.telefono || '');
            setDireccion(socioEditando.direccion || '');
            setCorreo(socioEditando.correo_electronico || '');
            setEstado(socioEditando.estado || 'ACTIVO');
            setObservaciones(socioEditando.observaciones || '');
        } else {
            setNombre('');
            setApellido('');
            setDni('');
            setTelefono('');
            setDireccion('');
            setCorreo('');
            setEstado('ACTIVO');
            setObservaciones('');
        }
    }, [socioEditando]);

    const guardarSocio = async () => {
        const errorValidacion =
            validarTexto(nombre, 'Nombre') ||
            validarTexto(apellido, 'Apellido') ||
            validarDni(dni) ||
            (!telefono.trim() || !direccion.trim()
                ? 'Teléfono y dirección son obligatorios.'
                : null) ||
            validarEmailOpcional(correo);

        if (errorValidacion) {
            alert(errorValidacion);
            return;
        }

        const payload = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            numero_documento: dni.trim(),
            telefono: telefono.trim(),
            direccion: direccion.trim(),
            correo_electronico: correo.trim() || null,
            observaciones: observaciones.trim() || null,
        };

        setGuardando(true);
        try {
            if (socioEditando) {
                const actualizado = await apiRequest(`/socios/${socioEditando.id_socio}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ...payload, estado }),
                });
                alert(`Socio #${actualizado.numero_socio} (${actualizado.nombre_completo}) actualizado correctamente.`);
            } else {
                const socioCreado = await apiRequest('/socios', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                alert(`Socio #${socioCreado.numero_socio} (${socioCreado.nombre_completo}) registrado correctamente`);
            }
            if (onSuccess) await onSuccess();
        } catch (error) {
            alert(error.message);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <h5 className="mb-3">
                {socioEditando
                    ? `Modificar socio #${socioEditando.numero_socio}: ${socioEditando.nombre_completo}`
                    : 'Registrar nuevo socio'}
            </h5>

            <PersonaNombreFields
                nombre={nombre}
                apellido={apellido}
                onNombreChange={setNombre}
                onApellidoChange={setApellido}
            />

            <input
                className="form-control mb-3"
                placeholder="DNI (solo números, 7-15 dígitos)"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
            />

            <input
                className="form-control mb-3"
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
            />

            <input
                className="form-control mb-3"
                placeholder="Dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
            />

            <input
                className="form-control mb-3"
                type="email"
                placeholder="Correo electrónico (opcional)"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
            />

            {socioEditando && (
                <div className="mb-3">
                    <label className="form-label small mb-1">Estado del socio</label>
                    <select
                        className="form-select"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                    >
                        <option value="ACTIVO">ACTIVO</option>
                        <option value="SUSPENDIDO">SUSPENDIDO</option>
                        <option value="INACTIVO">INACTIVO</option>
                    </select>
                </div>
            )}

            <textarea
                className="form-control mb-3"
                rows="2"
                placeholder="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
            />

            <div className="d-flex justify-content-end gap-2">
                {socioEditando && (
                    <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
                        Cancelar edición
                    </button>
                )}
                <button className="btn btn-success" onClick={guardarSocio} disabled={guardando}>
                    {guardando
                        ? 'Guardando...'
                        : socioEditando
                        ? 'Guardar cambios'
                        : 'Guardar socio'}
                </button>
            </div>
        </>
    );
}

export default SocioForm;
