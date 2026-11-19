declare module "gifenc" {
  export type Palette = number[][];
  export interface GifWriteOptions { palette?: Palette; delay?: number; repeat?: number; transparent?: boolean; transparentIndex?: number; dispose?: number; first?: boolean }
  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array | Uint8ClampedArray, width: number, height: number, opts?: GifWriteOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }
  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GifEncoderInstance;
  export function quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number, opts?: { format?: "rgb565" | "rgb444" | "rgba4444"; clearAlpha?: boolean; clearAlphaThreshold?: number; clearAlphaColor?: number; oneBitAlpha?: boolean | number }): Palette;
  export function applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: Palette, format?: "rgb565" | "rgb444" | "rgba4444"): Uint8Array;
}
