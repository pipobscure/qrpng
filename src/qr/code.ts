import * as QRUtil from './utils.ts';
import { Grid } from './grid.ts';
import { QRPolynomial } from './polynomial.ts';
import { QRRSBlock } from './block.ts';
import { QRBitBuffer } from './bitbuffer.ts';
import { QR8bitByte } from './byte.ts';

export class QRCode {
	constructor(typeNumber: number, errorCorrectLevel: number) {
		this.typeNumber = typeNumber;
		this.errorCorrectLevel = errorCorrectLevel;
	}
	private typeNumber: number;
	private errorCorrectLevel: number;
	private modules: Grid<boolean> = new Grid<boolean>(0);
	private moduleCount: number = 0;
	private dataCache?: Uint32Array | undefined;
	private dataList: QR8bitByte[] = [];

	public addData(data: string): void {
		const newData = new QR8bitByte(data);
		this.dataList.push(newData);
		this.dataCache = undefined;
	}

	isDark(row: number, col: number) {
		if (
			row < 0 ||
			this.moduleCount <= row ||
			col < 0 ||
			this.moduleCount <= col
		) {
			throw new Error(`${row},${col}`);
		}
		return this.modules.get(row, col);
	}

	getModuleCount() {
		return this.moduleCount;
	}

	make() {
		this.makeImpl(false, this.getBestMaskPattern());
	}

	makeImpl(test: boolean, maskPattern: number) {
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

		if (!this.dataCache) {
			this.dataCache = createData(
				this.typeNumber,
				this.errorCorrectLevel,
				this.dataList,
			);
		}

		this.mapData(this.dataCache as Uint32Array, maskPattern);
	}

	setupPositionProbePattern(row: number, col: number) {
		for (let r = -1; r <= 7; r++) {
			if (row + r <= -1 || this.moduleCount <= row + r) continue;

			for (let c = -1; c <= 7; c++) {
				if (col + c <= -1 || this.moduleCount <= col + c) continue;

				if (
					(0 <= r && r <= 6 && (c === 0 || c === 6)) ||
					(0 <= c && c <= 6 && (r === 0 || r === 6)) ||
					(2 <= r && r <= 4 && 2 <= c && c <= 4)
				) {
					this.modules.set(row + r, col + c, true);
				} else {
					this.modules.set(row + r, col + c, false);
				}
			}
		}
	}

	getBestMaskPattern() {
		let minLostPoint = 0;
		let pattern = 0;

		for (let i = 0; i < 8; i++) {
			this.makeImpl(true, i);

			const lostPoint = QRUtil.getLostPoint(this);

			if (i === 0 || minLostPoint > lostPoint) {
				minLostPoint = lostPoint;
				pattern = i;
			}
		}

		return pattern;
	}

	setupTimingPattern() {
		for (let r = 8; r < this.moduleCount - 8; r++) {
			if (this.modules.get(r, 6) !== undefined) {
				continue;
			}
			this.modules.set(r, 6, r % 2 === 0);
		}

		for (let c = 8; c < this.moduleCount - 8; c++) {
			if (this.modules.get(6, c) !== undefined) {
				continue;
			}
			this.modules.set(6, c, c % 2 === 0);
		}
	}

	setupPositionAdjustPattern() {
		const pos = QRUtil.getPatternPosition(this.typeNumber);

		for (let i = 0; i < pos.length; i++) {
			for (let j = 0; j < pos.length; j++) {
				const row = pos[i] ?? 0;
				const col = pos[j] ?? 0;

				if (this.modules.get(row, col) !== undefined) {
					continue;
				}

				for (let r = -2; r <= 2; r++) {
					for (let c = -2; c <= 2; c++) {
						if (
							r === -2 ||
							r === 2 ||
							c === -2 ||
							c === 2 ||
							(r === 0 && c === 0)
						) {
							this.modules.set(row + r, col + c, true);
						} else {
							this.modules.set(row + r, col + c, false);
						}
					}
				}
			}
		}
	}

	setupTypeNumber(test: boolean) {
		const bits = QRUtil.getBCHTypeNumber(this.typeNumber);

		for (let i = 0; i < 18; i++) {
			const mod = !test && ((bits >> i) & 1) === 1;
			this.modules.set(
				Math.floor(i / 3),
				(i % 3) + this.moduleCount - 8 - 3,
				mod,
			);
		}

		for (let i = 0; i < 18; i++) {
			const mod = !test && ((bits >> i) & 1) === 1;
			this.modules.set(
				(i % 3) + this.moduleCount - 8 - 3,
				Math.floor(i / 3),
				mod,
			);
		}
	}

