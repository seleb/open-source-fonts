const {
	createCanvas,
	registerFont
} = require('canvas');
const fs = require('fs');
const parsePb = require('./parsePb');
const fsp = fs.promises;

const w = 1280;
const h = 720;

const results = {};
const errors = [];

async function saveFont(fontName) {
	let metadataFile;
	try {
		metadataFile = await fsp.readFile(`./node_modules/fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
	} catch (err) {
		errors.push({ fontName, err });
		return;
	}
	const { fonts, subsets } = parsePb(metadataFile);

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

		const includesLatin = subsets.includes('latin');

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

		const subsetsString = (await Promise.all(subsets
			.filter(s => s !== 'menu')
			.map(s => fsp.readFile(`./subsets/${s}.txt`, 'utf8'))
		)).map(s => s.trim()).join(' - ');

		drawText(full_name, 100, 7 / 8, 1 / 2, !includesLatin);
		drawText(subsetsString, 50, 3 / 4, 3 / 5);
		drawText(copyright, 50, 3 / 4, 4 / 5, !includesLatin);

		// save image
		const out = fs.createWriteStream(`./output/${full_name}.png`)
		const stream = canvas.createPNGStream();
		stream.pipe(out);
		console.log(full_name);
		results[full_name] = fontName;
	}

	return Promise.all(fonts.map(saveFontVariant));
}

async function main() {
	const files = await fsp.readdir('./node_modules/fonts/ofl');
	await files.reduce(async (chain, file) => {
		await chain;
		await saveFont(file);
	}, Promise.resolve());
	if (errors.length > 0) {
		console.warn('Skipped:', errors);
	}
	return fsp.writeFile('./output/output.txt', JSON.stringify(results, undefined, 1), 'utf8');
}

main()
	.then(() => console.log('👍'))
	.catch(err => {
		console.log('👎');
		console.error(err);
	});
