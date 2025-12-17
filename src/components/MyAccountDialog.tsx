
'use client';

import React, { useReducer, useEffect, useTransition } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useAuth } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
import type { AppUser, ImagePlaceholder, Payment } from '@/lib/types';
import { format } from 'date-fns';
import { User as UserIcon, KeyRound, Edit, Trash2, Upload, FileText, Receipt, EyeOff, Eye, Pencil, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFileWithProgress } from '@/lib/storage-utils';

// State Management with useReducer
type State = {
  isEditingDetails: boolean;
  isPasswordDialogOpen: boolean;
  isPhotoPreviewOpen: boolean;
  profilePhotoFile: File | null;
  profilePhotoPreview: string | null;
  editableFormData: Partial<AppUser>;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
};

type Action =
  | { type: 'SET_EDIT_DETAILS'; payload: boolean }
  | { type: 'SET_PASSWORD_DIALOG'; payload: boolean }
  | { type: 'SET_PHOTO_PREVIEW_DIALOG'; payload: boolean }
  | { type: 'SET_PHOTO_FILE'; payload: { file: File | null, preview: string | null } }
  | { type: 'SET_FORM_DATA'; payload: Partial<AppUser> }
  | { type: 'UPDATE_FORM_DATA'; payload: { name: keyof AppUser, value: string } }
  | { type: 'SET_PASSWORD_FIELD'; payload: { field: 'current' | 'new' | 'confirm', value: string } }
  | { type: 'TOGGLE_PASSWORD_VISIBILITY'; payload: 'current' | 'new' | 'confirm' }
  | { type: 'RESET_PASSWORD_FORM' }
  | { type: 'RESET_UPLOAD' };

const initialState: State = {
  isEditingDetails: false,
  isPasswordDialogOpen: false,
  isPhotoPreviewOpen: false,
  profilePhotoFile: null,
  profilePhotoPreview: null,
  editableFormData: {},
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  showCurrentPassword: false,
  showNewPassword: false,
  showConfirmPassword: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_EDIT_DETAILS': return { ...state, isEditingDetails: action.payload };
    case 'SET_PASSWORD_DIALOG': return { ...state, isPasswordDialogOpen: action.payload };
    case 'SET_PHOTO_PREVIEW_DIALOG': return { ...state, isPhotoPreviewOpen: action.payload };
    case 'SET_PHOTO_FILE': return { ...state, profilePhotoFile: action.payload.file, profilePhotoPreview: action.payload.preview };
    case 'SET_FORM_DATA': return { ...state, editableFormData: action.payload };
    case 'UPDATE_FORM_DATA': return { ...state, editableFormData: { ...state.editableFormData, [action.payload.name]: action.payload.value } };
    case 'SET_PASSWORD_FIELD':
      if (action.payload.field === 'current') return { ...state, currentPassword: action.payload.value };
      if (action.payload.field === 'new') return { ...state, newPassword: action.payload.value };
      if (action.payload.field === 'confirm') return { ...state, confirmPassword: action.payload.value };
      return state;
    case 'TOGGLE_PASSWORD_VISIBILITY':
      if (action.payload === 'current') return { ...state, showCurrentPassword: !state.showCurrentPassword };
      if (action.payload === 'new') return { ...state, showNewPassword: !state.showNewPassword };
      if (action.payload === 'confirm') return { ...state, showConfirmPassword: !state.showConfirmPassword };
      return state;
    case 'RESET_PASSWORD_FORM': return { ...state, currentPassword: '', newPassword: '', confirmPassword: '', isPasswordDialogOpen: false };
    case 'RESET_UPLOAD':
      if (state.profilePhotoPreview) URL.revokeObjectURL(state.profilePhotoPreview);
      return { ...state, profilePhotoFile: null, profilePhotoPreview: null, isPhotoPreviewOpen: false };
    default: return state;
  }
}

interface MyAccountDialogProps {
  user: AppUser | null;
  authUser: User | null;
  planImage: ImagePlaceholder | null;
  generatedInvoices: Payment[];
  onLogout: () => void;
  children: React.ReactNode;
}

