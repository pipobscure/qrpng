export class Grid<T> {
	constructor(rows: number, cols: number = rows) {
		this.rowCount = rows;
		this.colCount = cols;
	}
	private dataHash: { [key: string]: T } = {};
	private rowCount: number = 0;
	private colCount: number = 0;
	public get rows() {
		return this.rowCount;
	}
	public get columns() {
		return this.colCount;
	}
	public get(row: number, col: number): T | undefined {
		return this.dataHash[`${row}/${col}`];
	}
	public set(row: number, col: number, val: T) {
		this.dataHash[`${row}/${col}`] = val;
	}
	public has(row: number, col: number): boolean {
		return 'undefined' !== typeof this.get(row, col);
	}
	public delete(row: number, col: number) {
		delete this.dataHash[`${row}/${col}`];
	}
	public get data() {
		const data = [];
		for (let row = 0; row < this.rows; row++) {
			const rowdata: (T | undefined)[] = [];
			data.push(rowdata);
			for (let col = 0; col < this.columns; col++) {
				rowdata.push(this.get(row, col));
			}
		}
		return data;
	}
}
