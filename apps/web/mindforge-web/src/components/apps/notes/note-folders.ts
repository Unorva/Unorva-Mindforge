import type { noteFolderType } from 'src/types/apps/notes'

export function getFolderPath(folders: noteFolderType[], folderId?: string) {
  const path: noteFolderType[] = []
  let current = folders.find((folder) => folder.id === folderId)

  while (current) {
    path.unshift(current)
    current = folders.find((folder) => folder.id === current?.parentId)
  }

  return path
}
