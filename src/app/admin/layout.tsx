
'use client';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: appUsers } = useCollection<AppUser>(usersQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    })
  }

  const handleSearch = () => {
    if (!searchTerm || !appUsers) return;

    const foundUser = appUsers.find(user => 
        user.clientId?.toLowerCase() === searchTerm.toLowerCase() || (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (foundUser) {
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

  const adminUser = appUsers?.find(u => u.id === user?.uid);


  return (
      <div className="flex flex-col h-screen">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
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
                           
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-96">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Notifications</h4>
                            <p className="text-sm text-muted-foreground">
                                You have 0 new notifications.
                            </p>
                        </div>
                        <Separator className="my-4" />
                    </PopoverContent>
                </Popover>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="overflow-hidden rounded-full"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={adminUser?.photoURL} alt={adminUser?.name} />
                                <AvatarFallback>{adminUser?.name?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            <p className="font-semibold">{adminUser?.businessName}</p>
                            <p className="text-xs text-muted-foreground font-normal">{adminUser?.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
      </div>
  );
}
