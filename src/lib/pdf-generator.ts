
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
  
  // 1. Add Logo and Header
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
  
  try {
     doc.addImage(logoUrl, 'JPEG', 14, 12, 24, 24);
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Statement of Account', 105, 25, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date Issued: ${format(new Date(), 'PP')}`, 200, 35, { align: 'right' });


  // 2. Add Client and Company Info
  doc.setLineWidth(0.5);
  doc.line(14, 40, 200, 40);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.text(user.businessName || 'N/A', 14, 56);
  doc.text(user.name, 14, 62);
  doc.text(user.address || 'No address provided', 14, 68);
  doc.text(user.email, 14, 74);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('From:', 130, 50);

  doc.setFont('helvetica', 'normal');
  doc.text('River Business', 130, 56);
  doc.text('123 Waterway Drive, Aqua City', 130, 62);
  doc.text('contact@riverph.com', 130, 68);
  doc.line(14, 80, 200, 80);

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

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Account Summary', 14, 90);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Billing Period: ${period}`, 14, 96);
  doc.text(`Total Water Consumed:`, 14, 102);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalLiters.toLocaleString()} Liters (${totalContainers.toLocaleString()} containers)`, 55, 102);


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
    startY: 110,
    theme: 'striped',
    headStyles: {
        fillColor: [3, 105, 161] // A shade of blue
    },
    styles: {
        cellPadding: 2,
        fontSize: 9,
    },
  });

  // 5. Add Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('This is a computer-generated document. No signature is required.', 105, 285, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, 200, 290, { align: 'right' });
  }

  // 6. Save PDF
  doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
