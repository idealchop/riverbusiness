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
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let lastY = 0;

    const margin = 40;
    const isParent = user.accountType === 'Parent';
    const pricePerLiter = user.plan?.price || 0;
    const pricePerContainer = pricePerLiter * LITER_RATIO;

    const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/River%20Mobile%2FLogo%2FRiverAI_Icon_Blue_HQ.png?alt=media&token=2d84c0cb-3515-4c4c-b62d-2b61ef75c35c';
    let logoBase64 = '';
    try {
        logoBase64 = await getBase64ImageFromURL(logoUrl);
    } catch (e) {
        console.warn("Could not pre-load logo for SOA:", e);
    }

    const drawHeader = () => {
      if (logoBase64) {
        try {
           doc.addImage(logoBase64, 'PNG', margin, 40, 50, 50);
        } catch (e) {
          console.error("Could not add logo to PDF:", e);
        }
      }
      
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('River Philippines', margin + 65, 55);

      doc.setTextColor(83, 142, 194);
      doc.setFontSize(14);
      doc.text('Statement of Account', margin + 65, 75);

      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const planText = user.plan ? `Plan: ${user.plan.name}` : 'No Active Plan';
      doc.text(planText, margin + 65, 92);
    };

    drawHeader();
    
    lastY = 150;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Client Details', margin, lastY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.text(`Business Name: ${user.businessName || 'N/A'}`, margin, lastY + 15);
    doc.text(`Client ID: ${user.clientId || 'N/A'}`, margin, lastY + 27);
    doc.text(`Address: ${user.address || 'No address provided'}`, margin, lastY + 39);
    doc.text(`Period: ${billingPeriod}`, margin, lastY + 51);

    lastY += 85;

    const renderTable = (title: string, head: any[], body: any[][], finalY: number) => {
        let tableFinalY = finalY;
        if (body.length > 0) {
            if (tableFinalY > pageHeight - 150) { 
                doc.addPage();
                drawHeader();
                tableFinalY = 150;
            }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(title, margin, tableFinalY);
            tableFinalY += 15;

            autoTable(doc, {
                head: head,
                body: body,
                startY: tableFinalY,
                theme: 'plain',
                headStyles: { fontStyle: 'bold', textColor: 0, fontSize: 9, cellPadding: { bottom: 8 } },
                bodyStyles: { fontSize: 8, cellPadding: 6 },
                margin: { left: margin, right: margin },
                didDrawPage: (data) => {
                    doc.setDrawColor(200);
                    doc.setLineWidth(0.5);
                    doc.line(margin, data.settings.startY + 10, pageWidth - margin, data.settings.startY + 10);
                }
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
        lastY += 40;
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
            lastY += 40;
        }
    }

    // 3. Sanitation Logs
    if (sanitationVisits.length > 0) {
        const sanitationBody = sanitationVisits.map(v => [
            format(new Date(v.scheduledDate), 'PP'), 
            v.status, 
            v.assignedTo,
            getSanitationPassRate(v)
        ]);
        lastY = renderTable('Office Sanitation Logs', [["Scheduled Date", "Status", "Quality Officer", "Score Rate"]], sanitationBody, lastY);
        lastY += 40;
    }

    // 4. Compliance Reports
    if (complianceReports.length > 0) {
        const complianceBody = complianceReports.map(r => [
            r.name,
            r.date && typeof (r.date as any).toDate === 'function' ? format((r.date as any).toDate(), 'MMM yyyy') : 'N/A',
            r.status
        ]);
        lastY = renderTable('Water Quality & Station Compliance', [["Report Name", "Valid Period", "Status"]], complianceBody, lastY);
        lastY += 40;
    }

    // 5. Water Refill Logs (MOVED TO LAST)
    let totalContainers = 0;
    let totalLitersConsumed = 0;
    let totalRefillAmount = 0;
    
    const branchMap = (branches || []).reduce((map, branch) => {
        if (branch.id) map[branch.id] = branch.businessName;
        return map;
    }, {} as Record<string, string>);

    const deliveryHead = isParent
        ? [["Date", "Tracking #", "Branch", "Qty", "Price/Unit", "Vol (L)", "Amount"]]
        : [["Date", "Tracking #", "Qty", "Price/Unit", "Vol (L)", "Amount", "Status"]];
    
    const deliveryBody = deliveries.map(d => {
        const containers = d.volumeContainers || 0;
        const liters = d.liters ?? containerToLiter(containers);
        const deliveryAmount = d.amount ?? (liters * pricePerLiter);
        
        totalContainers += containers;
        totalLitersConsumed += liters;
        totalRefillAmount += deliveryAmount;

        const row: (string | number)[] = [
            format(new Date(d.date), 'yyyy-MM-dd'),
            d.id,
            ...(isParent ? [branchMap[d.userId] || d.userId] : []),
            containers,
            `P${pricePerContainer.toFixed(2)}`,
            `${liters.toFixed(1)}L`,
            `P${deliveryAmount.toFixed(2)}`,
            ...(isParent ? [] : [d.status]),
        ];
        return row;
    });

    if (deliveries.length > 0) {
        const summaryRow = [
          { content: 'TOTAL CONSUMPTION', colSpan: isParent ? 3 : 2, styles: { fontStyle: 'bold', halign: 'left' } },
          { content: totalContainers.toLocaleString(), styles: { fontStyle: 'bold' } },
          { content: '' },
          { content: `${totalLitersConsumed.toLocaleString(undefined, {maximumFractionDigits:1})} L`, styles: { fontStyle: 'bold' } },
          { content: `P ${totalRefillAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, styles: { fontStyle: 'bold' } },
          ...(isParent ? [] : [{ content: '' }]),
        ];
        deliveryBody.push(summaryRow as any);
    }

    lastY = renderTable('Water Delivery History', deliveryHead, deliveryBody, lastY);
    
    // VAT transparency below the table
    const vatAmount = totalRefillAmount * (12/112);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(`VAT (12% Included): P ${vatAmount.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}`, pageWidth - margin, (doc as any).lastAutoTable.finalY + 20, { align: 'right' });
    
    doc.save(`SOA_${user.businessName?.replace(/\s/g, '_')}_${billingPeriod.replace(/\s/g, '-')}.pdf`);
};

interface InvoicePDFProps {
    user: AppUser;
    invoice: Payment;
}

export const generateInvoicePDF = async ({ user, invoice }: InvoicePDFProps) => {
    const doc = new jsPDF('p', 'pt');
    const primaryColor = [83, 142, 194]; // #538ec2
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
            doc.addImage(logoBase64, 'PNG', margin, 40, 40, 40);
        } catch (e) {
            console.error("Could not add logo to PDF:", e);
        }
    }

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('River Tech Inc.', margin + 55, 65);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Invoice Receipt', margin + 55, 82);

    lastY = 130;
    
    const invoiceDate = typeof invoice.date === 'string' ? new Date(invoice.date) : (invoice.date as any).toDate();
    
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
    doc.text('Bill To:', margin, lastY);
    doc.setFont('helvetica', 'normal');
    doc.text(user.businessName || '', margin, lastY + 12);
    doc.text(user.address || '', margin, lastY + 24);
    doc.text(user.email, margin, lastY + 36);

    lastY += 70;
    
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
        headStyles: { fontStyle: 'bold', textColor: 0, fontSize: 10, cellPadding: { bottom: 8 } },
        bodyStyles: { fontSize: 10, cellPadding: { top: 10, bottom: 10 } },
        margin: { left: margin, right: margin },
    });
    lastY = (doc as any).lastAutoTable.finalY;

    const summaryX = pageWidth - margin - 200;
    const vatIncluded = invoice.amount * (12/112);

    const totals = [
        ['Subtotal (VAT Included)', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['VAT (12% Included)', `P ${vatIncluded.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
        ['Total Paid', `P ${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`]
    ];
    
    doc.setFontSize(10);
    totals.forEach((total, index) => {
        doc.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal');
        doc.text(total[0], summaryX, lastY + 30 + (index * 18));
        doc.text(total[1], pageWidth - margin, lastY + 30 + (index * 18), { align: 'right'});
    });

    doc.save(`Invoice_${invoice.id}.pdf`);
};