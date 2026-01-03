export type FitMode = 'none' | 'width' | 'height' | 'page';

export interface PrintProfile {
  paperSize: 'A4' | 'A3' | 'Letter';
  orientation: 'Portrait' | 'Landscape';
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  scale: number; // 1 = 100%
  fitTo: FitMode;
  repeatHeader: boolean;
  showGridLines: boolean;
  showBorders: boolean;
  header: {
    enabled: boolean;
    left: string;
    center: string;
    right: string;
  };
  footer: {
    enabled: boolean;
    left: string;
    center: string;
    right: string;
  };
}

export const DEFAULT_PRINT_PROFILE: PrintProfile = {
  paperSize: 'A4',
  orientation: 'Portrait',
  margins: { top: 12, right: 12, bottom: 12, left: 12 },
  scale: 1,
  fitTo: 'none',
  repeatHeader: true,
  showGridLines: true,
  showBorders: true,
  header: { enabled: true, left: '', center: '', right: '' },
  footer: { enabled: true, left: '', center: '', right: '' }
};

