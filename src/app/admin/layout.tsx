'use client';
import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from '@/components/admin-sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Search, FileClock, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Feedback, AppUser } from '@/lib/types';
import { loginLogs, feedbackLogs as initialFeedbackLogs, appUsers } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface InvoiceRequest {
  id: string;
  userName: string;
  userId: string;
  dateRange: string;
  status: 'Pending' | 'Sent';
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackLogs, setFeedbackLogs] = useState<Feedback[]>(initialFeedbackLogs);
  const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>([]);

  useEffect(() => {
    const storedFeedback = localStorage.getItem('feedbackLogs');
    if (storedFeedback) {
      setFeedbackLogs(JSON.parse(storedFeedback));
    }

    const storedRequests = localStorage.getItem('invoiceRequests');
    if (storedRequests) {
      setInvoiceRequests(JSON.parse(storedRequests));
    }
  }, []);
  
  const unreadFeedbackCount = feedbackLogs.filter(fb => !fb.read).length;
  const pendingRequestsCount = invoiceRequests.filter(req => req.status === 'Pending').length;
  const totalNotifications = unreadFeedbackCount + pendingRequestsCount;

  const handleSearch = () => {
    if (!searchTerm) return;

    const foundUser = appUsers.find(user => 
        user.id.toLowerCase() === searchTerm.toLowerCase() || user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (foundUser) {
        // This is a bit of a hack. In a real app, we'd use a global state manager.
        const event = new CustomEvent('admin-user-search', { detail: foundUser });
        window.dispatchEvent(event);
    } else {
        toast({
            variant: "destructive",
            title: "User not found",
            description: `No user found with ID or name: ${searchTerm}`,
        });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleSearch();
      }
  };


  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <AdminSidebar />
      </Sidebar>
      <SidebarInset>
         <div className="flex flex-col h-screen">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <div className="flex items-center gap-4">
                  <div className="relative">
                      <Input
                        type="search"
                        placeholder="Enter User ID or Name..."
                        className="w-full appearance-none bg-background pl-8 shadow-none md:w-64 lg:w-96"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                      />
                      <Button onClick={handleSearch} size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  </div>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button
                              variant="outline"
                              size="icon"
                              className="relative overflow-hidden rounded-full"
                          >
                              <Bell className="h-5 w-5" />
                              {totalNotifications > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
                                  {totalNotifications}
                                </Badge>
                              )}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-96">
                          <div className="space-y-2">
                              <h4 className="font-medium text-sm">Notifications</h4>
                              <p className="text-sm text-muted-foreground">
                                  You have {totalNotifications} new notifications.
                              </p>
                          </div>
                          <Separator className="my-4" />
                          <div className="space-y-4">
                              {invoiceRequests.filter(r => r.status === 'Pending').slice(0, 3).map(req => (
                                <div key={req.id} className="grid grid-cols-[25px_1fr] items-start gap-3">
                                  <FileClock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">New Invoice Request</p>
                                    <p className="text-sm text-muted-foreground">From {req.userName} for {req.dateRange}</p>
                                  </div>
                                </div>
                              ))}
                               {unreadFeedbackCount > 0 && pendingRequestsCount > 0 && <Separator />}
                              {feedbackLogs.filter(fb => !fb.read).slice(0, 3).map(fb => (
                                <div key={fb.id} className="grid grid-cols-[25px_1fr] items-start gap-3">
                                  <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">New Feedback Received</p>
                                    <p className="text-sm text-muted-foreground truncate">From {fb.userName}: "{fb.feedback}"</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(fb.timestamp), 'PP')}</p>
                                  </div>
                                </div>
                              ))}
                              {totalNotifications === 0 && (
                                <p className="text-sm text-muted-foreground text-center">No new notifications.</p>
                              )}
                          </div>
                      </PopoverContent>
                  </Popover>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
              {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