	setupTypeInfo(test: boolean, maskPattern: number) {
		const data = (this.errorCorrectLevel << 3) | maskPattern;
		const bits = QRUtil.getBCHTypeInfo(data);

		// vertical
		for (let i = 0; i < 15; i++) {
			const mod = !test && ((bits >> i) & 1) === 1;

			if (i < 6) {
				this.modules.set(i, 8, mod);
			} else if (i < 8) {
				this.modules.set(i + 1, 8, mod);
			} else {
				this.modules.set(this.moduleCount - 15 + i, 8, mod);
			}
		}

		// horizontal
		for (let i = 0; i < 15; i++) {
			const mod = !test && ((bits >> i) & 1) === 1;

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

	mapData(data: Uint32Array, maskPattern: number) {
		let inc = -1;
		let row = this.moduleCount - 1;
		let bitIndex = 7;
		let byteIndex = 0;

		for (let col = this.moduleCount - 1; col > 0; col -= 2) {
			if (col === 6) col--;

			while (true) {
				for (let c = 0; c < 2; c++) {
					if (this.modules.get(row, col - c) === undefined) {
						let dark = false;

						if (byteIndex < data.length) {
							dark = (((data[byteIndex] ?? 0) >>> bitIndex) & 1) === 1;
						}

						const mask = QRUtil.getMask(maskPattern, row, col - c);

						if (mask) {
							dark = !dark;
						}

						this.modules.set(row, col - c, dark);
						bitIndex--;

						if (bitIndex === -1) {
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

function createData(
	typeNumber: number,
	errorCorrectLevel: number,
	dataList: QR8bitByte[],
) {
	const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

	const buffer = new QRBitBuffer();

	for (let i = 0; i < dataList.length; i++) {
		const data = dataList[i] as QR8bitByte;
		buffer.put(data.mode, 4);
		buffer.put(data.length, QRUtil.getLengthInBits(data.mode, typeNumber));
		data.write(buffer);
	}

	// calc num max data.
	let totalDataCount = 0;
	for (let i = 0; i < rsBlocks.length; i++) {
		totalDataCount += rsBlocks[i]?.dataCount ?? 0;
	}

	if (buffer.bitLength > totalDataCount * 8) {
		throw new Error(
			'code length overflow. (' +
				buffer.bitLength +
				'>' +
				totalDataCount * 8 +
				')',
		);
	}

	// end code
	if (buffer.bitLength + 4 <= totalDataCount * 8) {
		buffer.put(0, 4);
	}

	// padding
	while (buffer.bitLength % 8 !== 0) {
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
	let offset = 0;

	let maxDcCount = 0;
	let maxEcCount = 0;

	const dcdata = new Array(rsBlocks.length);
	const ecdata = new Array(rsBlocks.length);

	for (let r = 0; r < rsBlocks.length; r++) {
		const dcCount = rsBlocks[r]?.dataCount ?? 0;
		const ecCount = (rsBlocks[r]?.totalCount ?? 0) - dcCount;

		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);

		dcdata[r] = new Array(dcCount);

		for (let i = 0; i < dcdata[r].length; i++) {
			dcdata[r][i] = 0xff & (buffer.buffer[i + offset] ?? 0);
		}
		offset += dcCount;

		const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
		const rawPoly = new QRPolynomial(dcdata[r], rsPoly.length - 1);

		const modPoly = rawPoly.mod(rsPoly);
		ecdata[r] = new Array(rsPoly.length - 1);
		for (let i = 0; i < ecdata[r].length; i++) {
			const modIndex = i + modPoly.length - ecdata[r].length;
			ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
		}
	}

	let totalCodeCount = 0;
	for (let i = 0; i < rsBlocks.length; i++) {
		totalCodeCount += rsBlocks[i]?.totalCount ?? 0;
	}

	const data = new Uint32Array(totalCodeCount);
	let index = 0;

	for (let i = 0; i < maxDcCount; i++) {
		for (let r = 0; r < rsBlocks.length; r++) {
			if (i < dcdata[r].length) {
				data[index++] = dcdata[r][i];
			}
		}
	}

	for (let i = 0; i < maxEcCount; i++) {
		for (let r = 0; r < rsBlocks.length; r++) {
			if (i < ecdata[r].length) {
				data[index++] = ecdata[r][i];
			}
		}
	}

	return data;
}
