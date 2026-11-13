import React, { useState } from 'react';
import { UsersRound, BookOpen, BarChart3 } from 'lucide-react';
import Socios from '../components/Socios.jsx';
import Libro from '../components/Libros.jsx';
import Pagos from '../components/Pagos.jsx';
import { Usuario } from '../components/Usuario.jsx';
import Devoluciones from '../components/Devoluciones.jsx';
import Prestamos from '../components/Prestamos.jsx';
import Autores from '../components/Autores.jsx';
import Reportes from '../components/Reportes.jsx';
import CitaDelDia from '../components/common/CitaDelDia.jsx';

function Dashboard({ usuarioActual, onCerrarSesion }) {

    const [mostrarSocios, setMostrarSocios] = useState(false);
    const [mostrarLibros, setMostrarLibros] = useState(false);
    const [mostrarAutores, setMostrarAutores] = useState(false);
    const [mostrarPagos, setMostrarPagos] = useState(false);
    const [mostrarUsuario, setMostrarUsuario] = useState(false);
    const [mostrarDevoluciones, setMostrarDevoluciones] = useState(false);
    const [mostrarPrestamos, setMostrarPrestamos] = useState(false);
    const [mostrarReportes, setMostrarReportes] = useState(false);

    const esAdmin = usuarioActual?.rol === "ADMIN";

    return (
        <div className="container-biblioteca">

            {/* TITULO */}
            <div className="seccion-titulo">
                <h1 className="nombre-biblioteca">
                    Hola {usuarioActual?.nombre_completo || usuarioActual?.nombre_usuario}, bienvenido a la Biblioteca
                </h1>

                <p className="subtitulo-biblioteca">
                    Un espacio para aprender, descubrir y compartir historias.{" "}
                    <span className="badge bg-light text-dark ms-2">
                        Rol: {usuarioActual?.rol || "BIBLIOTECARIO"}
                    </span>
                </p>
            </div>

            {/* CITA DEL DIA */}
            <CitaDelDia />

            {/* TITULO DE SECCIONES */}
            <div className="titulo-secciones">
                <h2>Panel de gestión</h2>
                <p>Seleccioná una sección para comenzar a trabajar.</p>
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

                <button className="btn-gestion" onClick={() => setMostrarAutores(true)}>
                    Autores
                </button>

                <button className="btn-gestion" onClick={() => setMostrarPagos(true)}>
                    Pagos
                </button>

                {esAdmin && (
                    <button className="btn-gestion" onClick={() => setMostrarUsuario(true)}>
                        Usuarios
                    </button>
                )}

                <button className="btn-gestion" onClick={() => setMostrarDevoluciones(true)}>
                    Devoluciones
                </button>

                <button className="btn-gestion" onClick={() => setMostrarPrestamos(true)}>
                    Préstamos
                </button>

                <button className="btn-gestion" onClick={() => setMostrarReportes(true)}>
                    <BarChart3 />
                    Reportes
                </button>

            </div>

            {/* CERRAR SESION */}
            <div className="acciones-finales">
                <button
                    className="btn-cerrar"
                    onClick={onCerrarSesion}
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
                <Libro cerrar={() => setMostrarLibros(false)} esAdmin={esAdmin} />
            )}

            {mostrarAutores && (
                <Autores cerrar={() => setMostrarAutores(false)} esAdmin={esAdmin} />
            )}

            {mostrarPagos && (
                <Pagos cerrar={() => setMostrarPagos(false)} />
            )}

            {esAdmin && mostrarUsuario && (
                <Usuario cerrar={() => setMostrarUsuario(false)} />
            )}

            {mostrarDevoluciones && (
                <Devoluciones cerrar={() => setMostrarDevoluciones(false)} />
            )}

            <Prestamos
                mostrar={mostrarPrestamos}
                cerrar={() => setMostrarPrestamos(false)}
            />

            {mostrarReportes && (
                <Reportes cerrar={() => setMostrarReportes(false)} />
            )}

        </div>
    );
}

export default Dashboard;

