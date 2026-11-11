
import React, { useState } from 'react';
import { UsersRound, BookOpen } from 'lucide-react';
import Login from './loguing.jsx';
import Socios from './socios.jsx';
import Libro from './libros.jsx';
import Pagos from './pagos.jsx';
import { Usuario } from './usuario.jsx';
import Devoluciones from './devoluciones.jsx';
import Prestamos from './prestamos.jsx';

function App() {

    const [logeado, setLogeado] = useState(false);
    const [mostrarSocios, setMostrarSocios] = useState(false);
    const [mostrarLibros, setMostrarLibros] = useState(false);
    const [mostrarPagos, setMostrarPagos] = useState(false);
    const [mostrarUsuario, setMostrarUsuario] = useState(false);
    const [mostrarDevoluciones, setMostrarDevoluciones] = useState(false);
    const [mostrarPrestamos, setMostrarPrestamos] = useState(false);

    if (!logeado) {
        return <Login onLoginSuccess={() => setLogeado(true)} />;
    }

    return (
        <div className="container-biblioteca">

            {/* TITULO */}
            <div className="seccion-titulo">
                <h1 className="nombre-biblioteca">
                    Biblioteca de juancho
                </h1>

                <p className="subtitulo-biblioteca">
                    Un espacio para aprender, descubrir y compartir historias.
                </p>
            </div>

            {/* CITA DEL DIA */}
            <div className="seccion-centro">
                <div className="tarjeta-cita">
                    <h5 className="cita-titulo">
                        📖 Cita del día
                    </h5>

                    <p className="cita-texto">
                        "Para viajar lejos, no hay mejor nave que un libro."
                    </p>

                    <footer className="cita-autor">
                        — Emily Dickinson
                    </footer>
                </div>
            </div>

            {/* TITULO DE SECCIONES */}
            <div className="titulo-secciones">
                <h2>Panel Central</h2>
                <p>Seleccioná para comenzar a trabajar.</p>
            </div>

            {/* BOTONES PRINCIPALES */}
            <div className="seccion-botones">

                <button className="btn-gestion" onClick={() => setMostrarSocios(true)}>
                    <UsersRound />
                    Socios
                </button>

                <button className="btn-gestion" onClick={() => setMostrarLibros(true)}>
                    <BookOpen />
                    Libros
                </button>

                <button className="btn-gestion" onClick={() => setMostrarPagos(true)}>
                    Pagos
                </button>

                <button className="btn-gestion" onClick={() => setMostrarUsuario(true)}>
                    Usuarios
                </button>

                <button className="btn-gestion" onClick={() => setMostrarDevoluciones(true)}>
                    Devoluciones
                </button>

                <button className="btn-gestion" onClick={() => setMostrarPrestamos(true)}>
                    Préstamos
                </button>

            </div>

            {/* CERRAR SESION */}
            <div className="acciones-finales">
                <button
                    className="btn-cerrar"
                    onClick={() => setLogeado(false)}
                >
                    Cerrar sesión
                </button>
            </div>

            {/* VENTANAS */}
            <Socios
                mostrar={mostrarSocios}
                cerrar={() => setMostrarSocios(false)}
            />

            {mostrarLibros && (
                <Libro cerrar={() => setMostrarLibros(false)} />
            )}

            {mostrarPagos && (
                <Pagos cerrar={() => setMostrarPagos(false)} />
            )}

            {mostrarUsuario && (
                <Usuario cerrar={() => setMostrarUsuario(false)} />
            )}

            {mostrarDevoluciones && (
                <Devoluciones cerrar={() => setMostrarDevoluciones(false)} />
            )}

            <Prestamos
                mostrar={mostrarPrestamos}
                cerrar={() => setMostrarPrestamos(false)}
            />

        </div>
    );
}

export default App;
