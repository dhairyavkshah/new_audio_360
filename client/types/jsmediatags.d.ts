declare module 'jsmediatags' {
  interface Picture {
    format: string;
    type: string;
    description: string;
    data: number[];
  }

  interface Tags {
    title?: string;
    artist?: string;
    album?: string;
    year?: string;
    track?: string;
    genre?: string;
    picture?: Picture;
  }

  interface TagResult {
    type: string;
    tags: Tags;
  }

  interface ReadOptions {
    onSuccess: (tag: TagResult) => void;
    onError: (error: { type: string; info: string }) => void;
  }

  function read(file: string | Blob | File, options: ReadOptions): void;

  export default { read };
  export { read };
}
