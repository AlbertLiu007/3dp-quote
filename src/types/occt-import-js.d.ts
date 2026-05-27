declare module 'occt-import-js' {
  type OcctImportOptions = {
    locateFile?: (path: string) => string;
  };

  type OcctImportApi = {
    ReadFile: (format: string, buffer: Uint8Array, params: Record<string, unknown> | null) => unknown;
  };

  export default function occtimportjs(options?: OcctImportOptions): Promise<OcctImportApi>;
}
