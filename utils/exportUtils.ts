import { LogEntry } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autoTable
type jsPDFWithAutoTable = jsPDF & {
  autoTable: (options: any) => jsPDF;
};


export const exportToCSV = (logs: LogEntry[], filename: string) => {
    const headers = ['Timestamp', 'Type', 'Description', 'Company', 'User'];
    const rows = logs.map(log => [
        `"${new Date(log.timestamp).toLocaleString('pt-BR')}"`,
        `"${log.type}"`,
        `"${log.description.replace(/"/g, '""')}"`,
        `"${log.companyName || 'N/A'}"`,
        `"${log.userName || 'N/A'}"`,
    ]);

    const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    // Add BOM for Excel compatibility with UTF-8
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const exportToPDF = (logs: LogEntry[], filename: string) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    
    doc.autoTable({
        head: [['Timestamp', 'Tipo', 'Descrição', 'Empresa', 'Usuário']],
        body: logs.map(log => [
            new Date(log.timestamp).toLocaleString('pt-BR'),
            log.type,
            log.description,
            log.companyName || 'N/A',
            log.userName || 'N/A'
        ]),
        styles: {
            font: 'helvetica',
            fontSize: 8,
        },
        headStyles: {
            fillColor: [16, 24, 44], // #10182C
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251] // light gray
        },
        didDrawPage: (data) => {
            // Header
            doc.setFontSize(20);
            doc.setTextColor(40);
            doc.text('Relatório de Logs - TRIAD3', data.settings.margin.left, 15);

            // Footer
            const pageCount = (doc.internal as any).getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`${filename}.pdf`);
};