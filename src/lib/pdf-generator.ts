
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { AppUser, Delivery } from '@/lib/types';
import type { DateRange } from 'react-day-picker';

// Extend jsPDF with the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const containerToLiter = (containers: number) => (containers || 0) * 19.5;

export const generateSOA = (user: AppUser, deliveries: Delivery[], dateRange?: DateRange) => {
  const doc = new jsPDF();
  const primaryColor = [21, 99, 145]; // A corporate blue
  const accentColor = [240, 249, 255]; // A very light blue for backgrounds
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // 1. Add Logo and Header
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
  
  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  try {
     doc.addImage(logoUrl, 'JPEG', 14, 8, 18, 18);
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }
  
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Statement of Account', pageWidth - 14, 18, { align: 'right' });


  // 2. Add Client and Company Info
  let startY = 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Bill To:', 14, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(user.businessName || 'N/A', 14, startY + 6);
  doc.text(user.name, 14, startY + 11);
  doc.text(user.address || 'No address provided', 14, startY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('From:', pageWidth / 2, startY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('River Business', pageWidth / 2, startY + 6);
  doc.text('Filinvest Axis Tower 1 24th & 26th Flr', pageWidth / 2, startY + 11);
  doc.text('304 Filinvest Ave, Alabang, Muntinlupa', pageWidth / 2, startY + 16);

  // 3. Add Document Details
  const docDetailsY = startY + 28;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Date Issued:', 14, docDetailsY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(format(new Date(), 'PP'), 40, docDetailsY);

  let period = 'All Time';
  if (dateRange?.from) {
      period = format(dateRange.from, 'PP');
      if (dateRange.to) {
          period += ` to ${format(dateRange.to, 'PP')}`;
      }
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Period Covered:', 14, docDetailsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(period, 45, docDetailsY + 6);


  // 4. Create Table
  const tableStartY = docDetailsY + 15;
  const tableColumn = ["Ref ID", "Delivery Date", "Volume (Containers)", "Volume (Liters)", "Status"];
  const tableRows: (string | number)[][] = [];

  deliveries.forEach(delivery => {
    const deliveryData = [
      delivery.id,
      format(new Date(delivery.date), 'PP'),
      delivery.volumeContainers,
      containerToLiter(delivery.volumeContainers),
      delivery.status,
    ];
    tableRows.push(deliveryData);
  });

  const totalContainers = deliveries.reduce((sum, d) => sum + d.volumeContainers, 0);
  const totalLiters = containerToLiter(totalContainers);
  
  // Add a summary row to the table body
  const summaryRow = [
      { content: 'Total Consumption', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold' } },
      { content: totalLiters.toLocaleString(), styles: { fontStyle: 'bold' } },
      { content: '', styles: {} },
  ];
  tableRows.push(summaryRow as any);


  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: tableStartY,
    theme: 'grid',
    headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
    },
    styles: {
        cellPadding: 2.5,
        fontSize: 9,
    },
    alternateRowStyles: {
        fillColor: accentColor,
    },
    didDrawPage: (data) => {
        // Footer on every page
        doc.setLineWidth(0.2);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = 'River Business | customers@riverph.com | www.riverph.com';
        doc.text(footerText, 14, pageHeight - 15);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
    }
  });


  // 5. Save PDF
  doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
