

export function colorToUint(r, g, b) {
	return r | (g << 8) | (b << 16) | 0xFF000000;
}

// https://gist.github.com/mjackson/5311256
export function RGBToHSL(r, g, b) {
	r /= 255, g /= 255, b /= 255;

	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

	switch (max) {
		case r: h = (g - b) / d + (g < b ? 6 : 0); break;
		case g: h = (b - r) / d + 2; break;
		case b: h = (r - g) / d + 4; break;
	}

	h /= 6;
	}

	return [ h, s, l ];
}

export function HSLToRGB(h, s, l) {
	let r, g, b;

	if (s == 0) {
		r = g = b = l; // achromatic
	} else {

		function hue2RGB(p, q, t) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1/6) return p + (q - p) * 6 * t;
			if (t < 1/2) return q;
			if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}

		let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		let p = 2 * l - q;

		r = hue2RGB(p, q, h + 1/3);
		g = hue2RGB(p, q, h);
		b = hue2RGB(p, q, h - 1/3);
	}

	return [ r * 255, g * 255, b * 255 ];
}

export function mod(x, y) {
	return x - y * Math.floor(x / y);
}

export function fract(x) {
	return x - Math.floor(x);
}

export function clamp(x, xmin, xmax) {
	return Math.min(Math.max(x, xmin), xmax);
}

export function snap(x, step) {
	return Math.floor(x / step) * step;
}

const Utils = {
	colorToUint, RGBToHSL, HSLToRGB,
	mod, fract, clamp, snap
};

export { Utils };