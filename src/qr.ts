import { QRCode } from './qr/code.ts';
import { bitmap } from './png.ts';

async function generate(text: string, scale: number = 8): Promise<Uint8Array> {
	if (text.length > 1273) throw new Error('text too long');
	const qr = new QRCode(level(text), 2);
	qr.addData(text);
	qr.make();
	const pixels = code(qr, scale);
	return await bitmap(pixels);
}

export default generate;

function code(qr: QRCode, scale: number = 1) {
	var res: boolean[][] = [];
	var mods = qr.getModuleCount();

	for (let cnt = 3; cnt; cnt--)
		for (let cnt = scale; cnt; cnt--)
			res.push(new Array((mods + 2 * 3) * scale).fill(false));

	for (let idx = 0; idx < mods; idx += 1) {
		const lp = line(qr, idx, scale);
		res.push(...new Array(scale).fill(lp));
	}

	for (let cnt = 3; cnt; cnt--)
		for (let cnt = scale; cnt; cnt--)
			res.push(new Array((mods + 2 * 3) * scale).fill(false));

	return res;
}

function line(qr: QRCode, l: number, scale: number) {
	var mods = qr.getModuleCount();
	var res: boolean[] = [];

	for (let cnt = 3; cnt; cnt--) res.push(...new Array(scale).fill(false));

	for (let idx = 0; idx < mods; idx += 1) {
		res.push(...new Array(scale).fill(qr.isDark(l, idx)));
	}

	for (let cnt = 3; cnt; cnt--) res.push(...new Array(scale).fill(false));

	return res;
}

var levels = [
	7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280,
	310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842,
	898, 958, 983, 1051, 1093, 1139, 1219, 1273,
];

function level(text: string): number {
	var res = 9999;
	levels.forEach((max, lev) => {
		if (max < text.length) return;
		res = Math.min(lev, res);
	});
	if (res >= levels.length)
		throw new Error(`text too long (max: ${levels[levels.length - 1]})`);
	return res + 1;
}
