import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { AppUser, Delivery, SanitationVisit, ComplianceReport, Transaction } from '@/lib/types';

const LITER_RATIO = 19.5;
const containerToLiter = (containers: number) => (containers || 0) * LITER_RATIO;

/**
 * Utility to convert an image URL to a Base64 Data URL.
 */
const getBase64ImageFromURL = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = (error) => {
      reject(error);
    };
    img.src = url;
  });
};

const getSanitationPassRate = (v: SanitationVisit) => {
    if (!v.dispenserReports || v.dispenserReports.length === 0) return 'N/A';
    let total = 0;
    let passed = 0;
    v.dispenserReports.forEach(r => {
        if (r.checklist) {
            total += r.checklist.length;
            passed += r.checklist.filter(item => item.checked).length;
        }
    });
    return total > 0 ? `${((passed / total) * 100).toFixed(0)}%` : 'N/A';
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

export const generateMonthlySOA = async ({ user, deliveries, sanitationVisits, complianceReports, totalAmount, billingPeriod, branches, transactions }: MonthlySOAProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;

    const margin = 40;
    const isParent = user.accountType === 'Parent';
    const pricePerLiter = user.plan?.price || 0;
    const pricePerContainer = pricePerLiter * LITER_RATIO;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_White_HQ.png?alt=media&token=a850265f-12c0-4b9b-9447-dbfd37e722ff';
    let logoBase64 = '';
    try {
        logoBase64 = await getBase64ImageFromURL(logoUrl);
    } catch (e) {
        console.warn("Could not pre-load logo for SOA:", e);
    }

    const drawHeader = () => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 95, 'F');
      
      if (logoBase64) {
        try {
           doc.addImage(logoBase64, 'PNG', margin, 22, 50, 50);
        } catch (e) {
          console.error("Could not add logo to PDF:", e);
        }
      }
      
      doc.setTextColor(255, 255, 255);
      
      // H1: River Philippines
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('River Philippines', margin + 65, 38);

      // H2: Statement of Account
      doc.setFontSize(14);
      doc.text('Statement of Account', margin + 65, 58);

      // H3: Plan Name
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const planText = user.plan ? `Plan: ${user.plan.name}` : 'No Active Plan';
      doc.text(planText, margin + 65, 75);
    };

    const drawPdfFooter = (pageNumber: number) => {
      doc.setLineWidth(0.5);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(margin, pageHeight - 60, pageWidth - margin, pageHeight - 60);
      
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('River PH - Automated, Connected, Convenient.', pageWidth / 2, pageHeight - 45, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text('See how we’re shaping the future of the Philippines → riverph.com', pageWidth / 2, pageHeight - 33, { align: 'center' });
      
      doc.setTextColor(150);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 33, { align: 'right' });
    };
    
    drawHeader();
    
    lastY = 130;
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

    lastY += 55;
    
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

    const renderTable = (title: string, head: any[], body: any[][], finalY: number) => {
        let tableFinalY = finalY;
        if (body.length > 0) {
            if (tableFinalY > pageHeight - 150) { 
                doc.addPage();
                drawHeader();
                tableFinalY = 120;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(title, margin, tableFinalY);
            tableFinalY += 20;

            autoTable(doc, {
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
    
    // 1. Financial Summary (Parent Only)
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

    // 2. Equipment & Services Summary
    if (user.customPlanDetails) {
        const eq = user.customPlanDetails;
        const equipmentBody = [];
        
        if (eq.gallonQuantity) {
            equipmentBody.push([
                '5-Gallon Reusable Containers',
                eq.gallonQuantity,
                `P ${eq.gallonPrice?.toLocaleString()}`,
                eq.gallonPaymentType || 'Monthly',
                `P ${(eq.gallonPrice || 0).toLocaleString()}`
            ]);
        }
        if (eq.dispenserQuantity) {
            equipmentBody.push([
                'Premium Hot & Cold Water Dispenser',
                eq.dispenserQuantity,
                `P ${eq.dispenserPrice?.toLocaleString()}`,
                eq.dispenserPaymentType || 'Monthly',
                `P ${(eq.dispenserPrice || 0).toLocaleString()}`
            ]);
        }
        if (eq.sanitationPrice) {
            equipmentBody.push([
                'Professional Monthly Sanitation Service',
                '1',
                `P ${eq.sanitationPrice?.toLocaleString()}`,
                eq.sanitationPaymentType || 'Monthly',
                `P ${(eq.sanitationPrice || 0).toLocaleString()}`
            ]);
        }

        if (equipmentBody.length > 0) {
            lastY = renderTable('Equipment & Services Summary', [['Service Item', 'Qty', 'Unit Price', 'Frequency', 'Subtotal']], equipmentBody, lastY);
            lastY += 30;
        }
    }

    // 3. Water Refill Logs
    let totalContainers = 0;
    let totalLitersConsumed = 0;
    let totalRefillAmount = 0;
    
    const branchMap = (branches || []).reduce((map, branch) => {
        if (branch.id) map[branch.id] = branch.businessName;
        return map;
    }, {} as Record<string, string>);

    const deliveryHead = isParent
        ? [["Ref ID", "Branch", "Date", "Qty", "Price/Unit", "Volume", "Amount"]]
        : [["Ref ID", "Date", "Qty", "Price/Unit", "Volume", "Amount", "Status"]];
    
    const deliveryBody = deliveries.map(d => {
        const containers = d.volumeContainers || 0;
        const liters = d.liters ?? containerToLiter(containers);
        const deliveryAmount = d.amount ?? (liters * pricePerLiter);
        
        totalContainers += containers;
        totalLitersConsumed += liters;
        totalRefillAmount += deliveryAmount;

        const row: (string | number)[] = [
            d.id,
            ...(isParent ? [branchMap[d.userId] || d.userId] : []),
            format(new Date(d.date), 'PP'),
            containers,
            `P${pricePerContainer.toFixed(2)}`,
            `${liters.toFixed(1)} L`,
            `P${deliveryAmount.toFixed(2)}`,
            ...(isParent ? [] : [d.status]),
        ];
        return row;
    });

    if (deliveries.length > 0) {
        const summaryRow = [
          { content: 'TOTAL CONSUMPTION', colSpan: isParent ? 3 : 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 242, 255] } },
          { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: '', styles: { fillColor: [230, 242, 255] } },
          { content: `${totalLitersConsumed.toLocaleString(undefined, {maximumFractionDigits:1})} L`, styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          { content: `P ${totalRefillAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, styles: { fontStyle: 'bold', fillColor: [230, 242, 255] } },
          ...(isParent ? [] : [{ content: '', styles: {fillColor: [230, 242, 255] } }]),
        ];
        deliveryBody.push(summaryRow as any);

        const vatAmount = totalRefillAmount * (12/112);
        const vatRow = [
            { content: 'VAT (12% Included)', colSpan: isParent ? 6 : 5, styles: { fontStyle: 'italic', halign: 'right', textColor: [100, 100, 100] } },
            { content: `P ${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
            ...(isParent ? [] : [{ content: '' }]),
        ];
        deliveryBody.push(vatRow as any);
    }

    lastY = renderTable('Water Refill Logs', deliveryHead, deliveryBody, lastY);
    lastY += 30;
    
    // 4. Sanitation Logs
    if (sanitationVisits.length > 0) {
        const sanitationBody = sanitationVisits.map(v => [
            format(new Date(v.scheduledDate), 'PP'), 
            v.status, 
            v.assignedTo,
            getSanitationPassRate(v)
        ]);
        lastY = renderTable('Office Sanitation Logs', [["Scheduled Date", "Status", "Quality Officer", "Score Rate"]], sanitationBody, lastY);
        lastY += 30;
    }

    // 5. Compliance Reports
    if (complianceReports.length > 0) {
        const complianceBody = complianceReports.map(r => [
            r.name,
            r.date && typeof (r.date as any).toDate === 'function' ? format((r.date as any).toDate(), 'MMM yyyy') : 'N/A',
            r.status
        ]);
        lastY = renderTable('Water Quality & Station Compliance', [["Report Name", "Valid Period", "Status"]], complianceBody, lastY);
        lastY += 30;
    }

    const totalPages = doc.internal.getNumberOfPages();
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

export const generateInvoicePDF = async ({ user, invoice }: InvoicePDFProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;
    const margin = 40;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
    let logoBase64 = '';
    try {
        logoBase64 = await getBase64ImageFromURL(logoUrl);
    } catch (e) {
        console.warn("Could not pre-load logo for Invoice:", e);
    }

    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', pageWidth - margin - 35, margin - 10, 35, 35);
        } catch (e) {
            console.error("Could not add logo to PDF:", e);
        }
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

    autoTable(doc, {
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
    const vatIncluded = invoice.amount * (12/112);

    const totals = [
        ['Subtotal (VAT Included)', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['VAT (12% Included)', `P ${vatIncluded.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
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
