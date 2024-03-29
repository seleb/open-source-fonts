import child_process from 'child_process';
import fs from 'fs';
import util from 'util';
import parsePb from './parsePb.js';
const fsp = fs.promises;

const exec = util.promisify(child_process.exec);

let errors = [];

const badFonts = fs
	.readFileSync('./badFonts.env', 'utf8')
	.split(/\n/)
	.map(f => f.split('#')[0].trim())
	.reduce(
		(result, font) => ({
			...result,
			[font]: true,
		}),
		{}
	);

async function getVariants(fontName) {
	const metadataFile = await fsp.readFile(`.google-fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
	const { fonts, subsets } = parsePb(metadataFile);

	const subsetsString = (await Promise.all(subsets.filter(s => s !== 'menu').map(s => fsp.readFile(`./subsets/${s}.txt`, 'utf8')))).map(s => s.trim()).join(' - ');

	return fonts.map(font => ({
		...font,
		fontName,
		subsets: subsetsString,
	}));
}

async function main() {
	// get font list
	const files = await fsp.readdir('.google-fonts/ofl');
	// read metadata from font list
	const fontVariants = await Promise.all(
		files.map(f =>
			getVariants(f).catch(error => {
				errors.push({
					font: f,
					error,
				});
			})
		)
	);
	// flatten sets
	const fonts = fontVariants.filter(f => f).reduce((result, sets) => result.concat(sets), []);

	// create descriptor files
	await Promise.all(fonts.map(font => fsp.writeFile(`./.temp/${font.full_name}.json`, JSON.stringify(font), 'utf8')));

	// filter out bad fonts
	let validFonts = fonts
	.filter(({ fontName, full_name }) => {
		if (badFonts[full_name]) {
			errors.push({
				font: fontName,
				error: 'manually excluded',
			});
			return false;
		} else {
			return true;
		}
	});
	validFonts = await validFonts.reduce(async (acc, font) => {
		const arr = await acc;
		console.log(font.full_name, '❓');
		try {
			await exec(`node "./testFont" --file="./.temp/${font.full_name}.json"`);
			console.log(font.full_name, '✅');
			arr.push(font);
		} catch (err) {
			console.log(font.full_name, '❌');
			errors.push({
				font: font.full_name,
				error: err.stdout || err.stderr || err.message,
			});
		} finally {
			return arr;
		}
	}, Promise.resolve([]));
	validFonts = validFonts.filter(i => i);

	// save previews
	await validFonts.reduce(async (acc, font) => {
		await acc;
		await exec(`node "./saveFontPreview" --file="./.temp/${font.full_name}.json"`);
		console.log(font.full_name, '💾');
	}, Promise.resolve());

	// finalize output
	errors = Array.from(new Set(errors.map(i => JSON.stringify(i)))).map(i => JSON.parse(i));
	errors.sort(({ font: a }, { font: b }) => a.localeCompare(b, undefined, { sensitivity: 'base', ignorePunctuation: true }));
	if (errors.length > 0) {
		await fsp.writeFile('./output/_errors.json', JSON.stringify(errors, undefined, 1), 'utf8');
		console.warn(`Skipped ${errors.length} fonts due to errors; see ./output/_errors.json for details`);
	}
	await fsp.writeFile(
		'./output/_output.json',
		JSON.stringify(
			{
				origin: ['#[#setFont#]main#'],
				main: ['#name# - https://fonts.google.com/specimen/#name.replace( ,%20)##SVGstart##SVGlayout##SVGend#'],

				'wrapper for SVG (image) section': [],
				SVGstart: [
					'{svg <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="black"/>',
				],
				SVGend: ['</svg>}'],

				SVGlayout: ['<image xlink:href="https://raw.githubusercontent.com/seleb/open-source-fonts/main/output/#file#.png" width="1280" height="720"/>'],

				'list of directories in Google fonts': [],
				setFont: validFonts.map(({ full_name, name }) => `[file:${full_name}][name:${name}]`),
			},
			undefined,
			1
		),
		'utf8'
	);
}

main()
	.then(() => console.log('👍'))
	.catch(err => {
		console.log('👎');
		console.error(err);
	});
