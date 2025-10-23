import { Mode } from './const.ts';
import type { QRBitBuffer } from './bitbuffer.ts';

export class QR8bitByte {
	constructor(data: string) {
		this.data = data;
	}
	private data: string;
	public readonly mode = Mode.MODE_8BIT_BYTE;
	public get length() {
		return this.data.length;
	}
	write(buffer: QRBitBuffer) {
		for (let i = 0; i < this.data.length; i++) {
			// not JIS ...
			buffer.put(this.data.charCodeAt(i), 8);
		}
	}
}
