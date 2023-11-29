
import { colorToUint, clamp } from "./Utils.js";

import { CellFactory } from "./CellFactory.js";

import { CellTypes } from "./CellTypes.js";

export class World {
	
	constructor(width, height, backgroundColor = 0) {
		this.width = width;
		this.height = height;
		this.cellCount = width * height;

		this.gravity = 0.25;
		this.maxVelocity = 8;

		this.backgroundColor = backgroundColor;

		this.tileSize = 16;
		this.tileWidth = (width / this.tileSize)|0;
		this.tileHeight = (height / this.tileSize)|0;
		this.tileCount = this.tileWidth * this.tileHeight;
		this.tiles = new Array(this.tileCount);

		for (let i = 0; i < this.tileCount; i++) {
			this.tiles[i] = {
				minX: this.width,
				maxX: 0,
				minY: this.height,
				maxY: 0
			};
		}

		this.currTime = 1;

		this.clear();
	}

	clear() {
		this._colorArrayBuffer = new ArrayBuffer(this.cellCount * 4);
		this._colorBuffer8 = new Uint8Array(this._colorArrayBuffer);
		this.colors = new Uint32Array(this._colorArrayBuffer);
		this.colors.fill(this.backgroundColor);

		this.cells = new Uint8Array(this.cellCount);
		this.cells.fill(0);

		this.data = new Uint8Array(this.cellCount);
		this.data.fill(0);

		this.velocityX = new Float32Array(this.cellCount);
		this.velocityX.fill(0);
		this.velocityY = new Float32Array(this.cellCount);
		this.velocityY.fill(0);

		this.awake = new Uint8Array(this.cellCount);
		this.awake.fill(0);

		this.timer = new Uint8Array(this.cellCount);
		this.timer.fill(0);
	}

	getColorBuffer() {
		return this._colorBuffer8;
	}

	update() {

		this.currTime = (this.currTime + 1) & 255;

		for (let y = this.height - 1; y >= 0; y--) {
			const dir = Math.random() < 0.5;

			for (let x = 0; x < this.width; x++) {
				const x0 = dir ? x : this.width - 1 - x;
				const index = this.getIndex(x0, y);

				if (!this.isAwake(index))
					continue;

				if (this.isEmpty(index)) {
					this.setAwake(index, 0);
					continue;
				}

				if (this.timer[index] === this.currTime)
					continue;

				this.timer[index] = this.currTime;

				this.updateVelocity(index);

				const updateCount = this.getUpdateCount(index);

				if (updateCount === 0)
					continue;

				let currIndex = index;
				for (let i = 0; i < updateCount; i++) {
					const type = this.getCell(currIndex);
					const newIndex = CellFactory.updateCell(type, currIndex, this);

					if (currIndex !== newIndex) {
						this.setAwake(currIndex - 1, 1);
						this.setAwake(currIndex + 1, 1);
						this.setAwake(currIndex - this.width, 1);
						this.setAwake(currIndex + this.width, 1);
						this.setAwake(currIndex - this.width - 1, 1);
						this.setAwake(currIndex + this.width + 1, 1);
						this.setAwake(currIndex - this.width + 1, 1);
						this.setAwake(currIndex + this.width - 1, 1);

						currIndex = newIndex;

						this.setAwake(currIndex - 1, 1);
						this.setAwake(currIndex + 1, 1);
						this.setAwake(currIndex - this.width, 1);
						this.setAwake(currIndex + this.width, 1);
						this.setAwake(currIndex - this.width - 1, 1);
						this.setAwake(currIndex + this.width + 1, 1);
						this.setAwake(currIndex - this.width + 1, 1);
						this.setAwake(currIndex + this.width - 1, 1);
					} else {
						this.setVelocityY(currIndex, 0);
						this.setAwake(currIndex, 0);
						break;
					}
				}
			}
		}
	}

	updateVelocity(index) {
		let newVelocity = this.getVelocityY(index) + this.gravity;

		if (Math.abs(newVelocity) > this.maxVelocity) {
			newVelocity = Math.sign(newVelocity) * this.maxVelocity;
		}

		this.setVelocityY(index, newVelocity);
	}

	getUpdateCount(index) {
		const absVelocity = Math.abs(this.getVelocityY(index));
		let count = Math.floor(absVelocity);
		const remainder = absVelocity - count;

		if (this.getCell(index) === CellTypes.WATER) count = Math.max(count, 2);

		return count + (Math.random() < remainder ? 1 : 0);
	}

