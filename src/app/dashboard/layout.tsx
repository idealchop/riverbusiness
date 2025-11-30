
'use client';
import React, { useState, useEffect } from 'react';
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
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Bell, Truck, User, KeyRound, Info, Camera, Eye, EyeOff, LifeBuoy } from 'lucide-react';
import { deliveries } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const recentDeliveries = deliveries.slice(0, 4);

  const [userName, setUserName] = useState('Juan dela Cruz');
  const [tempUserName, setTempUserName] = useState(userName);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    const onboardingDataString = localStorage.getItem('onboardingData');
    if (onboardingDataString) {
      const onboardingData = JSON.parse(onboardingDataString);
      if (onboardingData.clientType) {
        setAccountType(onboardingData.clientType);
      }
    }
  }, []);

  const handleSaveUsername = () => {
    setUserName(tempUserName);
  };

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
      <div className="flex flex-col h-full">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            
            <div className="flex items-center">
                <span className="font-bold">River Business</span>
            </div>
          </Link>
          <div className="flex-1" />
          <Link href="/dashboard/support">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <LifeBuoy className="h-4 w-4" />
            </Button>
          </Link>
          <Popover>
              <PopoverTrigger asChild>
              <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-full"
              >
                  <Bell className="h-4 w-4" />
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
                      <p className="text-xs text-muted-foreground">{new Date(delivery.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                  </div>
                  ))}
              </div>
              </PopoverContent>
          </Popover>
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer">
                {userAvatar && (
                  <Image
                    src={userAvatar.imageUrl}
                    width={40}
                    height={40}
                    alt={userAvatar.description}
                    data-ai-hint={userAvatar.imageHint}
                    className="rounded-full"
                  />
                )}
                <div className="hidden sm:flex flex-col items-start">
                  <p className="font-semibold text-sm">{userName}</p>
                  <p className="text-xs text-muted-foreground">{accountType ? `${accountType} Plan` : 'Account'}</p>
                </div>
              </div>
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
                  <h4 className="font-semibold text-lg">{userName}</h4>
                  <p className="text-sm text-muted-foreground">{accountType ? `${accountType} Plan` : 'Account'}</p>
                </div>
              </div>
              <Tabs defaultValue="username">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="username"><User className="mr-2" />Username</TabsTrigger>
                  <TabsTrigger value="password"><KeyRound className="mr-2" />Password</TabsTrigger>
                  <TabsTrigger value="clientid"><Info className="mr-2" />Client ID</TabsTrigger>
                </TabsList>
                <TabsContent value="username" className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={tempUserName} onChange={(e) => setTempUserName(e.target.value)} />
                  </div>
                  <Button className="mt-4" onClick={handleSaveUsername}>Save</Button>
                </TabsContent>
                <TabsContent value="password" className="py-4">
                  <div className="space-y-4">
                    <div className="space-y-2 relative">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} />
                      <Button size="icon" variant="ghost" className="absolute right-1 top-6" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type={showNewPassword ? 'text' : 'password'} />
                      <Button size="icon" variant="ghost" className="absolute right-1 top-6" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} />
                      <Button size="icon" variant="ghost" className="absolute right-1 top-6" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
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
              <div className="flex justify-end pt-4">
                  <Button variant="outline">Logout</Button>
              </div>
            </DialogContent>
          </Dialog>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="container">
              {React.cloneElement(children as React.ReactElement, { userName })}
            </div>
          </main>
      </div>
  );
}
