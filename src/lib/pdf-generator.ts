
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
    const doc = new jsPDF('p', 'pt'); // Using points for finer control
    const primaryColor = [21, 99, 145];
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let startY = 0;

    const margin = 40;

    // --- HEADER ---
    const drawHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 70, 'F');
      
      const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
      try {
         doc.addImage(logoUrl, 'JPEG', margin, 18, 35, 35);
      } catch (e) {
        console.error("Could not add logo to PDF:", e);
      }
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Statement of Account', pageWidth - margin, 38, { align: 'right' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const planText = user.plan ? `Plan: ${user.plan.name} (${user.clientType || 'N/A'})` : 'No Active Plan';
      doc.text(planText, pageWidth - margin, 55, { align: 'right' });
    };

    // --- FOOTER ---
    const drawFooter = (pageNumber: number) => {
      doc.setLineWidth(0.5);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);
      
      doc.setFontSize(8);
      
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('River Philippines', margin, pageHeight - 38);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('| Turn Essential Needs Into Automatic Experience.', margin + 70, pageHeight - 38);

      const contactInfo = 'customers@riverph.com | www.riverph.com';
      doc.text(contactInfo, margin, pageHeight - 28);
      
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 28, { align: 'right' });
    };
    
    drawHeader();
    startY = 100;

    // --- BILLING & DATE INFO ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('BILL TO:', margin, startY);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(user.businessName || 'N/A', margin, startY + 12);
    doc.text(user.address || 'No address provided', margin, startY + 22);
    
    const now = new Date();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('STATEMENT DATE:', pageWidth / 2, startY);
    doc.text('BILLING PERIOD:', pageWidth / 2, startY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(format(now, 'PP'), (pageWidth / 2) + 85, startY);
    doc.text(format(startOfMonth(now), 'MMMM yyyy'), (pageWidth / 2) + 85, startY + 12);
    
    startY += 50;

    // --- RENDER TABLES ---
    const renderTable = (title: string, head: any[], body: any[][], finalY: number) => {
        let tableFinalY = finalY;
        if (body.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(title, margin, tableFinalY - 10);

            doc.autoTable({
                head: head,
                body: body,
                startY: tableFinalY,
                theme: 'striped',
                headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, cellPadding: 4 },
                bodyStyles: { fontSize: 8, cellPadding: 4 },
                margin: { left: margin, right: margin },
            });
            tableFinalY = (doc as any).lastAutoTable.finalY;
        }
        return tableFinalY;
    };
    
    let lastY = startY;

    // --- Equipment Details ---
     if (user.customPlanDetails) {
        const { gallonQuantity, dispenserQuantity, litersPerMonth } = user.customPlanDetails;
        let equipmentBody: string[][] = [];
        if(litersPerMonth > 0) equipmentBody.push(['Purchased Liters', `${litersPerMonth.toLocaleString()} L/month`]);
        if (gallonQuantity > 0) equipmentBody.push(['Containers', `${gallonQuantity}`]);
        if (dispenserQuantity > 0) equipmentBody.push(['Dispensers', `${dispenserQuantity}`]);
        
        if (equipmentBody.length > 0) {
            lastY = renderTable('Subscription Details', [], equipmentBody, lastY);
            lastY += 20;
        }
    }


    // --- Deliveries ---
    const totalContainers = deliveries.reduce((sum, d) => sum + d.volumeContainers, 0);
    const totalLitersConsumed = containerToLiter(totalContainers);
    const deliveryBody = deliveries.map(d => [d.id, format(new Date(d.date), 'PP'), d.volumeContainers, containerToLiter(d.volumeContainers).toFixed(1), d.status]);
    if (deliveries.length > 0) {
        const deliverySummaryRow = [
          { content: 'Total Consumption', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 242, 255] } },
          { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: totalLitersConsumed.toLocaleString(undefined, {maximumFractionDigits:1}), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: '', styles: {fillColor: [230, 242, 255] } },
        ];
        deliveryBody.push(deliverySummaryRow as any);
    }
    lastY = renderTable('Delivery History', [["Ref ID", "Date", "Containers", "Liters", "Status"]], deliveryBody, lastY);
    lastY += 20;
    
    // --- Sanitation & Compliance ---
    const hasSanitation = sanitationVisits && sanitationVisits.length > 0;
    const hasCompliance = complianceReports && complianceReports.length > 0;

    if (hasSanitation || hasCompliance) {
        lastY = renderTable('Sanitation Visits', 
          [["Scheduled Date", "Status", "Quality Officer"]],
          hasSanitation ? sanitationVisits.map(v => [format(new Date(v.scheduledDate), 'PP'), v.status, v.assignedTo]) : [['No visits for this period.']],
          lastY
        );
        lastY += 20;
        
        lastY = renderTable('Water Quality Compliance',
          [["Report Name", "Date", "Status"]],
          hasCompliance ? complianceReports.map(r => [r.name, r.date ? format((r.date as any).toDate(), 'PP') : 'N/A', r.status]) : [['No reports for this period.']],
          lastY
        );
        lastY += 20;
    }

    // --- FINANCIAL SUMMARY (AT THE END) ---
    if ((doc as any).lastAutoTable.finalY > pageHeight - 150) { 
      doc.addPage();
      drawHeader();
      lastY = 100;
    } else {
        lastY = (doc as any).lastAutoTable.finalY + 30;
    }

    const summaryX = pageWidth - margin - 220; 
    
    const subtotal = totalAmount;
    const tax = totalAmount * 0.12;
    const grandTotal = subtotal;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text('Subtotal:', summaryX, lastY);
    doc.text(`₱ ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY, { align: 'right' });
    
    doc.text('VAT (12%):', summaryX, lastY + 15);
    doc.text(`₱ ${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY + 15, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(summaryX - 5, lastY + 28, pageWidth - margin, lastY + 28);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Total Amount Due:', summaryX, lastY + 42);
    doc.text(`₱ ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY + 42, { align: 'right' });
    
    // Saved Liters for fixed plans
    if (user && !user.plan?.isConsumptionBased && user.customPlanDetails) {
        const totalMonthlyAllocation = (user.customPlanDetails.litersPerMonth || 0) + (user.customPlanDetails.bonusLiters || 0);
        const savedLiters = totalMonthlyAllocation - totalLitersConsumed;
        if (savedLiters > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`Saved Liters: ${savedLiters.toLocaleString(undefined, {maximumFractionDigits:0})} L will be added to next month's balance.`, summaryX, lastY + 62);
        }
    }

    drawFooter((doc as any).internal.getNumberOfPages());

    // --- SAVE PDF ---
    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${format(now, 'yyyy-MM')}.pdf`);
};

