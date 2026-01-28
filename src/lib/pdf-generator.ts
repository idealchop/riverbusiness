

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { AppUser, Delivery, SanitationVisit, ComplianceReport, Payment } from '@/lib/types';
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
     doc.addImage(logoUrl, 'JPEG', 14, 5, 18, 18);
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Water Refill History', 36, 17, { align: 'left' });

  doc.setFontSize(10);
  doc.text('River Tech Inc.', pageWidth - 14, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.text('Turn Everyday Needs Into Automatic Experience With River', pageWidth - 14, 18, { align: 'right' });


  // 2. Add Personalized Greeting and Info
  let startY = 40;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  const greetingText = `Hi ${user.name}, thank you for being part of the River Business family. This document summarizes your delivery history, showcasing the convenience and quality you enjoy with our automated service.`;
  const splitGreeting = doc.splitTextToSize(greetingText, pageWidth - 28);
  doc.text(splitGreeting, 14, startY);
  
  startY += (splitGreeting.length * 5) + 10;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Company Information', 14, startY);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('River Tech Inc.', 14, startY + 6);
  doc.text('Filinvest Axis Tower 1 24th & 26th Flr, 304 Filinvest Ave, Alabang, Muntinlupa', 14, startY + 11);
  doc.text('www.riverph.com', 14, startY + 16);
  doc.text('customer@riverph.com', 14, startY + 21);
  

  // 3. Add Document Details
  const docDetailsY = startY + 33;
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
  const tableColumn = ["Ref ID", "Delivery Date", "Volume (Containers)", "Volume (Liters)", "Status", "Proof"];
  const tableRows: (string | number | object)[][] = [];

  deliveries.forEach(delivery => {
    const deliveryData = [
      delivery.id,
      format(new Date(delivery.date), 'PP'),
      delivery.volumeContainers,
      containerToLiter(delivery.volumeContainers),
      delivery.status,
      delivery.proofOfDeliveryUrl ? { content: 'See Delivery Proof', href: delivery.proofOfDeliveryUrl } : 'N/A'
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
        doc.text('River Tech Inc.: Turn Essential Needs Into Automatic Experience.', 14, pageHeight - 12);
        
        // Page Number
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
    }
  });


  // 5. Save PDF
  doc.save(`WaterRefillHistory_${user.businessName?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

interface MonthlySOAProps {
    user: AppUser;
    deliveries: Delivery[];
    sanitationVisits: SanitationVisit[];
    complianceReports: ComplianceReport[];
    totalAmount?: number;
    billingPeriod: string;
}

export const generateMonthlySOA = ({ user, deliveries, sanitationVisits, complianceReports, totalAmount, billingPeriod }: MonthlySOAProps) => {
    const doc = new jsPDF('p', 'pt'); // Using points for finer control
    const primaryColor = [21, 99, 145];
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;

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
      const planText = user.plan ? `Plan: ${user.plan.name}` : 'No Active Plan';
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
      doc.text('River Tech Inc.', margin, pageHeight - 38);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('| Turn Essential Needs Into Automatic Experience.', margin + 70, pageHeight - 38);

      const contactInfo = 'customers@riverph.com | www.riverph.com';
      doc.text(contactInfo, margin, pageHeight - 28);
      
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 28, { align: 'right' });
    };
    
    drawHeader();
    
    // --- FROM/TO & DATE INFO ---
    lastY = 100;
    const fromToY = lastY;

    // FROM (Company Info)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('FROM:', margin, fromToY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('River Tech Inc.', margin, fromToY + 12);
    doc.text('Filinvest Axis Tower 1, Alabang', margin, fromToY + 22);
    doc.text('customer@riverph.com', margin, fromToY + 32);

    // TO (Client Info)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TO:', pageWidth / 2, fromToY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(user.businessName || 'N/A', pageWidth / 2, fromToY + 12);
    doc.text(user.address || 'No address provided', pageWidth / 2, fromToY + 22);
    doc.text(user.email || '', pageWidth / 2, fromToY + 32);

    lastY = fromToY + 50;
    
    const now = new Date();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT DATE:', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(now, 'PP'), margin + 100, lastY);

    doc.setFont('helvetica', 'bold');
    doc.text('BILLING PERIOD:', margin, lastY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(billingPeriod, margin + 100, lastY + 15);

    lastY += 40;

    // --- RENDER TABLES ---
    const renderTable = (title: string, head: any[], body: any[][], finalY: number) => {
        let tableFinalY = finalY;
        if (body.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(title, margin, tableFinalY);
            tableFinalY += 15;

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
    
     // --- Equipment Details ---
     if (user.customPlanDetails) {
        const { gallonQuantity, dispenserQuantity, litersPerMonth, gallonPaymentType, dispenserPaymentType } = user.customPlanDetails;
        let equipmentBody: string[][] = [];
        if(litersPerMonth && litersPerMonth > 0) equipmentBody.push(['Purchased Liters', `${litersPerMonth.toLocaleString()} L/month`]);
        if (gallonQuantity && gallonQuantity > 0) equipmentBody.push(['Containers', `${gallonQuantity} (${gallonPaymentType})`]);
        if (dispenserQuantity && dispenserQuantity > 0) equipmentBody.push(['Dispensers', `${dispenserQuantity} (${dispenserPaymentType})`]);
        
        if (equipmentBody.length > 0) {
            lastY = renderTable('Subscription Details', [['Item', 'Details']], equipmentBody, lastY);
            lastY += 20;
        }
    }


    // --- Deliveries ---
    const totalContainers = deliveries.reduce((sum, d) => sum + d.volumeContainers, 0);
    const totalLitersConsumed = containerToLiter(totalContainers);
    const deliveryBody = deliveries.map(d => [
        d.id,
        format(new Date(d.date), 'PP'),
        d.volumeContainers,
        containerToLiter(d.volumeContainers).toFixed(1),
        d.status,
        d.proofOfDeliveryUrl ? { content: 'See Delivery Proof', href: d.proofOfDeliveryUrl } : 'N/A'
    ]);
    if (deliveries.length > 0) {
        const deliverySummaryRow = [
          { content: 'Total Consumption', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 242, 255] } },
          { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: totalLitersConsumed.toLocaleString(undefined, {maximumFractionDigits:1}), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: '', styles: {fillColor: [230, 242, 255] } },
          { content: '', styles: {fillColor: [230, 242, 255] } },
        ];
        deliveryBody.push(deliverySummaryRow as any);
    }
    lastY = renderTable('Delivery History', [["Ref ID", "Date", "Containers", "Liters", "Status", "Proof"]], deliveryBody, lastY);
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
    
    // Auto-paging for summary
    if (lastY > pageHeight - 150) { 
        doc.addPage();
        drawHeader();
        lastY = 100;
    }
    
    // --- FINANCIAL SUMMARY ---
    if (totalAmount && totalAmount > 0) {
        const summaryX = pageWidth - margin - 220; 
        
        const subtotal = totalAmount;
        const tax = totalAmount * 0.12;
        const grandTotal = subtotal;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text('Subtotal:', summaryX, lastY);
        doc.text(`P ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY, { align: 'right' });
        
        doc.text('VAT (12%):', summaryX, lastY + 15);
        doc.text(`P ${tax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY + 15, { align: 'right' });

        doc.setLineWidth(0.5);
        doc.line(summaryX - 5, lastY + 28, pageWidth - margin, lastY + 28);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Total Amount Due:', summaryX, lastY + 42);
        doc.text(`P ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY + 42, { align: 'right' });
        
        lastY += 62;
    }
    
    // Saved Liters for fixed plans
    if (user && !user.plan?.isConsumptionBased && user.customPlanDetails) {
        const totalMonthlyAllocation = (user.customPlanDetails.litersPerMonth || 0) + (user.customPlanDetails.bonusLiters || 0);
        const savedLiters = totalMonthlyAllocation - totalLitersConsumed;
        if (savedLiters > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`Saved Liters: ${savedLiters.toLocaleString(undefined, {maximumFractionDigits:0})} L will be added to next month's balance.`, pageWidth - margin, lastY, { align: 'right' });
        }
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for(let i=1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i);
    }
    
    // --- SAVE PDF ---
    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`);
};

interface InvoicePDFProps {
    user: AppUser;
    invoice: Payment;
}

export const generateInvoicePDF = ({ user, invoice }: InvoicePDFProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [21, 99, 145];
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;
    const margin = 40;

    // --- HEADER & LOGO ---
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.jpg?alt=media&token=e91345f6-0616-486a-845a-101514781446';
    try {
        doc.addImage(logoUrl, 'JPEG', pageWidth - margin - 35, margin - 10, 35, 35);
    } catch (e) {
        console.error("Could not add logo to PDF:", e);
    }

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Invoice', margin, margin + 20);

    lastY = margin + 50;
    
    // --- INVOICE DETAILS ---
    const invoiceDate = typeof invoice.date === 'string' ? new Date(invoice.date) : (invoice.date as any).toDate();
    const details = [
        ['Invoice number', invoice.id],
        ['Date of issue', format(invoiceDate, 'MMMM d, yyyy')],
        ['Date due', format(invoiceDate, 'MMMM d, yyyy')]
    ];
    doc.setFontSize(10);
    details.forEach((detail, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(detail[0], margin, lastY + (index * 15));
        doc.setFont('helvetica', 'normal');
        doc.text(detail[1], margin + 80, lastY + (index * 15));
    });

    lastY += (details.length * 15) + 20;

    // --- FROM / TO ---
    doc.setFont('helvetica', 'bold');
    doc.text('River Tech Inc.', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text('Filinvest Axis Tower 1', margin, lastY + 12);
    doc.text('Alabang, Muntinlupa', margin, lastY + 24);
    doc.text('customer@riverph.com', margin, lastY + 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Bill to', margin + 250, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(user.businessName || '', margin + 250, lastY + 12);
    doc.text(user.address || '', margin + 250, lastY + 24);
    doc.text(user.email, margin + 250, lastY + 36);

    lastY += 60;
    
    // --- PAID STATUS ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`PHP ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PAID`, margin, lastY);
    
    lastY += 30;

    // --- LINE ITEMS TABLE ---
    const planName = user.plan?.name || 'N/A';
    let litersText = '';
    if (user.plan?.isConsumptionBased) {
        let monthlyEquipmentCost = 0;
        if (user.customPlanDetails?.gallonPaymentType === 'Monthly') {
            monthlyEquipmentCost += (user.customPlanDetails?.gallonPrice || 0);
        }
        if (user.customPlanDetails?.dispenserPaymentType === 'Monthly') {
            monthlyEquipmentCost += (user.customPlanDetails?.dispenserPrice || 0);
        }
        
        const pricePerLiter = user.plan.price || 1; // Avoid division by zero
        const consumptionAmount = invoice.amount - monthlyEquipmentCost;
        const consumedLiters = consumptionAmount > 0 ? consumptionAmount / pricePerLiter : 0;
        litersText = `(${consumedLiters.toLocaleString(undefined, {maximumFractionDigits:1})} L consumed)`;
    } else {
        const monthlyLiters = user.customPlanDetails?.litersPerMonth?.toLocaleString();
        if (monthlyLiters) {
            litersText = `(${monthlyLiters} L/mo)`;
        }
    }
    
    const description = `${invoice.description}\nPlan: ${planName} ${litersText}`;

    doc.autoTable({
        startY: lastY,
        head: [["Description", "Qty", "Unit price", "Amount"]],
        body: [[
            description,
            1,
            `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        ]],
        theme: 'plain',
        headStyles: { fontStyle: 'bold', textColor: 120, fontSize: 10, cellPadding: { top: 0, bottom: 8 } },
        bodyStyles: { fontSize: 10, cellPadding: { top: 8, bottom: 8 } },
        margin: { left: margin, right: margin },
    });
    lastY = (doc as any).lastAutoTable.finalY;

    // --- TOTALS ---
    const summaryX = pageWidth - margin - 200;
    const totals = [
        ['Subtotal', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Total', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
    ];
    
    doc.setFontSize(10);
    totals.forEach((total, index) => {
        doc.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal');
        doc.text(total[0], summaryX, lastY + 20 + (index * 15));
        doc.text(total[1], pageWidth - margin, lastY + 20 + (index * 15), { align: 'right'});
    });
    
    lastY += (totals.length * 15) + 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Amount paid', summaryX, lastY);
    doc.text(`P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, pageWidth - margin, lastY, { align: 'right'});


    // --- FOOTER ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = 'Thank you for your business. If you have any questions, please contact us at customer@riverph.com.';
    const splitFooter = doc.splitTextToSize(footerText, pageWidth - (margin * 2));
    doc.text(splitFooter, margin, pageHeight - margin - 10);
    
    // --- SAVE PDF ---
    doc.save(`Invoice_${invoice.id}.pdf`);
};

