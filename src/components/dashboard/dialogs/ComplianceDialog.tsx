'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { WaterStation, ComplianceReport, SanitationVisit } from '@/lib/types';
import { format, formatDistanceToNow, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  FileText, 
  Hourglass, 
  CheckCircle, 
  AlertTriangle, 
  Droplet, 
  Signature, 
  History, 
  Camera, 
  ChevronRight, 
  ClipboardCheck, 
  Microscope, 
  ShieldCheck,
  LayoutGrid,
  XCircle,
  CalendarDays,
  FlaskConical
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

type ComplianceCadence = 'monthly' | 'semi-annual' | 'annual';
type PeriodFilter = 'all' | ComplianceCadence;

type DisplayComplianceReport = ComplianceReport & {
  cadence: ComplianceCadence;
  periodKey: string;
  periodLabel: string;
  isDummy?: boolean;
};

function toReportDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function inferCadence(report: Pick<ComplianceReport, 'name' | 'reportType'>): ComplianceCadence {
  const text = `${report.reportType || ''} ${report.name || ''}`.toLowerCase();
  if (text.includes('annual') && !text.includes('semi')) return 'annual';
  if (text.includes('semi')) return 'semi-annual';
  return 'monthly';
}

function periodKeyFor(cadence: ComplianceCadence, date: Date): string {
  if (cadence === 'monthly') return `monthly-${format(date, 'yyyy-MM')}`;
  if (cadence === 'semi-annual') {
    const half = date.getMonth() < 6 ? 1 : 2;
    return `semi-${date.getFullYear()}-H${half}`;
  }
  return `annual-${date.getFullYear()}`;
}

function periodLabelFor(cadence: ComplianceCadence, date: Date): string {
  if (cadence === 'monthly') return format(date, 'MMMM yyyy');
  if (cadence === 'semi-annual') {
    const half = date.getMonth() < 6 ? 1 : 2;
    return half === 1 ? `H1 ${date.getFullYear()} · Jan–Jun` : `H2 ${date.getFullYear()} · Jul–Dec`;
  }
  return `Calendar year ${date.getFullYear()}`;
}

function shiftHalf(year: number, half: 1 | 2, stepsBack: number): { year: number; half: 1 | 2 } {
  const total = year * 2 + (half - 1) - stepsBack;
  return { year: Math.floor(total / 2), half: total % 2 === 0 ? 1 : 2 };
}

function buildDummyComplianceReports(now: Date): DisplayComplianceReport[] {
  const reports: DisplayComplianceReport[] = [];

  for (let i = 0; i < 12; i++) {
    const monthDate = subMonths(now, i);
    const issued = i === 0 ? subDays(now, 2) : new Date(monthDate.getFullYear(), monthDate.getMonth(), 8, 10, 24);
    reports.push({
      id: `dummy-monthly-${format(monthDate, 'yyyy-MM')}`,
      name: 'DOH Bacteriological Test (Monthly)',
      reportType: 'DOH Bacteriological Test (Monthly)',
      resultId: `BAC-${format(monthDate, 'yyyyMM')}-${1842 + i}`,
      date: issued,
      status: 'Passed',
      cadence: 'monthly',
      periodKey: periodKeyFor('monthly', monthDate),
      periodLabel: periodLabelFor('monthly', monthDate),
      isDummy: true,
    });
  }

  const currentHalf: 1 | 2 = now.getMonth() < 6 ? 1 : 2;
  for (let i = 0; i < 4; i++) {
    const { year, half } = shiftHalf(now.getFullYear(), currentHalf, i);
    const periodDate = new Date(year, half === 1 ? 0 : 6, 1);
    const issued =
      i === 0
        ? subDays(now, 5)
        : new Date(half === 1 ? year : year + 1, half === 1 ? 6 : 0, 4, 9, 0);
    reports.push({
      id: `dummy-semi-${year}-H${half}`,
      name: 'DOH Physico-Chemical Test (Semi-Annual)',
      reportType: 'DOH Bacteriological Test (Semi-Annual)',
      resultId: `PHY-${year}H${half}-${3104 + i}`,
      date: issued,
      status: 'Passed',
      cadence: 'semi-annual',
      periodKey: periodKeyFor('semi-annual', periodDate),
      periodLabel: periodLabelFor('semi-annual', periodDate),
      isDummy: true,
    });
  }

  for (let i = 0; i < 3; i++) {
    const year = now.getFullYear() - i;
    const periodDate = new Date(year, 0, 1);
    const issued = i === 0 ? subDays(now, 9) : new Date(year, 2, 14, 11, 0);
    reports.push({
      id: `dummy-annual-${year}`,
      name: 'DOH Annual Water Quality Certificate',
      reportType: 'Sanitary Permit',
      resultId: `ANL-${year}-${9011 + i}`,
      date: issued,
      status: 'Passed',
      cadence: 'annual',
      periodKey: periodKeyFor('annual', periodDate),
      periodLabel: periodLabelFor('annual', periodDate),
      isDummy: true,
    });
  }

  return reports;
}

function mergeComplianceReports(liveReports: ComplianceReport[] | null, now: Date): DisplayComplianceReport[] {
  const dummy = buildDummyComplianceReports(now);
  const byKey = new Map<string, DisplayComplianceReport>(dummy.map((report) => [report.periodKey, report]));

  (liveReports || []).forEach((report) => {
    const date = toReportDate(report.date) || now;
    const cadence = inferCadence(report);
    const key = periodKeyFor(cadence, date);
    byKey.set(key, {
      ...report,
      cadence,
      periodKey: key,
      periodLabel: periodLabelFor(cadence, date),
      isDummy: false,
    });
  });

  return Array.from(byKey.values()).sort((a, b) => {
    const timeA = toReportDate(a.date)?.getTime() || 0;
    const timeB = toReportDate(b.date)?.getTime() || 0;
    return timeB - timeA;
  });
}

const CADENCE_META: Record<ComplianceCadence, { label: string; blurb: string }> = {
  monthly: { label: 'Monthly', blurb: 'Bacteriological (coliform / E. coli)' },
  'semi-annual': { label: 'Semi-annual', blurb: 'Physico-chemical panel' },
  annual: { label: 'Annual', blurb: 'Water quality certificate' },
};

interface ComplianceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  waterStation: WaterStation | null;
  complianceReports: ComplianceReport[] | null;
  complianceLoading: boolean;
  sanitationVisits: SanitationVisit[] | null;
  sanitationLoading: boolean;
  onViewAttachment: (url: string | null) => void;
  initialTab?: 'compliance' | 'sanitation';
  initialVisitId?: string | null;
}

