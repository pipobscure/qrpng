import { unsigned as crc32 } from "./crc32";
import { deflate } from "pako";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HEADER = [
  0,
  0,
  0,
  13, // HEADER.length - IHDR & CRC
  0x49,
  0x48,
  0x44,
  0x52, // IHDR
  0,
  0,
  0,
  0, // width
  0,
  0,
  0,
  0, // height
  1,
  0, // bitdepth , colortype
  0,
  0,
  0, // compression, filter, interlace
  0,
  0,
  0,
  0, // CRC
];
const DATA = [
  0,
  0,
  0,
  0, // data.length
  0x49,
  0x44,
  0x41,
  0x54,
];

const FOOTER = [
  0,
  0,
  0,
  0, // FOOTER.length - IEND & CRC
  0x49,
  0x45,
  0x4e,
  0x44, // IEND
  0,
  0,
  0,
  0, // CRC
];

export function bitmap(pixels: boolean[][]) {
  const { width, height, data } = compileData(pixels);

  const result = new ArrayBuffer(SIGNATURE.length + HEADER.length + DATA.length + (data.length + 4) + FOOTER.length);

  let baseOffset = 0;

  new Uint8Array(result, baseOffset, SIGNATURE.length).set(SIGNATURE);
  baseOffset = SIGNATURE.length;

  new Uint8Array(result, baseOffset, HEADER.length).set(HEADER);
  setUint32(result, baseOffset + 8, width);
  setUint32(result, baseOffset + 12, height);
  setUint32(result, baseOffset + HEADER.length - 4, crc32(new Uint8Array(result, baseOffset + 4, HEADER.length - 8)));
  baseOffset += HEADER.length;

  new Uint8Array(result, baseOffset, DATA.length).set(DATA);
  setUint32(result, baseOffset, data.length);
  new Uint8Array(result, baseOffset + DATA.length, data.length).set(data);
  setUint32(result, baseOffset + DATA.length + data.byteLength, crc32(new Uint8Array(result, baseOffset + 4, DATA.length + data.byteLength + 4 - 8)));
  baseOffset += DATA.length + data.byteLength + 4;

  new Uint8Array(result, baseOffset, FOOTER.length).set(FOOTER);
  setUint32(result, baseOffset + FOOTER.length - 4, crc32(new Uint8Array(result, baseOffset + 4, FOOTER.length - 8)));

  return new Uint8Array(result, 0, result.byteLength);
}

function setUint32(buffer: ArrayBuffer, offset: number, value: number) {
  const view = new DataView(buffer, offset, 4);
  view.setUint32(0, value, false);
}

function compileData(data: boolean[][]): { width: number; height: number; data: Uint8Array } {
  const height = Math.ceil(data.length / 8) * 8;
  const width = Math.ceil(data[0].length / 8) * 8;
  const buffer = new Uint8Array(((width + 1) * height) / 8);

  let byteOff = 0;
  for (let line = 0; line < height; line++) {
    buffer[byteOff] = 0; // filter-type for scanline
    byteOff++;
    for (let off = 0; off < width; off += 8) {
      const linedata = data[line] || [];
      const byte = (!linedata[off + 0] ? 0b10_00_00_00 : 0) | (!linedata[off + 1] ? 0b01_00_00_00 : 0) | (!linedata[off + 2] ? 0b00_10_00_00 : 0) | (!linedata[off + 3] ? 0b00_01_00_00 : 0) | (!linedata[off + 4] ? 0b00_00_10_00 : 0) | (!linedata[off + 5] ? 0b00_00_01_00 : 0) | (!linedata[off + 6] ? 0b00_00_00_10 : 0) | (!linedata[off + 7] ? 0b00_00_00_01 : 0);
      buffer[byteOff] = byte;
      byteOff++;
    }
  }

  const result = deflate(buffer);
  return { width, height, data: result };
}
