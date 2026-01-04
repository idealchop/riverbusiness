
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { SanitationVisit, AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Signature, CheckCircle, Save } from 'lucide-react';
import { Logo } from '@/components/icons';
import Image from 'next/image';

// A simple signature pad component
const SignaturePad = ({ onSave, label }: { onSave: (dataUrl: string) => void, label: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const getPosition = (event: MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        if (event instanceof MouseEvent) {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        } else if (event.touches[0]) {
             return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
        }
        return { x: 0, y: 0 };
    };

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const pos = getPosition(event.nativeEvent);
        context.beginPath();
        context.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const pos = getPosition(event.nativeEvent);
        context.lineTo(pos.x, pos.y);
        context.stroke();
    };

    const endDrawing = () => {
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        context.closePath();
        setIsDrawing(false);
    };

    const clearPad = () => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL('image/png'));
        }
    };


    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="border rounded-md bg-white">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full h-auto cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearPad}>Clear</Button>
                <Button size="sm" onClick={handleSave}>Confirm Signature</Button>
            </div>
        </div>
    );
};


export default function SanitationReportPage() {
    const { visitId: linkId } = useParams();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visitData, setVisitData] = useState<SanitationVisit | null>(null);
    const [clientData, setClientData] = useState<AppUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!firestore || !linkId) return;

        const fetchVisit = async () => {
            setIsLoading(true);
            try {
                const linkRef = doc(firestore, 'publicSanitationLinks', linkId as string);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists()) {
                    throw new Error("This report link is invalid or has expired.");
                }

                const { userId, visitId } = linkSnap.data();
                
                const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
                const visitSnap = await getDoc(visitRef);

                if (!visitSnap.exists()) {
                     throw new Error("The sanitation visit report could not be found.");
                }
                
                const clientRef = doc(firestore, 'users', userId);
                const clientSnap = await getDoc(clientRef);
                
                setClientData(clientSnap.data() as AppUser);
                setVisitData({ id: visitSnap.id, ...visitSnap.data() } as SanitationVisit);

            } catch (err: any) {
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchVisit();
    }, [firestore, linkId]);

    const handleChecklistChange = (index: number, field: 'checked' | 'remarks', value: boolean | string) => {
        if (!visitData) return;
        const newChecklist = [...(visitData.checklist || [])];
        (newChecklist[index] as any)[field] = value;
        setVisitData({ ...visitData, checklist: newChecklist });
    };
    
    const handleSaveSignature = (type: 'officer' | 'client', dataUrl: string) => {
        if (!visitData) return;
        if (type === 'officer') {
            setVisitData({ ...visitData, officerSignature: dataUrl });
        } else {
            setVisitData({ ...visitData, clientSignature: dataUrl });
        }
        toast({ title: "Signature Captured!", description: "The signature has been added to the report." });
    };
    
    const handleSubmitReport = async () => {
        if (!firestore || !linkId || !visitData) return;

        setIsSubmitting(true);
        try {
            const linkRef = doc(firestore, 'publicSanitationLinks', linkId as string);
            const linkSnap = await getDoc(linkRef);
            const { userId, visitId } = linkSnap.data() as any;

            const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
            await updateDoc(visitRef, {
                checklist: visitData.checklist,
                officerSignature: visitData.officerSignature,
                clientSignature: visitData.clientSignature,
                status: 'Completed'
            });

            toast({ title: "Report Submitted!", description: "The sanitation report has been successfully saved." });
        } catch (error) {
            console.error("Error submitting report:", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "There was an error saving the report." });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) {
        return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted p-4">
                 <div className="w-full max-w-4xl space-y-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                    <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                    <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
                 </div>
            </main>
        )
    }
    
    if (error) {
         return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                        <CardTitle>An Error Occurred</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTitle>Unable to load report</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </main>
         )
    }

    return (
        <main className="min-h-screen w-full bg-muted p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex items-center gap-4">
                    <Logo className="h-16 w-16" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Sanitation Visit Report</h1>
                        <p className="text-muted-foreground">
                            {clientData?.businessName} - {visitData ? format(new Date(visitData.scheduledDate), 'PP') : ''}
                        </p>
                    </div>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Sanitation Checklist</CardTitle>
                        <CardDescription>Please complete the following checklist. Any unchecked items require remarks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {visitData?.checklist?.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-start gap-4 p-3 rounded-md border bg-background">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Checkbox 
                                            id={`check-${index}`} 
                                            checked={item.checked} 
                                            onCheckedChange={(checked) => handleChecklistChange(index, 'checked', !!checked)}
                                        />
                                        <Label htmlFor={`check-${index}`} className="text-sm">{item.item}</Label>
                                    </div>
                                    {!item.checked && (
                                         <Input 
                                            placeholder="Remarks..." 
                                            className="h-9 text-sm"
                                            value={item.remarks}
                                            onChange={(e) => handleChecklistChange(index, 'remarks', e.target.value)}
                                         />
                                    )}
                                    {item.checked && <CheckCircle className="h-5 w-5 text-green-500" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Signature className="h-5 w-5" />Signatures</CardTitle>
                        <CardDescription>Please provide digital signatures to confirm the completion and accuracy of this report.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {visitData?.officerSignature ? (
                            <div className="space-y-2">
                                <Label>Quality Officer's Signature</Label>
                                <Image src={visitData.officerSignature} alt="Officer Signature" width={400} height={150} className="rounded-md border bg-white" />
                                <Button size="sm" variant="outline" onClick={() => setVisitData({...visitData, officerSignature: undefined})}>Redo</Button>
                            </div>
                        ) : (
                             <SignaturePad onSave={(dataUrl) => handleSaveSignature('officer', dataUrl)} label="Quality Officer's Signature" />
                        )}
                         {visitData?.clientSignature ? (
                            <div className="space-y-2">
                                <Label>Client Representative's Signature</Label>
                                <Image src={visitData.clientSignature} alt="Client Signature" width={400} height={150} className="rounded-md border bg-white" />
                                <Button size="sm" variant="outline" onClick={() => setVisitData({...visitData, clientSignature: undefined})}>Redo</Button>
                            </div>
                        ) : (
                             <SignaturePad onSave={(dataUrl) => handleSaveSignature('client', dataUrl)} label="Client Representative's Signature" />
                        )}
                    </CardContent>
                </Card>
                
                 <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmitReport} disabled={isSubmitting || !visitData?.officerSignature || !visitData?.clientSignature}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Saving Report..." : "Save and Submit Report"}
                    </Button>
                </div>
            </div>
        </main>
    );
}
