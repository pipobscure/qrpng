import * as QRUtil from "./utils";
import { Grid } from "./grid";
import { QRPolynomial } from "./polynomial";
import { QRRSBlock } from "./block";
import { QRBitBuffer } from "./bitbuffer";
import { QR8bitByte } from "./byte";

export class QRCode {
  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }
  private typeNumber: number;
  private errorCorrectLevel: number;
  private modules: Grid<boolean> = new Grid<boolean>(0);
  private moduleCount: number = 0;
  private dataCache?: Uint32Array;
  private dataList: QR8bitByte[] = [];

  public addData(data: string): void {
    let newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = undefined;
  }

  isDark(row: number, col: number) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules.get(row, col);
  }

  getModuleCount() {
    return this.moduleCount;
  }

  make() {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  makeImpl(test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Grid(this.moduleCount);

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache == null) {
      this.dataCache = createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }

    this.mapData(this.dataCache, maskPattern);
  }

  setupPositionProbePattern(row: number, col: number) {
    for (var r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;

      for (var c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;

        if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          this.modules.set(row + r, col + c, true);
        } else {
          this.modules.set(row + r, col + c, false);
        }
      }
    }
  }

  getBestMaskPattern() {
    var minLostPoint = 0;
    var pattern = 0;

    for (var i = 0; i < 8; i++) {
      this.makeImpl(true, i);

      var lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  }

  setupTimingPattern() {
    for (var r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules.get(r, 6) !== undefined) {
        continue;
      }
      this.modules.set(r, 6, r % 2 == 0);
    }

    for (var c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules.get(6, c) !== undefined) {
        continue;
      }
      this.modules.set(6, c, c % 2 == 0);
    }
  }

  setupPositionAdjustPattern() {
    let pos = QRUtil.getPatternPosition(this.typeNumber);

    for (var i = 0; i < pos.length; i++) {
      for (var j = 0; j < pos.length; j++) {
        var row = pos[i];
        var col = pos[j];

        if (this.modules.get(row, col) !== undefined) {
          continue;
        }

        for (var r = -2; r <= 2; r++) {
          for (var c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              this.modules.set(row + r, col + c, true);
            } else {
              this.modules.set(row + r, col + c, false);
            }
          }
        }
      }
    }
  }

  setupTypeNumber(test) {
    var bits = QRUtil.getBCHTypeNumber(this.typeNumber);

    for (var i = 0; i < 18; i++) {
      var mod = !test && ((bits >> i) & 1) == 1;
      this.modules.set(Math.floor(i / 3), (i % 3) + this.moduleCount - 8 - 3, mod);
    }

    for (var i = 0; i < 18; i++) {
      var mod = !test && ((bits >> i) & 1) == 1;
      this.modules.set((i % 3) + this.moduleCount - 8 - 3, Math.floor(i / 3), mod);
    }
  }

  setupTypeInfo(test, maskPattern) {
    var data = (this.errorCorrectLevel << 3) | maskPattern;
    var bits = QRUtil.getBCHTypeInfo(data);

    // vertical
    for (var i = 0; i < 15; i++) {
      var mod = !test && ((bits >> i) & 1) == 1;

      if (i < 6) {
        this.modules.set(i, 8, mod);
      } else if (i < 8) {
        this.modules.set(i + 1, 8, mod);
      } else {
        this.modules.set(this.moduleCount - 15 + i, 8, mod);
      }
    }

    // horizontal
    for (var i = 0; i < 15; i++) {
      var mod = !test && ((bits >> i) & 1) == 1;

      if (i < 8) {
        this.modules.set(8, this.moduleCount - i - 1, mod);
      } else if (i < 9) {
        this.modules.set(8, 15 - i - 1 + 1, mod);
      } else {
        this.modules.set(8, 15 - i - 1, mod);
      }
    }

    // fixed module
    this.modules.set(this.moduleCount - 8, 8, !test);
  }

  mapData(data, maskPattern) {
    var inc = -1;
    var row = this.moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;

    for (var col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--;

      while (true) {
        for (var c = 0; c < 2; c++) {
          if (this.modules.get(row, col - c) == undefined) {
            var dark = false;

            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1;
            }

            var mask = QRUtil.getMask(maskPattern, row, col - c);

            if (mask) {
              dark = !dark;
            }

            this.modules.set(row, col - c, dark);
            bitIndex--;

            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
}

const PAD0 = 0xec;
const PAD1 = 0x11;

function createData(typeNumber: number, errorCorrectLevel: number, dataList: QR8bitByte[]) {
  var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

  var buffer = new QRBitBuffer();

  for (var i = 0; i < dataList.length; i++) {
    var data = dataList[i];
    buffer.put(data.mode, 4);
    buffer.put(data.length, QRUtil.getLengthInBits(data.mode, typeNumber));
    data.write(buffer);
  }

  // calc num max data.
  var totalDataCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalDataCount += rsBlocks[i].dataCount;
  }

  if (buffer.bitLength > totalDataCount * 8) {
    throw new Error("code length overflow. (" + buffer.bitLength + ">" + totalDataCount * 8 + ")");
  }

  // end code
  if (buffer.bitLength + 4 <= totalDataCount * 8) {
    buffer.put(0, 4);
  }

  // padding
  while (buffer.bitLength % 8 != 0) {
    buffer.putBit(false);
  }

  // padding
  while (true) {
    if (buffer.bitLength >= totalDataCount * 8) {
      break;
    }
    buffer.put(PAD0, 8);

    if (buffer.bitLength >= totalDataCount * 8) {
      break;
    }
    buffer.put(PAD1, 8);
  }

  return createBytes(buffer, rsBlocks);
}

function createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): Uint32Array {
  var offset = 0;

  var maxDcCount = 0;
  var maxEcCount = 0;

  var dcdata = new Array(rsBlocks.length);
  var ecdata = new Array(rsBlocks.length);

  for (var r = 0; r < rsBlocks.length; r++) {
    var dcCount = rsBlocks[r].dataCount;
    var ecCount = rsBlocks[r].totalCount - dcCount;

    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    dcdata[r] = new Array(dcCount);

    for (var i = 0; i < dcdata[r].length; i++) {
      dcdata[r][i] = 0xff & buffer.buffer[i + offset];
    }
    offset += dcCount;

    var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
    var rawPoly = new QRPolynomial(dcdata[r], rsPoly.length - 1);

    var modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.length - 1);
    for (var i = 0; i < ecdata[r].length; i++) {
      var modIndex = i + modPoly.length - ecdata[r].length;
      ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
  }

  var totalCodeCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalCodeCount += rsBlocks[i].totalCount;
  }

  var data = new Uint32Array(totalCodeCount);
  var index = 0;

  for (var i = 0; i < maxDcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) {
        data[index++] = dcdata[r][i];
      }
    }
  }

  for (var i = 0; i < maxEcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) {
        data[index++] = ecdata[r][i];
      }
    }
  }

  return data;
}
