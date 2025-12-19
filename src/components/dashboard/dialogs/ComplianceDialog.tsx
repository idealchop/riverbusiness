
'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { WaterStation, ComplianceReport, SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Eye, FileText, Hourglass, CheckCircle, AlertTriangle } from 'lucide-react';
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
}: ComplianceDialogProps) {
  const [selectedSanitationVisit, setSelectedSanitationVisit] = useState<SanitationVisit | null>(null);

  const sanitationReportStats = useMemo(() => {
    if (!selectedSanitationVisit || !selectedSanitationVisit.checklist) {
        return { passed: 0, total: 0, passRate: 0, overallStatus: '', statusColor: '' };
    }
    const total = selectedSanitationVisit.checklist.length;
    const passed = selectedSanitationVisit.checklist.filter(item => item.checked).length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    let overallStatus = 'Failed';
    let statusColor = 'text-red-500';
    if (passRate === 100) {
        overallStatus = 'Excellent';
        statusColor = 'text-green-500';
    } else if (passRate >= 80) {
        overallStatus = 'Good';
        statusColor = 'text-green-500';
    } else if (passRate >= 60) {
        overallStatus = 'Needs Improvement';
        statusColor = 'text-yellow-500';
    }

    return { passed, total, passRate, overallStatus, statusColor };
  }, [selectedSanitationVisit]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Compliance & Sanitation</DialogTitle>
            <DialogDescription>
              View water quality reports from your assigned station and scheduled sanitation visits for your office.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="compliance" className="flex flex-col gap-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 md:w-96 mx-auto">
              <TabsTrigger value="compliance">Water Quality Reports</TabsTrigger>
              <TabsTrigger value="sanitation">Office Sanitation Visits</TabsTrigger>
            </TabsList>
            
            <TabsContent value="compliance">
              <Card>
                <CardHeader>
                  <CardTitle>Water Quality Compliance</CardTitle>
                  <CardDescription>View all historical compliance reports and their status for {waterStation?.name || 'your assigned station'}.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Attachment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Loading reports...</TableCell>
                        </TableRow>
                      ) : complianceReports?.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell>{report.date && typeof (report.date as any).toDate === 'function' ? format((report.date as any).toDate(), 'MMM yyyy') : 'Processing...'}</TableCell>
                          <TableCell>
                            <Badge variant={report.status === 'Passed' ? 'default' : report.status === 'Failed' ? 'destructive' : 'secondary'} className={cn('text-xs', report.status === 'Passed' && 'bg-green-100 text-green-800', report.status === 'Failed' && 'bg-red-100 text-red-800', report.status === 'Pending Review' && 'bg-yellow-100 text-yellow-800')}>{report.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => onViewAttachment(report.reportUrl || 'pending')}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!complianceReports || complianceReports.length === 0) && !complianceLoading && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No compliance reports available.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sanitation">
              <Card>
                <CardHeader>
                  <CardTitle>Office Sanitation Visits</CardTitle>
                  <CardDescription>Records of scheduled sanitation and cleaning for your office dispensers.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Scheduled Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quality Officer</TableHead>
                        <TableHead className="text-right">Report</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sanitationLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Loading visits...</TableCell>
                        </TableRow>
                      ) : sanitationVisits?.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell>{new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                          <TableCell>
                            <Badge variant={visit.status === 'Completed' ? 'default' : visit.status === 'Scheduled' ? 'secondary' : 'outline'} className={visit.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : visit.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'}>
                              {visit.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{visit.assignedTo}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedSanitationVisit(visit); }}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!sanitationVisits || sanitationVisits.length === 0) && !sanitationLoading && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">No sanitation visits scheduled.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedSanitationVisit} onOpenChange={() => setSelectedSanitationVisit(null)}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Sanitation Visit Report</DialogTitle>
                <DialogDescription>
                    Report for {selectedSanitationVisit ? format(new Date(selectedSanitationVisit.scheduledDate), 'PP') : ''} by Quality Officer {selectedSanitationVisit?.assignedTo}.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
                {selectedSanitationVisit?.status === 'Completed' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Overall Result</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center mb-4">
                                <p className={cn("text-2xl font-bold", sanitationReportStats.statusColor)}>{sanitationReportStats.overallStatus}</p>
                                <p className="text-sm text-muted-foreground">
                                    {sanitationReportStats.passed} of {sanitationReportStats.total} items passed
                                </p>
                            </div>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Progress value={sanitationReportStats.passRate} className="h-2" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{sanitationReportStats.passRate.toFixed(0)}% Pass Rate</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                )}
                
                <div className="space-y-2">
                    <h4 className="font-semibold text-base">Checklist Details</h4>
                    <Card>
                        <CardContent className="p-0">
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedSanitationVisit?.checklist?.map((item, index) => (
                                            <TableRow key={index} className={cn(!item.checked && "bg-destructive/5")}>
                                                <TableCell className="font-medium text-xs w-full">
                                                    {item.item}
                                                    {!item.checked && item.remarks && (
                                                        <p className="text-destructive text-xs mt-1 pl-2 border-l-2 border-destructive">
                                                            <span className="font-bold">Remarks:</span> {item.remarks}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {selectedSanitationVisit.status === 'Scheduled' ? (
                                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 whitespace-nowrap"><Hourglass className="h-3 w-3 mr-1" /> Pending</Badge>
                                                    ) : item.checked ? (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap"><CheckCircle className="h-3 w-3 mr-1" /> Passed</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="whitespace-nowrap"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {selectedSanitationVisit?.reportUrl && (
                    <Button variant="outline" asChild>
                         <a href={selectedSanitationVisit.reportUrl} target="_blank" rel="noopener noreferrer">
                             <Eye className="mr-2 h-4 w-4" /> View Official Report
                         </a>
                    </Button>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

