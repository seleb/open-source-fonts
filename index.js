const {
	createCanvas,
	registerFont
} = require('canvas');
const fs = require('fs');
const parsePb = require('./parsePb');

const w = 1920;
const h = 1080;

async function main() {
	const files = fs.readdirSync('./node_modules/fonts/ofl');
	await Promise.all(files.map(async fontName => {
		console.log(fontName);
		const metadataFile = fs.readFileSync(`./node_modules/fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
		const metadata = parsePb(metadataFile);

		await Promise.all(metadata.fonts.map(async ({
			filename,
			full_name,
			copyright,
			weight,
			style,
		}) => {
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
					ctx.font = `${weight} ${style} ${fontSize--}pt '${full_name}'`;
					const metrics = ctx.measureText(text);
					width = metrics.width;
				} while (width > w * maxWidth && fontSize > 0);
				ctx.fillText(text, w / 2, h * height);
			}

			const subsets = metadata.subsets
				.filter(s => s !== 'menu')
				.map(s => fs.readFileSync(`./subsets/${s}.txt`, 'utf8').trim())
				.join(' - ');
		drawText(full_name, 100, 7 / 8, 1 / 2);
		drawText(subsets, 50, 3 / 4, 3 / 5);
		drawText(copyright, 50, 3 / 4, 4 / 5);


			// save image
			const out = fs.createWriteStream(`./output/${fontName}_${full_name}.png`)
			const stream = canvas.createPNGStream();
			stream.pipe(out);
		}));
	}));
}

main()
	.then(() => console.log('👍'))
	.catch(err => console.error('👎', err));
