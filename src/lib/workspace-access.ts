import type { AppUser } from '@/lib/types';

/** Team tenant id: owners often have clientId; employees have companyId. */
export function getWorkspaceCompanyId(user?: Pick<AppUser, 'companyId' | 'clientId'> | null): string | null {
  const id = user?.companyId || user?.clientId || '';
  return id.trim() ? id : null;
}

export function buildCollabImagePath(uid: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `users/${uid}/collab_images/${Date.now()}-${safeName}`;
}

export function getCollabSharePath(page: { id: string }): string {
  return `/public/${page.id}`;
}

export function getCollabShareUrl(page: { id: string }): string {
  if (typeof window === 'undefined') return getCollabSharePath(page);
  return `${window.location.origin}${getCollabSharePath(page)}`;
}

/** Documents / Canvas / Sheets list home */
export function getCollabTypeHomeHref(type?: string | null): string {
  if (type === 'board') return '/workspace/boards';
  if (type === 'sheet') return '/workspace/sheets';
  return '/workspace/docs';
}

export function getCollabTypeHomeLabel(type?: string | null): string {
  if (type === 'board') return 'Canvas';
  if (type === 'sheet') return 'Sheets';
  return 'Documents';
}

export function getCollabFolderHref(type?: string | null, folderId?: string | null): string {
  const home = getCollabTypeHomeHref(type);
  if (!folderId) return home;
  return `${home}?folder=${encodeURIComponent(folderId)}`;
}

/** One step back from an open document or canvas */
export function getCollabBackHref(
  page: { type?: string | null; parentId?: string | null },
  parent?: { id: string; type?: string | null } | null
): string {
  const type = page.type || 'doc';
  if (parent?.type === 'folder') return getCollabFolderHref(type, parent.id);
  if (parent?.id) return `/workspace/${parent.id}`;
  return getCollabTypeHomeHref(type);
}

export type RiverAppId = 'water' | 'teams' | 'collab' | 'files';
export type RiverAppAvailability = 'active' | 'disabled' | 'hidden';

export function isInvitedEmployee(user?: Pick<AppUser, 'hrRole'> | null): boolean {
  return user?.hrRole === 'employee';
}

export function isIndividualWorkspace(user?: Pick<AppUser, 'workspaceKind'> | null): boolean {
  return user?.workspaceKind === 'individual';
}

export function getHomePath(user?: Pick<AppUser, 'role' | 'hrRole' | 'workspaceKind' | 'email'> | null): string {
  if (!user) return '/login';
  if (user.email === 'admin@riverph.com' || user.role === 'Admin') return '/admin';
  if (isInvitedEmployee(user)) return '/hr-dashboard/attendance';
  if (isIndividualWorkspace(user)) return '/workspace';
  return '/dashboard';
}

export function getAppAvailability(user?: Pick<AppUser, 'hrRole' | 'workspaceKind'> | null): Record<RiverAppId, RiverAppAvailability> {
  if (isInvitedEmployee(user)) {
    return { water: 'hidden', teams: 'active', collab: 'active', files: 'active' };
  }
  if (isIndividualWorkspace(user)) {
    return { water: 'disabled', teams: 'disabled', collab: 'active', files: 'active' };
  }
  return { water: 'active', teams: 'active', collab: 'active', files: 'active' };
}
