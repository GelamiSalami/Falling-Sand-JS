
import GUI from "./lib/lil-gui.module.min.js";
import Stats from "./lib/stats.module.min.js";

import { World } from "./World.js";

import { colorToUint, RGBToHSL, HSLToRGB,
		 mod, fract, clamp, snap } from "./Utils.js";

import { CellTypes } from "./CellTypes.js";

(async function main() {

function addStatsJS(type) {
	let stats = new Stats();

	stats.showPanel(type); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild(stats.dom);

	return stats;
}

const stats = addStatsJS(0);

function resizeCanvasToDisplaySize(canvas, pixelRatio) {
	pixelRatio = pixelRatio || 1;
	const width  = canvas.clientWidth * pixelRatio | 0;
	const height = canvas.clientHeight * pixelRatio | 0;
	if (canvas.width !== width ||  canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
		return true;
	}
	return false;
}

const container = document.getElementById("canvas-container");
const canvas = document.getElementById("main-canvas");
const ctx = canvas.getContext("2d");
const gl = canvas.getContext("webgl2");

canvas.addEventListener("contextmenu", (event) => {
	event.preventDefault();
});

// const WIDTH = 120;
// const HEIGHT = 65;
// const SCALE = 8;

// const WIDTH = 120*10;
// const HEIGHT = 65*10;
// const SCALE = 1;

// const WIDTH = 120*4;
// const HEIGHT = 65*4;
// const SCALE = 2;

const WIDTH = 120*2;
const HEIGHT = 65*2;
const SCALE = 4;

const BRUSH_RADIUS = 8;
const MIN_BRUSH_RADIUS = 1;
const MAX_BRUSH_RADIUS = 20;

canvas.width = WIDTH;
canvas.height = HEIGHT;

canvas.style.width = `${WIDTH * SCALE}px`;
canvas.style.height = `${HEIGHT * SCALE}px`;

ctx.fillStyle = "rgb(13, 13, 13)";
ctx.fillRect(0, 0, canvas.width, canvas.height);

let brushColor = "rgba(255, 128, 50, 0.75)";

const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);

const BACKGROUND_COLOR = colorToUint(13, 13, 13);
const SAND_RGB = [240, 160, 100];
const SAND = colorToUint(SAND_RGB[0], SAND_RGB[0], SAND_RGB[0]);

const world = new World(WIDTH, HEIGHT, BACKGROUND_COLOR);

const gui = new GUI();

const settings = {
	brushType: 1,
	brushRadius: BRUSH_RADIUS,
	brushProbability: 1.0,
	showUpdateMask: false,
	clearFunc: () => world.clear(),
}

const brushTypeController = gui.add(settings, "brushType", 0, 9, 1).name("Brush Type");
const brushRadiusController = gui.add(settings, "brushRadius", MIN_BRUSH_RADIUS, MAX_BRUSH_RADIUS, 0.1).name("Brush Radius");

gui.add(settings, "brushProbability", 0.0, 1.0).name("Brush Probability");

const updateMaskController = gui.add(settings, "showUpdateMask").name("Show Update Mask");

gui.add(settings, "clearFunc", 0.0, 1.0).name("Clear World");

const mouse = {
	x: 0, y: 0,
	px: 0, py: 0,
	pressed: false,
	buttonLeft: false,
	buttonRight: false,
	inside: false
}

function mouseMoved(event) {
	let x = event.clientX != null ? event.clientX : event.touches[0].clientX;
	let y = event.clientY != null ? event.clientY : event.touches[0].clientY;
	let rect = canvas.getBoundingClientRect();
	mouse.x = x - rect.left;
	mouse.y = y - rect.top;
}

function mousePressed(event) {
	let x = event.clientX != null ? event.clientX : event.touches[0].clientX;
	let y = event.clientY != null ? event.clientY : event.touches[0].clientY;
	let rect = canvas.getBoundingClientRect();
	mouse.x = x - rect.left;
	mouse.y = y - rect.top;
	mouse.px = mouse.x;
	mouse.py = mouse.y;
	mouse.pressed = true;

	if (event.button == 0) {
		mouse.buttonLeft = true;
	} else if (event.button == 2 || event.touches.length > 1) {
		mouse.buttonRight = true;
	}
}

function mouseReleased(event) {
	mouse.pressed = false;
	mouse.buttonLeft = false;
	mouse.buttonRight = false;
}

function mouseEntered(event) {
	mouse.inside = true;
}

function mouseLeft(event) {
	mouse.inside = false;
	mouseReleased(event);
}

function varyBrushRadius(offset) {
	settings.brushRadius = clamp(settings.brushRadius - offset, MIN_BRUSH_RADIUS, MAX_BRUSH_RADIUS);
	brushRadiusController.updateDisplay();
}

function mouseScrolled(event) {
	varyBrushRadius(snap(-event.deltaY / 100, 0.1));
}

function keyPressed(event) {
	const keyCode = event.keyCode;
	if (keyCode >= 48 && keyCode <= 57) {
		brushTypeController.setValue(keyCode - 48);
	} else if (keyCode >= 96 && keyCode <= 105) {
		brushTypeController.setValue(keyCode - 96);
	}
	if (keyCode === 68) {
		updateMaskController.setValue(!settings.showUpdateMask);
	}

	if (keyCode === 219) {
		varyBrushRadius(-0.5);
	} else if (keyCode === 221) {
		varyBrushRadius(0.5);
	}
}

document.addEventListener("keydown", keyPressed);

canvas.addEventListener("mouseenter", mouseEntered);
canvas.addEventListener("touchenter", mouseEntered);

canvas.addEventListener("mouseleave", mouseLeft);
canvas.addEventListener("touchleave", mouseLeft);

canvas.addEventListener("mousemove", mouseMoved);
canvas.addEventListener("touchmove", mouseMoved, { passive: true });

canvas.addEventListener("mousedown", mousePressed);
canvas.addEventListener("touchstart", mousePressed, { passive: true });

canvas.addEventListener("mouseup", mouseReleased);
canvas.addEventListener("touchend", mouseReleased);

canvas.addEventListener("wheel", mouseScrolled, { passive: true });

function getSandColor(x, y) {
	const [r, g, b] = SAND_RGB;
	const hsl = RGBToHSL(r, g, b);
	
	const hoff = (Math.sin(x * 0.15) + Math.cos(y * 0.12)) * 0.06;
	hsl[0] = fract(hsl[0] + (Math.random() - 0.5) * 0.06 + prevTime * 0.0005 + hoff);
	hsl[1] = clamp(hsl[1] + (Math.random() - 0.5) * 0.08, 0, 1);
	hsl[2] = clamp(hsl[2] + (Math.random() - 0.5) * 0.15, 0, 1);

	if (Math.random() < 0.01) {
		hsl[2] = clamp(hsl[2] * 2, 0, 0.95);
	}

	const rgb = HSLToRGB(hsl[0], hsl[1], hsl[2]);

	return colorToUint(rgb[0], rgb[1], rgb[2]);
}

function varyColor(r, g, b, ho = 0.06, so = 0.08, lo = 0.08) {
	const hsl = RGBToHSL(r, g, b);

	hsl[0] = fract(hsl[0] + (Math.random() - 0.5) * ho);
	hsl[1] = clamp(hsl[1] + (Math.random() - 0.5) * so, 0, 1);
	hsl[2] = clamp(hsl[2] + (Math.random() - 0.5) * lo, 0, 1);

	const rgb = HSLToRGB(hsl[0], hsl[1], hsl[2]);

	return colorToUint(rgb[0], rgb[1], rgb[2]);
}

const debugArrayBuffer = new ArrayBuffer(WIDTH * HEIGHT * 4);
const debugBuffer8 = new Uint8Array(debugArrayBuffer);
const debugBuffer = new Uint32Array(debugArrayBuffer);

const DEBUG_RED = colorToUint(255, 50, 50);
const DEBUG_BLUE = colorToUint(50, 255, 50);

let prevTime = 0;
function render(currentTime) {

	const mx = (mouse.x / SCALE);
	const my = (mouse.y / SCALE);
	const mpx = (mouse.px / SCALE);
	const mpy = (mouse.py / SCALE);

	if (mouse.buttonLeft || mouse.buttonRight) {
		world.setSegment(mpx, mpy, mx, my, settings.brushRadius, settings.brushProbability, (x, y) => {
			if (mouse.buttonLeft) {
				switch (settings.brushType) {
					case 0:
						return { type: CellTypes.EMPTY, color: 0 };
					case 1: 
						return {
							type: CellTypes.WATER,
							color: varyColor(20, 160, 255, 0.0, 0.04, 0.05),
							data: Math.random() < 0.5 ? 0 : 1
						};
					case 2:
						return { type: CellTypes.SAND, color: getSandColor(x, y) };
					case 3:
						return { type: CellTypes.STONE, color: varyColor(55, 59, 65) };
					case 4:
						return { type: CellTypes.WALL, color: varyColor(22, 24, 25) };
					default:
						return { type: CellTypes.EMPTY, color: 0 };
				}
			} else {
				return { type: CellTypes.EMPTY, color: 0 };
			}
		});
	}

	if (mouse.buttonRight) {
	}

	const UPDATE_COUNT = 1;
	for (let i = 0; i < UPDATE_COUNT; i++) {
		world.update();
	}

	if (settings.showUpdateMask) {
		for (let i = 0; i < WIDTH * HEIGHT; i++) {
			debugBuffer[i] = world.awake[i] !== 0 ? DEBUG_RED : world.isEmpty(i) ? 0 : DEBUG_BLUE;
		}
		imageData.data.set(debugBuffer8);
	} else {
		imageData.data.set(world.getColorBuffer());
	}

	ctx.putImageData(imageData, 0, 0);

	if (mouse.inside) {
		ctx.fillStyle = brushColor;

		ctx.beginPath();
		ctx.arc(mx, my, settings.brushRadius, 0, 2 * Math.PI);
		ctx.fill();
	}

	mouse.px = mouse.x;
	mouse.py = mouse.y;
	prevTime = currentTime;

	stats.update();

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

})();