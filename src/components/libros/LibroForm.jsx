import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import { validarAnio, validarTexto } from '../../utils/validators.js';

function LibroForm({ catalogos, libroEditando, onSuccess, onCancelar }) {
    const [isbn, setIsbn] = useState('');
    const [titulo, setTitulo] = useState('');
    const [anioPublicacion, setAnioPublicacion] = useState('');
    const [idEditorial, setIdEditorial] = useState('');
    const [idGenero, setIdGenero] = useState('');
    const [autoresIds, setAutoresIds] = useState([]);
    const [stockTotal, setStockTotal] = useState('1');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (libroEditando) {
            setIsbn(libroEditando.isbn || '');
            setTitulo(libroEditando.titulo || '');
            setAnioPublicacion(String(libroEditando.anio_publicacion || ''));
            setIdEditorial(String(libroEditando.id_editorial || ''));
            setIdGenero(String(libroEditando.id_genero || ''));
            setAutoresIds(libroEditando.autores_ids || []);
            setStockTotal(String(libroEditando.stock_total || 1));
        } else {
            setIsbn('');
            setTitulo('');
            setAnioPublicacion('');
            setIdEditorial('');
            setIdGenero('');
            setAutoresIds([]);
            setStockTotal('1');
        }
    }, [libroEditando]);

    const toggleAutor = (idAutor) => {
        setAutoresIds((prev) =>
            prev.includes(idAutor)
                ? prev.filter((id) => id !== idAutor)
                : [...prev, idAutor]
        );
    };

    const guardarLibro = async () => {
        const errorValidacion =
            validarTexto(isbn, 'ISBN', 5) ||
            validarTexto(titulo, 'Título', 2) ||
            validarAnio(anioPublicacion) ||
            (!idEditorial || !idGenero ? 'Seleccioná editorial y género.' : null) ||
            (autoresIds.length === 0 ? 'Seleccioná al menos un autor.' : null) ||
            (Number(stockTotal) < 1 ? 'El stock total debe ser al menos 1.' : null);

        if (errorValidacion) {
            alert(errorValidacion);
            return;
        }

        const payload = {
            isbn: isbn.trim(),
            titulo: titulo.trim(),
            anio_publicacion: Number(anioPublicacion),
            id_editorial: Number(idEditorial),
            id_genero: Number(idGenero),
            autores_ids: autoresIds,
            stock_total: Number(stockTotal) || 1,
        };

        setGuardando(true);
        try {
            if (libroEditando) {
                const actualizado = await apiRequest(`/libros/${libroEditando.id_libro}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                alert(`Libro "${actualizado.titulo}" actualizado correctamente.`);
            } else {
                const creado = await apiRequest('/libros', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                alert(`Libro "${creado.titulo}" agregado al catálogo.`);
            }
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
                {libroEditando ? `Modificar libro: ${libroEditando.titulo}` : 'Agregar nuevo libro'}
            </h5>

            <div className="row g-2 mb-3">
                <div className="col-md-5">
                    <label className="form-label small mb-1">ISBN</label>
                    <input
                        className="form-control"
                        placeholder="Ej: 978-950-07-1234-5"
                        value={isbn}
                        onChange={(e) => setIsbn(e.target.value)}
                    />
                </div>
                <div className="col-md-7">
                    <label className="form-label small mb-1">Título</label>
                    <input
                        className="form-control"
                        placeholder="Título de la obra"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                    />
                </div>
            </div>

            <div className="row g-2 mb-3">
                <div className="col-md-4">
                    <label className="form-label small mb-1">Año de publicación</label>
                    <input
                        type="number"
                        className="form-control"
                        placeholder="Ej: 2024"
                        value={anioPublicacion}
                        onChange={(e) => setAnioPublicacion(e.target.value)}
                    />
                </div>
                <div className="col-md-4">
                    <label className="form-label small mb-1">Editorial</label>
                    <select
                        className="form-select"
                        value={idEditorial}
                        onChange={(e) => setIdEditorial(e.target.value)}
                    >
                        <option value="">Seleccioná editorial...</option>
                        {catalogos.editoriales.map((ed) => (
                            <option key={ed.id_editorial} value={ed.id_editorial}>
                                {ed.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <label className="form-label small mb-1">Género</label>
                    <select
                        className="form-select"
                        value={idGenero}
                        onChange={(e) => setIdGenero(e.target.value)}
                    >
                        <option value="">Seleccioná género...</option>
                        {catalogos.generos.map((g) => (
                            <option key={g.id_genero} value={g.id_genero}>
                                {g.nombre}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="row g-2 mb-3">
                <div className="col-md-8">
                    <label className="form-label small mb-1">Autores (podés elegir uno o varios)</label>
                    <div className="border rounded p-2" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                        {catalogos.autores.map((a) => (
                            <div className="form-check" key={a.id_autor}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`autor-${a.id_autor}`}
                                    checked={autoresIds.includes(a.id_autor)}
                                    onChange={() => toggleAutor(a.id_autor)}
                                />
                                <label className="form-check-label" htmlFor={`autor-${a.id_autor}`}>
                                    {a.nombre} {a.apellido}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="col-md-4">
                    <label className="form-label small mb-1">Stock total</label>
                    <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={stockTotal}
                        onChange={(e) => setStockTotal(e.target.value)}
                    />
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
                {libroEditando && (
                    <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>
                        Cancelar edición
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={guardarLibro}
                    disabled={guardando}
                >
                    {guardando
                        ? 'Guardando...'
                        : libroEditando
                        ? 'Guardar cambios'
                        : 'Guardar libro'}
                </button>
            </div>
        </>
    );
}

export default LibroForm;

