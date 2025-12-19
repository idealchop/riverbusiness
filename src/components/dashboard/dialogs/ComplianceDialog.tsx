'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WaterStation, ComplianceReport, SanitationVisit } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Eye, FileText, Hourglass, CheckCircle } from 'lucide-react';
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sanitation Visit Report</DialogTitle>
            <DialogDescription>
              Full report for the visit on {selectedSanitationVisit ? format(new Date(selectedSanitationVisit.scheduledDate), 'PP') : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Official Report</h4>
                <div className="p-2 border rounded-lg min-h-[100px] flex items-center justify-center bg-muted/20">
                  {selectedSanitationVisit?.reportUrl ? (
                    <Image src={selectedSanitationVisit.reportUrl} alt="Sanitation Report" width={400} height={600} className="rounded-md w-full h-auto object-contain" />
                  ) : (
                    <div className="p-6 text-center">
                      <Hourglass className="h-10 w-10 text-muted-foreground mb-2 mx-auto" />
                      <p className="text-sm font-medium">Attachment Pending</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        The report is being processed by the admin and will be available here soon.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Visit Details</h4>
              <Card>
                <CardContent className="pt-6 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date:</span> <span>{selectedSanitationVisit ? format(new Date(selectedSanitationVisit.scheduledDate), 'PPP') : ''}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Quality Officer:</span> <span>{selectedSanitationVisit?.assignedTo}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Status:</span>
                    {selectedSanitationVisit && <Badge variant={selectedSanitationVisit.status === 'Completed' ? 'default' : 'secondary'} className={cn(selectedSanitationVisit.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800')}>{selectedSanitationVisit.status}</Badge>}
                  </div>
                </CardContent>
              </Card>
              <h4 className="font-semibold">Checklist Results</h4>
              <Card>
                <CardContent className="p-2">
                  {selectedSanitationVisit?.status === 'Completed' && (
                    <div className="p-4 border-b">
                      <div className="text-center">
                        <p className={cn("text-2xl font-bold", sanitationReportStats.statusColor)}>{sanitationReportStats.overallStatus}</p>
                        <p className="text-sm text-muted-foreground">Overall Sanitation Result</p>
                      </div>
                      <div>
                        <Progress value={sanitationReportStats.passRate} className="h-2 mt-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{sanitationReportStats.passed} / {sanitationReportStats.total} Items Passed</span>
                          <span>{sanitationReportStats.passRate.toFixed(0)}%</span>
                        </div>
                      </div>
                      {(sanitationReportStats.overallStatus === 'Excellent' || sanitationReportStats.overallStatus === 'Good') && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Based on our inspection, your drinking water is clean and safe.
                        </p>
                      )}
                    </div>
                  )}
                  <ScrollArea className={cn(selectedSanitationVisit?.status === 'Completed' ? "h-[190px]" : "h-[400px]")}>
                    <Table>
                      <TableBody>
                        {selectedSanitationVisit?.checklist?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-xs w-full">{item.item}</TableCell>
                            <TableCell className="text-right">
                              {selectedSanitationVisit.status === 'Scheduled' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 whitespace-nowrap"><Hourglass className="h-3 w-3 mr-1" /> Pending</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Result will be available after the visit is completed.</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : item.checked ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 whitespace-nowrap"><CheckCircle className="h-3 w-3 mr-1" /> Passed</Badge>
                              ) : (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Badge variant="destructive" className="cursor-pointer whitespace-nowrap">Failed</Badge>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-60 text-sm">
                                    <p className="font-bold">Remarks:</p>
                                    <p>{item.remarks || "No remarks provided."}</p>
                                  </PopoverContent>
                                </Popover>
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
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
