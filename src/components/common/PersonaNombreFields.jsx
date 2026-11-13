import React from 'react';

function PersonaNombreFields({ nombre, apellido, onNombreChange, onApellidoChange }) {
    return (
        <div className="row g-2 mb-3">
            <div className="col-md-6">
                <input
                    className="form-control"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => onNombreChange(e.target.value)}
                />
            </div>
            <div className="col-md-6">
                <input
                    className="form-control"
                    placeholder="Apellido"
                    value={apellido}
                    onChange={(e) => onApellidoChange(e.target.value)}
                />
            </div>
        </div>
    );
}

export default PersonaNombreFields;

