const w = 100;
const h = 50;

const fs = require('fs');

const {
	file,
} = require('minimist')(process.argv.slice(2));
const {
	fontName,
	filename,
	full_name,
	copyright,
	weight,
	style,
	subsets,
} = JSON.parse(fs.readFileSync(file, 'utf8'));

const {
	createCanvas,
	registerFont
} = require('canvas');

registerFont(`./node_modules/fonts/ofl/${fontName}/${filename}`, {
	family: full_name,
	weight,
	style,
});


const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, w, h);
ctx.fillStyle = 'white';
ctx.textAlign = 'center';

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

const testStr = 'the quick brown\nfox jumps over\nthe lazy dog';
drawText(testStr, 25, 4 / 5, 1 / 2);
const a = canvas.toBuffer();

ctx.fillStyle = 'black';
ctx.fillRect(0, 0, w, h);
ctx.fillStyle = 'white';
drawText(testStr, 25, 4 / 5, 1 / 2, true);
const b = canvas.toBuffer();

if (a.compare(b)) {
	return;
}

console.log('failed');