export function ComplianceDialog({
  isOpen,
  onOpenChange,
  waterStation,
  complianceReports,
  complianceLoading: _complianceLoading,
  sanitationVisits,
  sanitationLoading,
  onViewAttachment,
  initialTab = 'compliance',
  initialVisitId = null,
}: ComplianceDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('compliance');
  const [selectedSanitationVisit, setSelectedSanitationVisit] = useState<SanitationVisit | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [complianceCurrentPage, setComplianceCurrentPage] = useState(1);
  const COMPLIANCE_ITEMS_PER_PAGE = 6;
  const [sanitationCurrentPage, setSanitationCurrentPage] = useState(1);
  const SANITATION_ITEMS_PER_PAGE = 5;
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<DisplayComplianceReport | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialVisitId && sanitationVisits) {
        const visit = sanitationVisits.find(v => v.id === initialVisitId);
        if (visit) {
          setSelectedSanitationVisit(visit);
        }
      }
    } else {
        setSelectedSanitationVisit(null);
    }
  }, [isOpen, initialTab, initialVisitId, sanitationVisits]);

  const sanitationReportStats = useMemo(() => {
    if (!selectedSanitationVisit || !selectedSanitationVisit.dispenserReports) {
        return { passed: 0, total: 0, passRate: 0, overallStatus: '', statusColor: '' };
    }
    
    let totalItems = 0;
    let passedItems = 0;

    selectedSanitationVisit.dispenserReports.forEach(report => {
        if (report.checklist) {
            totalItems += report.checklist.length;
            passedItems += report.checklist.filter(item => item.checked).length;
        }
    });

    const passRate = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;

    let overallStatus = 'Failed';
    let statusColor = 'text-destructive';
    if (passRate === 100) {
        overallStatus = 'Perfect Score';
        statusColor = 'text-green-600';
    } else if (passRate >= 80) {
        overallStatus = 'Standard Passed';
        statusColor = 'text-green-600';
    } else if (passRate >= 60) {
        overallStatus = 'Action Recommended';
        statusColor = 'text-amber-500';
    }

    return { passed: passedItems, total: totalItems, passRate, overallStatus, statusColor };
  }, [selectedSanitationVisit]);

  const displayReports = useMemo(() => mergeComplianceReports(complianceReports, new Date()), [complianceReports]);

  const cadenceSummaries = useMemo(() => {
    return (['monthly', 'semi-annual', 'annual'] as ComplianceCadence[]).map((cadence) => {
      const latest = displayReports.find((report) => report.cadence === cadence);
      const issued = latest ? toReportDate(latest.date) : null;
      return { cadence, latest, issued };
    });
  }, [displayReports]);

  const filteredReports = useMemo(() => {
    if (periodFilter === 'all') return displayReports;
    return displayReports.filter((report) => report.cadence === periodFilter);
  }, [displayReports, periodFilter]);

  useEffect(() => {
    setComplianceCurrentPage(1);
  }, [periodFilter]);

  const totalCompliancePages = Math.ceil(filteredReports.length / COMPLIANCE_ITEMS_PER_PAGE);

  const paginatedComplianceReports = useMemo(() => {
    const startIndex = (complianceCurrentPage - 1) * COMPLIANCE_ITEMS_PER_PAGE;
    return filteredReports.slice(startIndex, startIndex + COMPLIANCE_ITEMS_PER_PAGE);
  }, [filteredReports, complianceCurrentPage]);

  const totalSanitationPages = Math.ceil((sanitationVisits?.length || 0) / SANITATION_ITEMS_PER_PAGE);

  const paginatedSanitationVisits = useMemo(() => {
    if (!sanitationVisits) return [];
    const startIndex = (sanitationCurrentPage - 1) * SANITATION_ITEMS_PER_PAGE;
    return [...sanitationVisits].sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).slice(startIndex, startIndex + SANITATION_ITEMS_PER_PAGE);
  }, [sanitationVisits, sanitationCurrentPage]);


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="rb-app !inset-0 !flex !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none bg-[#F5F5F7] p-0 shadow-none sm:!inset-auto sm:!left-1/2 sm:!top-1/2 sm:!h-auto sm:!max-h-[90vh] sm:!w-[calc(100%-2rem)] sm:!max-w-5xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-[28px] sm:shadow-2xl [&>button.absolute]:right-3 [&>button.absolute]:top-3 [&>button.absolute]:z-10 [&>button.absolute]:flex [&>button.absolute]:h-11 [&>button.absolute]:w-11 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white [&>button.absolute]:opacity-100 [&>button.absolute]:shadow-sm">
          <DialogHeader className="shrink-0 space-y-0 border-b border-black/5 bg-[#F5F5F7] px-4 pb-4 pr-16 pt-4 text-left sm:px-8 sm:pt-6">
            <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1A2C49] text-white">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-[22px] font-extrabold tracking-[-0.03em] text-[#0A0A0A] sm:text-[26px]">Quality</DialogTitle>
                  <DialogDescription className="mt-0.5 whitespace-normal break-words text-[14px] font-semibold leading-snug text-[#8A8A94]">
                    Water tests and sanitation for {waterStation?.name || 'your station'}.
                  </DialogDescription>
                </div>
            </div>
          </DialogHeader>
          
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex flex-col gap-4">
              <TabsList className="sticky top-0 z-10 grid h-12 w-full grid-cols-2 rounded-2xl border border-black/5 bg-white p-1 shadow-sm">
                <TabsTrigger value="compliance" className="h-10 rounded-xl text-[14px] font-bold data-[state=active]:bg-[#1A2C49] data-[state=active]:text-white data-[state=active]:shadow-none">Station reports</TabsTrigger>
                <TabsTrigger value="sanitation" className="h-10 rounded-xl text-[14px] font-bold data-[state=active]:bg-[#1A2C49] data-[state=active]:text-white data-[state=active]:shadow-none">Sanitation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="compliance" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {cadenceSummaries.map(({ cadence, latest, issued }) => (
                    <button
                      key={cadence}
                      type="button"
                      onClick={() => setPeriodFilter(cadence)}
                      className={cn(
                        "min-h-[44px] rounded-[20px] border p-4 text-left transition-all",
                        periodFilter === cadence ? "border-[#1A2C49] bg-white shadow-sm" : "border-transparent bg-white hover:border-[#E4E4E7]"
                      )}
                    >
                      <p className="text-[12px] font-bold text-[#8A8A94]">{CADENCE_META[cadence].label}</p>
                      <p className="mt-1 text-[16px] font-extrabold tracking-[-0.02em] text-[#0A0A0A]">{latest?.periodLabel || 'On cycle'}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">{CADENCE_META[cadence].blurb}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {latest?.status || 'Passed'}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400">
                          {issued ? `Updated ${formatDistanceToNow(issued, { addSuffix: true })}` : 'Live'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <Card className="overflow-hidden rounded-[24px] border-none bg-white shadow-sm">
                  <CardHeader className="flex flex-col gap-3 bg-white pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-[18px] font-extrabold tracking-[-0.02em]">Station reports</CardTitle>
                      <CardDescription className="text-[13px] font-semibold text-[#8A8A94]">Monthly, semi-annual, and annual DOH documents.</CardDescription>
                    </div>
                    <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
                      <SelectTrigger className="h-11 w-full rounded-2xl bg-[#F5F5F7] text-[14px] font-bold sm:w-[220px]">
                        <History className="mr-2 h-3.5 w-3.5" />
                        <SelectValue placeholder="Period Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All cadences</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="semi-annual">Semi-annual</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="hidden md:table">
                      <TableHeader className="bg-muted/10">
                        <TableRow>
                          <TableHead className="pl-6">Report Category</TableHead>
                          <TableHead>Valid Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right pr-6">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedComplianceReports.map((report) => {
                          const issued = toReportDate(report.date);
                          return (
                          <TableRow key={report.id} className="group hover:bg-muted/30 transition-colors cursor-default">
                            <TableCell className="pl-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary/5 transition-colors">
                                        <Microscope className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-sm text-slate-900 block">{report.name}</span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{CADENCE_META[report.cadence].label} · {report.resultId}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-500">
                                <p className="uppercase font-bold">{report.periodLabel}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{issued ? `Issued ${format(issued, 'MMM d, yyyy')}` : 'On file'}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                  'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border shadow-sm',
                                  report.status === 'Passed' && 'bg-green-50 text-green-700 border-green-200',
                                  report.status === 'Failed' && 'bg-red-50 text-red-700 border-red-200',
                                  report.status === 'Pending Review' && 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              )}>
                                {report.status === 'Passed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {report.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2 hover:bg-primary/5 hover:text-primary" onClick={() => {
                                if (report.reportUrl && report.reportUrl !== 'pending') onViewAttachment(report.reportUrl);
                                else setSelectedCertificate(report);
                              }}>
                                <Eye className="h-3.5 w-3.5" />
                                View Doc
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="space-y-3 p-3 md:hidden">
                      {paginatedComplianceReports.map(report => {
                        const issued = toReportDate(report.date);
                        return (
                        <div key={report.id} className="rounded-[20px] bg-[#F5F5F7] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[15px] font-extrabold leading-snug text-[#0A0A0A]">{report.name}</p>
                                <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">
                                  {report.periodLabel}{issued ? ` · ${format(issued, 'MMM d, yyyy')}` : ''}
                                </p>
                              </div>
                              <Badge variant="outline" className={cn(
                                  'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold',
                                  report.status === 'Passed' ? 'border-green-200 bg-green-50 text-green-700' : 'border-yellow-200 bg-yellow-50 text-yellow-700'
                              )}>{report.status}</Badge>
                            </div>
                            <Button variant="outline" className="mt-3 h-11 w-full rounded-full bg-white text-[14px] font-bold" onClick={() => {
                              if (report.reportUrl && report.reportUrl !== 'pending') onViewAttachment(report.reportUrl);
                              else setSelectedCertificate(report);
                            }}>
                              <Eye className="mr-2 h-4 w-4" /> View report
                            </Button>
                        </div>
                        );
                      })}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 border-t bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[13px] font-semibold text-[#8A8A94]">{filteredReports.length} documents</div>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Button variant="outline" className="h-11 flex-1 rounded-full text-[14px] font-bold sm:flex-none sm:px-5" onClick={() => setComplianceCurrentPage(p => Math.max(1, p - 1))} disabled={complianceCurrentPage === 1}>Previous</Button>
                          <span className="min-w-12 text-center text-[14px] font-bold text-[#0A0A0A]">{complianceCurrentPage} / {totalCompliancePages || 1}</span>
                          <Button variant="outline" className="h-11 flex-1 rounded-full text-[14px] font-bold sm:flex-none sm:px-5" onClick={() => setComplianceCurrentPage(p => Math.min(totalCompliancePages, p + 1))} disabled={complianceCurrentPage === totalCompliancePages || totalCompliancePages === 0}>Next</Button>
                      </div>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="sanitation" className="mt-0 space-y-6">
                <Card className="overflow-hidden rounded-[24px] border-none bg-white shadow-sm">
                  <CardHeader className="bg-white">
                    <CardTitle className="text-[18px] font-extrabold tracking-[-0.02em]">Sanitation visits</CardTitle>
                    <CardDescription className="text-[13px] font-semibold text-[#8A8A94]">Monthly visits for your dispensers.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table className="hidden md:table">
                      <TableHeader className="bg-muted/10">
                        <TableRow>
                          <TableHead className="pl-6">Scheduled Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Quality Officer</TableHead>
                          <TableHead className="text-right pr-6">Management</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sanitationLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-xs font-bold uppercase tracking-widest opacity-40">Loading visit history...</TableCell>
                          </TableRow>
                        ) : paginatedSanitationVisits.map((visit) => (
                          <TableRow key={visit.id} className="group hover:bg-muted/30 transition-colors">
                            <TableCell className="pl-6 py-4 font-bold text-sm">{format(new Date(visit.scheduledDate), 'MMMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                  "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border shadow-sm",
                                  visit.status === 'Completed' ? "bg-green-50 text-green-700 border-green-200" :
                                  visit.status === 'Scheduled' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200"
                              )}>
                                {visit.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-500 uppercase tracking-tight">{visit.assignedTo}</TableCell>
                            <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2 hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => setSelectedSanitationVisit(visit)}>
                                        <FileText className="h-3.5 w-3.5" />
                                        View Report
                                    </Button>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                                </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="space-y-3 p-3 md:hidden">
                      {sanitationLoading ? (
                        <p className="py-10 text-center text-[14px] font-semibold text-[#8A8A94]">Loading visits…</p>
                      ) : paginatedSanitationVisits.map(visit => (
                        <button key={visit.id} type="button" className="w-full rounded-[20px] bg-[#F5F5F7] p-4 text-left" onClick={() => setSelectedSanitationVisit(visit)}>
                              <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                      <p className="text-[15px] font-extrabold text-[#0A0A0A]">{format(new Date(visit.scheduledDate), 'MMM d, yyyy')}</p>
                                      <p className="mt-1 text-[13px] font-semibold text-[#8A8A94]">{visit.assignedTo}</p>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                      "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold",
                                      visit.status === 'Completed' ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"
                                  )}>{visit.status}</Badge>
                              </div>
                              <span className="mt-3 flex h-11 w-full items-center justify-center rounded-full bg-white text-[14px] font-bold text-[#0A0A0A]">
                                  View report
                              </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 border-t bg-white py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[13px] font-semibold text-[#8A8A94]">{sanitationVisits?.length || 0} visits</div>
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Button variant="outline" className="h-11 flex-1 rounded-full text-[14px] font-bold sm:flex-none sm:px-5" onClick={() => setSanitationCurrentPage(p => Math.max(1, p - 1))} disabled={sanitationCurrentPage === 1}>Previous</Button>
                          <span className="min-w-12 text-center text-[14px] font-bold text-[#0A0A0A]">{sanitationCurrentPage} / {totalSanitationPages || 1}</span>
                          <Button variant="outline" className="h-11 flex-1 rounded-full text-[14px] font-bold sm:flex-none sm:px-5" onClick={() => setSanitationCurrentPage(p => Math.min(totalSanitationPages, p + 1))} disabled={sanitationCurrentPage === totalSanitationPages || totalSanitationPages === 0}>Next</Button>
                      </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="shrink-0 border-t border-black/5 bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-8">
            <DialogClose asChild>
                <Button variant="outline" className="h-12 w-full rounded-full text-[15px] font-bold sm:ml-auto sm:w-auto sm:px-8">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="rb-app !left-0 !top-0 !flex !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-none bg-white p-0 sm:!left-1/2 sm:!top-1/2 sm:!h-auto sm:!max-h-[90vh] sm:!w-[calc(100%-2rem)] sm:!max-w-lg sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-[28px] [&>button.absolute]:right-3 [&>button.absolute]:top-3 [&>button.absolute]:flex [&>button.absolute]:h-11 [&>button.absolute]:w-11 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-[#F5F5F7] [&>button.absolute]:opacity-100">
          <DialogHeader className="space-y-0 px-5 pb-2 pr-16 pt-5 text-left">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1A2C49] text-white">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-[18px] font-extrabold leading-snug tracking-[-0.02em]">{selectedCertificate?.name}</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px] font-semibold text-[#8A8A94]">
                  {selectedCertificate?.periodLabel} · {selectedCertificate?.resultId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-green-50 border border-green-100 px-4 py-3">
              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                <CheckCircle className="h-4 w-4" />
                Certified Passed
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                {selectedCertificate ? CADENCE_META[selectedCertificate.cadence].label : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(selectedCertificate?.cadence === 'monthly'
                ? [
                    ['Total coliform', 'Absent / 100 mL'],
                    ['E. coli', 'Absent / 100 mL'],
                    ['HPC', '< 500 CFU/mL'],
                    ['Free chlorine', '0.3–0.5 mg/L'],
                  ]
                : selectedCertificate?.cadence === 'semi-annual'
                ? [
                    ['pH', '7.1 – 7.4'],
                    ['TDS', '118 mg/L'],
                    ['Turbidity', '0.21 NTU'],
                    ['Nitrate', '1.4 mg/L'],
                  ]
                : [
                    ['DOH certificate', 'Valid'],
                    ['Sanitary permit', 'Current'],
                    ['Source class', 'Refilling station'],
                    ['Next audit', 'On annual cycle'],
                  ]
              ).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="font-bold text-slate-900 mt-1">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Issued {selectedCertificate && toReportDate(selectedCertificate.date) ? format(toReportDate(selectedCertificate.date) as Date, 'MMMM d, yyyy') : 'on file'} for {waterStation?.name || 'assigned station'}.
            </p>
          </div>
          <DialogFooter className="px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-0">
            <DialogClose asChild>
              <Button variant="outline" className="h-12 w-full rounded-full text-[15px] font-bold">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Individual Report Detail View */}
      <Dialog open={!!selectedSanitationVisit} onOpenChange={() => setSelectedSanitationVisit(null)}>
        <DialogContent className="rb-app !left-0 !top-0 !flex !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none bg-[#F5F5F7] p-0 sm:!left-1/2 sm:!top-1/2 sm:!h-auto sm:!max-h-[90vh] sm:!w-[calc(100%-2rem)] sm:!max-w-4xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:rounded-[28px] [&>button.absolute]:right-3 [&>button.absolute]:top-3 [&>button.absolute]:flex [&>button.absolute]:h-11 [&>button.absolute]:w-11 [&>button.absolute]:items-center [&>button.absolute]:justify-center [&>button.absolute]:rounded-full [&>button.absolute]:bg-white [&>button.absolute]:opacity-100">
            <DialogHeader className="shrink-0 space-y-0 border-b border-black/5 bg-[#F5F5F7] px-4 pb-4 pr-16 pt-4 text-left sm:px-8 sm:pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1A2C49] text-white">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-[20px] font-extrabold tracking-[-0.03em] sm:text-[24px]">Sanitation report</DialogTitle>
                            <DialogDescription className="mt-0.5 text-[13px] font-semibold text-[#8A8A94]">
                                {selectedSanitationVisit ? format(new Date(selectedSanitationVisit.scheduledDate), 'MMMM d, yyyy') : ''}
                            </DialogDescription>
                        </div>
                    </div>
                    {selectedSanitationVisit?.status === 'Completed' && (
                        <Badge className="mt-1 shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[12px] font-bold text-green-700">
                            Done
                        </Badge>
                    )}
                </div>
            </DialogHeader>

             <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F5F7] px-4 sm:px-8">
              <div className="mx-auto max-w-3xl space-y-5 py-4 sm:space-y-8 sm:py-8">
                  
                  {/* Results Hero Section */}
                  {selectedSanitationVisit?.status === 'Completed' ? (
                      <Card className="overflow-hidden rounded-[24px] border-none bg-white shadow-sm">
                          <CardContent className="p-5 sm:p-8">
                              <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8">
                                  <div className="space-y-4">
                                      <div className="space-y-1">
                                          <Label className="text-[13px] font-semibold text-[#8A8A94]">Quality assessment</Label>
                                          <p className={cn("text-[32px] font-extrabold leading-none tracking-[-0.03em] sm:text-4xl", sanitationReportStats.statusColor)}>
                                              {sanitationReportStats.overallStatus}
                                          </p>
                                      </div>
                                      <p className="text-sm font-bold text-slate-600 leading-relaxed">
                                          Our officer has verified <span className="text-slate-900">{sanitationReportStats.passed} of {sanitationReportStats.total}</span> compliance checkpoints for your office hydration infrastructure.
                                      </p>
                                      <div className="flex items-center gap-4 pt-2">
                                          <div className="h-10 w-px bg-slate-100" />
                                          <div>
                                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Officer</p>
                                              <p className="text-sm font-black text-slate-900">{selectedSanitationVisit.assignedTo}</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-inner relative overflow-hidden">
                                      <div className="relative z-10 text-center">
                                          <p className="text-5xl font-black tracking-tighter text-slate-900 mb-1">{sanitationReportStats.passRate.toFixed(0)}<span className="text-2xl">%</span></p>
                                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Intelligence Score</p>
                                      </div>
                                      <Progress value={sanitationReportStats.passRate} className="absolute bottom-0 left-0 right-0 h-1.5 rounded-none bg-slate-200" />
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  ) : (
                      <Card className="border-2 border-dashed rounded-3xl bg-white/50">
                          <CardContent className="py-16 flex flex-col items-center justify-center text-center gap-4">
                              <div className="p-4 rounded-full bg-slate-100 animate-pulse">
                                <Hourglass className="h-10 w-10 text-slate-400" />
                              </div>
                              <div className="space-y-2">
                                  <p className="text-xl font-black text-slate-900 uppercase tracking-tight">Visit Pending Execution</p>
                                  <p className="text-sm font-bold text-slate-400 max-w-sm">
                                      Detailed analytics and multi-point checklist results will be automatically populated once our quality officer completes the sanitation.
                                  </p>
                              </div>
                          </CardContent>
                      </Card>
                  )}

                  {/* Proof Photos Gallery */}
                  {selectedSanitationVisit?.proofUrls && selectedSanitationVisit.proofUrls.length > 0 && (
                      <div className="space-y-4">
                          <div className="flex items-center gap-3">
                              <Camera className="h-4 w-4 text-primary" />
                              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Visual Verification Logs</h4>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {selectedSanitationVisit.proofUrls.map((url, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-lg cursor-pointer group hover:scale-[1.02] transition-all" onClick={() => setSelectedProofImg(url)}>
                                      <Image src={url} alt={`Sanitation Proof ${idx + 1}`} fill className="object-cover" />
                                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <Eye className="text-white h-6 w-6 drop-shadow-md" />
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                  
                  {/* Detailed Checkpoint Cards */}
                  <div className="space-y-6">
                       <div className="flex items-center gap-3">
                          <LayoutGrid className="h-4 w-4 text-primary" />
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Unit-by-Unit Checkpoints</h4>
                      </div>
                      <div className="grid gap-6">
                          {selectedSanitationVisit?.dispenserReports?.map((report, rIdx) => (
                              <Card key={report.dispenserId || rIdx} className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
                                  <CardHeader className="bg-muted/30 p-6 flex flex-row items-center justify-between">
                                       <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                <Droplet className="h-5 w-5 text-primary"/>
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-black uppercase tracking-tight">{report.dispenserName}</CardTitle>
                                                {report.dispenserCode && <CardDescription className="text-[10px] font-bold uppercase text-primary">Serial: {report.dispenserCode}</CardDescription>}
                                            </div>
                                       </div>
                                       <Badge variant="secondary" className="bg-white text-[9px] font-black uppercase tracking-widest px-3 border shadow-none">{report.checklist?.length || 0} Points</Badge>
                                  </CardHeader>
                                   <CardContent className="p-0">
                                       <div className="divide-y divide-slate-50">
                                          {report.checklist?.map((item: any, index: number) => (
                                              <div key={index} className={cn("p-4 flex items-start gap-4 transition-colors", !item.checked && "bg-destructive/5")}>
                                                  <div className={cn(
                                                      "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                                                      item.checked ? "bg-green-100 text-green-600" : "bg-destructive/10 text-destructive"
                                                  )}>
                                                      {selectedSanitationVisit.status === 'Scheduled' ? <Hourglass className="h-3 w-3" /> : item.checked ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                                  </div>
                                                  <div className="space-y-1.5 flex-1">
                                                      <p className="text-xs font-bold text-slate-900 leading-tight">{item.item}</p>
                                                      {selectedSanitationVisit.status === 'Completed' && !item.checked && item.remarks && (
                                                          <div className="p-3 rounded-xl bg-white border border-destructive/10 text-[11px] font-medium text-destructive leading-relaxed shadow-sm italic">
                                                              "{item.remarks}"
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          ))}
                                       </div>
                                  </CardContent>
                              </Card>
                          ))}
                      </div>
                  </div>

                  {/* Authorization Section */}
                  {selectedSanitationVisit?.status === 'Completed' && (selectedSanitationVisit.officerSignature || selectedSanitationVisit.clientSignature) && (
                  <Card className="border-none shadow-sm rounded-3xl bg-white">
                      <CardHeader className="p-8 pb-4">
                          <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-2">
                            <Signature className="h-4 w-4" /> Legal Attestation
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-10">
                          {selectedSanitationVisit.officerSignature && (
                              <div className="space-y-4 text-center md:text-left">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Authorized Officer</p>
                                  <div className="relative aspect-[3/1] w-full bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center">
                                      <Image src={selectedSanitationVisit.officerSignature} alt="Officer Signature" fill className="object-contain p-4"/>
                                  </div>
                                  <div className="space-y-0.5">
                                      <p className="text-sm font-black text-slate-900">{selectedSanitationVisit.assignedTo}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{selectedSanitationVisit.officerSignatureDate ? format(new Date(selectedSanitationVisit.officerSignatureDate), 'PPP p') : ''}</p>
                                  </div>
                              </div>
                          )}
                          {selectedSanitationVisit.clientSignature && (
                              <div className="space-y-4 text-center md:text-left">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Client Acknowledgment</p>
                                  <div className="relative aspect-[3/1] w-full bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center">
                                      <Image src={selectedSanitationVisit.clientSignature} alt="Client Signature" fill className="object-contain p-4"/>
                                  </div>
                                  <div className="space-y-0.5">
                                      <p className="text-sm font-black text-slate-900">{selectedSanitationVisit.clientRepName}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{selectedSanitationVisit.clientSignatureDate ? format(new Date(selectedSanitationVisit.clientSignatureDate), 'PPP p') : ''}</p>
                                  </div>
                              </div>
                          )}
                      </CardContent>
                       <CardFooter className="p-8 pt-0 border-t border-slate-50 flex justify-center text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight max-w-sm mt-6">
                                This document serves as a digital record of the monthly sanitation audit. High-fidelity water safety is guaranteed by River PH.
                            </p>
                        </CardFooter>
                  </Card>
                  )}
              </div>
            </div>
            
            <DialogFooter className="flex shrink-0 flex-col gap-2 border-t bg-white px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-8">
                {selectedSanitationVisit?.reportUrl ? (
                      <Button variant="outline" className="h-12 w-full rounded-full text-[15px] font-bold sm:w-auto sm:px-6" asChild>
                          <a href={selectedSanitationVisit.reportUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="mr-2 h-4 w-4" /> Certificate
                          </a>
                      </Button>
                ) : null}
                <DialogClose asChild>
                    <Button className="h-12 w-full rounded-full bg-[#1A2C49] text-[15px] font-bold text-white hover:bg-[#1A2C49]/90 sm:w-auto sm:px-8">Close</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Preview for Proofs */}
      <Dialog open={!!selectedProofImg} onOpenChange={() => setSelectedProofImg(null)}>
          <DialogContent className="sm:max-w-5xl p-0 overflow-hidden border-none bg-black/95 shadow-none rounded-none">
              <DialogHeader className="sr-only">
                  <DialogTitle>Visual Evidence</DialogTitle>
                  <DialogDescription>High-fidelity proof photo of the sanitation visit.</DialogDescription>
              </DialogHeader>
              {selectedProofImg && (
                  <div className="relative aspect-video w-full flex items-center justify-center cursor-zoom-out" onClick={() => setSelectedProofImg(null)}>
                      <Image src={selectedProofImg} alt="Visual Proof Zoomed" fill className="object-contain" priority />
                      <div className="absolute top-6 right-6 p-2 rounded-full bg-white/10 backdrop-blur-xl text-white/50 border border-white/20">
                          <XCircle className="h-6 w-6" />
                      </div>
                  </div>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
