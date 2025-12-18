
'use client';

import React, { useReducer, useEffect, useTransition } from 'react';
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useAuth, useStorage } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from 'firebase/auth';
import type { AppUser } from '@/lib/types';
import { KeyRound, Edit, Trash2, Upload, LogOut, EyeOff, Eye, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

interface AdminMyAccountDialogProps {
  adminUser: AppUser | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AdminMyAccountDialog({ adminUser, isOpen, onOpenChange }: AdminMyAccountDialogProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isPending, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const router = useRouter();

  useEffect(() => {
    if (adminUser) {
      dispatch({ type: 'SET_FORM_DATA', payload: adminUser });
    }
  }, [adminUser]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_PHOTO_FILE', payload: { file, preview: previewUrl } });
      dispatch({ type: 'SET_PHOTO_PREVIEW_DIALOG', payload: true });
    }
    e.target.value = '';
  };
  
  const handleLogout = () => {
    if (!auth) return;
    signOut(auth).then(() => router.push('/login'));
  };

  const handleSaveChanges = async () => {
    if (!auth.currentUser || !firestore) return;
    const adminUserDocRef = doc(firestore, 'users', auth.currentUser.uid);
    try {
      await updateDoc(adminUserDocRef, state.editableFormData);
      dispatch({ type: 'SET_EDIT_DETAILS', payload: false });
      toast({ title: "Changes Saved", description: "Your account details have been updated." });
    } catch (error) {
      console.error("Error saving changes: ", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save your changes." });
    }
  };

  const handlePasswordChange = async () => {
    if (!auth.currentUser?.email) return;
    if (state.newPassword !== state.confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, state.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, state.newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully." });
      dispatch({ type: 'RESET_PASSWORD_FORM' });
    } catch (error) {
      toast({ variant: "destructive", title: "Password Update Failed", description: "The current password you entered is incorrect." });
    }
  };

  const handleProfilePhotoUpload = async () => {
    if (!state.profilePhotoFile || !auth.currentUser || !storage) return;

    const filePath = `users/${auth.currentUser.uid}/profile/profile-photo-${Date.now()}`;
    
    startTransition(() => {
        uploadFileWithProgress(storage, auth, filePath, state.profilePhotoFile, {}, setUploadProgress)
        .then(() => {
            toast({ title: 'Upload Complete', description: 'Your photo is being processed and will update shortly.' });
        })
        .catch((error) => {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your profile photo.' });
        })
        .finally(() => {
            dispatch({ type: 'RESET_UPLOAD' });
            setUploadProgress(0);
        });
    });
  };

  const handleProfilePhotoDelete = async () => {
    if (!auth.currentUser || !adminUser?.photoURL || !firestore) return;
    
    startTransition(async () => {
        const userDocRef = doc(firestore, 'users', auth.currentUser!.uid);
        try {
            await updateDoc(userDocRef, { photoURL: null });
            toast({ title: 'Profile Photo Removed' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not remove photo.' });
        }
    });
  };

  if (!adminUser) return null;

  const displayPhoto = adminUser.photoURL;

  return (
    <AlertDialog>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>My Account</DialogTitle>
            <DialogDescription>Manage your account details.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] w-full">
            <div className="pr-6 py-4 space-y-6">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <div className="relative group cursor-pointer">
                            <Avatar className="h-20 w-20">
                            <AvatarImage src={displayPhoto ?? undefined} alt={adminUser.name || ''} />
                            <AvatarFallback className="text-3xl">{adminUser.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {(isPending || uploadProgress > 0) && (
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
                            <Label htmlFor="admin-photo-upload" className="w-full cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload new photo
                            </Label>
                        </DropdownMenuItem>
                        {displayPhoto && (
                            <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove photo
                            </DropdownMenuItem>
                            </AlertDialogTrigger>
                        )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Input id="admin-photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={isPending} />
                    <div className="space-y-1">
                        <h4 className="font-semibold">{adminUser.name}</h4>
                        <p className="text-sm text-muted-foreground">Update your account details.</p>
                    </div>
                    </div>
                </div>
                <Separator />
                <div>
                    <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold">Your Details</h4>
                    {!state.isEditingDetails && <Button variant="outline" size="sm" onClick={() => dispatch({type: 'SET_EDIT_DETAILS', payload: true})}><Edit className="mr-2 h-4 w-4" />Edit Details</Button>}
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
                        <Button variant="secondary" onClick={() => {dispatch({type: 'SET_EDIT_DETAILS', payload: false}); dispatch({type: 'SET_FORM_DATA', payload: adminUser})}}>Cancel</Button>
                        <Button onClick={handleSaveChanges}>Save Changes</Button>
                    </div>
                    )}
                </div>
                <Separator />
                <div>
                    <h4 className="font-semibold mb-4">Security</h4>
                    <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => dispatch({type: 'SET_PASSWORD_DIALOG', payload: true})}><KeyRound className="mr-2 h-4 w-4" />Update Password</Button>
                    </div>
                </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pr-6 pt-4 border-t">
            <Button variant="outline" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button>
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

      <Dialog open={state.isPhotoPreviewOpen} onOpenChange={(isOpen) => { if (!isPending) dispatch({type: 'SET_PHOTO_PREVIEW_DIALOG', payload: isOpen}); }}>
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

      <Dialog open={state.isPasswordDialogOpen} onOpenChange={(isOpen) => dispatch({type: 'SET_PASSWORD_DIALOG', payload: isOpen})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
                <Label htmlFor="current-password-admin">Current Password</Label>
                <Input id="current-password-admin" type={state.showCurrentPassword ? 'text' : 'password'} value={state.currentPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'current', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'current'})}>
                    {state.showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="new-password-admin">New Password</Label>
                <Input id="new-password-admin" type={state.showNewPassword ? 'text' : 'password'} value={state.newPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'new', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'new'})}>
                    {state.showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <div className="relative">
                <Label htmlFor="confirm-password-admin">Confirm New Password</Label>
                <Input id="confirm-password-admin" type={state.showConfirmPassword ? 'text' : 'password'} value={state.confirmPassword} onChange={(e) => dispatch({type: 'SET_PASSWORD_FIELD', payload: {field: 'confirm', value: e.target.value}})} />
                <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => dispatch({type: 'TOGGLE_PASSWORD_VISIBILITY', payload: 'confirm'})}>
                    {state.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => dispatch({type: 'SET_PASSWORD_DIALOG', payload: false})}>Cancel</Button>
            <Button onClick={handlePasswordChange}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
}
