
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const router = useRouter();

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <Logo className="h-16 w-16 mb-4 mx-auto" />
                    <CardTitle>Reset Your Password</CardTitle>
                    <CardDescription>
                        This page is under construction to fix a routing issue. Please try again shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full" onClick={() => router.push('/login')}>
                        Back to Login
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
