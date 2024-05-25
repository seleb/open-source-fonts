import nodeCanvas from 'canvas';
import fs from 'fs';
import minimist from 'minimist';

const w = 1280;
const h = 720;

const { createCanvas, registerFont } = nodeCanvas;
const { file } = minimist(process.argv.slice(2));
const {
	fontName,
	filename,
	full_name,
	copyright,
	weight,
	style,
	subsets,
} = JSON.parse(fs.readFileSync(file, 'utf8'));

const canvas = createCanvas(1, 1);
const ctx = canvas.getContext('2d');
registerFont(`.google-fonts/ofl/${fontName}/${filename}`, {
	family: full_name,
	weight,
	style,
});

const includesLatin = subsets.includes('latin') || subsets.includes('latin-ext');

function drawText(text, startSize, maxWidth, height, forceSans = false) {
	let fontSize = startSize;
	let width;
	do {
		ctx.font = `${weight} ${style} ${fontSize}pt '${forceSans ? 'sans' : full_name}'`;
		fontSize -= 2;
		const metrics = ctx.measureText(text);
		width = metrics.width;
	} while (width > w * maxWidth && fontSize > 0);
	ctx.fillText(text, w / 2, h * height);
}


drawText(full_name, 100, 7 / 8, 1 / 2, !includesLatin);
drawText(subsets, 50, 3 / 4, 3 / 5);
drawText(copyright, 50, 3 / 4, 4 / 5, !includesLatin);
