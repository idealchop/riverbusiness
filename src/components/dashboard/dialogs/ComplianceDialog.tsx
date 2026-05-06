'use client';

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { WaterStation, ComplianceReport, SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
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
  XCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';

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
  complianceLoading,
  sanitationVisits,
  sanitationLoading,
  onViewAttachment,
  initialTab = 'compliance',
  initialVisitId = null,
}: ComplianceDialogProps) {
  const [activeTab, setActiveTab] = useState<string>('compliance');
  const [selectedSanitationVisit, setSelectedSanitationVisit] = useState<SanitationVisit | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [complianceCurrentPage, setComplianceCurrentPage] = useState(1);
  const COMPLIANCE_ITEMS_PER_PAGE = 5;
  const [sanitationCurrentPage, setSanitationCurrentPage] = useState(1);
  const SANITATION_ITEMS_PER_PAGE = 5;
  const [selectedProofImg, setSelectedProofImg] = useState<string | null>(null);

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

  const availableMonths = useMemo(() => {
    if (!complianceReports) return [];
    const months = new Set<string>();
    complianceReports.forEach(report => {
        if (report.date && typeof (report.date as any).toDate === 'function') {
            months.add(format((report.date as any).toDate(), 'yyyy-MM'));
        }
    });
    return Array.from(months).map(m => ({
        value: m,
        label: format(new Date(m + '-02'), 'MMMM yyyy'),
    })).sort((a,b) => b.value.localeCompare(a.value));
  }, [complianceReports]);

  const filteredReports = useMemo(() => {
    if (!complianceReports) return [];
    if (monthFilter === 'all') return complianceReports;
    return complianceReports.filter(report => {
        if (report.date && typeof (report.date as any).toDate === 'function') {
            return format((report.date as any).toDate(), 'yyyy-MM') === monthFilter;
        }
        return false;
    });
  }, [complianceReports, monthFilter]);

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
        <DialogContent className="sm:max-w-4xl h-full flex flex-col sm:h-auto sm:max-h-[90vh] p-0 border-none shadow-2xl overflow-hidden rounded-2xl">
          <DialogHeader className="p-8 pb-4 bg-muted/20 border-b">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">Compliance Intelligence</DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium">
              Real-time monitoring of water quality tests and office sanitation records for {waterStation?.name || 'Assigned Station'}.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="px-6 flex-1 py-6">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex flex-col gap-6">
              <TabsList className="grid w-full grid-cols-2 md:w-96 mx-auto sticky top-0 bg-background/80 backdrop-blur-md z-10 p-1 border rounded-xl shadow-inner">
                <TabsTrigger value="compliance" className="rounded-lg data-[state=active]:shadow-sm">Station Reports</TabsTrigger>
                <TabsTrigger value="sanitation" className="rounded-lg data-[state=active]:shadow-sm">Sanitation Logs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="compliance" className="mt-0 space-y-6">
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 bg-slate-50/50">
                    <div>
                      <CardTitle className="text-lg">Station Quality Metrics</CardTitle>
                      <CardDescription className="text-xs">Bacteriological and operational compliance documents.</CardDescription>
                    </div>
                    {availableMonths.length > 0 && (
                      <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="w-full md:w-[200px] h-9 text-xs font-bold uppercase tracking-tight bg-white">
                          <History className="mr-2 h-3.5 w-3.5" />
                          <SelectValue placeholder="Period Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Full History</SelectItem>
                          {availableMonths.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                        {complianceLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-12 text-xs font-bold uppercase tracking-widest opacity-40">Synchronizing records...</TableCell>
                          </TableRow>
                        ) : paginatedComplianceReports.map((report) => (
                          <TableRow key={report.id} className="group hover:bg-muted/30 transition-colors cursor-default">
                            <TableCell className="pl-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary/5 transition-colors">
                                        <Microscope className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <span className="font-bold text-sm text-slate-900">{report.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-500 uppercase">
                                {report.date && typeof (report.date as any).toDate === 'function' ? format((report.date as any).toDate(), 'MMMM yyyy') : 'Processing...'}
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
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2 hover:bg-primary/5 hover:text-primary" onClick={() => onViewAttachment(report.reportUrl || 'pending')}>
                                <Eye className="h-3.5 w-3.5" />
                                View Doc
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!paginatedComplianceReports || paginatedComplianceReports.length === 0) && !complianceLoading && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No historical reports match the filter.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="space-y-4 md:hidden p-4">
                      {complianceLoading ? (
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest opacity-40 py-10">Synchronizing...</p>
                      ) : paginatedComplianceReports.map(report => (
                        <Card key={report.id} className="shadow-none border bg-muted/10">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-sm">{report.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight mt-1">
                                  {report.date && typeof (report.date as any).toDate === 'function' ? format((report.date as any).toDate(), 'MMMM yyyy') : 'Validating...'}
                                </p>
                              </div>
                              <Badge variant="outline" className={cn(
                                  'text-[9px] uppercase font-bold tracking-widest px-2 py-0.5',
                                  report.status === 'Passed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                              )}>{report.status}</Badge>
                            </div>
                            <Button variant="outline" size="sm" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest" onClick={() => onViewAttachment(report.reportUrl || 'pending')}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> View Report Document
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t py-4 flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ledger {filteredReports.length} documents</div>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setComplianceCurrentPage(p => Math.max(1, p - 1))} disabled={complianceCurrentPage === 1}>Prev</Button>
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-2">{complianceCurrentPage} / {totalCompliancePages || 1}</span>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setComplianceCurrentPage(p => Math.min(totalCompliancePages, p + 1))} disabled={complianceCurrentPage === totalCompliancePages || totalCompliancePages === 0}>Next</Button>
                      </div>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              <TabsContent value="sanitation" className="mt-0 space-y-6">
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50">
                    <CardTitle className="text-lg">Office Service Log</CardTitle>
                    <CardDescription className="text-xs">Professional monthly sanitation visits for your dispensers.</CardDescription>
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

                    <div className="space-y-4 md:hidden p-4">
                      {sanitationLoading ? (
                        <p className="text-center text-[10px] font-bold uppercase tracking-widest opacity-40 py-10">Loading...</p>
                      ) : paginatedSanitationVisits.map(visit => (
                        <Card key={visit.id} className="shadow-none border bg-muted/10 active:scale-[0.98] transition-transform cursor-pointer" onClick={() => setSelectedSanitationVisit(visit)}>
                          <CardContent className="p-4 space-y-4">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="font-bold text-sm">{format(new Date(visit.scheduledDate), 'MMM d, yyyy')}</p>
                                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Officer: {visit.assignedTo}</p>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                      "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5",
                                      visit.status === 'Completed' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                                  )}>{visit.status}</Badge>
                              </div>
                              <Button variant="outline" size="sm" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest">
                                  Open Analysis Report
                              </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 border-t py-4 flex items-center justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total {sanitationVisits?.length || 0} visits</div>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setSanitationCurrentPage(p => Math.max(1, p - 1))} disabled={sanitationCurrentPage === 1}>Prev</Button>
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-2">{sanitationCurrentPage} / {totalSanitationPages || 1}</span>
                          <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setSanitationCurrentPage(p => Math.min(totalSanitationPages, p + 1))} disabled={sanitationCurrentPage === totalSanitationPages || totalSanitationPages === 0}>Next</Button>
                      </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          
          <div className="p-6 pt-4 border-t bg-muted/20 flex justify-end">
            <DialogClose asChild>
                <Button variant="outline" className="font-bold uppercase tracking-widest text-[10px] rounded-xl px-8 h-10 border-slate-200 shadow-sm">Dismiss</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Individual Report Detail View */}
      <Dialog open={!!selectedSanitationVisit} onOpenChange={() => setSelectedSanitationVisit(null)}>
        <DialogContent className="sm:max-w-4xl h-full sm:h-auto sm:max-h-[95vh] flex flex-col p-0 border-none shadow-3xl overflow-hidden rounded-[2rem]">
            <DialogHeader className="p-8 pb-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-b-4 border-primary">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
                            <ClipboardCheck className="h-6 w-6 text-primary-light" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Sanitation Intelligence Report</DialogTitle>
                            <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                {selectedSanitationVisit ? format(new Date(selectedSanitationVisit.scheduledDate), 'MMMM do, yyyy') : ''} • Ref: SAN-{selectedSanitationVisit?.id.substring(0, 8).toUpperCase()}
                            </DialogDescription>
                        </div>
                    </div>
                    {selectedSanitationVisit?.status === 'Completed' && (
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 font-black uppercase text-[10px] tracking-widest h-7 px-4">
                            Finalized
                        </Badge>
                    )}
                </div>
            </DialogHeader>

             <div className="flex-1 overflow-y-auto px-8 bg-slate-50/50">
              <div className="py-8 space-y-8 max-w-3xl mx-auto">
                  
                  {/* Results Hero Section */}
                  {selectedSanitationVisit?.status === 'Completed' ? (
                      <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden group">
                          <CardContent className="p-8">
                              <div className="grid md:grid-cols-2 gap-8 items-center">
                                  <div className="space-y-4">
                                      <div className="space-y-1">
                                          <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Quality Assessment</Label>
                                          <p className={cn("text-4xl font-black tracking-tighter uppercase", sanitationReportStats.statusColor)}>
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
            
            <DialogFooter className="p-8 pt-4 bg-white border-t flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto">
                  {selectedSanitationVisit?.reportUrl && (
                      <Button variant="outline" className="w-full md:w-auto rounded-xl h-11 px-8 font-black uppercase tracking-widest text-[10px] shadow-sm" asChild>
                          <a href={selectedSanitationVisit.reportUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="mr-2 h-4 w-4" /> View Full Certificate
                          </a>
                      </Button>
                  )}
                </div>
                <DialogClose asChild>
                    <Button variant="ghost" className="w-full md:w-auto rounded-xl h-11 px-10 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900">Close Report</Button>
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
