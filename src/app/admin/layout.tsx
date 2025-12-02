
'use client';
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, LogOut, Upload, Edit, KeyRound, Eye, EyeOff, Shield } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useUser, useCollection, useFirestore, useMemoFirebase, useAuth, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: appUsers } = useCollection<AppUser>(usersQuery);

  const adminUser = appUsers?.find(u => u.id === authUser?.uid);
  const userDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [editableFormData, setEditableFormData] = React.useState<Partial<AppUser>>({});
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');


  useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  useEffect(() => {
    if(adminUser) {
      setEditableFormData(adminUser);
    }
  }, [adminUser]);
  
  const handleLogout = () => {
    if (!auth) return;
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

  const handleAccountInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableFormData({
        ...editableFormData,
        [e.target.name]: e.target.value
    });
  };

  const handleSaveChanges = () => {
    if (userDocRef && editableFormData) {
        updateDocumentNonBlocking(userDocRef, editableFormData);
        setIsEditingDetails(false);
        toast({
            title: "Changes Saved",
            description: "Your account details have been successfully updated.",
        });
    }
  };

  const handleCancelEdit = () => {
    if (adminUser) {
        setEditableFormData(adminUser);
    }
    setIsEditingDetails(false);
  }

  const handlePasswordChange = async () => {
    if (!authUser || !authUser.email) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to change your password." });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters long." });
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, newPassword);
      
      toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
        let description = 'An unexpected error occurred. Please try again.';
        if (error.code === 'auth/wrong-password') {
            description = 'The current password you entered is incorrect.';
        } else if (error.code === 'auth/weak-password') {
            description = 'The new password is too weak.';
        }
       toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: description,
      });
    }
  }

  const handleProfilePhotoUpload = async (file: File) => {
    if (!authUser || !firestore) return;
    const storage = getStorage();
    const filePath = `users/${authUser.uid}/profile/${file.name}`;
    const storageRef = ref(storage, filePath);

    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(firestore, 'users', authUser.uid);
      updateDocumentNonBlocking(userRef, { photoURL: downloadURL });

      toast({ title: 'Profile Photo Updated', description: 'Your new photo has been saved.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your photo. Please try again.' });
    }
  };

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
                 <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                    <DialogTrigger asChild>
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
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>My Account</DialogTitle>
                            <DialogDescription>
                            Manage your account details.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh] w-full">
                            <div className="pr-6 py-4">
                                {editableFormData ? (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center gap-4 mb-4">
                                                <Avatar className="h-20 w-20">
                                                    <AvatarImage src={editableFormData.photoURL} alt={editableFormData.name} />
                                                    <AvatarFallback className="text-3xl">{editableFormData.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="space-y-1">
                                                    <h4 className="font-semibold">Profile Photo</h4>
                                                    <p className="text-sm text-muted-foreground">Update your photo.</p>
                                                    <Button asChild variant="outline" size="sm">
                                                        <Label>
                                                            <Upload className="mr-2 h-4 w-4" />
                                                            Upload Photo
                                                            <Input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProfilePhotoUpload(e.target.files[0])}/>
                                                        </Label>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <Separator />
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold">Your Details</h4>
                                            {!isEditingDetails && <Button variant="outline" size="sm" onClick={() => setIsEditingDetails(true)}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                    <Label htmlFor="fullName" className="text-right">Full Name</Label>
                                                    <Input id="fullName" name="name" value={editableFormData.name || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                                </div>
                                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                    <Label htmlFor="email" className="text-right">Login Email</Label>
                                                    <Input id="email" name="email" type="email" value={editableFormData.email || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails} />
                                                </div>
                                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                    <Label htmlFor="address" className="text-right">Address</Label>
                                                    <Input id="address" name="address" value={editableFormData.address || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                                </div>
                                                <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                                    <Label htmlFor="contactNumber" className="text-right">Contact Number</Label>
                                                    <Input id="contactNumber" name="contactNumber" type="tel" value={editableFormData.contactNumber || ''} onChange={handleAccountInfoChange} disabled={!isEditingDetails}/>
                                                </div>
                                            </div>
                                            {isEditingDetails && (
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
                                                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                                                </div>
                                            )}
                                        </div>
                                        <Separator />
                                        <div>
                                            <h4 className="font-semibold mb-4">Security</h4>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <Button onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : <p>No account information available.</p>}
                            </div>
                        </ScrollArea>
                        <DialogFooter className="pr-6 pt-4">
                            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Password</DialogTitle>
                            <DialogDescription>
                            Enter your current and new password to update.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1 relative">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                                <div className="space-y-1 relative">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                                <div className="space-y-1 relative">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                <Button size="icon" variant="ghost" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handlePasswordChange}>Change Password</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
      </div>
  );
}

    