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

export const generateMonthlySOA = async ({ user, deliveries, sanitationVisits, complianceReports, billingPeriod, branches, transactions }: MonthlySOAProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
    const pageWidth = doc.internal.pageSize.width;
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

    // 1. High-Fidelity Header (Solid Blue Corner)
    doc.setFillColor(83, 142, 194);
    doc.rect(0, 0, pageWidth, 120, 'F');

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', margin, 35, 50, 50);
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('River Philippines', margin + 65, 55);

    doc.setFontSize(14);
    doc.text('Statement of Account', margin + 65, 78);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Plan: ${user.plan?.name || 'N/A'}`, margin + 65, 95);

    // 2. Stakeholder Details (Two Column Layout)
    let currentY = 160;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(83, 142, 194);
    doc.text('FROM:', margin, currentY);
    doc.text('TO:', pageWidth / 2 + 20, currentY);

    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('River Tech Inc.', margin, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text('SEC Reg #: 202406123456', margin, currentY + 27);
    doc.text('Filinvest Axis Tower 1, Alabang', margin, currentY + 39);
    doc.text('customers@riverph.com', margin, currentY + 51);

    doc.setFont('helvetica', 'bold');
    doc.text(user.businessName || 'N/A', pageWidth / 2 + 20, currentY + 15);
    doc.setFont('helvetica', 'normal');
    
    const address = user.address || 'No address provided';
    const addressLines = doc.splitTextToSize(address, pageWidth / 2 - 60);
    doc.text(addressLines, pageWidth / 2 + 20, currentY + 27);
    
    // Tightened vertical spacing for Client ID
    const nextY = currentY + 27 + (addressLines.length * 12);
    doc.text(`Client ID: ${user.clientId || 'N/A'}`, pageWidth / 2 + 20, nextY);
    doc.text(user.email || '', pageWidth / 2 + 20, nextY + 12);

    // 3. Metadata
    currentY = nextY + 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('STATEMENT DATE:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'MMM d, yyyy'), margin + 110, currentY);

    doc.setFont('helvetica', 'bold');
    doc.text('BILLING PERIOD:', margin, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(billingPeriod, margin + 110, currentY + 15);

    currentY += 40;

    const renderTable = (title: string, head: any[], body: any[][], startY: number, foot?: any[]) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(83, 142, 194);
        doc.text(title, margin, startY);
        
        autoTable(doc, {
            head: head,
            body: body,
            foot: foot,
            startY: startY + 10,
            theme: 'striped',
            headStyles: { fillColor: [83, 142, 194], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 8, cellPadding: 6 },
            margin: { left: margin, right: margin },
        });
        return (doc as any).lastAutoTable.finalY + 30;
    };

    // 1. Financial Summary (Parents only)
    if (isParent && transactions) {
        const totalCredits = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amountCredits, 0);
        const totalDebits = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + (t.amountCredits || 0), 0);
        const finalBalance = user.topUpBalanceCredits || 0;
        const summaryBody = [
            ['Total Credits (Top-Ups)', `P ${totalCredits.toLocaleString()}`],
            ['Total Debits (Branch Consumption)', `P ${totalDebits.toLocaleString()}`],
            ['Final Balance', `P ${finalBalance.toLocaleString()}`]
        ];
        currentY = renderTable('Financial Summary', [['Description', 'Amount']], summaryBody, currentY);
    }

    // 2. Equipment Summary
    if (user.customPlanDetails) {
        const eq = user.customPlanDetails;
        const equipmentBody = [];
        if (eq.gallonQuantity) equipmentBody.push(['5-Gallon Reusable Containers', eq.gallonQuantity, `P ${eq.gallonPrice || 0}`, eq.gallonPaymentType || 'Monthly', `P ${(eq.gallonPrice || 0).toLocaleString()}`]);
        if (eq.dispenserQuantity) equipmentBody.push(['Premium Hot & Cold Water Dispenser', eq.dispenserQuantity, `P ${eq.dispenserPrice || 0}`, eq.dispenserPaymentType || 'Monthly', `P ${(eq.dispenserPrice || 0).toLocaleString()}`]);
        if (eq.sanitationPrice) equipmentBody.push(['Professional Monthly Sanitation', '1', `P ${eq.sanitationPrice || 0}`, eq.sanitationPaymentType || 'Monthly', `P ${(eq.sanitationPrice || 0).toLocaleString()}`]);
        if (equipmentBody.length > 0) currentY = renderTable('Equipment & Services Summary', [['Service Item', 'Qty', 'Unit Price', 'Frequency', 'Subtotal']], equipmentBody, currentY);
    }

    // 3. Service Logs (Sanitation)
    if (sanitationVisits.length > 0) {
        const sanitationBody = sanitationVisits.map(v => [format(new Date(v.scheduledDate), 'PP'), v.status, v.assignedTo, getSanitationPassRate(v)]);
        currentY = renderTable('Office Sanitation Logs', [["Scheduled Date", "Status", "Quality Officer", "Score Rate"]], sanitationBody, currentY);
    }

    // 4. Compliance Reports
    if (complianceReports.length > 0) {
        const complianceBody = complianceReports.map(r => [r.name, r.date && typeof (r.date as any).toDate === 'function' ? format((r.date as any).toDate(), 'MMM yyyy') : 'N/A', r.status]);
        currentY = renderTable('Water Quality & Station Compliance', [["Report Name", "Valid Period", "Status"]], complianceBody, currentY);
    }

    // 5. Refill Logs (LAST)
    if (deliveries.length > 0) {
        let totalQty = 0; let totalLiters = 0; let totalAmount = 0;
        const branchMap = (branches || []).reduce((map, b) => ({ ...map, [b.id]: b.businessName }), {} as Record<string, string>);
        const deliveryHead = isParent ? [["Ref ID", "Date", "Branch", "Qty", "Price/Unit", "Volume", "Amount"]] : [["Ref ID", "Date", "Qty", "Price/Unit", "Volume", "Amount", "Status"]];
        const deliveryBody = deliveries.map(d => {
            const qty = d.volumeContainers || 0; 
            const liters = d.liters ?? containerToLiter(qty); 
            const deliveryAmount = d.amount ?? (liters * pricePerLiter);
            totalQty += qty; 
            totalLiters += liters; 
            totalAmount += deliveryAmount;
            return [
                d.id, 
                format(new Date(d.date), 'MMM d, yyyy'), 
                ...(isParent ? [branchMap[d.userId] || d.userId] : []), 
                qty, 
                `P ${pricePerContainer.toFixed(2)}`, 
                `${liters.toFixed(1)} L`, 
                `P ${deliveryAmount.toFixed(2)}`, 
                ...(isParent ? [] : [d.status])
            ];
        });
        
        // Use 'foot' parameter to ensure summary stays with the table
        const summaryFoot = [[
            { content: 'TOTAL CONSUMPTION', colSpan: isParent ? 3 : 2, styles: { fontStyle: 'bold', halign: 'right' } },
            { content: totalQty.toString(), styles: { fontStyle: 'bold' } },
            { content: '' },
            { content: `${totalLiters.toFixed(1)} L`, styles: { fontStyle: 'bold' } },
            { content: `P ${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, styles: { fontStyle: 'bold' } },
            ...(isParent ? [] : [{ content: '' }])
        ]];
        
        currentY = renderTable('Water Refill Logs', deliveryHead, deliveryBody, currentY, summaryFoot);
        
        const vatAmount = totalAmount * (12/112);
        doc.setFontSize(8); 
        doc.setFont('helvetica', 'italic'); 
        doc.setTextColor(150);
        doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}`, pageWidth - margin, (doc as any).lastAutoTable.finalY + 15, { align: 'right' });
    }

    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`);
};

