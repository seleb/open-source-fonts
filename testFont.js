const w = 100;
const h = 50;

import nodeCanvas from 'canvas';
import fs from 'fs';
import minimist from 'minimist';
import fetch from 'node-fetch';

const { createCanvas, registerFont } = nodeCanvas;
const { file } = minimist(process.argv.slice(2));
const { name, fontName, filename, full_name, copyright, weight, style, subsets } = JSON.parse(fs.readFileSync(file, 'utf8'));


const canvas = createCanvas(w, h);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, w, h);
ctx.fillStyle = 'white';
ctx.textAlign = 'center';

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

const testStr = subsets.replace(/ - /g,'\n');
drawText(testStr, 25, 4 / 5, 1 / 2, true);
const a = canvas.toBuffer();

ctx.fillStyle = 'black';
ctx.fillRect(0, 0, w, h);
ctx.fillStyle = 'white';

registerFont(`.google-fonts/ofl/${fontName}/${filename}`, {
	family: full_name,
	weight,
	style,
});
drawText(testStr, 25, 4 / 5, 1 / 2);
const b = canvas.toBuffer();

if (!a.compare(b)) {
	console.log('Failed canvas draw test');
	process.exit(1);
}

const url = `https://fonts.google.com/metadata/fonts/${name.replace(/\s/g, '%20')}`;
fetch(url)
	.then(response => {
		if (!response.ok) throw `Failed to load specimen metadata from ${url}`;
	})
	.then(() => {
		process.exit(0);
	})
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});
