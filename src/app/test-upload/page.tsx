'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useUser, useStorage } from '@/firebase';
import { uploadFile } from '@/lib/storage-utils';
import type { UploadMetadata } from 'firebase/storage';

export default function TestUploadPage() {
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Idle');
  const [result, setResult] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('File selected. Ready to upload.');
      setResult('');
      setProgress(0);
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
    if (!storage) {
        setStatus('Error: Firebase Storage is not available.');
        return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatus('Starting upload...');
    console.log('[TEST SCRIPT] Starting upload...');

    const userId = user.uid;
    // This path format is now critical, as the Cloud Function uses it to identify the user.
    const filePath = `users/${userId}/profile/profile_photo_${Date.now()}.jpg`;
    
    // The metadata is no longer needed for this specific test, as the function uses path-based logic.
    const metadata: UploadMetadata = {};

    try {
      // We don't need the downloadURL on the client anymore for this flow.
      await uploadFile(
        storage,
        file,
        filePath,
        metadata,
        (p) => {
          setProgress(p);
          console.log(`[TEST SCRIPT] Upload progress: ${p.toFixed(2)}%`);
        }
      );

      setStatus('Upload complete! The Cloud Function has been triggered to update Firestore.');
      setResult(`Success! The file was uploaded to: ${filePath}. The backend is now processing it.`);
      console.log('[TEST SCRIPT] Upload successful.');
      console.log('[TEST SCRIPT] The backend Cloud Function should now be updating the photoURL field in Firestore.');

    } catch (error: any) {
      setStatus(`Upload failed: ${error.message}`);
      setResult('');
      console.error('[TEST SCRIPT] Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (isUserLoading) {
    return <div>Loading user...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle>File Upload Test Script</CardTitle>
          <CardDescription>
            Use this page to test the file upload functionality. The backend Cloud Function will handle the Firestore update. Open your console to see logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <p className="text-destructive font-semibold">Please log in to use this test page.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="file-upload">1. Select a file</Label>
                <Input id="file-upload" type="file" onChange={handleFileChange} disabled={isUploading} />
              </div>

              <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
                {isUploading ? 'Uploading...' : '2. Run Upload Test'}
              </Button>

              <div className="space-y-2">
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded-md">{status}</p>
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <Progress value={progress} />
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
