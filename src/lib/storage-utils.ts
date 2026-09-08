'use client';

import { FirebaseStorage, ref, uploadBytesResumable, type UploadMetadata, getDownloadURL } from 'firebase/storage';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

const INLINE_MAX_BYTES = 450_000;
const PART_BYTES = 350_000;
const CATALOG_MAX_BYTES = 40 * 1024 * 1024;

export async function uploadFileWithProgress(
  storage: FirebaseStorage,
  auth: Auth,
  path: string,
  file: File,
  metadata: UploadMetadata,
  onProgress: (progress: number) => void
): Promise<string> {
  if (!auth || !auth.currentUser) {
    throw new Error('User not authenticated.');
  }
  if (!storage) {
    throw new Error('Storage service is not available.');
  }

  await auth.currentUser.getIdToken();

  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      ...metadata,
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes > 0 ? snapshot.totalBytes : 1;
        onProgress(Math.min((snapshot.bytesTransferred / total) * 100, 100));
      },
      (error) => {
        reject(error);
      },
      () => {
        onProgress(100);
        getDownloadURL(uploadTask.snapshot.ref).then(resolve).catch(reject);
      }
    );
  });
}

export function sanitizeStorageFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return safe.slice(0, 180) || 'file';
}

export function isRiverBlobUrl(url?: string | null): boolean {
  return !!url && url.startsWith('river-blob:');
}

export function riverBlobId(url: string): string {
  return url.slice('river-blob:'.length);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, Math.min(i + step, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(slice));
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function trySignedWorkspaceUpload(
  companyId: string,
  file: File,
  contentType: string,
  onProgress: (progress: number) => void
): Promise<WorkspaceUploadResult | null> {
  try {
    const functions = getFunctions(getApp());
    const createUpload = httpsCallable<
      { companyId: string; fileName: string; contentType: string; size: number },
      { uploadUrl: string; storagePath: string; contentType: string }
    >(functions, 'createWorkspaceFileUpload');
    const finalizeUpload = httpsCallable<
      { companyId: string; storagePath: string },
      { url: string; storagePath: string }
    >(functions, 'finalizeWorkspaceFileUpload');

    const created = await createUpload({
      companyId,
      fileName: file.name,
      contentType,
      size: file.size,
    });
    if (!created.data?.uploadUrl) return null;

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', created.data.uploadUrl);
      xhr.setRequestHeader('Content-Type', created.data.contentType || contentType);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const total = event.total > 0 ? event.total : 1;
        onProgress(Math.min((event.loaded / total) * 100, 99));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
          return;
        }
        reject(new Error(`Signed upload failed (${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error('Signed upload failed.'));
      xhr.send(file);
    });

    const finalized = await finalizeUpload({ companyId, storagePath: created.data.storagePath });
    return { url: finalized.data.url, storagePath: finalized.data.storagePath };
  } catch {
    return null;
  }
}

async function storeFileInWorkspaceCatalog(
  firestore: Firestore,
  file: File,
  onProgress: (progress: number) => void
): Promise<WorkspaceUploadResult> {
  if (file.size > CATALOG_MAX_BYTES) {
    throw new Error('This file is larger than 40MB. Publish Storage rules to support larger video uploads.');
  }

  onProgress(5);
  const buffer = new Uint8Array(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';

  if (file.size <= INLINE_MAX_BYTES) {
    onProgress(80);
    const dataUrl = `data:${contentType};base64,${uint8ToBase64(buffer)}`;
    onProgress(100);
    return { url: dataUrl, storagePath: 'inline' };
  }

  const fileRef = doc(collection(firestore, 'cloud_files'));
  const partCount = Math.ceil(buffer.length / PART_BYTES);
  for (let i = 0; i < partCount; i++) {
    const start = i * PART_BYTES;
    const part = buffer.subarray(start, start + PART_BYTES);
    await setDoc(doc(firestore, 'cloud_files', fileRef.id, 'parts', String(i).padStart(4, '0')), {
      i,
      d: uint8ToBase64(part),
    });
    onProgress(Math.min(95, Math.round(((i + 1) / partCount) * 95)));
  }

  onProgress(100);
  return {
    url: `river-blob:${fileRef.id}`,
    storagePath: `cloud_files/${fileRef.id}`,
    fileId: fileRef.id,
  };
}

export type WorkspaceUploadResult = {
  url: string;
  storagePath: string;
  fileId?: string;
};

/**
 * Team Files upload: signed URL, then Storage SDK on the workspace path, then Firestore catalog.
 */
export async function uploadWorkspaceFile(
  _storage: FirebaseStorage,
  auth: Auth,
  firestore: Firestore,
  companyId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<WorkspaceUploadResult> {
  if (!auth?.currentUser) {
    throw new Error('User not authenticated.');
  }
  if (!companyId || companyId === 'unassigned') {
    throw new Error('No workspace is linked to this account.');
  }
  if (!firestore) {
    throw new Error('Workspace catalog is not available.');
  }

  const contentType = file.type || 'application/octet-stream';
  const signed = await trySignedWorkspaceUpload(companyId, file, contentType, onProgress);
  if (signed) return signed;

  try {
    const storagePath = `workspaces/${companyId}/files/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, '0')}/${(crypto.randomUUID?.() || `${Date.now()}`)}-${sanitizeStorageFileName(file.name)}`;
    const url = await uploadFileWithProgress(_storage, auth, storagePath, file, {
      customMetadata: { companyId, uploadedBy: auth.currentUser.uid },
    }, onProgress);
    return { url, storagePath };
  } catch {
    return storeFileInWorkspaceCatalog(firestore, file, onProgress);
  }
}

export async function resolveWorkspaceFileSrc(
  firestore: Firestore,
  file: { url: string; type?: string }
): Promise<string> {
  if (!file.url) return '';
  if (!isRiverBlobUrl(file.url)) return file.url;

  const fileId = riverBlobId(file.url);
  const partsSnap = await getDocs(collection(firestore, 'cloud_files', fileId, 'parts'));
  const parts = partsSnap.docs
    .map((d) => d.data() as { i?: number; d?: string })
    .filter((p) => typeof p.d === 'string')
    .sort((a, b) => (a.i || 0) - (b.i || 0));

  const total = parts.reduce((n, p) => n + base64ToUint8(p.d!).length, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    const chunk = base64ToUint8(part.d!);
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' });
  return URL.createObjectURL(blob);
}
