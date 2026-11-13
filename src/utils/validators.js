export function validarDni(dni) {
    const limpio = (dni || '').trim();
    if (!/^\d{7,15}$/.test(limpio)) {
        return 'El DNI debe contener entre 7 y 15 dígitos numéricos.';
    }
    return null;
}

export function validarEmailOpcional(email) {
    const limpio = (email || '').trim();
    if (!limpio) return null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(limpio)) {
        return 'El formato del correo electrónico no es válido.';
    }
    return null;
}

export function validarTexto(valor, nombreCampo, min = 2) {
    const limpio = (valor || '').trim();
    if (limpio.length < min) {
        return `El campo "${nombreCampo}" debe tener al menos ${min} caracteres.`;
    }
    return null;
}

export function validarUsername(username) {
    const limpio = (username || '').trim();
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(limpio)) {
        return 'El nombre de usuario debe tener entre 3 y 50 caracteres sin espacios.';
    }
    return null;
}

export function validarAnio(anio) {
    const num = Number(anio);
    if (!Number.isInteger(num) || num < 1400 || num > 2100) {
        return 'El año de publicación debe estar entre 1400 y 2100.';
    }
    return null;
}

