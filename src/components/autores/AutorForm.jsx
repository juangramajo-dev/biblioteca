import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import PersonaNombreFields from '../common/PersonaNombreFields.jsx';

function AutorForm({ autorEditando, onSuccess, onCancelar }) {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [nacionalidad, setNacionalidad] = useState('');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (autorEditando) {
            setNombre(autorEditando.nombre || '');
            setApellido(autorEditando.apellido || '');
            setNacionalidad(autorEditando.nacionalidad || '');
        } else {
            setNombre('');
            setApellido('');
            setNacionalidad('');
        }
    }, [autorEditando]);

    const guardarAutor = async () => {
        if (!nombre.trim() || !apellido.trim()) {
            alert('Nombre y apellido son obligatorios.');
            return;
        }

        const payload = {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            nacionalidad: nacionalidad.trim() || null,
        };

        setGuardando(true);
        try {
            if (autorEditando) {
                const actualizado = await apiRequest(`/autores/${autorEditando.id_autor}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                alert(`Autor "${actualizado.nombre} ${actualizado.apellido}" actualizado correctamente.`);
            } else {
                const creado = await apiRequest('/autores', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                alert(`Autor "${creado.nombre} ${creado.apellido}" registrado correctamente.`);
            }
            setNombre('');
            setApellido('');
            setNacionalidad('');
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
                {autorEditando
                    ? `Modificar autor: ${autorEditando.nombre} ${autorEditando.apellido}`
                    : 'Agregar nuevo autor'}
            </h5>

            <PersonaNombreFields
                nombre={nombre}
                apellido={apellido}
                onNombreChange={setNombre}
                onApellidoChange={setApellido}
            />

            <input
                className="form-control mb-3"
                placeholder="Nacionalidad (opcional)"
                value={nacionalidad}
                onChange={(e) => setNacionalidad(e.target.value)}
            />

            <div className="d-flex justify-content-end gap-2">
                {autorEditando && (
                    <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
                        Cancelar edición
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={guardarAutor}
                    disabled={guardando}
                >
                    {guardando
                        ? 'Guardando...'
                        : autorEditando
                        ? 'Guardar cambios'
                        : 'Guardar autor'}
                </button>
            </div>
        </>
    );
}

export default AutorForm;

