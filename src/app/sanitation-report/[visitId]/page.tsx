'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import type { SanitationVisit, AppUser, DispenserReport, SanitationChecklistItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format, addDays, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Signature, CheckCircle, Save, Droplet, Eye } from 'lucide-react';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const QUICK_REMARKS = ["Needs Cleaning", "Parts Wear", "Repair Needed"];

// A simple signature pad component
const SignaturePad = ({ onSave, label, disabled = false }: { onSave: (dataUrl: string) => void, label: string, disabled?: boolean }) => {
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
        if (disabled) return;
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const pos = getPosition(event.nativeEvent);
        context.beginPath();
        context.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;
        event.preventDefault(); // Prevents page scrolling on touch devices
        const context = canvasRef.current?.getContext('2d');
        if (!context) return;
        const pos = getPosition(event.nativeEvent);
        context.lineTo(pos.x, pos.y);
        context.stroke();
    };

    const endDrawing = () => {
        if (disabled) return;
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
            <div className={cn("border rounded-md bg-white touch-none", disabled && "bg-muted cursor-not-allowed")}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className={cn("w-full h-auto", disabled ? "cursor-not-allowed" : "cursor-crosshair")}
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
                <Button variant="outline" size="sm" onClick={clearPad} disabled={disabled}>Clear</Button>
                <Button size="sm" onClick={handleSave} disabled={disabled}>Confirm Signature</Button>
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
    const [visitData, setVisitData] = useState<Partial<SanitationVisit> | null>(null);
    const [clientData, setClientData] = useState<AppUser | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('');
    const [selectedImg, setSelectedImg] = useState<string | null>(null);
    
    const isChecklistComplete = useMemo(() => {
        if (!visitData?.dispenserReports || visitData.dispenserReports.length === 0) {
            return true;
        }
        return visitData.dispenserReports.every(report => 
            report.checklist && report.checklist.every(item => item.checked || (item.remarks && item.remarks.trim() !== ''))
        );
    }, [visitData]);

    const allSignaturesCompleted = !!(visitData?.officerSignature && visitData?.clientSignature && visitData?.clientRepName && visitData.clientRepName.trim() !== '');

    const isReportFullyComplete = allSignaturesCompleted && isChecklistComplete;

    useEffect(() => {
        if (!firestore || !linkId) return;

        const fetchVisit = async () => {
            setIsLoading(true);
            try {
                const linkRef = doc(firestore, 'publicSanitationLinks', linkId as string);
                const linkSnap = await getDoc(linkRef);

                if (!linkSnap.exists()) {
                    throw new Error("This report link is invalid or has been disabled. Please contact the administrator.");
                }

                const linkData = linkSnap.data();
                const { userId, visitId, createdAt } = linkData;
                
                // Expiration Check
                if (createdAt) {
                    let createdDate: Date;
                    if (createdAt instanceof Timestamp) {
                        createdDate = createdAt.toDate();
                    } else if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
                        createdDate = new Date((createdAt as any).seconds * 1000);
                    } else {
                        createdDate = new Date(createdAt);
                    }

                    if (!isNaN(createdDate.getTime())) {
                        const expiryDate = addDays(createdDate, 7);
                        if (isAfter(new Date(), expiryDate)) {
                            throw new Error("This report link has expired. It was valid for 7 days from the last time it was generated.");
                        }
                    }
                }
                
                const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
                const visitSnap = await getDoc(visitRef);

                if (!visitSnap.exists()) {
                     throw new Error("The internal sanitation visit record could not be found.");
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
                setError(err.message || "An unexpected error occurred while loading the report.");
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
        const signatureDate = new Date().toISOString();
        if (type === 'officer') {
            setVisitData(prev => ({...prev, officerSignature: dataUrl, officerSignatureDate: signatureDate }));
            toast({ title: "Officer Signature Captured!" });
        } else if (type === 'client') {
            setVisitData(prev => ({...prev, clientSignature: dataUrl, clientSignatureDate: signatureDate }));
            toast({ title: "Client Signature Captured!" });
        }
    };
    
    
    const handleSubmitReport = async () => {
        if (!firestore || !linkId || !visitData) return;

        if (!isReportFullyComplete) {
            toast({ variant: 'destructive', title: "Incomplete Information", description: "Please ensure all fields are complete." });
            return;
        }

        setIsSubmitting(true);
        try {
            const linkRef = doc(firestore, 'publicSanitationLinks', linkId as string);
            const linkSnap = await getDoc(linkRef);
            const { userId, visitId } = linkSnap.data() as any;

            const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
            
            const updateData: Partial<SanitationVisit> = {
                dispenserReports: visitData.dispenserReports,
                officerSignature: visitData.officerSignature,
                officerSignatureDate: visitData.officerSignatureDate,
                clientSignature: visitData.clientSignature,
                clientRepName: visitData.clientRepName,
                clientSignatureDate: visitData.clientSignatureDate,
                status: 'Completed'
            };

            await updateDoc(visitRef, updateData);
            
            toast({ title: "Report Submitted!", description: "The sanitation report has been successfully saved." });
            setVisitData(prev => ({ ...prev, status: 'Completed' }));
        } catch (error) {
            console.error("Error submitting report:", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "There was an error saving the report." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleFieldChange = (field: keyof SanitationVisit, value: any) => {
        setVisitData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted p-4 sm:p-8">
                 <div className="w-full max-w-4xl space-y-4">
                    <div className="flex items-center gap-4"><Logo className="h-12 w-12 sm:h-16 sm:w-16" /><Skeleton className="h-12 w-1/2" /></div>
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
                        <CardTitle>Access Restricted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTitle>Unable to load report</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-xs text-muted-foreground text-center">If you believe this is an error, please contact the River Philippines administrator to generate a new link.</p>
                    </CardFooter>
                </Card>
            </main>
         )
    }

    if (visitData?.status === 'Completed') {
        return (
            <main className="min-h-screen w-full flex flex-col items-center justify-center bg-muted p-4 sm:p-8">
                <header className="mb-8 flex flex-col items-center gap-4">
                    <Logo className="h-16 w-16" />
                    <h1 className="text-3xl font-bold">River Philippines</h1>
                </header>
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <CardTitle>Report Finalized</CardTitle>
                        <CardDescription>
                            The sanitation visit report for {clientData?.businessName} has been successfully submitted and finalized.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Officer: {visitData.assignedTo}</p>
                        <p className="text-sm text-muted-foreground">Date: {visitData.scheduledDate ? format(new Date(visitData.scheduledDate), 'PPP') : ''}</p>
                    </CardContent>
                    <CardFooter className="justify-center pt-4 border-t">
                        <p className="text-xs text-muted-foreground italic">You can safely close this window now.</p>
                    </CardFooter>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen w-full bg-muted p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex flex-col sm:flex-row items-center gap-4">
                    <Logo className="h-12 w-12 sm:h-16 sm:w-16" />
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold">Sanitation Visit Report</h1>
                        <p className="text-muted-foreground">
                            {clientData?.businessName} - {visitData?.scheduledDate ? format(new Date(visitData.scheduledDate), 'PP') : ''}
                        </p>
                    </div>
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-none sm:flex sm:flex-wrap h-auto sm:h-10">
                        {visitData?.dispenserReports?.map(report => (
                            <TabsTrigger key={report.dispenserId} value={report.dispenserId} className="flex items-center gap-2">
                                <Droplet className="h-4 w-4"/>
                                {report.dispenserName}
                                {report.dispenserCode && <Badge variant="secondary">{report.dispenserCode}</Badge>}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {visitData?.dispenserReports?.map((report, dispenserIndex) => (
                        <TabsContent key={report.dispenserId} value={report.dispenserId} className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {report.dispenserName}
                                        {report.dispenserCode && <Badge variant="outline">{report.dispenserCode}</Badge>}
                                    </CardTitle>
                                    <CardDescription>Sanitation Checklist. Please complete all items. Any unchecked items require remarks.</CardDescription>
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
                                                     <div className="w-full sm:w-72 space-y-2">
                                                        <Input 
                                                            placeholder="Remarks..." 
                                                            className="h-9 text-sm"
                                                            value={item.remarks}
                                                            onChange={(e) => handleChecklistChange(report.dispenserId, itemIndex, 'remarks', e.target.value)}
                                                        />
                                                        <div className="flex flex-wrap gap-1">
                                                            {QUICK_REMARKS.map((suggestion) => (
                                                                <Button 
                                                                    key={suggestion} 
                                                                    type="button"
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                                    onClick={() => handleChecklistChange(report.dispenserId, itemIndex, 'remarks', suggestion)}
                                                                >
                                                                    {suggestion}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                     </div>
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
                         <div className="space-y-4">
                            <Label className="font-semibold">Quality Officer</Label>
                            {visitData?.officerSignature ? (
                                <div className="space-y-2">
                                    <Image src={visitData.officerSignature} alt="Officer Signature" width={400} height={150} className="rounded-md border bg-white" />
                                    <div className="flex justify-between items-center pt-1">
                                        <div>
                                            <p className="font-semibold text-sm">{visitData.assignedTo}</p>
                                            <p className="text-xs text-muted-foreground">{visitData.officerSignatureDate ? format(new Date(visitData.officerSignatureDate), 'PP') : ''}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleSaveSignature('officer', '')}>Redo Signature</Button>
                                    </div>
                                </div>
                            ) : (
                                <SignaturePad onSave={(dataUrl) => handleSaveSignature('officer', dataUrl)} label="" />
                            )}
                        </div>
                        <div className="space-y-4">
                             <Label className="font-semibold">Client Representative</Label>
                            {visitData?.clientSignature ? (
                                <div className="space-y-2">
                                    <Image src={visitData.clientSignature} alt="Client Signature" width={400} height={150} className="rounded-md border bg-white" />
                                    <div className="flex justify-between items-center pt-1">
                                        <div>
                                            <p className="font-semibold text-sm">{visitData.clientRepName}</p>
                                            <p className="text-xs text-muted-foreground">{visitData.clientSignatureDate ? format(new Date(visitData.clientSignatureDate), 'PP') : ''}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => setVisitData(prev => ({...prev, clientSignature: '', clientRepName: '', clientSignatureDate: ''}))}>Redo Signature</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                     <SignaturePad onSave={(dataUrl) => handleSaveSignature('client', dataUrl)} label="" />
                                     <div>
                                        <Label htmlFor="clientRepName">Representative Name</Label>
                                        <Input id="clientRepName" value={visitData?.clientRepName || ''} onChange={(e) => handleFieldChange('clientRepName', e.target.value)} />
                                     </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                 <div className="flex justify-end pt-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block">
                                    <Button onClick={handleSubmitReport} disabled={isSubmitting || !isReportFullyComplete}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isSubmitting ? "Saving Report..." : "Save and Submit Report"}
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {!isReportFullyComplete && (
                                <TooltipContent>
                                    <div className="space-y-1">
                                        <p className="font-medium">Cannot submit yet. Missing items:</p>
                                        <ul className="list-disc pl-4 text-xs text-muted-foreground">
                                            {!isChecklistComplete && <li>All checklist items must be checked or have remarks.</li>}
                                            {!(visitData?.officerSignature) && <li>Officer signature.</li>}
                                            {!(visitData?.clientSignature) && <li>Client signature.</li>}
                                            {!(visitData?.clientRepName && visitData.clientRepName.trim() !== '') && <li>Client representative's name.</li>}
                                        </ul>
                                    </div>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Local Image Zoom Dialog */}
            <Dialog open={!!selectedImg} onOpenChange={() => setSelectedImg(null)}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Image Preview</DialogTitle>
                        <DialogDescription>A larger view of the provided signature or proof.</DialogDescription>
                    </DialogHeader>
                    {selectedImg && (
                        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center">
                            <Image src={selectedImg} alt="Image Preview Zoomed" fill className="object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    );
}