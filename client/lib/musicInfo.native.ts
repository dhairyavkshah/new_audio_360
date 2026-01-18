export interface MusicMetadata {
  title?: string;
  artist?: string;
  album?: string;
}

export async function getMusicMetadata(_localUri: string): Promise<MusicMetadata | null> {
  return null;
}
