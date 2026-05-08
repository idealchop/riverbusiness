'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * Custom error class for Firestore permission issues.
 * Includes Object.setPrototypeOf to ensure proper prototype chain in all environments.
 */
export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`Firestore Security Rules: Permission Denied at ${context.path}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // Explicitly set the prototype to fix inheritance in some environments
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
