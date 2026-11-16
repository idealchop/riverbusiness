
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedDocRef using useMemoFirebase.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} memoizedDocRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & {__memo?: boolean}) | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;
  const refId = memoizedDocRef?.path ?? '';

  const [state, setState] = useState<{
    refId: string;
    data: StateDataType;
    isLoading: boolean;
    error: FirestoreError | Error | null;
  }>(() => ({
    refId,
    data: null,
    isLoading: Boolean(memoizedDocRef),
    error: null,
  }));

  // A new document must count as loading in this render. Waiting for an effect
  // leaves one frame where the profile looks missing and login redirects loop.
  let current = state;
  if (state.refId !== refId) {
    current = { refId, data: null, isLoading: Boolean(memoizedDocRef), error: null };
    setState(current);
  }

  useEffect(() => {
    if (!memoizedDocRef) return;
    const path = memoizedDocRef.path;

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        setState({
          refId: path,
          data: snapshot.exists() ? { ...(snapshot.data() as T), id: snapshot.id } : null,
          isLoading: false,
          error: null,
        });
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: path,
                operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
        setState({ refId: path, data: null, isLoading: false, error: err });
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef]);

  if (memoizedDocRef && (typeof memoizedDocRef !== 'object' || !('__memo' in memoizedDocRef))) {
    throw new Error('useDoc: reference was not properly memoized using useMemoFirebase');
  }

  return { data: current.data, isLoading: current.isLoading, error: current.error };
}
