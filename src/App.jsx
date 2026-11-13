import React, { useEffect, useState } from 'react';
import Login from './page/Login.jsx';
import Dashboard from './page/Dashboard.jsx';
import {
    limpiarSesion,
    obtenerTiempoRestanteMs,
    obtenerTokenValido,
    obtenerUsuarioActual,
} from './api.js';

function App() {

    const [logeado, setLogeado] = useState(() => Boolean(obtenerTokenValido()));
    const [usuarioActual, setUsuarioActual] = useState(() => obtenerUsuarioActual());

    useEffect(() => {
        if (!logeado) return;

        const cerrarPorExpiracion = () => {
            limpiarSesion();
            setUsuarioActual(null);
            setLogeado(false);
            alert("Tu sesión de 5 minutos ha expirado. Por favor, iniciá sesión nuevamente.");
        };

        window.addEventListener("sesion-expirada", cerrarPorExpiracion);

        const tiempoRestante = obtenerTiempoRestanteMs();
        const timer = setTimeout(cerrarPorExpiracion, tiempoRestante);

        return () => {
            window.removeEventListener("sesion-expirada", cerrarPorExpiracion);
            clearTimeout(timer);
        };
    }, [logeado]);

    const manejarCerrarSesion = () => {
        limpiarSesion();
        setUsuarioActual(null);
        setLogeado(false);
    };

    if (!logeado) {
        return (
            <Login
                onLoginSuccess={(datosUsuario) => {
                    setUsuarioActual(datosUsuario);
                    setLogeado(true);
                }}
            />
        );
    }

    return (
        <Dashboard
            usuarioActual={usuarioActual}
            onCerrarSesion={manejarCerrarSesion}
        />
    );
}

export default App;
