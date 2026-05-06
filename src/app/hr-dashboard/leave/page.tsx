'use client';

import React, { useState } from 'react';
import { 
  CalendarDays, 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { collection, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FileLeaveDialog } from '@/components/hr/FileLeaveDialog';

export default function LeavePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  
  const companyId = user?.companyId || user?.clientId || 'default';

  const leaveQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'hr_companies', companyId, 'leaveRequests'), orderBy('appliedAt', 'desc')) : null,
    [firestore, companyId]
  );
  const { data: leaveRequests, isLoading } = useCollection(leaveQuery);

  const handleStatusUpdate = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    try {
        const leaveRef = doc(firestore, 'hr_companies', companyId, 'leaveRequests', requestId);
        await updateDoc(leaveRef, { status: newStatus });
        toast({ title: `Request ${newStatus}`, description: `The leave request has been processed.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Action Failed' });
    }
  };

  const isManagement = user?.hrRole === 'owner' || user?.hrRole === 'admin';

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Leave Management</h1>
          <p className="text-slate-500 font-medium">Review applications and manage team availability.</p>
        </div>
        <Button 
            onClick={() => setIsLeaveDialogOpen(true)}
            className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-[10px] bg-slate-900"
        >
          <Plus className="mr-2 h-4 w-4" /> File Leave
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
         <CardHeader className="bg-slate-50/50 border-b p-6">
            <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-black tracking-tight text-slate-900">Request Queue</CardTitle>
                   <CardDescription className="text-xs font-bold uppercase text-slate-400">Pending team applications</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-widest">
                       <LayoutGrid className="h-3.5 w-3.5 mr-2" /> Calendar View
                    </Button>
                </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-slate-50/50">
                   <TableRow>
                     <TableHead className="pl-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Employee</TableHead>
                     <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Type & Period</TableHead>
                     <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Reason</TableHead>
                     <TableHead className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Status</TableHead>
                     <TableHead className="text-right pr-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Review</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {isLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-[10px]">Processing Request Data...</TableCell></TableRow>
                   ) : leaveRequests && leaveRequests.length > 0 ? (
                      leaveRequests.map(request => (
                        <TableRow key={request.id} className="hover:bg-slate-50/50 transition-colors">
                           <TableCell className="pl-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                    {request.employeeName.charAt(0)}
                                 </div>
                                 <p className="text-sm font-bold text-slate-900">{request.employeeName}</p>
                              </div>
                           </TableCell>
                           <TableCell>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{request.type}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d')}</p>
                           </TableCell>
                           <TableCell>
                              <p className="text-[11px] text-slate-500 font-medium italic max-w-[200px] truncate">"{request.reason || 'No reason provided'}"</p>
                           </TableCell>
                           <TableCell>
                              <Badge className={cn(
                                 "text-[8px] font-black uppercase border-none px-2",
                                 request.status === 'approved' ? "bg-green-100 text-green-700" : 
                                 request.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                              )}>
                                 {request.status}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-right pr-6">
                              {(request.status === 'pending' && isManagement) ? (
                                 <div className="flex items-center justify-end gap-2">
                                    <Button 
                                        onClick={() => handleStatusUpdate(request.id, 'approved')}
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 rounded-lg text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                       <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                       <XCircle className="h-4 w-4" />
                                    </Button>
                                 </div>
                              ) : (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-4">Processed</p>
                              )}
                           </TableCell>
                        </TableRow>
                      ))
                   ) : (
                      <TableRow>
                         <TableCell colSpan={5} className="text-center py-24">
                            <div className="flex flex-col items-center gap-3 opacity-20">
                               <Clock className="h-10 w-10 text-slate-400" />
                               <p className="text-xs font-black uppercase tracking-widest">The request queue is clear</p>
                            </div>
                         </TableCell>
                      </TableRow>
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
