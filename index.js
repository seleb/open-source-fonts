const fs = require('fs');
const {
	execSync
} = require('child_process');
const parsePb = require('./parsePb');
const fsp = fs.promises;

const errors = [];

const badFonts = fs.readFileSync('./badFonts.txt', 'utf8')
	.split(/\n/)
	.map(f => f.trim())
	.reduce((result, font) => ({
		...result,
		[font]: true,
	}), {});

async function getVariants(fontName) {
	const metadataFile = await fsp.readFile(`./node_modules/fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
	const {
		fonts,
		subsets
	} = parsePb(metadataFile);

	const subsetsString = (await Promise.all(subsets
		.filter(s => s !== 'menu')
		.map(s => fsp.readFile(`./subsets/${s}.txt`, 'utf8'))
	)).map(s => s.trim()).join(' - ');

	return fonts.map(font => ({
		...font,
		fontName,
		subsets: subsetsString
	}));
}

async function main() {
	// get font list
	const files = await fsp.readdir('./node_modules/fonts/ofl');
	// read metadata from font list
	const fontVariants = await Promise.all(files.map(f => getVariants(f).catch(error => {
		errors.push({
			font: f,
			error
		});
	})));
	// flatten sets
	const fonts = fontVariants
		.filter(f => f)
		.reduce((result, sets) => result.concat(sets), []);

	// filter out bad fonts
	const validFonts = fonts.filter(({
		fontName,
		full_name
	}) => {
		if (badFonts[full_name]) {
			errors.push({
				font: fontName,
				error: 'manually excluded',
			});
			return false;
		} else {
			return true;
		}
	}).filter(font => {
		fs.writeFileSync('./temp.json', JSON.stringify(font), 'utf8');
		const valid = execSync(`node "./testFont" --file="./temp.json"`).length === 0;
		if (!valid) {
			errors.push({
				font: font.full_name,
				error: 'failed to load',
			});
		}
		console.log(font.full_name, 'test');
		return valid;
	});

	// save previews
	validFonts.forEach(font => {
		fs.writeFileSync('./temp.json', JSON.stringify(font), 'utf8');
		execSync(`node "./saveFontPreview" --file="./temp.json"`);
		console.log(font.full_name);
	});

	// finalize output
	if (errors.length > 0) {
		await fsp.writeFile('./output/errors.json', JSON.stringify(errors, undefined, 1), 'utf8');
		console.warn(`Skipped ${errors.length} fonts due to errors; see ./output/errors.json for details`);
	}
	return fsp.writeFile('./output/output.json', JSON.stringify({
		origin: ["#[#setFont#]main#"],
		main: ["#name# - https://fonts.google.com/specimen/#name.replace( ,%20)##SVGstart##SVGlayout##SVGend#"],

		"wrapper for SVG (image) section": [],
		SVGstart: ["{svg <svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"1280\" height=\"720\" viewBox=\"0 0 1280 720\"><rect width=\"1280\" height=\"720\" fill=\"black\"/>"],
		SVGend: ["</svg>}"],

		SVGlayout: [
			"<image xlink:href=\"https://seans.site/stuff/open-source-fonts/#file#.png\" width=\"1280\" height=\"720\"/>"
		],

		"list of directories in Google fonts": [],
		setFont: validFonts.map(({
			full_name,
			name
		}) => `[file:${full_name}][name:${name}]`)
	}, undefined, 1), 'utf8');
}

main()
	.then(() => console.log('👍'))
	.catch(err => {
		console.log('👎');
		console.error(err);
	});
