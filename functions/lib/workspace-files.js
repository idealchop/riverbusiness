"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeWorkspaceFileUpload = exports.createWorkspaceFileUpload = void 0;
exports.syncUserWorkspaceClaim = syncUserWorkspaceClaim;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const crypto_1 = require("crypto");
const logger = __importStar(require("firebase-functions/logger"));
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
function sanitizeFileName(name) {
    const safe = String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    return safe.slice(0, 180) || 'file';
}
function workspaceIdFromUser(data) {
    const id = String((data === null || data === void 0 ? void 0 : data.companyId) || (data === null || data === void 0 ? void 0 : data.clientId) || '').trim();
    return id;
}
function getWorkspaceBucket() {
    const storage = (0, storage_1.getStorage)();
    try {
        const config = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : null;
        if (config === null || config === void 0 ? void 0 : config.storageBucket) {
            return storage.bucket(config.storageBucket);
        }
    }
    catch (_a) {
        // Fall through to project default.
    }
    const projectId = process.env.GCLOUD_PROJECT || 'studio-911553385-80027';
    return storage.bucket(`${projectId}.firebasestorage.app`);
}
async function assertWorkspaceMember(uid, companyId) {
    if (!companyId || companyId === 'unassigned') {
        throw new https_1.HttpsError('invalid-argument', 'Workspace id is required.');
    }
    const userSnap = await (0, firestore_1.getFirestore)().collection('users').doc(uid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'User profile was not found.');
    }
    const user = userSnap.data();
    const workspaceId = workspaceIdFromUser(user);
    const email = String((user === null || user === void 0 ? void 0 : user.email) || '');
    const isAdmin = email === 'admin@riverph.com' || (user === null || user === void 0 ? void 0 : user.role) === 'admin';
    if (!isAdmin && workspaceId !== companyId) {
        throw new https_1.HttpsError('permission-denied', 'You can only upload to your team workspace.');
    }
    return { workspaceId, user };
}
function assertWorkspacePath(storagePath, companyId) {
    const prefix = `workspaces/${companyId}/files/`;
    if (!storagePath.startsWith(prefix) || storagePath.includes('..')) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid storage path.');
    }
}
/** Mint a short-lived signed PUT URL after verifying the caller belongs to the workspace. */
exports.createWorkspaceFileUpload = (0, https_1.onCall)({ cors: true, timeoutSeconds: 60 }, async (request) => {
    var _a, _b, _c, _d, _e;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to upload files.');
    }
    const companyId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.companyId) || '').trim();
    const fileName = String(((_c = request.data) === null || _c === void 0 ? void 0 : _c.fileName) || 'file');
    const contentType = String(((_d = request.data) === null || _d === void 0 ? void 0 : _d.contentType) || 'application/octet-stream');
    const size = Number(((_e = request.data) === null || _e === void 0 ? void 0 : _e.size) || 0);
    if (size > MAX_FILE_SIZE_BYTES) {
        throw new https_1.HttpsError('invalid-argument', 'File exceeds the 500MB limit.');
    }
    await assertWorkspaceMember(request.auth.uid, companyId);
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const fileId = (0, crypto_1.randomUUID)();
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
exports.finalizeWorkspaceFileUpload = (0, https_1.onCall)({ cors: true, timeoutSeconds: 60 }, async (request) => {
    var _a, _b, _c;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in to finish the upload.');
    }
    const companyId = String(((_b = request.data) === null || _b === void 0 ? void 0 : _b.companyId) || '').trim();
    const storagePath = String(((_c = request.data) === null || _c === void 0 ? void 0 : _c.storagePath) || '').trim();
    assertWorkspacePath(storagePath, companyId);
    await assertWorkspaceMember(request.auth.uid, companyId);
    const bucket = getWorkspaceBucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
        throw new https_1.HttpsError('not-found', 'Upload did not complete.');
    }
    const token = (0, crypto_1.randomUUID)();
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
async function syncUserWorkspaceClaim(userId, data) {
    const workspaceId = workspaceIdFromUser(data);
    if (!workspaceId)
        return;
    try {
        const user = await (0, auth_1.getAuth)().getUser(userId);
        await (0, auth_1.getAuth)().setCustomUserClaims(userId, Object.assign(Object.assign({}, (user.customClaims || {})), { workspaceId }));
    }
    catch (error) {
        logger.error('Failed to set workspace claim', { userId, error });
    }
}
//# sourceMappingURL=workspace-files.js.map