interface InvoicePDFProps {
    user: AppUser;
    invoice: Payment;
}

export const generateInvoicePDF = async ({ user, invoice }: InvoicePDFProps) => {
    const doc = new jsPDF('p', 'pt');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 40;
    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_White_HQ.png?alt=media&token=a850265f-12c0-4b9b-9447-dbfd37e722ff';
    let logoBase64 = '';
    try { logoBase64 = await getBase64ImageFromURL(logoUrl); } catch (e) {}
    
    doc.setFillColor(83, 142, 194); 
    doc.rect(0, 0, pageWidth, 100, 'F');
    
    if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 30, 40, 40);
    
    doc.setFontSize(22); 
    doc.setFont('helvetica', 'bold'); 
    doc.setTextColor(255, 255, 255); 
    doc.text('River Tech Inc.', margin + 50, 55);
    doc.setFontSize(12); 
    doc.text('Invoice Receipt', margin + 50, 75);
    
    let lastY = 140; 
    const invoiceDate = typeof invoice.date === 'string' ? new Date(invoice.date) : (invoice.date as any).toDate();
    
    doc.setTextColor(0); 
    doc.setFontSize(10); 
    doc.setFont('helvetica', 'bold'); 
    doc.text('Invoice #:', margin, lastY); 
    doc.setFont('helvetica', 'normal'); 
    doc.text(invoice.id, margin + 80, lastY);
    
    doc.setFont('helvetica', 'bold'); 
    doc.text('Date:', margin, lastY + 15); 
    doc.setFont('helvetica', 'normal'); 
    doc.text(format(invoiceDate, 'MMMM d, yyyy'), margin + 80, lastY + 15);
    
    lastY += 50; 
    doc.setFont('helvetica', 'bold'); 
    doc.setTextColor(83, 142, 194); 
    doc.text('BILL TO:', margin, lastY); 
    doc.setFont('helvetica', 'normal'); 
    doc.setTextColor(0);
    
    doc.text(user.businessName || '', margin, lastY + 15); 
    doc.text(user.address || '', margin, lastY + 27, { maxWidth: pageWidth / 2 });
    doc.text(`Client ID: ${user.clientId || 'N/A'}`, margin, lastY + 39); 
    doc.text(user.email || '', margin, lastY + 51);
    
    lastY += 90;
    autoTable(doc, {
        startY: lastY,
        head: [["Description", "Qty", "Unit price", "Amount"]],
        body: [[invoice.description, 1, `P ${invoice.amount.toLocaleString()}`, `P ${invoice.amount.toLocaleString()}`]],
        theme: 'striped',
        headStyles: { fillColor: [83, 142, 194], textColor: 255, fontStyle: 'bold' },
        margin: { left: margin, right: margin },
    });
    
    const summaryX = pageWidth - margin - 200; 
    const vatIncluded = invoice.amount * (12/112); 
    lastY = (doc as any).lastAutoTable.finalY + 30;
    
    const totals = [
        ['Subtotal (VAT Included)', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
        ['VAT (12% Included)', `P ${vatIncluded.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
        ['Total Paid', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}`]
    ];
    
    doc.setFontSize(10);
    totals.forEach((total, index) => {
        doc.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal');
        doc.text(total[0], summaryX, lastY + (index * 18)); 
        doc.text(total[1], pageWidth - margin, lastY + (index * 18), { align: 'right'});
    });
    
    doc.save(`Invoice_${invoice.id}.pdf`);
};