export function MyAccountDialog({ user, authUser, planImage, generatedInvoices, onLogout, children }: MyAccountDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();

  useEffect(() => {
    if (user) {
      dispatch({ type: 'SET_FORM_DATA', payload: user });
    }
  }, [user]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_PHOTO_FILE', payload: { file, preview: previewUrl } });
      dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: true });
    }
    e.target.value = '';
  };

  const handleSaveChanges = async () => {
    if (!authUser || !firestore) return;
    const userDocRef = doc(firestore, 'users', authUser.uid);
    try {
      await updateDoc(userDocRef, state.editableFormData);
      dispatch({ type: 'SET_EDIT_DETAILS', payload: false });
      toast({ title: "Changes Saved", description: "Your account details have been updated." });
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save your changes." });
    }
  };

  const handlePasswordChange = async () => {
    if (!authUser?.email) return;
    if (state.newPassword !== state.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }
    if (state.newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters long." });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(authUser.email, state.currentPassword);
      await reauthenticateWithCredential(authUser, credential);
      await updatePassword(authUser, state.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      dispatch({ type: 'RESET_PASSWORD_FORM' });
    } catch (error) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "The current password you entered is incorrect or the new password is too weak." });
    }
  };
  
  const handleProfilePhotoUpload = async () => {
    if (!state.profilePhotoFile || !authUser || !storage || !auth) return;
  
    const filePath = `users/${authUser.uid}/profile/profile-photo-${Date.now()}`;
    
    startTransition(async () => {
      try {
        await uploadFileWithProgress(storage, auth, filePath, state.profilePhotoFile, {}, setUploadProgress);
        toast({ title: 'Upload Complete', description: 'Your photo is being processed and will update shortly.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your profile photo.' });
      } finally {
        dispatch({ type: 'RESET_UPLOAD' });
        setUploadProgress(0);
      }
    });
  };
  
  const handleProfilePhotoDelete = async () => {
    if (!authUser || !user || !firestore) return;
    
    startTransition(async () => {
        const userDocRef = doc(firestore, 'users', authUser.uid);
        try {
            // The Cloud Function doesn't handle deletion, so we just clear the URL.
            // A more robust solution would involve a separate function to delete the file from storage.
            await updateDoc(userDocRef, { photoURL: null });
            toast({ title: 'Profile Photo Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove photo.' });
        }
    });
  };

  if (!user) return <>{children}</>;

  const displayPhoto = user.photoURL;

  return (
    <AlertDialog>
      <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>My Account</DialogTitle>
            <DialogDescription>Manage your plan, account details, and invoices.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] w-full">
            <div className="pr-6">
              <Tabs defaultValue="accounts">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="accounts"><UserIcon className="mr-2 h-4 w-4" />Accounts</TabsTrigger>
                  <TabsTrigger value="plan"><FileText className="mr-2 h-4 w-4" />Plan</TabsTrigger>
                  <TabsTrigger value="invoices"><Receipt className="mr-2 h-4 w-4" />Invoices</TabsTrigger>
                </TabsList>
                <TabsContent value="accounts" className="py-4">
                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      <div className="flex items-center gap-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={displayPhoto ?? undefined} alt={user.name || ''} />
                                <AvatarFallback className="text-3xl">{user.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {(isPending) && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="h-6 w-6 border-2 border-dashed rounded-full animate-spin border-white"></div>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Pencil className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Profile Photo</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Label htmlFor="photo-upload-input-user" className="w-full cursor-pointer">
                                <Upload className="mr-2 h-4 w-4" /> Upload new photo
                              </Label>
                            </DropdownMenuItem>
                            {displayPhoto && (
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Remove photo
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Input id="photo-upload-input-user" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={isPending} />
                        <div className="space-y-1">
                          <h4 className="font-semibold">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">Update your account details.</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold">Your Details</h4>
                          {!state.isEditingDetails && <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_EDIT_DETAILS', payload: true })}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="fullName" className="text-right">Full Name</Label>
                                <Input id="fullName" name="name" value={state.editableFormData.name || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'name', value: e.target.value}})} disabled={!state.isEditingDetails} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="email" className="text-right">Login Email</Label>
                                <Input id="email" name="email" type="email" value={state.editableFormData.email || ''} disabled={true} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="businessEmail" className="text-right">Business Email</Label>
                                <Input id="businessEmail" name="businessEmail" type="email" value={state.editableFormData.businessEmail || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'businessEmail', value: e.target.value}})} disabled={!state.isEditingDetails} />
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="businessName" className="text-right">Business Name</Label>
                                <Input id="businessName" name="businessName" value={state.editableFormData.businessName || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'businessName', value: e.target.value}})} disabled={!state.isEditingDetails}/>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Input id="address" name="address" value={state.editableFormData.address || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'address', value: e.target.value}})} disabled={!state.isEditingDetails}/>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
                                <Label htmlFor="contactNumber" className="text-right">Contact Number</Label>
                                <Input id="contactNumber" name="contactNumber" type="tel" value={state.editableFormData.contactNumber || ''} onChange={(e) => dispatch({type: 'UPDATE_FORM_DATA', payload: {name: 'contactNumber', value: e.target.value}})} disabled={!state.isEditingDetails}/>
                            </div>
                        </div>
                        {state.isEditingDetails && (
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="secondary" onClick={() => { dispatch({ type: 'SET_EDIT_DETAILS', payload: false }); dispatch({type: 'SET_FORM_DATA', payload: user}) }}>Cancel</Button>
                                <Button onClick={handleSaveChanges}>Save Changes</Button>
                            </div>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-4">Security</h4>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: true })}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                          <Button variant="outline" onClick={() => toast({ title: "Coming soon!" })}><Shield className="mr-2 h-4 w-4" />Enable 2FA</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="plan" className="py-4">
                  <Card>
                      <CardContent className="p-0">
                          {planImage && (
                              <div className="relative h-48 w-full">
                                  <Image src={planImage.imageUrl} alt={user.clientType || 'Plan Image'} fill style={{ objectFit: 'cover' }} data-ai-hint={planImage.imageHint} />
                              </div>
                          )}
                          <div className="p-6">
                            <h3 className="text-xl font-bold">{user.plan?.name} ({user.clientType})</h3>
                            <p className="text-lg font-bold text-foreground">₱{user.plan?.price.toLocaleString()}/month</p>
                          </div>
                      </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="invoices" className="py-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Invoice ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {generatedInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                              <TableCell>{invoice.id}</TableCell>
                              <TableCell>{format(new Date(invoice.date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                                    invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                    invoice.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                )}>
                                    {invoice.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">₱{invoice.amount.toFixed(2)}</TableCell>
                          </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
          <DialogFooter className="pr-6 pt-4 border-t">
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently remove your profile photo.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleProfilePhotoDelete}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Photo Preview Dialog */}
      <Dialog open={state.isPhotoPreviewOpen} onOpenChange={(isOpen) => { if (!isPending) dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: isOpen }); }}>
        <DialogContent onInteractOutside={(e) => { if (isPending) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>Preview Profile Photo</DialogTitle>
          </DialogHeader>
          <div className="my-4 flex justify-center">
            {state.profilePhotoPreview && <Image src={state.profilePhotoPreview} alt="Preview" width={200} height={200} className="rounded-full aspect-square object-cover" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => dispatch({type: 'RESET_UPLOAD'})} disabled={isPending}>Cancel</Button>
            <Button onClick={handleProfilePhotoUpload} disabled={isPending}>
              {isPending ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={state.isPasswordDialogOpen} onOpenChange={(isOpen) => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: isOpen })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type={state.showCurrentPassword ? 'text' : 'password'} value={state.currentPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'current', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'current'})}>
                    {state.showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type={state.showNewPassword ? 'text' : 'password'} value={state.newPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'new', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'new'})}>
                    {state.showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type={state.showConfirmPassword ? 'text' : 'password'} value={state.confirmPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'confirm', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'confirm'})}>
                    {state.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => dispatch({ type: 'SET_PASSWORD_DIALOG', payload: false })}>Cancel</Button>
            <Button onClick={handlePasswordChange}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
}
