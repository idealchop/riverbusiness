
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { AppUser, Delivery, SanitationVisit, ComplianceReport } from '@/lib/types';
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
  doc.text('River Philippines', pageWidth / 2, startY + 6);
  doc.text('Filinvest Axis Tower 1 24th & 26th Flr, 304 Filinvest Ave', pageWidth / 2, startY + 11);
  doc.text('Alabang, Muntinlupa', pageWidth / 2, startY + 16);

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
        
        // Branding Message
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('River Philippines', 14, pageHeight - 15);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120);
        doc.text('| Turn Essential Needs Into Automatic Experience.', 45, pageHeight - 15);

        // Contact Info
        const contactInfo = 'customers@riverph.com | www.riverph.com';
        doc.text(contactInfo, 14, pageHeight - 10);
        
        // Page Number
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
  });


  // 5. Save PDF
  doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

interface MonthlySOAProps {
    user: AppUser;
    deliveries: Delivery[];
    sanitationVisits: SanitationVisit[];
    complianceReports: ComplianceReport[];
    totalAmount: number;
}

export const generateMonthlySOA = ({ user, deliveries, sanitationVisits, complianceReports, totalAmount }: MonthlySOAProps) => {
    const doc = new jsPDF();
    const primaryColor = [21, 99, 145];
    const accentColor = [240, 249, 255];
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let startY = 0; // We'll manage this dynamically

    // --- HEADER ---
    const drawHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
      try {
         doc.addImage(logoUrl, 'JPEG', 14, 8, 18, 18);
      } catch (e) {
        console.error("Could not add logo to PDF:", e);
      }
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Monthly Statement of Account', pageWidth - 14, 18, { align: 'right' });
    };

    // --- FOOTER ---
    const drawFooter = (pageNumber: number) => {
      doc.setLineWidth(0.2);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
      
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('River Philippines', 14, pageHeight - 15);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('| Turn Essential Needs Into Automatic Experience.', 45, pageHeight - 15);

      const contactInfo = 'customers@riverph.com | www.riverph.com';
      doc.text(contactInfo, 14, pageHeight - 10);
      
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    };
    
    drawHeader();
    startY = 40;

    // --- BILLING & DATE INFO ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Bill To:', 14, startY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(user.businessName || 'N/A', 14, startY + 5);
    doc.text(user.address || 'No address provided', 14, startY + 10);
    
    const now = new Date();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Statement Date:', pageWidth / 2, startY);
    doc.text('Billing Period:', pageWidth / 2, startY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(format(now, 'PP'), (pageWidth / 2) + 30, startY);
    doc.text(format(startOfMonth(now), 'MMMM yyyy'), (pageWidth / 2) + 30, startY + 5);
    
    startY += 25;

    // --- FINANCIAL SUMMARY ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Account Summary', 14, startY);
    startY += 6;

    const subtotal = totalAmount;
    const tax = totalAmount * 0.12;
    const grandTotal = subtotal; // VAT is not added to the total amount due

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(14, startY, pageWidth - 28, 28, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('Subtotal:', 18, startY + 7);
    doc.text(`₱ ${subtotal.toFixed(2)}`, pageWidth - 18, startY + 7, { align: 'right' });
    
    doc.text('VAT (12%):', 18, startY + 14);
    doc.text(`₱ ${tax.toFixed(2)}`, pageWidth - 18, startY + 14, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount Due:', 18, startY + 22);
    doc.text(`₱ ${grandTotal.toFixed(2)}`, pageWidth - 18, startY + 22, { align: 'right' });
    
    startY += 40;

    // --- DELIVERIES SECTION ---
    if (deliveries.length > 0) {
        doc.autoTable({
            head: [["Ref ID", "Date", "Containers", "Liters", "Status"]],
            body: deliveries.map(d => [
                d.id,
                format(new Date(d.date), 'PP'),
                d.volumeContainers,
                containerToLiter(d.volumeContainers),
                d.status
            ]),
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            didDrawPage: (data) => {
                drawHeader();
                drawFooter(data.pageNumber);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.text('Delivery History', 14, 35);
            }
        });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- SANITATION VISITS SECTION ---
    if (sanitationVisits.length > 0) {
        doc.autoTable({
            head: [["Scheduled Date", "Status", "Quality Officer"]],
            body: sanitationVisits.map(v => [
                format(new Date(v.scheduledDate), 'PP'),
                v.status,
                v.assignedTo
            ]),
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            didDrawPage: (data) => {
                drawHeader();
                drawFooter(data.pageNumber);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.text('Sanitation Visits', 14, 35);
            }
        });
        startY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- COMPLIANCE REPORTS SECTION ---
    if (complianceReports.length > 0) {
        doc.autoTable({
            head: [["Report Name", "Date", "Status"]],
            body: complianceReports.map(r => [
                r.name,
                r.date ? format((r.date as any).toDate(), 'PP') : 'N/A',
                r.status
            ]),
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: primaryColor },
            didDrawPage: (data) => {
                drawHeader();
                drawFooter(data.pageNumber);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.text('Compliance Reports', 14, 35);
            }
        });
    }

    // Draw footer on the last page
    drawFooter((doc as any).internal.getNumberOfPages());

    // --- SAVE PDF ---
    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(now, 'yyyy-MM')}.pdf`);
};
