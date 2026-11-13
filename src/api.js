export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const TOKEN_KEY = "biblioteca_jwt_token";
const EXP_KEY = "biblioteca_jwt_exp";
const USER_KEY = "biblioteca_usuario";

export function guardarSesion(loginData) {
    const expMs = Date.now() + (loginData.expires_in || 300) * 1000;
    localStorage.setItem(TOKEN_KEY, loginData.access_token);
    localStorage.setItem(EXP_KEY, String(expMs));
    localStorage.setItem(
        USER_KEY,
        JSON.stringify({
            id_usuario: loginData.id_usuario,
            nombre_usuario: loginData.nombre_usuario,
            nombre_completo: loginData.nombre_completo,
            rol: loginData.rol,
        })
    );
}

export function limpiarSesion() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
    localStorage.removeItem(USER_KEY);
}

export function obtenerTokenValido() {
    const token = localStorage.getItem(TOKEN_KEY);
    const exp = Number(localStorage.getItem(EXP_KEY) || 0);
    if (!token || !exp) return null;
    if (Date.now() >= exp) {
        limpiarSesion();
        return null;
    }
    return token;
}

export function obtenerTiempoRestanteMs() {
    const exp = Number(localStorage.getItem(EXP_KEY) || 0);
    if (!exp) return 0;
    return Math.max(0, exp - Date.now());
}

export function obtenerUsuarioActual() {
    if (!obtenerTokenValido()) return null;
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export async function apiRequest(endpoint, options = {}) {
    const token = obtenerTokenValido();

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => null);

    if (response.status === 401 && endpoint !== "/auth/login") {
        limpiarSesion();
        window.dispatchEvent(new Event("sesion-expirada"));
        throw new Error(
            data?.detail || "Tu sesión de 5 minutos ha expirado. Volvé a iniciar sesión."
        );
    }

    if (!response.ok) {
        const mensaje = data?.detail || "Error al comunicarse con el servidor.";
        throw new Error(mensaje);
    }

    return data;
}
