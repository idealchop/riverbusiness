'use client';
import React from 'react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppSidebar } from '@/components/app-sidebar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Bell, Truck, User, KeyRound, Info, Camera } from 'lucide-react';
import { deliveries } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const recentDeliveries = deliveries.slice(0, 4);

  const getStatusBadgeVariant = (status: 'Delivered' | 'In Transit' | 'Pending'): 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Delivered':
        return 'default';
      case 'In Transit':
        return 'secondary';
      case 'Pending':
        return 'outline';
      default:
        return 'outline';
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
         <div className="flex flex-col h-full">
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
            <SidebarTrigger />
            <div className="flex-1" />
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                >
                    <Bell className="h-5 w-5" />
                </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Notifications</h4>
                    <Badge variant="default" className="rounded-full">
                        {recentDeliveries.filter(d => d.status !== 'Delivered').length} New
                    </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Recent water delivery updates.
                    </p>
                </div>
                <Separator className="my-4" />
                <div className="space-y-4">
                    {recentDeliveries.map((delivery) => (
                    <div key={delivery.id} className="grid grid-cols-[25px_1fr] items-start gap-4">
                        <span className="flex h-2 w-2 translate-y-1 rounded-full bg-primary" />
                        <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Delivery {delivery.id}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center justify-between">
                            <span>{delivery.volumeGallons} Gallons</span>
                            <Badge
                            variant={getStatusBadgeVariant(delivery.status)}
                            className={cn('text-xs',
                                delivery.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                            )}
                            >
                            {delivery.status}
                            </Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(delivery.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    ))}
                </div>
                </PopoverContent>
            </Popover>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                >
                    {userAvatar && (
                    <Image
                        src={userAvatar.imageUrl}
                        width={40}
                        height={40}
                        alt={userAvatar.description}
                        data-ai-hint={userAvatar.imageHint}
                        className="overflow-hidden rounded-full"
                    />
                    )}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <Dialog>
                    <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>My Account</DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>My Account</DialogTitle>
                        <DialogDescription>
                            Manage your account settings.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center space-x-4 py-4">
                            {userAvatar && (
                                <div className="relative">
                                    <Image
                                        src={userAvatar.imageUrl}
                                        width={80}
                                        height={80}
                                        alt={userAvatar.description}
                                        data-ai-hint={userAvatar.imageHint}
                                        className="rounded-full"
                                    />
                                    <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
                                        <Camera className="h-4 w-4" />
                                        <Input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    </Button>
                                </div>
                            )}
                            <div>
                                <h4 className="font-semibold text-lg">Juan dela Cruz</h4>
                                <p className="text-sm text-muted-foreground">juandelacruz@email.com</p>
                            </div>
                        </div>
                        <Tabs defaultValue="username">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="username"><User className="mr-2"/>Username</TabsTrigger>
                            <TabsTrigger value="password"><KeyRound className="mr-2"/>Password</TabsTrigger>
                            <TabsTrigger value="clientid"><Info className="mr-2"/>Client ID</TabsTrigger>
                        </TabsList>
                        <TabsContent value="username" className="py-4">
                            <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input id="username" defaultValue="Juan dela Cruz" />
                            </div>
                            <Button className="mt-4">Save</Button>
                        </TabsContent>
                        <TabsContent value="password" className="py-4">
                            <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" />
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" />
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type="password" />
                            </div>
                            <Button className="mt-4">Change Password</Button>
                        </TabsContent>
                        <TabsContent value="clientid" className="py-4">
                            <div className="space-y-2">
                                <Label>Client ID</Label>
                                <Input readOnly value="CL-12345-67890" />
                                <p className="text-sm text-muted-foreground">This is your unique client identifier.</p>
                            </div>
                        </TabsContent>
                        </Tabs>
                    </DialogContent>
                    </Dialog>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </header>
            <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
