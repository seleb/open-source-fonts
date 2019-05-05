const {
	createCanvas,
	registerFont
} = require('canvas');
const fs = require('fs');
const parsePb = require('./parsePb');
const fsp = fs.promises;

const w = 1920;
const h = 1080;

const results = {};

async function saveFont(fontName) {
	const metadataFile = await fsp.readFile(`./node_modules/fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
	const metadata = parsePb(metadataFile);

	async function saveFontVariant({
		filename,
		full_name,
		copyright,
		weight,
		style,
	}) {
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

		function drawText(text, startSize, maxWidth, height) {
			let fontSize = startSize;
			let width;
			do {
				ctx.font = `${weight} ${style} ${fontSize}pt '${full_name}'`;
				fontSize -= 2;
				const metrics = ctx.measureText(text);
				width = metrics.width;
			} while (width > w * maxWidth && fontSize > 0);
			ctx.fillText(text, w / 2, h * height);
		}

		const subsets = (await Promise.all(metadata.subsets
			.filter(s => s !== 'menu')
			.map(s => fsp.readFile(`./subsets/${s}.txt`, 'utf8'))
		)).map(s => s.trim()).join(' - ');

		drawText(full_name, 100, 7 / 8, 1 / 2);
		drawText(subsets, 50, 3 / 4, 3 / 5);
		drawText(copyright, 50, 3 / 4, 4 / 5);

		// save image
		const out = fs.createWriteStream(`./output/${full_name}.png`)
		const stream = canvas.createPNGStream();
		stream.pipe(out);
		console.log(full_name);
		results[full_name] = fontName;
	}

	return Promise.all(metadata.fonts.map(saveFontVariant));
}

async function main() {
	const files = await fsp.readdir('./node_modules/fonts/ofl');
	await Promise.all(files.slice(0,10).map(saveFont));
	fsp.writeFile('./output/output.txt', JSON.stringify(results, undefined, 1), 'utf8');
}

main()
	.then(() => console.log('👍'))
	.catch(err => console.error('👎', err));
