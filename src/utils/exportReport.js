import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportarPDF({ titulo, subtitulo, headers, rows, fileName }) {
    const doc = new jsPDF({ orientation: headers.length > 5 ? 'landscape' : 'portrait' });

    doc.setFontSize(16);
    doc.text(titulo, 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const fecha = new Date().toLocaleString('es-AR');
    const lineaSubtitulo = subtitulo
        ? `${subtitulo}  |  Generado: ${fecha}`
        : `Biblioteca UTN  |  Generado: ${fecha}`;
    doc.text(lineaSubtitulo, 14, 25);

    autoTable(doc, {
        startY: 31,
        head: [headers],
        body: rows,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [39, 132, 93] },
    });

    doc.save(`${fileName}.pdf`);
}

export function exportarExcel({ sheetName, headers, rows, fileName }) {
    const hoja = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, sheetName.slice(0, 31));
    XLSX.writeFile(libro, `${fileName}.xlsx`);
}

