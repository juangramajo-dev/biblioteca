import React, { useMemo } from 'react';

const CITAS_LITERARIAS = [
    {
        texto: 'Para viajar lejos, no hay mejor nave que un libro.',
        autor: 'Emily Dickinson',
    },
    {
        texto: 'Siempre imaginé que el Paraíso sería algún tipo de biblioteca.',
        autor: 'Jorge Luis Borges',
    },
    {
        texto: 'Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.',
        autor: 'Franz Kafka',
    },
    {
        texto: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.',
        autor: 'Miguel de Cervantes',
    },
    {
        texto: 'Los libros son espejos: solo se ve en ellos lo que uno ya lleva dentro.',
        autor: 'Carlos Ruiz Zafón',
    },
    {
        texto: 'Un lector vive mil vidas antes de morir. Aquel que nunca lee vive solo una.',
        autor: 'George R. R. Martin',
    },
    {
        texto: 'La lectura es una conversación con los hombres más ilustres de los siglos pasados.',
        autor: 'René Descartes',
    },
    {
        texto: 'No existen más que dos reglas para escribir: tener algo que decir y decirlo.',
        autor: 'Oscar Wilde',
    },
    {
        texto: 'Leer es una forma de felicidad.',
        autor: 'Jorge Luis Borges',
    },
    {
        texto: 'La lectura hace al hombre completo; la conversación, ágil; y el escribir, preciso.',
        autor: 'Francis Bacon',
    },
    {
        texto: 'Aprender a leer es encender un fuego; cada sílaba que se deletrea es una chispa.',
        autor: 'Victor Hugo',
    },
    {
        texto: 'Quien no lee a los 70 años habrá vivido solo una vida; quien lee habrá vivido cinco mil años.',
        autor: 'Umberto Eco',
    },
    {
        texto: 'Los libros son las abejas que llevan el polen de una inteligencia a otra.',
        autor: 'James Russell Lowell',
    },
    {
        texto: 'Donde se queman libros, se acaba quemando también a las personas.',
        autor: 'Heinrich Heine',
    },
    {
        texto: 'Una habitación sin libros es como un cuerpo sin alma.',
        autor: 'Marco Tulio Cicerón',
    },
];

function obtenerIndiceDelDia(total) {
    const hoy = new Date();
    const claveFecha = `${hoy.getFullYear()}-${hoy.getMonth() + 1}-${hoy.getDate()}`;
    let hash = 0;
    for (let i = 0; i < claveFecha.length; i += 1) {
        hash = (hash * 31 + claveFecha.charCodeAt(i)) >>> 0;
    }
    return hash % total;
}

function CitaDelDia() {
    const cita = useMemo(() => {
        const indice = obtenerIndiceDelDia(CITAS_LITERARIAS.length);
        return CITAS_LITERARIAS[indice];
    }, []);

    return (
        <div className="seccion-centro">
            <div className="tarjeta-cita">
                <h5 className="cita-titulo">📖 Cita del día</h5>

                <p className="cita-texto">"{cita.texto}"</p>

                <footer className="cita-autor">— {cita.autor}</footer>
            </div>
        </div>
    );
}

export default CitaDelDia;

