'use client';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
                <Skeleton className="h-10 w-48" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-full" /></CardContent><CardFooter><Skeleton className="h-2 w-full" /></CardFooter></Card>
                <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-2 w-full" /></CardContent><CardFooter><Skeleton className="h-5 w-20" /></CardFooter></Card>
                <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-2 w-full" /></CardContent><CardFooter><Skeleton className="h-5 w-20" /></CardFooter></Card>
                <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent className="flex flex-col gap-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full mt-2" /></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <Skeleton className="h-6 w-48" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-36" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </CardHeader>
                    <CardContent className="h-80">
                        <Skeleton className="h-full w-full" />
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></CardHeader><CardContent><Skeleton className="h-5 w-24" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-1" /></CardHeader><CardContent><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-full mt-2" /></CardContent></Card>
                </div>
            </div>
        </div>
    );
}
