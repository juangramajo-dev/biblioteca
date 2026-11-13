import React, { useState } from 'react';
import { apiRequest, guardarSesion } from '../api';

// COMPONENTE LOGIN
function Login({ onLoginSuccess }) {

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          nombre_usuario: usuario,
          clave: clave,
        }),
      });
      guardarSesion(data);
      onLoginSuccess(data);
    } catch (error) {
      alert(error.message || "Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  return (

    <div className="login-contenedor">

      <form className="login-formulario" onSubmit={manejarEnvio}>

        <h2 className="login-titulo">
          Tu próxima historia comienza aquí.
        </h2>

        <div className="login-campo">

          <label>Usuario</label>

          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />

        </div>

        <div className="login-campo">

          <label>Contraseña</label>

          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />

        </div>

        <button type="submit" className="btn-login" disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Aceptar'}
        </button>

      </form>

    </div>
  );
}
export default Login;
