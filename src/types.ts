export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

export interface ConsoleMessage {
  id: string;
  timestamp: Date;
  type: 'log' | 'info' | 'warn' | 'error' | 'toast';
  text: string;
}

export interface DocPage {
  title: string;
  filename: string;
  category: string;
}

export interface SimulatedDevice {
  width: number;
  height: number;
  brand: string;
  model: string;
  battery: number;
  sdkInt: number;
}
