import { WebFolderData } from './storage';

let sessionWebFolders: WebFolderData[] = [];
let hasSessionInitialized = false;

export function getSessionWebFolders(): WebFolderData[] {
  return sessionWebFolders;
}

export function setSessionWebFolders(folders: WebFolderData[]): void {
  sessionWebFolders = folders;
}

export function isSessionInitialized(): boolean {
  return hasSessionInitialized;
}

export function markSessionInitialized(): void {
  hasSessionInitialized = true;
}

export function clearSessionCache(): void {
  sessionWebFolders = [];
  hasSessionInitialized = false;
}