	getIndex(x, y) {
		return x + y * this.width;
	}

	setCell(x, y, { type, color = 0, data = 0 }) {
		const index = this.getIndex(x, y);

		this.cells[index] = type;
		this.colors[index] = color;
		this.data[index] = data;
		this.awake[index] = type !== CellTypes.EMPTY ? 1 : 0;
		this.timer[index] = this.currTime > 0 ? this.currTime - 1 : 0;

		this.setAwake(index - 1, 1);
		this.setAwake(index + 1, 1);
		this.setAwake(index - this.width, 1);
		this.setAwake(index + this.width, 1);
		this.setAwake(index - this.width - 1, 1);
		this.setAwake(index + this.width + 1, 1);
		this.setAwake(index - this.width + 1, 1);
		this.setAwake(index + this.width - 1, 1);
	}

	getCell(index) {
		if (index < 0 || index >= this.cellCount)
			return 100;
		return this.cells[index];
	}

	setVelocityY(index, value) {
		this.velocityY[index] = value;
	}

	getVelocityY(index) {
		return this.velocityY[index];
	}

	isAwake(index) {
		return this.awake[index] !== CellTypes.EMPTY;
	}

	setAwake(index, value) {
		this.awake[index] = value;
	}

	isEmpty(index) {
		return this.cells[index] === CellTypes.EMPTY;
	}

	getDensity(index) {
		switch(this.getCell(index)) {
			case 0: return 0;
			case 1: return 1;
			case 2: return 2;
		}
		return index;
	}

	isEmptyXY(x, y) {
		if (x < 0 || x >= this.width || y < 0 || y >= this.height)
			return false;

		return this.cells[this.getIndex(x, y)] === CellTypes.EMPTY;
	}

	swapCells(a, b) {
		const temp = this.cells[a];
		this.cells[a] = this.cells[b];
		this.cells[b] = temp;

		const tempColor = this.colors[a];
		this.colors[a] = this.colors[b];
		this.colors[b] = tempColor;

		const tempData = this.data[a];
		this.data[a] = this.data[b];
		this.data[b] = tempData;

		const tempVelocityY = this.velocityY[a];
		this.velocityY[a] = this.velocityY[b];
		this.velocityY[b] = tempVelocityY;

		const tempAwake = this.awake[a];
		this.awake[a] = this.awake[b];
		this.awake[b] = tempAwake;

		const tempTimer = this.timer[a];
		this.timer[a] = this.timer[b];
		this.timer[b] = tempTimer;
	}

	setCircle(x, y, radius, probability, cellCallback) {

		const radiusSq = radius * radius;

		for (let y0 = -radius; y0 <= radius; y0++) {
			for (let x0 = -radius; x0 <= radius; x0++) {
				const px = (x + x0)|0;
				const py = (y + y0)|0;

				if (px < 0 || px >= this.width || py < 0 || py >= this.height) {
					continue;
				}

				if (x0*x0 + y0*y0 < radiusSq && (!probability || Math.random() < probability)) {
					this.setCell(px, py, cellCallback(px, py));
				}
			}
		}
	}

	setSegment(x0, y0, x1, y1, radius, probability, cellCallback) {

		const xd = x1 - x0;
		const yd = y1 - y0;
		const d = xd * xd + yd * yd;

		if (d < 1e-4) {
			this.setCircle(x0, y0, radius, probability, cellCallback);
			return;
		}

		const radiusSq = radius * radius;

		const xmin = Math.min(x0, x1);
		const ymin = Math.min(y0, y1);
		const xmax = Math.max(x0, x1);
		const ymax = Math.max(y0, y1);

		for (let y = ymin - radius; y <= ymax + radius; y++) {
			for (let x = xmin - radius; x <= xmax + radius; x++) {
				const px = (x)|0;
				const py = (y)|0;

				if (px < 0 || px >= this.width || py < 0 || py >= this.height) {
					continue;
				}

				const n = (x - x0) * xd + (y - y0) * yd;
				const h = clamp(n / d, 0.0, 1.0);
				const xo = (x - x0) - xd * h;
				const yo = (y - y0) - yd * h;

				if (xo*xo + yo*yo < radiusSq && (!probability || Math.random() < probability)) {
					this.setCell(px, py, cellCallback(px, py));
				}
			}
		}
	}
}