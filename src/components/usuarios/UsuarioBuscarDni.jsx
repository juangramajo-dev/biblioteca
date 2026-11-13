import React, { useState } from 'react';
import { apiRequest } from '../../api';

function UsuarioBuscarDni({ onEliminar }) {
    const [dniBusqueda, setDniBusqueda] = useState('');
    const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);

    const buscarUsuario = async () => {
        if (!dniBusqueda.trim()) {
            alert('Ingresá un DNI para buscar.');
            return;
        }
        try {
            const data = await apiRequest(`/usuarios/dni/${encodeURIComponent(dniBusqueda.trim())}`);
            setUsuarioEncontrado(data);
        } catch (error) {
            setUsuarioEncontrado(null);
            alert(error.message);
        }
    };

    const manejarEliminar = async () => {
        const eliminado = await onEliminar(dniBusqueda);
        if (eliminado) {
            setUsuarioEncontrado(null);
            setDniBusqueda('');
        }
    };

    return (
        <>
            <h5 className="card-title mb-3">Buscar usuario</h5>

            <input
                className="form-control mb-3"
                placeholder="Ingresar DNI"
                value={dniBusqueda}
                onChange={(e) => setDniBusqueda(e.target.value)}
            />

            <button className="btn btn-primary" onClick={buscarUsuario}>
                Buscar
            </button>

            <button className="btn btn-danger ms-2" onClick={manejarEliminar}>
                Eliminar
            </button>

            {usuarioEncontrado && (
                <div className="alert alert-info mt-3 text-start">
                    <strong>Nombre:</strong> {usuarioEncontrado.nombre_completo} <br />
                    <strong>Usuario:</strong> {usuarioEncontrado.nombre_usuario} <br />
                    <strong>DNI:</strong> {usuarioEncontrado.numero_documento} <br />
                    <strong>Rol:</strong> {usuarioEncontrado.rol}
                </div>
            )}
        </>
    );
}

export default UsuarioBuscarDni;

