import type { CollabPage } from '@/lib/types';

export function folderChildren(pages: CollabPage[], folderId: string) {
  return pages
    .filter((p) => !p.isTrashed && p.parentId === folderId)
    .sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return (a.title || '').localeCompare(b.title || '');
    });
}

export function isInsideFolder(pages: CollabPage[], itemId: string, folderId: string) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const seen = new Set<string>();
  let curr = byId.get(itemId);
  while (curr?.parentId) {
    if (curr.parentId === folderId) return true;
    if (seen.has(curr.parentId)) break;
    seen.add(curr.parentId);
    curr = byId.get(curr.parentId);
  }
  return false;
}

export function canMoveToFolder(pages: CollabPage[], pageId: string, targetParentId: string | null) {
  if (pageId === targetParentId) return false;
  const page = pages.find((p) => p.id === pageId);
  if (!page) return pageId !== targetParentId;
  if ((page.parentId || null) === (targetParentId || null)) return false;
  if (targetParentId && page.type === 'folder' && isInsideFolder(pages, targetParentId, pageId)) {
    return false;
  }
  return true;
}

export function moveDestinations(pages: CollabPage[], page: CollabPage) {
  return pages
    .filter((p) => p.type === 'folder' && !p.isTrashed && canMoveToFolder(pages, page.id, p.id))
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}
