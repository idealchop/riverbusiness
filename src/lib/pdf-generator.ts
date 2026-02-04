
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { AppUser, Delivery, SanitationVisit, ComplianceReport, Payment, Transaction } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Extend jsPDF with the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const containerToLiter = (containers: number) => (containers || 0) * 19.5;
const toSafeDate = (timestamp: any): Date => {
    if (!timestamp) return new Date(0);
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    return new Date(timestamp);
};

interface MonthlySOAProps {
    user: AppUser;
    deliveries: Delivery[];
    sanitationVisits: SanitationVisit[];
    complianceReports: ComplianceReport[];
    totalAmount?: number;
    billingPeriod: string;
    branches?: AppUser[] | null;
    transactions?: Transaction[] | null;
}

export const generateMonthlySOA = ({ user, deliveries, sanitationVisits, complianceReports, totalAmount, billingPeriod, branches, transactions }: MonthlySOAProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;

    const margin = 40;
    const isParent = user.accountType === 'Parent';

    // --- HEADER ---
    const drawHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 70, 'F');
      
      const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_White_HQ.png?alt=media&token=a850265f-12c0-4b9b-9447-dbfd37e722ff';
      try {
         doc.addImage(logoUrl, 'PNG', margin, 18, 35, 35);
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
    const drawPdfFooter = (pageNumber: number) => {
      doc.setLineWidth(0.5);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);
      
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('River PH - Automated, Connected, Convenient.', pageWidth / 2, pageHeight - 38, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('See how we’re shaping the future of the Philippines → riverph.com', pageWidth / 2, pageHeight - 28, { align: 'center' });
      
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 28, { align: 'right' });
    };
    
    drawHeader();
    
    // --- CLIENT INFO ---
    lastY = 100;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('FROM:', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text('River Tech Inc.', margin, lastY + 12);
    doc.text('Filinvest Axis Tower 1, Alabang', margin, lastY + 22);
    doc.text('customers@riverph.com', margin, lastY + 32);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TO:', pageWidth / 2, lastY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(user.businessName || 'N/A', pageWidth / 2, lastY + 12);
    doc.text(user.address || 'No address provided', pageWidth / 2, lastY + 22);
    doc.text(user.email || '', pageWidth / 2, lastY + 32);

    lastY += 50;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT DATE:', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'PP'), margin + 110, lastY);

    doc.setFont('helvetica', 'bold');
    doc.text('BILLING PERIOD:', margin, lastY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(billingPeriod, margin + 110, lastY + 15);

    lastY += 40;

    // --- RENDER TABLES ---
    const renderTable = (title: string, head: any[], body: any[][], finalY: number) => {
        let tableFinalY = finalY;
        if (body.length > 0) {
            if (tableFinalY > pageHeight - 150) { 
                doc.addPage();
                drawHeader();
                tableFinalY = 100;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(title, margin, tableFinalY);
            tableFinalY += 20;

            doc.autoTable({
                head: head,
                body: body,
                startY: tableFinalY,
                theme: 'striped',
                headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, cellPadding: 4 },
                bodyStyles: { fontSize: 8, cellPadding: 4 },
                margin: { left: margin, right: margin }
            });
            tableFinalY = (doc as any).lastAutoTable.finalY;
        }
        return tableFinalY;
    };
    
    // --- Parent Credits Logic ---
    if (isParent && transactions) {
        const totalCredits = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amountCredits, 0);
        const totalDebits = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + (t.amountCredits || 0), 0);
        const finalBalance = user.topUpBalanceCredits || 0;

        const summaryBody = [
            ['Total Credits (Top-Ups)', `P ${totalCredits.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
            ['Total Debits (Branch Consumption)', `P ${totalDebits.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
            ['Final Balance', `P ${finalBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`]
        ];
        
        lastY = renderTable('Financial Summary', [['Description', 'Amount']], summaryBody, lastY);
        lastY += 30;
    }

    // --- Deliveries ---
    const totalContainers = deliveries.reduce((sum, d) => sum + d.volumeContainers, 0);
    const totalLitersConsumed = containerToLiter(totalContainers);
    
    const branchMap = (branches || []).reduce((map, branch) => {
        if (branch.id) map[branch.id] = branch.businessName;
        return map;
    }, {} as Record<string, string>);

    const deliveryHead = isParent
        ? [["Ref ID", "Branch Name", "Date", "Qty (Cont.)", "Volume (L)", "Status"]]
        : [["Ref ID", "Date", "Qty (Cont.)", "Volume (L)", "Status"]];
    
    const deliveryBody = deliveries.map(d => {
        const row: (string | number)[] = [
            d.id,
            ...(isParent ? [branchMap[d.userId] || d.userId] : []),
            format(new Date(d.date), 'PP'),
            d.volumeContainers,
            (d.liters ?? containerToLiter(d.volumeContainers)).toFixed(1),
            d.status,
        ];
        return row;
    });

    if (deliveries.length > 0) {
        const summaryRow = [
          { content: 'Total Consumption', colSpan: isParent ? 3 : 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 242, 255] } },
          { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: totalLitersConsumed.toLocaleString(undefined, {maximumFractionDigits:1}), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: '', styles: {fillColor: [230, 242, 255] } },
          ...(isParent ? [{ content: '', styles: {fillColor: [230, 242, 255] } }] : []),
        ];
        deliveryBody.push(summaryRow as any);
    }

    lastY = renderTable('Water Refill Logs', deliveryHead, deliveryBody, lastY);
    lastY += 30;
    
    // --- Sanitation ---
    if (sanitationVisits.length > 0) {
        const sanitationBody = sanitationVisits.map(v => [format(new Date(v.scheduledDate), 'PP'), v.status, v.assignedTo]);
        lastY = renderTable('Sanitation Visits', [["Scheduled Date", "Status", "Quality Officer"]], sanitationBody, lastY);
        lastY += 30;
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for(let i=1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPdfFooter(i);
    }
    
    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`);
};

interface InvoicePDFProps {
    user: AppUser;
    invoice: Payment;
}

export const generateInvoicePDF = ({ user, invoice }: InvoicePDFProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;
    const margin = 40;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
    try {
        doc.addImage(logoUrl, 'PNG', pageWidth - margin - 35, margin - 10, 35, 35);
    } catch (e) {
        console.error("Could not add logo to PDF:", e);
    }

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Invoice', margin, margin + 20);

    lastY = margin + 50;
    
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

    doc.setFont('helvetica', 'bold');
    doc.text('River Tech Inc.', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text('Filinvest Axis Tower 1', margin, lastY + 12);
    doc.text('Alabang, Muntinlupa', margin, lastY + 24);
    doc.text('customers@riverph.com', margin, lastY + 36);

    doc.setFont('helvetica', 'bold');
    doc.text('Bill to', margin + 250, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(user.businessName || '', margin + 250, lastY + 12);
    doc.text(user.address || '', margin + 250, lastY + 24);
    doc.text(user.email, margin + 250, lastY + 36);

    lastY += 60;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`PHP ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} PAID`, margin, lastY);
    
    lastY += 30;

    const planName = user.plan?.name || 'N/A';
    const description = `${invoice.description}\nPlan: ${planName}`;

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

    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = 'Thank you for your business. For any questions, please contact us at customers@riverph.com.';
    const splitFooter = doc.splitTextToSize(footerText, pageWidth - (margin * 2));
    doc.text(splitFooter, margin, pageHeight - margin - 10);
    
    doc.save(`Invoice_${invoice.id}.pdf`);
};
