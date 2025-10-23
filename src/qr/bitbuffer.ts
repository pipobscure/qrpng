export class QRBitBuffer {
	public buffer: number[] = [];
	public length: number = 0;

	get(index: number) {
		var bufIndex = Math.floor(index / 8);
		return (((this.buffer[bufIndex] ?? 0) >>> (7 - (index % 8))) & 1) === 1;
	}
	put(num: number, length: number) {
		for (let i = 0; i < length; i++) {
			this.putBit(((num >>> (length - i - 1)) & 1) === 1);
		}
	}
	get bitLength() {
		return this.length;
	}
	putBit(bit: boolean) {
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) {
			this.buffer.push(0);
		}
		if (bit) {
			this.buffer[bufIndex] =
				(this.buffer[bufIndex] ?? 0) | (0x80 >>> (this.length % 8));
		}
		this.length++;
	}
}
