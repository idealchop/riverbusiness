'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { useAuth } from '@/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const passwordSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    const { toast } = useToast();

    const [oobCode, setOobCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
    });

    useEffect(() => {
        const code = searchParams.get('oobCode');
        if (!code) {
            setError('Invalid password reset link. Please request a new one.');
            setLoading(false);
            return;
        }

        if (!auth) {
            // This might happen on initial load. Let's wait.
            return;
        }
        
        setOobCode(code);
        verifyPasswordResetCode(auth, code)
            .then(() => {
                setLoading(false);
            })
            .catch((err) => {
                setError('Your password reset link is invalid or has expired. Please request a new one.');
                setLoading(false);
            });
    }, [searchParams, auth]);

    const onSubmit = async (data: PasswordFormValues) => {
        if (!oobCode || !auth) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
            return;
        }
        try {
            await confirmPasswordReset(auth, oobCode, data.password);
            setSuccess(true);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset password. The link may have expired.' });
        }
    };
    
    if (loading || !auth) {
        return (
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Skeleton className="h-16 w-16 mb-4 mx-auto rounded-full" />
                    <Skeleton className="h-8 w-48 mx-auto" />
                    <Skeleton className="h-5 w-64 mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
                    <CardTitle>Invalid Link</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{error}</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/login')}>Back to Login</Button>
                </CardFooter>
            </Card>
        )
    }

    if (success) {
        return (
             <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <CardTitle>Password Reset!</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Your password has been successfully updated. You can now log in with your new password.</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={() => router.push('/login')}>Proceed to Login</Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <Logo className="h-16 w-16 mb-4 mx-auto" />
                <CardTitle>Create a New Password</CardTitle>
                <CardDescription>
                    Please enter your new password below.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
                    <div className="grid gap-2 relative">
                        <Label htmlFor="password">New Password</Label>
                        <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} disabled={isSubmitting} />
                         <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => setShowPassword(!showPassword)} type="button">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                    </div>
                     <div className="grid gap-2 relative">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} disabled={isSubmitting} />
                        <Button size="icon" variant="ghost" className="absolute right-1 top-7 h-8 w-8" onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <ResetPasswordContent />
            </Suspense>
        </main>
    )
}
