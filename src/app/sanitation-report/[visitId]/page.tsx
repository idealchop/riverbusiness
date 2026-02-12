'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
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
import { AlertTriangle, Signature, CheckCircle, Save, Droplet, Eye, Camera, XCircle, Lightbulb } from 'lucide-react';
import { Logo } from '@/components/icons';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const QUICK_REMARKS = [
    "Spotted visible dirt or residue buildup.",
    "Observed signs of physical wear and tear.",
    "Detected minor leakage or moisture spots.",
    "Noticed storage area is damp or untidy.",
    "Observed container showing signs of degradation."
];

const toSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    if (typeof val === 'string') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
};

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
        event.preventDefault(); 
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
                    throw new Error("This report link is invalid. It may have been deleted or replaced by a new generation.");
                }

                const linkData = linkSnap.data();
                const { userId, visitId, createdAt } = linkData;
                
                // Expiration Check - Strictly based on link generation/renewal time (createdAt)
                if (createdAt) {
                    const createdDate = toSafeDate(createdAt);
                    if (createdDate && !isNaN(createdDate.getTime())) {
                        const expiryDate = addDays(createdDate, 7);
                        if (isAfter(new Date(), expiryDate)) {
                            throw new Error("This report link has expired. Shareable links are valid for 7 days from generation/renewal.");
                        }
                    }
                }
                
                const visitRef = doc(firestore, 'users', userId, 'sanitationVisits', visitId);
                const visitSnap = await getDoc(visitRef);

                if (!visitSnap.exists()) {
                     throw new Error("The associated sanitation record could not be found.");
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
                        <CardTitle>Link Status Notice</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTitle>Unable to load report</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-xs text-muted-foreground text-center">If you need to complete this report, please contact the River Philippines administrator to refresh the shareable link.</p>
                    </CardFooter>
                </Card>
            </main>
         )
    }

    const isFinalized = visitData?.status === 'Completed';

    return (
        <main className="min-h-screen w-full bg-muted p-4 sm:p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="flex flex-col sm:flex-row items-center gap-4">
                    <Logo className="h-12 w-12 sm:h-16 sm:w-16" />
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl font-bold">{isFinalized ? 'Finalized Report' : 'Sanitation Visit Report'}</h1>
                        <p className="text-muted-foreground">
                            {clientData?.businessName} - {visitData?.scheduledDate ? format(new Date(visitData.scheduledDate), 'PP') : ''}
                        </p>
                    </div>
                    {isFinalized && <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">Completed</Badge>}
                </header>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-none sm:flex sm:flex-wrap h-auto sm:h-10">
                        {visitData?.dispenserReports?.map(report => (
                            <TabsTrigger key={report.dispenserId} value={report.dispenserId} className="flex items-center gap-2">
                                <Droplet className="h-4 w-4"/>
                                {report.dispenserName}
                                {report.dispenserCode && <Badge variant="secondary" className="ml-1 text-[10px] h-4">{report.dispenserCode}</Badge>}
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
                                    <CardDescription>{isFinalized ? 'Summary of sanitation checks performed.' : 'Sanitation Checklist. Please complete all items.'}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {report.checklist?.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex flex-col gap-3 p-3 rounded-md border bg-background shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    {!isFinalized && (
                                                        <Checkbox 
                                                            id={`check-${dispenserIndex}-${itemIndex}`} 
                                                            checked={item.checked} 
                                                            onCheckedChange={(checked) => handleChecklistChange(report.dispenserId, itemIndex, 'checked', !!checked)}
                                                        />
                                                    )}
                                                    <Label htmlFor={`check-${dispenserIndex}-${itemIndex}`} className="text-sm flex-1 leading-tight font-medium">{item.item}</Label>
                                                    {isFinalized && item.checked && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                                                </div>
                                                {isFinalized ? (
                                                    !item.checked && (
                                                        <div className="pl-7">
                                                            <Badge variant="destructive" className="mb-1 text-[10px]">Issue Observed</Badge>
                                                            {item.remarks && <p className="text-xs text-muted-foreground italic">"{item.remarks}"</p>}
                                                        </div>
                                                    )
                                                ) : (
                                                    !item.checked && (
                                                        <div className="pl-7 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Findings & Observations</Label>
                                                                <Input 
                                                                    placeholder="Describe what was detected..." 
                                                                    className="h-9 text-sm w-full bg-muted/30"
                                                                    value={item.remarks || ''}
                                                                    onChange={(e) => handleChecklistChange(report.dispenserId, itemIndex, 'remarks', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5 pt-1">
                                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                                    <Lightbulb className="h-3 w-3 text-primary" />
                                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Quick Observations:</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {QUICK_REMARKS.map((suggestion) => (
                                                                        <Button 
                                                                            key={suggestion} 
                                                                            type="button"
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="h-auto py-1.5 px-2.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-muted-foreground/20 text-left justify-start font-medium"
                                                                            onClick={() => handleChecklistChange(report.dispenserId, itemIndex, 'remarks', suggestion)}
                                                                        >
                                                                            {suggestion}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                                {!isFinalized && item.checked && <div className="pl-7"><CheckCircle className="h-5 w-5 text-green-500" /></div>}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>

                {visitData?.proofUrls && visitData.proofUrls.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Camera className="h-5 w-5 text-primary" />
                                Proof of Service
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {visitData.proofUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border cursor-pointer group" onClick={() => setSelectedImg(url)}>
                                        <Image src={url} alt={`Proof ${idx + 1}`} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="text-white h-6 w-6" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Signature className="h-5 w-5" />Signatures</CardTitle>
                        <CardDescription>Digitally signed by the Quality Officer and Client Representative.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <Label className="font-semibold">Quality Officer</Label>
                            {visitData?.officerSignature ? (
                                <div className="space-y-2">
                                    <div className="relative aspect-[4/1.5] w-full">
                                        <Image src={visitData.officerSignature} alt="Officer Signature" fill className="rounded-md border bg-white object-contain" />
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <div>
                                            <p className="font-semibold text-sm">{visitData.assignedTo}</p>
                                            <p className="text-xs text-muted-foreground">{visitData.officerSignatureDate ? format(new Date(visitData.officerSignatureDate), 'PP') : ''}</p>
                                        </div>
                                        {!isFinalized && <Button size="sm" variant="outline" onClick={() => handleSaveSignature('officer', '')}>Redo Signature</Button>}
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
                                    <div className="relative aspect-[4/1.5] w-full">
                                        <Image src={visitData.clientSignature} alt="Client Signature" fill className="rounded-md border bg-white object-contain" />
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <div>
                                            <p className="font-semibold text-sm">{visitData.clientRepName}</p>
                                            <p className="text-xs text-muted-foreground">{visitData.clientSignatureDate ? format(new Date(visitData.clientSignatureDate), 'PP') : ''}</p>
                                        </div>
                                        {!isFinalized && <Button size="sm" variant="outline" onClick={() => setVisitData(prev => ({...prev, clientSignature: '', clientRepName: '', clientSignatureDate: ''}))}>Redo Signature</Button>}
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
                
                 {!isFinalized && (
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
                                                {!isChecklistComplete && <li>All failures must have remarks.</li>}
                                                {!(visitData?.officerSignature) && <li>Officer signature.</li>}
                                                {!(visitData?.clientSignature) && <li>Client signature.</li>}
                                                {!(visitData?.clientRepName) && <li>Representative's name.</li>}
                                            </ul>
                                        </div>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                 )}
            </div>

            <Dialog open={!!selectedImg} onOpenChange={() => setSelectedImg(null)}>
                <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Proof Image Preview</DialogTitle>
                        <DialogDescription>A detailed view of the provided proof of service.</DialogDescription>
                    </DialogHeader>
                    {selectedImg && (
                        <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center">
                            <Image src={selectedImg} alt="Proof Expanded" fill className="object-contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </main>
    );
}