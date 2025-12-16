
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bell, Search, User, Edit, KeyRound, EyeOff, Eye, Upload, LogOut, Pencil, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useUser, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import type { AppUser } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { CircularProgress } from '@/components/ui/circular-progress';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  const adminUserDocRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
  const { data: adminUser } = useDoc<AppUser>(adminUserDocRef);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: appUsers } = useCollection<AppUser>(usersQuery);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [editableFormData, setEditableFormData] = React.useState<Partial<AppUser>>({});
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  useEffect(() => {
    if (!isUserLoading && !authUser) {
      router.push('/login');
    }
  }, [authUser, isUserLoading, router]);

  useEffect(() => {
    if (adminUser) {
      setEditableFormData(adminUser);
    }
  }, [adminUser]);

  const handleSearch = () => {
    if (!searchTerm) return;
    const event = new CustomEvent('admin-user-search-term', { detail: searchTerm });
    window.dispatchEvent(event);
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
      if (adminUserDocRef && editableFormData) {
          updateDocumentNonBlocking(adminUserDocRef, editableFormData);
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
    if (!authUser || !firestore || !adminUserDocRef) return;
    setIsUploading(true);
    setUploadProgress(0);
    const storage = getStorage();
    const filePath = `users/${authUser.uid}/profile/${file.name}`;
    const storageRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
          toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your photo. Please try again.' });
          setIsUploading(false);
          setUploadProgress(0);
        },
        async () => {
            const downloadURL = await getDownloadURL(storageRef);
            updateDocumentNonBlocking(adminUserDocRef, { photoURL: downloadURL });
            toast({ title: 'Profile Photo Updated', description: 'Your new photo has been saved.' });
            setIsUploading(false);
            setUploadProgress(0);
        }
    );
  };

  const handleProfilePhotoDelete = async () => {
    if (!authUser || !adminUserDocRef || !adminUser?.photoURL) return;

    const storage = getStorage();
    const photoRef = ref(storage, adminUser.photoURL);

    try {
      await deleteObject(photoRef);
      updateDocumentNonBlocking(adminUserDocRef, { photoURL: null });
      toast({
        title: 'Profile Photo Deleted',
        description: 'Your profile photo has been removed.',
      });
    } catch (error) {
      console.error("Error deleting profile photo: ", error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Could not delete the photo. Please try again.',
      });
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
                <AlertDialog>
                  <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="overflow-hidden rounded-full"
                      >
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={adminUser?.photoURL ?? undefined} alt="Admin" />
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
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
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                      <div className="relative group cursor-pointer">
                                                          <Avatar className="h-20 w-20">
                                                              <AvatarImage src={editableFormData.photoURL ?? undefined} alt={editableFormData.name || ''} />
                                                              <AvatarFallback className="text-3xl">{editableFormData.name?.charAt(0)}</AvatarFallback>
                                                          </Avatar>
                                                          {isUploading ? (
                                                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                                                <CircularProgress value={uploadProgress} />
                                                            </div>
                                                          ) : (
                                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Pencil className="h-6 w-6 text-white" />
                                                            </div>
                                                          )}
                                                      </div>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="start">
                                                      <DropdownMenuLabel>Profile Photo</DropdownMenuLabel>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem asChild>
                                                          <Label htmlFor="admin-photo-upload" className="w-full cursor-pointer">
                                                              <Upload className="mr-2 h-4 w-4" />
                                                              Upload new photo
                                                          </Label>
                                                      </DropdownMenuItem>
                                                      {editableFormData.photoURL && (
                                                          <AlertDialogTrigger asChild>
                                                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                                  Remove photo
                                                              </DropdownMenuItem>
                                                          </AlertDialogTrigger>
                                                      )}
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                              <Input id="admin-photo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleProfilePhotoUpload(e.target.files[0])}/>

                                              <div className="space-y-1">
                                                  <h4 className="font-semibold">{editableFormData.name}</h4>
                                                  <p className="text-sm text-muted-foreground">Update your account details.</p>
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
                                                  <Input id="email" name="email" type="email" value={editableFormData.email || ''} onChange={handleAccountInfoChange} disabled={true} />
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
                        <Button variant="outline"><LogOut className="mr-2 h-4 w-4" />Logout</Button>
                      </DialogFooter>
                    </DialogContent>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently remove your profile photo.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleProfilePhotoDelete}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </Dialog>
                </AlertDialog>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Update Password</DialogTitle>
                      <DialogDescription>
                      Enter your current and new password to update.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                      <div className="relative">
                          <Label htmlFor="current-password">Current Password</Label>
                          <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <div className="relative">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowNewPassword(!showNewPassword)}>
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                      <div className="relative">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                          <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
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
  );
}

    