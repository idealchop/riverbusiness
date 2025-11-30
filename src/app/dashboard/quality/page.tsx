
'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Eye } from 'lucide-react';
import type { ComplianceReport, SanitationVisit, AppUser } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function QualityPage({ user }: { user?: AppUser | null }) {
  const firestore = useFirestore();

  const complianceReportsQuery = useMemoFirebase(() => 
    (firestore && user?.assignedWaterStationId) 
      ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'complianceReports') 
      : null, 
    [firestore, user]
  );
  const { data: complianceReports, isLoading: complianceLoading } = useCollection<ComplianceReport>(complianceReportsQuery);

  const sanitationVisitsQuery = useMemoFirebase(() => 
    (firestore && user?.assignedWaterStationId) 
      ? collection(firestore, 'waterStations', user.assignedWaterStationId, 'sanitationVisits') 
      : null, 
    [firestore, user]
  );
  const { data: sanitationVisits, isLoading: sanitationLoading } = useCollection<SanitationVisit>(sanitationVisitsQuery);

  if (!user?.assignedWaterStationId) {
    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>No Water Station Assigned</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please contact your administrator to have a water station assigned to your account to view quality reports.</p>
            </CardContent>
        </Card>
    )
  }
  
  if (complianceLoading || sanitationLoading) {
      return <div>Loading quality reports...</div>
  }

  return (
    <Tabs defaultValue="compliance" className="flex flex-col gap-4">
      <TabsList className="grid w-full grid-cols-2 md:w-96">
        <TabsTrigger value="compliance">Compliance Reports</TabsTrigger>
        <TabsTrigger value="sanitation">Sanitation</TabsTrigger>
      </TabsList>
      
      <TabsContent value="compliance">
        <Card>
          <CardHeader>
            <CardTitle>Water Quality Compliance</CardTitle>
            <CardDescription>View all historical compliance reports and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attachment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceReports?.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.id}</TableCell>
                    <TableCell>{new Date(report.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <Badge variant={report.status === 'Compliant' ? 'default' : 'destructive'}
                       className={
                        report.status === 'Compliant' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : report.status === 'Non-compliant' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                      }>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <a href={report.reportUrl} target="_blank" rel="noopener noreferrer">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                 {(!complianceReports || complianceReports.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center">No compliance reports found for your assigned station.</TableCell>
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
            <CardTitle>Sanitation Visits</CardTitle>
            <CardDescription>Manage scheduling and records of sanitation visits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visit ID</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sanitationVisits?.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">{visit.id}</TableCell>
                    <TableCell>{new Date(visit.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</TableCell>
                    <TableCell>
                      <Badge variant={visit.status === 'Completed' ? 'default' : visit.status === 'Scheduled' ? 'secondary' : 'outline'}
                      className={
                        visit.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                        : visit.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
                      }>
                        {visit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{visit.assignedTo}</TableCell>
                    <TableCell className="text-right">
                      {visit.reportUrl ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={visit.reportUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            View Report
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                 {(!sanitationVisits || sanitationVisits.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">No sanitation visit records found for your assigned station.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
