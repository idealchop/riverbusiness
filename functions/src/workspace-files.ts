import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import * as logger from 'firebase-functions/logger';

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  const safe = String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return safe.slice(0, 180) || 'file';
}

function workspaceIdFromUser(data: DocumentData | undefined): string {
  const id = String(data?.companyId || data?.clientId || '').trim();
  return id;
}

function getWorkspaceBucket() {
  const storage = getStorage();
  try {
    const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;
    if (config?.storageBucket) {
      return storage.bucket(config.storageBucket);
    }
  } catch {
    // Fall through to project default.
  }
  const projectId = process.env.GCLOUD_PROJECT || 'studio-911553385-80027';
  return storage.bucket(`${projectId}.firebasestorage.app`);
}

async function assertWorkspaceMember(uid: string, companyId: string) {
  if (!companyId || companyId === 'unassigned') {
    throw new HttpsError('invalid-argument', 'Workspace id is required.');
  }

  const userSnap = await getFirestore().collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('permission-denied', 'User profile was not found.');
  }

  const user = userSnap.data();
  const workspaceId = workspaceIdFromUser(user);
  const email = String(user?.email || '');
  const isAdmin = email === 'admin@riverph.com' || user?.role === 'admin';

  if (!isAdmin && workspaceId !== companyId) {
    throw new HttpsError('permission-denied', 'You can only upload to your team workspace.');
  }

  return { workspaceId, user };
}

function assertWorkspacePath(storagePath: string, companyId: string) {
  const prefix = `workspaces/${companyId}/files/`;
  if (!storagePath.startsWith(prefix) || storagePath.includes('..')) {
    throw new HttpsError('invalid-argument', 'Invalid storage path.');
  }
}

/** Mint a short-lived signed PUT URL after verifying the caller belongs to the workspace. */
export const createWorkspaceFileUpload = onCall({ cors: true, timeoutSeconds: 60 }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to upload files.');
  }

  const companyId = String(request.data?.companyId || '').trim();
  const fileName = String(request.data?.fileName || 'file');
  const contentType = String(request.data?.contentType || 'application/octet-stream');
  const size = Number(request.data?.size || 0);

  if (size > MAX_FILE_SIZE_BYTES) {
    throw new HttpsError('invalid-argument', 'File exceeds the 500MB limit.');
  }

  await assertWorkspaceMember(request.auth.uid, companyId);

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const fileId = randomUUID();
  const storagePath = `workspaces/${companyId}/files/${year}/${month}/${fileId}-${sanitizeFileName(fileName)}`;

  const bucket = getWorkspaceBucket();
  const file = bucket.file(storagePath);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });

  logger.info('Workspace upload URL created', { uid: request.auth.uid, companyId, storagePath });

  return { uploadUrl, storagePath, fileId, contentType };
});

/** After the browser PUT completes, attach a durable download token for the team. */
export const finalizeWorkspaceFileUpload = onCall({ cors: true, timeoutSeconds: 60 }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to finish the upload.');
  }

  const companyId = String(request.data?.companyId || '').trim();
  const storagePath = String(request.data?.storagePath || '').trim();
  assertWorkspacePath(storagePath, companyId);
  await assertWorkspaceMember(request.auth.uid, companyId);

  const bucket = getWorkspaceBucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    throw new HttpsError('not-found', 'Upload did not complete.');
  }

  const token = randomUUID();
  await file.setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: token,
      uploadedBy: request.auth.uid,
      companyId,
    },
  });

  const encoded = encodeURIComponent(storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;

  return { url, storagePath };
});

/** Keep Auth tokens in sync with the user's current team id for future Storage rules. */
export async function syncUserWorkspaceClaim(userId: string, data: DocumentData | undefined) {
  const workspaceId = workspaceIdFromUser(data);
  if (!workspaceId) return;
  try {
    const user = await getAuth().getUser(userId);
    await getAuth().setCustomUserClaims(userId, { ...(user.customClaims || {}), workspaceId });
  } catch (error) {
    logger.error('Failed to set workspace claim', { userId, error });
  }
}
