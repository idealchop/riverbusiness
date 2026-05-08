'use client';

import React, { useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Search, 
  Plus, 
  CheckCircle2,
  XCircle,
  Clock,
  LayoutGrid,
  ChevronRight,
  UserCircle,
  Info,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { format, addDays, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FileLeaveDialog } from '@/components/hr/FileLeaveDialog';
import { Calendar } from '@/components/ui/calendar';
import type { HRLeaveRequest } from '@/lib/types';
import { FullScreenLoader } from '@/components/ui/loader';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 10;

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const DEMO_LEAVES: Partial<HRLeaveRequest>[] = [
    { id: 'l1', employeeName: 'Marcus Rivera', type: 'Vacation', startDate: format(addDays(new Date(), 10), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'), reason: 'Family trip', status: 'pending' },
    { id: 'l2', employeeName: 'Sarah Jenkins', type: 'Emergency', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), reason: 'Personal matters', status: 'pending' },
    { id: 'l3', employeeName: 'Elena Cruz', type: 'Sick', startDate: format(addDays(new Date(), -5), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), -4), 'yyyy-MM-dd'), reason: 'Medical appointment', status: 'approved' },
];

export default function LeavePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    let list = leaveRequests && leaveRequests.length > 0 ? leaveRequests : (DEMO_LEAVES as HRLeaveRequest[]);
    if (searchTerm) {
        const s = searchTerm.toLowerCase();
        list = list.filter(l => l.employeeName.toLowerCase().includes(s) || l.type.toLowerCase().includes(s));
    }
    return list;
  }, [leaveRequests, searchTerm]);

  const paginatedLeaves = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayLeaves.slice(start, start + ITEMS_PER_PAGE);
  }, [displayLeaves, currentPage]);

  const totalPages = Math.ceil(displayLeaves.length / ITEMS_PER_PAGE);

  // Calendar Intelligence Logic
  const calendarModifiers = useMemo(() => {
      const approved: Date[] = [];
      const pending: Date[] = [];

      displayLeaves.forEach(req => {
          const start = toSafeDate(req.startDate);
          const end = toSafeDate(req.endDate);
          if (!start || !end) return;

          // Loop through the range to fill the calendar
          let current = startOfDay(start);
          const last = startOfDay(end);

          while (current <= last) {
              if (req.status === 'approved') approved.push(new Date(current));
              else if (req.status === 'pending') pending.push(new Date(current));
              current = addDays(current, 1);
          }
      });

      return { approved, pending };
  }, [displayLeaves]);

  const selectedDateLeaves = useMemo(() => {
      if (!selectedCalendarDate) return [];
      return displayLeaves.filter(req => {
          const start = toSafeDate(req.startDate);
          const end = toSafeDate(req.endDate);
          if (!start || !end) return false;
          
          return isWithinInterval(selectedCalendarDate, {
              start: startOfDay(start),
              end: endOfDay(end)
          });
      });
  }, [selectedCalendarDate, displayLeaves]);

  const handleStatusUpdate = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore || !companyId || !requestId || requestId.startsWith('l')) {
        toast({ title: 'Demo Mode', description: 'Status updates are simulated for demo records.' });
        return;
    }
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
        <div className="flex items-center gap-3">
            <Button 
                variant="outline"
                onClick={() => setIsCalendarOpen(true)}
                className="rounded-xl h-11 px-6 font-bold border-slate-200 bg-white shadow-sm"
            >
                <LayoutGrid className="mr-2 h-4 w-4 text-primary" /> Calendar View
            </Button>
            <Button 
                onClick={() => setIsLeaveDialogOpen(true)}
                className="rounded-xl h-11 px-6 font-bold shadow-sm"
            >
                <Plus className="mr-2 h-4 w-4" /> File Leave
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
         <CardHeader className="bg-slate-50/20 border-b p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                   <CardTitle className="text-lg font-bold text-slate-900">
                       Organization Queue
                   </CardTitle>
                   <CardDescription className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
                       Requests Requiring Verification
                   </CardDescription>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by staff name..." 
                        className="pl-10 h-10 rounded-xl bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
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
                   ) : paginatedLeaves.map(request => (
                        <TableRow key={request.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 last:border-0 group">
                           <TableCell className="pl-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase shadow-inner">
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
                                 "text-[9px] font-bold uppercase border-none px-2 h-5 shadow-sm",
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
                          <TableRow>
                              <TableCell colSpan={5} className="text-center py-20 text-slate-300 font-bold uppercase text-[10px] tracking-widest">No leave applications found.</TableCell>
                          </TableRow>
                      )}
                </TableBody>
            </Table>
         </CardContent>
         <PaginationFooter 
            totalItems={displayLeaves.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
         />
      </Card>
      
      <FileLeaveDialog
        isOpen={isLeaveDialogOpen}
        onOpenChange={setIsLeaveDialogOpen}
        user={user}
      />

      {/* Calendar View Dialog */}
      <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <DialogContent className="sm:max-w-4xl rounded-[2.5rem] border-none p-0 overflow-hidden bg-white shadow-3xl h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-8 shrink-0">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md text-primary-light">
                                <CalendarDays className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Organizational Availability</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                    Visual Intelligence Feed • Multi-Status Tracking
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                <span className="text-[9px] font-black uppercase text-slate-400">Approved</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="text-[9px] font-black uppercase text-slate-400">Pending</span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="p-8 border-r border-slate-50 flex-1 flex flex-col items-center justify-center">
                    <Card className="border-none shadow-none p-4 rounded-[2rem] bg-slate-50/50">
                        <Calendar
                            mode="single"
                            selected={selectedCalendarDate}
                            onSelect={setSelectedCalendarDate}
                            modifiers={{
                                approved: calendarModifiers.approved,
                                pending: calendarModifiers.pending
                            }}
                            modifiersStyles={{
                                approved: { backgroundColor: 'hsl(var(--primary))', color: 'white', fontWeight: 'bold' },
                                pending: { backgroundColor: '#f59e0b', color: 'white', fontWeight: 'bold' }
                            }}
                            className="scale-110"
                            classNames={{
                                caption_label: "text-base font-black uppercase tracking-widest text-slate-900",
                                head_cell: "text-slate-300 font-black uppercase text-[10px] tracking-widest pb-6",
                                day: "h-10 w-10 p-0 font-bold text-xs uppercase rounded-xl hover:bg-white transition-all",
                                day_selected: "ring-2 ring-primary ring-offset-2",
                                day_today: "border-b-2 border-primary rounded-none",
                            }}
                        />
                    </Card>
                    <div className="mt-8 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4 max-w-xs">
                        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] font-medium text-blue-900/60 leading-relaxed uppercase tracking-tight">
                            Select a date to see the list of employees scheduled for time off. Highlights indicate active overlapping requests.
                        </p>
                    </div>
                </div>

                <div className="w-full md:w-[320px] bg-slate-50/30 flex flex-col h-full">
                    <div className="p-6 border-b bg-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Activity for</p>
                        <p className="text-lg font-black text-slate-900">{selectedCalendarDate ? format(selectedCalendarDate, 'MMMM d, yyyy') : 'No Date Selected'}</p>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-4">
                            {selectedDateLeaves.length > 0 ? selectedDateLeaves.map(leave => (
                                <div key={leave.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[10px]">
                                            {leave.employeeName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 leading-tight">{leave.employeeName}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{leave.type}</p>
                                        </div>
                                    </div>
                                    <Badge className={cn(
                                        "text-[8px] font-black uppercase border-none px-2 h-4",
                                        leave.status === 'approved' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                                    )}>
                                        {leave.status}
                                    </Badge>
                                </div>
                            )) : (
                                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-3">
                                    <CheckCircle2 className="h-8 w-8" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Full Operations</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>

            <DialogFooter className="p-6 bg-white border-t shrink-0">
                <DialogClose asChild>
                    <Button variant="ghost" className="rounded-xl h-11 px-10 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-900 transition-colors">
                        Close Calendar
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaginationFooter({ totalItems, currentPage, onPageChange }: { totalItems: number, currentPage: number, onPageChange: (p: number) => void }) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    if (totalItems === 0) return null;

    return (
        <CardFooter className="bg-slate-50/30 py-4 flex items-center justify-between border-t">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Showing {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(totalItems, currentPage * ITEMS_PER_PAGE)} of {totalItems} entries
            </div>
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] uppercase font-bold" 
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))} 
                    disabled={currentPage === 1}
                >
                    Prev
                </Button>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 px-2">{currentPage} / {totalPages || 1}</span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] uppercase font-bold" 
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} 
                    disabled={currentPage === totalPages || totalPages === 0}
                >
                    Next
                </Button>
            </div>
        </CardFooter>
    );
}
