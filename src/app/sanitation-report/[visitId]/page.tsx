
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { SanitationVisit, AppUser, DispenserReport, SanitationChecklistItem } from '@/lib/types';
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
import { AlertTriangle, Signature, CheckCircle, Save, Droplet } from 'lucide-react';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
        event.preventDefault(); // Prevents page scrolling on touch devices
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
            <div className="border rounded-md bg-white touch-none">
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
    const [activeTab, setActiveTab] = useState<string>('');

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
                const fetchedVisitData = { id: visitSnap.id, ...visitSnap.data() } as SanitationVisit;
                setVisitData(fetchedVisitData);
                if (fetchedVisitData.dispenserReports && fetchedVisitData.dispenserReports.length > 0) {
                    setActiveTab(fetchedVisitData.dispenserReports[0].dispenserId);
                }

            } catch (err: any) {
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchVisit();
    }, [firestore, linkId]);

    const handleChecklistChange = (dispenserId: string, itemIndex: number, field: 'checked' | 'remarks', value: boolean | string) => {
        setVisitData(prevVisitData => {
            if (!prevVisitData) return null;
    
            const updatedReports = prevVisitData.dispenserReports?.map(report => {
                if (report.dispenserId === dispenserId) {
                    const newChecklist = [...report.checklist];
                    (newChecklist[itemIndex] as any)[field] = value;
                    return { ...report, checklist: newChecklist };
                }
                return report;
            });
    
            return { ...prevVisitData, dispenserReports: updatedReports };
        });
    };
    
    const handleSaveSignature = (type: 'officer' | 'client', dataUrl: string) => {
        setVisitData(prevVisitData => {
            if (!prevVisitData) return null;
            return { ...prevVisitData, [`${type}Signature`]: dataUrl };
        });
        toast({ title: "Signature Captured!", description: `The ${type}'s signature has been added to the report.` });
    };
    
    
    const handleSubmitReport = async () => {
        if (!firestore || !linkId || !visitData) return;

        if (!visitData.officerSignature || !visitData.clientSignature) {
            toast({ variant: 'destructive', title: "Incomplete Signatures", description: "Please ensure the report is signed by both parties." });
            return;
        }

        setIsSubmitting(true);
        try {
            const linkRef = doc(firestore, 'publicSanitationLinks', linkId as string);
            const linkSnap = await getDoc(linkRef);
            const { userId, visitId } = linkSnap.data() as any;

            const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
            
            // Prepare the data to be updated
            const updateData: Partial<SanitationVisit> = {
                dispenserReports: visitData.dispenserReports,
                officerSignature: visitData.officerSignature,
                clientSignature: visitData.clientSignature,
                status: 'Completed'
            };

            await updateDoc(visitRef, updateData);

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
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted p-4 sm:p-8">
                 <div className="w-full max-w-4xl space-y-4">
                    <div className="flex items-center gap-4"><Logo className="h-16 w-16" /><Skeleton className="h-12 w-1/2" /></div>
                    <Skeleton className="h-6 w-3/4" />
                    <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                    <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
                 </div>
            </main>
        )
    }
    
    if (error) {
         return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 sm:p-8">
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

    const allSignaturesCompleted = visitData?.officerSignature && visitData?.clientSignature;

    return (
        <main className="min-h-screen w-full bg-muted p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex flex-col sm:flex-row items-center gap-4">
                    <Logo className="h-12 w-12 sm:h-16 sm:w-16" />
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold">Sanitation Visit Report</h1>
                        <p className="text-muted-foreground">
                            {clientData?.businessName} - {visitData ? format(new Date(visitData.scheduledDate), 'PP') : ''}
                        </p>
                    </div>
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-none sm:flex sm:flex-wrap h-auto sm:h-10">
                        {visitData?.dispenserReports?.map(report => (
                            <TabsTrigger key={report.dispenserId} value={report.dispenserId} className="flex items-center gap-2">
                                <Droplet className="h-4 w-4"/>
                                {report.dispenserName}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {visitData?.dispenserReports?.map((report, dispenserIndex) => (
                        <TabsContent key={report.dispenserId} value={report.dispenserId} className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Sanitation Checklist for: <span className="text-primary">{report.dispenserName}</span></CardTitle>
                                    <CardDescription>Please complete the following checklist. Any unchecked items require remarks.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {report.checklist?.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex flex-col sm:flex-row items-start gap-4 p-3 rounded-md border bg-background">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Checkbox 
                                                        id={`check-${dispenserIndex}-${itemIndex}`} 
                                                        checked={item.checked} 
                                                        onCheckedChange={(checked) => handleChecklistChange(report.dispenserId, itemIndex, 'checked', !!checked)}
                                                    />
                                                    <Label htmlFor={`check-${dispenserIndex}-${itemIndex}`} className="text-sm">{item.item}</Label>
                                                </div>
                                                {!item.checked && (
                                                     <Input 
                                                        placeholder="Remarks..." 
                                                        className="h-9 text-sm"
                                                        value={item.remarks}
                                                        onChange={(e) => handleChecklistChange(report.dispenserId, itemIndex, 'remarks', e.target.value)}
                                                     />
                                                )}
                                                {item.checked && <CheckCircle className="h-5 w-5 text-green-500 hidden sm:block self-center" />}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>

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
                                <Button size="sm" variant="outline" onClick={() => handleSaveSignature('officer', '')}>Redo</Button>
                            </div>
                        ) : (
                                <SignaturePad onSave={(dataUrl) => handleSaveSignature('officer', dataUrl)} label="Quality Officer's Signature" />
                        )}
                            {visitData?.clientSignature ? (
                            <div className="space-y-2">
                                <Label>Client Representative's Signature</Label>
                                <Image src={visitData.clientSignature} alt="Client Signature" width={400} height={150} className="rounded-md border bg-white" />
                                <Button size="sm" variant="outline" onClick={() => handleSaveSignature('client', '')}>Redo</Button>
                            </div>
                        ) : (
                                <SignaturePad onSave={(dataUrl) => handleSaveSignature('client', dataUrl)} label="Client Representative's Signature" />
                        )}
                    </CardContent>
                </Card>
                
                 <div className="flex justify-end pt-4">
                    <Button onClick={handleSubmitReport} disabled={isSubmitting || !allSignaturesCompleted}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Saving Report..." : "Save and Submit Report"}
                    </Button>
                </div>
            </div>
        </main>
    );
}
