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
import { Bell, Truck } from 'lucide-react';
import { deliveries } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function DashboardLayout({
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
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <SidebarTrigger className="flex md:hidden" />
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
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="relative flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
