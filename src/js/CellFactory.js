
import { CellTypes } from "./CellTypes.js";

const EmptyCell = {
	updateCell(index, world) {
		return index;
	}
}

const StoneCell = {
	updateCell(index, world) {
		const below = index + world.width;
		const leftright = world.getCell(index - 1) === 3 && world.getCell(index + 1) === 3;
		let falling = world.data[index] === 1;
		const canFall = world.getDensity(below) < 2;

		if (!leftright) {
			world.data[index] = 1;
			falling = true;
		}

		if (falling && canFall) {
			world.swapCells(index, below);
			return below;
		}

		return index;
	}
}

const WaterCell = {

	updateCell(index, world) {
		const below = index + world.width;
		const sign = Math.random() < 0.5 ? -1 : 1;

		const dir = world.data[index] === 0 ? -1 : 1;
		const side = index + dir;
		const side2 = index - dir;
		const belowSide = side + world.width;

		const isBelowEmpty = world.isEmpty(below);
		const randSide = Math.random() < 0.5 ? index - 1 : index + 1;

		if (isBelowEmpty && world.isEmpty(randSide) && Math.random() < 0.1) {
			world.swapCells(index, randSide);
			return randSide;
		} else if (isBelowEmpty) {
			world.swapCells(index, below);
			return below;
		} else if (world.isEmpty(belowSide)
			) {
			world.swapCells(index, belowSide);
			return belowSide;
		} else if (world.isEmpty(side)) { // || world.getCell(side) === 1) {
			world.swapCells(index, side);
			return side;
		} else if (world.isEmpty(side2)) {
			world.data[index] = 1 - world.data[index];
			world.swapCells(index, side2);
			return side2;
		}

		return index;
	}
}

const SandCell = {

	updateCell(index, world) {
		const below = index + world.width;
		const belowLeft = below - 1;
		const belowRight = below + 1;
		const canWiggle = Math.random() < 0.1;
		const density = 2;

		const isBelowEmpty = world.getDensity(below) < density;
		const isSide = Math.random() < 0.5;
		const side = isSide ? index - 1 : index + 1;

		if (isBelowEmpty && canWiggle && world.getDensity(side) < density) {
			world.swapCells(index, side);
			return side;
		} else if (isBelowEmpty) {
			world.swapCells(index, below);
			return below;
		} else if (world.getDensity(belowLeft) < density) {
			world.swapCells(index, belowLeft);
			return belowLeft;
		} else if (world.getDensity(belowRight) < density) {
			world.swapCells(index, belowRight);
			return belowRight;
		}

		return index;
	}
}

const CellList = [
	EmptyCell,
	WaterCell,
	SandCell,
	StoneCell,
];

const CellFactory = {
	
	updateCell(type, index, world) {
		if (CellList[type]) {
			return CellList[type].updateCell(index, world);
		}
		return index;
	}

}

export { CellFactory };