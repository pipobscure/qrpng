const EXP_TABLE: number[] = new Array(256);
const LOG_TABLE: number[] = new Array(256);
for (let i = 0; i < 8; i++) {
	EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i++) {
	EXP_TABLE[i] =
		(EXP_TABLE[i - 4] ?? 0) ^
		(EXP_TABLE[i - 5] ?? 0) ^
		(EXP_TABLE[i - 6] ?? 0) ^
		(EXP_TABLE[i - 8] ?? 0);
}
for (let i = 0; i < 255; i++) {
	LOG_TABLE[EXP_TABLE[i] ?? 0] = i;
}

export function glog(n: number) {
	if (n < 1) {
		throw new Error(`glog(${n})`);
	}
	return LOG_TABLE[n] ?? 0;
}

export function gexp(n: number) {
	while (n < 0) n += 255;
	while (n >= 256) n -= 255;
	return EXP_TABLE[n] ?? 0;
}
