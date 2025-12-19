
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
  const primaryColor = [21, 99, 145]; // A corporate blue, matches theme
  const accentColor = [240, 249, 255]; // A very light blue
  
  // 1. Add Logo and Header
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
  
  // Header background
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
  
  try {
     doc.addImage(logoUrl, 'JPEG', 14, 12, 20, 20);
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Statement of Account', doc.internal.pageSize.width - 14, 25, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Date Issued: ${format(new Date(), 'PP')}`, doc.internal.pageSize.width - 14, 32, { align: 'right' });


  // 2. Add Client and Company Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Bill To:', 14, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text(user.businessName || 'N/A', 14, 56);
  doc.text(user.name, 14, 62);
  doc.text(user.address || 'No address provided', 14, 68);
  doc.text(user.email, 14, 74);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 130, 50);

  doc.setFont('helvetica', 'normal');
  doc.text('River Business', 130, 56);
  doc.text('Filinvest Axis Tower 1, 24th & 26th Flr', 130, 62);
  doc.text('304 Filinvest Ave, Alabang, Muntinlupa', 130, 68);
  doc.text('customers@riverph.com', 130, 74);
  

  // 3. Add Summary
  let period = 'All Time';
  if (dateRange?.from) {
      period = format(dateRange.from, 'PP');
      if (dateRange.to) {
          period += ` to ${format(dateRange.to, 'PP')}`;
      }
  }

  const totalContainers = deliveries.reduce((sum, d) => sum + d.volumeContainers, 0);
  const totalLiters = containerToLiter(totalContainers);

  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(14, 85, doc.internal.pageSize.width - 28, 22, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Account Summary', 20, 92);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(`Billing Period: ${period}`, 20, 98);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Consumption:`, 20, 104);
  doc.text(`${totalLiters.toLocaleString()} Liters (${totalContainers.toLocaleString()} containers)`, 58, 104);


  // 4. Create Table
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

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 115,
    theme: 'striped',
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
  });

  // 5. Add Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.width;
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(14, 280, pageWidth - 14, 280);
    
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('River Business | customers@riverph.com', 14, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, 285, { align: 'right' });
  }

  // 6. Save PDF
  doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
