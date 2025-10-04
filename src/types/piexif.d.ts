// Type definitions for piexifjs
declare module 'piexifjs' {
  export function load(dataURL: string): {
    '0th': Record<string, unknown>;
    'Exif': Record<string, unknown>;
    'GPS': Record<string, unknown>;
    'Interop': Record<string, unknown>;
    '1st': Record<string, unknown>;
    thumbnail: unknown;
  };

  export function dump(exifObj: {
    '0th': Record<string, unknown>;
    'Exif': Record<string, unknown>;
    'GPS': Record<string, unknown>;
    'Interop': Record<string, unknown>;
    '1st': Record<string, unknown>;
    thumbnail: unknown;
  }): string;

  export function insert(exifBytes: string, dataURL: string): string;

  export const ImageIFD: {
    Orientation: number;
  };
}
