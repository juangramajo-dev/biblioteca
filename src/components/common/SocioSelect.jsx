import React from 'react';

function SocioSelect({
    socios,
    value,
    onChange,
    label = 'Socio',
    onlyActive = true,
}) {
    return (
        <>
            {label && <label className="mb-1">{label}</label>}
            <select
                className="form-select mb-3"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="">Seleccioná un socio...</option>
                {socios.map((s) => (
                    <option
                        key={s.id_socio}
                        value={s.numero_documento}
                        disabled={onlyActive && s.estado !== 'ACTIVO'}
                    >
                        #{s.numero_socio} - {s.nombre_completo} (DNI: {s.numero_documento})
                        {s.estado !== 'ACTIVO' ? ` [${s.estado}]` : ''}
                    </option>
                ))}
            </select>
        </>
    );
}

export default SocioSelect;

