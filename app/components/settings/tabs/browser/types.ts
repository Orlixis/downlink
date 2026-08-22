export type BrowserTarget = "chrome" | "firefox" | "safari";

export interface DetectedBrowser {
  id: string;
  name: string;
  is_installed: boolean;
  is_default: boolean;
  extension_type: string;
  app_path?: string;
}
