'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  getDocs,
} from 'firebase/firestore';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

interface UseCollectionOptions {
    idField?: string;
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options: UseCollectionOptions = {}
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedTargetRefOrQuery);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const { idField } = options;

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const isCollectionGroup = (memoizedTargetRefOrQuery as any).type === 'collection-group';

    const processSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        snapshot.forEach(doc => {
            let itemData: any = { ...(doc.data() as T), id: doc.id };
            if (isCollectionGroup && idField) {
                // For collection group queries, the parent ID might be what's needed.
                itemData[idField] = doc.ref.parent.parent?.id;
            }
            results.push(itemData);
        });
        setData(results);
        setError(null);
        setIsLoading(false);
    };

    if (isCollectionGroup) {
      // For collection group, we do a one-time fetch as real-time listeners can be expensive.
      // You can change this to onSnapshot if real-time updates are necessary and cost-effective.
      getDocs(memoizedTargetRefOrQuery)
        .then(processSnapshot)
        .catch((err: FirestoreError) => {
            console.error("useCollection (collectionGroup) error:", err);
            setError(err);
            setData(null);
            setIsLoading(false);
        });
    } else {
      const unsubscribe = onSnapshot(
        memoizedTargetRefOrQuery,
        processSnapshot,
        (error: FirestoreError) => {
          console.error("useCollection error:", error);
          setError(error);
          setData(null);
          setIsLoading(false);
        }
      );
      return () => unsubscribe();
    }

  }, [memoizedTargetRefOrQuery, idField]); // Re-run if the target query/reference or idField changes.
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
