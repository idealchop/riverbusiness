'use client';

import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Search, 
  Plus, 
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FileLeaveDialog } from '@/components/hr/FileLeaveDialog';
import type { HRLeaveRequest } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';

export default function LeavePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  
  const companyId = user?.companyId || user?.clientId || 'default';

  const leaveQuery = useMemoFirebase(
    () => {
        if (!firestore || !companyId) return null;
        return query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), orderBy('appliedAt', 'desc'));
    },
    [firestore, companyId]
  );
  const { data: leaveRequests, isLoading } = useCollection<HRLeaveRequest>(leaveQuery);

  const displayLeaves = useMemo(() => {
    return leaveRequests || [];
  }, [leaveRequests]);

  const handleStatusUpdate = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore || !companyId || !requestId) return;
    try {
        const leaveRef = doc(firestore, 'hr_companies', companyId, 'leaveRequests', requestId);
        await updateDoc(leaveRef, { status: newStatus });
        toast({ title: `Request ${newStatus}`, description: `The leave request has been processed.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action failed', description: 'Permission error or network issue.' });
    }
  };

  if (isUserLoading) return <FullScreenLoader text="Syncing Applications..." />;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Leave Review
          </h1>
          <p className="text-slate-500 font-medium">
              Review company-wide applications and manage team availability collaboratively.
          </p>
        </div>
        <Button 
            onClick={() => setIsLeaveDialogOpen(true)}
            className="rounded-xl h-11 px-6 font-bold shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> File Leave
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
         <CardHeader className="bg-slate-50/20 border-b p-6">
            <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-bold text-slate-900">
                       Organization Queue
                   </CardTitle>
                   <CardDescription className="text-xs font-medium text-slate-500">
                       All pending team applications requiring review.
                   </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg h-9 text-xs font-semibold border-slate-200">
                       <LayoutGrid className="h-3.5 w-3.5 mr-2 opacity-50" /> Calendar View
                    </Button>
                </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50/50">
                   <TableRow>
                     <TableHead className="pl-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Employee</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Type & Period</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Reason</TableHead>
                     <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</TableHead>
                     <TableHead className="text-right pr-6 font-bold text-[10px] uppercase tracking-wider text-slate-400">Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 font-medium opacity-50">Processing Request Data...</TableCell></TableRow>
                   ) : displayLeaves.map(request => (
                        <TableRow key={request.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0">
                           <TableCell className="pl-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                                    {request.employeeName?.charAt(0) || '?'}
                                 </div>
                                 <p className="text-sm font-semibold text-slate-900">{request.employeeName || 'Untitled Employee'}</p>
                              </div>
                           </TableCell>
                           <TableCell>
                              <p className="text-xs font-bold text-slate-900">{request.type || 'General'}</p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                                  {request.startDate ? format(new Date(request.startDate), 'MMM d') : '??'} - {request.endDate ? format(new Date(request.endDate), 'MMM d, yyyy') : '??'}
                              </p>
                           </TableCell>
                           <TableCell>
                              <p className="text-xs text-slate-500 font-medium italic max-w-[200px] truncate">"{request.reason || 'No reason provided'}"</p>
                           </TableCell>
                           <TableCell>
                              <Badge className={cn(
                                 "text-[9px] font-bold uppercase border-none px-2 h-5",
                                 request.status === 'approved' ? "bg-green-50 text-green-700" : 
                                 request.status === 'pending' ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"
                              )}>
                                 {request.status || 'Pending'}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-right pr-6">
                              {(request.status === 'pending') ? (
                                 <div className="flex items-center justify-end gap-2">
                                    <Button 
                                        onClick={() => handleStatusUpdate(request.id, 'approved')}
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 rounded-lg text-green-600 border-green-100 hover:bg-green-50"
                                        title="Approve Request"
                                    >
                                       <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 rounded-lg text-red-600 border-red-100 hover:bg-red-50"
                                        title="Reject Request"
                                    >
                                       <XCircle className="h-4 w-4" />
                                    </Button>
                                 </div>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-4">Resolved</p>
                              )}
                           </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && displayLeaves.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center py-20 font-medium text-slate-300 italic uppercase text-[10px] tracking-widest">No Leave Applications Found</TableCell></TableRow>
                      )}
                </TableBody>
            </Table>
         </CardContent>
      </Card>
      
      <FileLeaveDialog
        isOpen={isLeaveDialogOpen}
        onOpenChange={setIsLeaveDialogOpen}
        user={user}
      />
    </div>
  );
}
