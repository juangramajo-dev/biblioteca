import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import PersonaNombreFields from '../common/PersonaNombreFields.jsx';
import { validarDni, validarTexto, validarUsername } from '../../utils/validators.js';

function UsuarioForm({ roles, usuarioEditando, onSuccess, onCancelar }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [dni, setDni] = useState('');
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [rolUsuario, setRolUsuario] = useState('');
    const [clave, setClave] = useState('');
    const [activo, setActivo] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (usuarioEditando) {
            setNombre(usuarioEditando.nombre || '');
            setApellido(usuarioEditando.apellido || '');
            setDni(usuarioEditando.numero_documento || '');
            setNombreUsuario(usuarioEditando.nombre_usuario || '');
            setRolUsuario(String(usuarioEditando.id_rol || ''));
            setClave('');
            setActivo(Boolean(usuarioEditando.activo));
        } else {
            setNombre('');
            setApellido('');
            setDni('');
            setNombreUsuario('');
            setRolUsuario('');
            setClave('');
            setActivo(true);
        }
    }, [usuarioEditando]);

    const guardarUsuario = async () => {
        const errorValidacion =
            validarTexto(nombre, 'Nombre') ||
            validarTexto(apellido, 'Apellido') ||
            validarDni(dni) ||
            validarUsername(nombreUsuario) ||
            (!rolUsuario ? 'Seleccioná un rol.' : null) ||
            (!usuarioEditando && clave.length < 4
                ? 'La contraseña debe tener al menos 4 caracteres.'
                : usuarioEditando && clave && clave.length < 4
                ? 'La nueva contraseña debe tener al menos 4 caracteres.'
                : null);

        if (errorValidacion) {
            alert(errorValidacion);
            return;
        }

        setGuardando(true);
        try {
            if (usuarioEditando) {
                const actualizado = await apiRequest(`/usuarios/${usuarioEditando.id_usuario}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        nombre: nombre.trim(),
                        apellido: apellido.trim(),
                        numero_documento: dni.trim(),
                        nombre_usuario: nombreUsuario.trim(),
                        id_rol: Number(rolUsuario),
                        activo,
                        clave: clave || null,
                    }),
                });
                alert(`Usuario '${actualizado.nombre_usuario}' actualizado con éxito.`);
            } else {
                const creado = await apiRequest('/usuarios', {
                    method: 'POST',
                    body: JSON.stringify({
                        nombre: nombre.trim(),
                        apellido: apellido.trim(),
                        numero_documento: dni.trim(),
                        nombre_usuario: nombreUsuario.trim(),
                        clave,
                        id_rol: Number(rolUsuario),
                    }),
                });
                alert(`Usuario '${creado.nombre_usuario}' registrado con éxito.`);
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
            <h5 className="card-title mb-3">
                {usuarioEditando
                    ? `Modificar usuario: ${usuarioEditando.nombre_usuario}`
                    : 'Registrar usuario'}
            </h5>

            <PersonaNombreFields
                nombre={nombre}
                apellido={apellido}
                onNombreChange={setNombre}
                onApellidoChange={setApellido}
            />

            <input
                className="form-control mb-3"
                placeholder="DNI (7 a 15 dígitos)"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
            />
            <input
                className="form-control mb-3"
                placeholder="Nombre de usuario (sin espacios)"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                disabled={usuarioEditando?.nombre_usuario === 'admin'}
            />
            <input
                className="form-control mb-3"
                type="password"
                placeholder={
                    usuarioEditando
                        ? 'Nueva contraseña (opcional, dejar vacío para mantener)'
                        : 'Contraseña (mín. 4 caracteres)'
                }
                value={clave}
                onChange={(e) => setClave(e.target.value)}
            />
            <select
                className="form-select mb-3"
                value={rolUsuario}
                onChange={(e) => setRolUsuario(e.target.value)}
                disabled={usuarioEditando?.nombre_usuario === 'admin'}
            >
                <option value="">Seleccioná un rol...</option>
                {roles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>
                        {r.nombre_rol}
                    </option>
                ))}
            </select>

            {usuarioEditando && (
                <div className="form-check text-start mb-3">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="usuario-activo-check"
                        checked={activo}
                        onChange={(e) => setActivo(e.target.checked)}
                        disabled={usuarioEditando?.nombre_usuario === 'admin'}
                    />
                    <label className="form-check-label" htmlFor="usuario-activo-check">
                        Usuario activo
                    </label>
                </div>
            )}

            <div className="d-flex justify-content-center gap-2">
                {usuarioEditando && (
                    <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
                        Cancelar edición
                    </button>
                )}
                <button className="btn btn-primary" onClick={guardarUsuario} disabled={guardando}>
                    {guardando
                        ? 'Guardando...'
                        : usuarioEditando
                        ? 'Guardar cambios'
                        : 'Guardar usuario'}
                </button>
            </div>
        </>
    );
}

export default UsuarioForm;
