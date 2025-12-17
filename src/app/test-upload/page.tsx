
'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUser } from '@/firebase';
import { uploadProfilePhotoAction } from '@/app/actions';

export default function TestUploadPage() {
  const { user, isUserLoading } = useUser();
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('File selected. Ready to upload.');
      setResult('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Error: No file selected.');
      return;
    }
    if (!user) {
      setStatus('Error: You must be logged in to upload.');
      return;
    }

    setStatus('Starting upload...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.uid);

    startTransition(async () => {
      const response = await uploadProfilePhotoAction(formData);

      if (response.success) {
        setStatus('Upload complete! Firestore has been updated.');
        setResult(`Success! The file was uploaded and the public URL is: ${response.url}`);
        console.log('[TEST SCRIPT] Upload and Firestore update successful.');
      } else {
        setStatus(`Upload failed: ${response.error}`);
        setResult('');
        console.error('[TEST SCRIPT] Upload failed:', response.error);
      }
    });
  };

  if (isUserLoading) {
    return <div>Loading user...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle>File Upload Test Script (v2: Server Action)</CardTitle>
          <CardDescription>
            This page now uses a Server Action to upload the file, bypassing CORS issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <p className="text-destructive font-semibold">Please log in to use this test page.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="file-upload">1. Select a file</Label>
                <Input id="file-upload" type="file" onChange={handleFileChange} disabled={isPending} />
              </div>

              <Button onClick={handleUpload} disabled={!file || isPending} className="w-full">
                {isPending ? 'Uploading...' : '2. Run Upload Test'}
              </Button>

              <div className="space-y-2">
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{status}</p>
              </div>
              
              {isPending && (
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={undefined} />
                </div>
              )}

              {result && (
                <div className="space-y-2">
                  <Label>Result</Label>
                  <div className="text-sm p-3 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-md break-all">
                    {result}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
