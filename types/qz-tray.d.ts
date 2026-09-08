declare module 'qz-tray' {
  interface PrintConfig {
    size?: { width: number; height: number };
    units?: 'mm' | 'in' | 'cm';
    colorType?: 'blackwhite' | 'grayscale' | 'color';
    copies?: number;
    [key: string]: unknown;
  }

  interface PrintData {
    type: 'pixel' | 'raw';
    format?: 'html' | 'pdf' | 'image' | 'plain';
    flavor?: 'plain' | 'file' | 'base64';
    data: string;
    options?: Record<string, unknown>;
  }

  type QZConfig = Record<string, unknown>;

  const qz: {
    websocket: {
      connect(options?: { retries?: number; delay?: number }): Promise<void>;
      disconnect(): Promise<void>;
      isActive(): boolean;
    };
    printers: {
      find(query?: string): Promise<string>;
      getDefault(): Promise<string>;
    };
    configs: {
      create(printer: string, options?: PrintConfig): QZConfig;
    };
    print(config: QZConfig, data: PrintData[]): Promise<void>;
    security: {
      setCertificatePromise(fn: (resolve: (cert: string) => void, reject: (err: unknown) => void) => void): void;
      setSignatureAlgorithm(algorithm: string): void;
      setSignaturePromise(fn: (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => void): void;
    };
  };

  export default qz;
}
