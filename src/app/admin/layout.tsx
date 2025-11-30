
'use client';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Feedback, AppUser } from '@/lib/types';
import { feedbackLogs as initialFeedbackLogs, appUsers } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackLogs, setFeedbackLogs] = useState<Feedback[]>(initialFeedbackLogs);

  useEffect(() => {
    const storedFeedback = localStorage.getItem('feedbackLogs');
    if (storedFeedback) {
      setFeedbackLogs(JSON.parse(storedFeedback));
    }
  }, []);
  
  const unreadFeedbackCount = feedbackLogs.filter(fb => !fb.read).length;
  const totalNotifications = unreadFeedbackCount;

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
      <SidebarProvider>
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
