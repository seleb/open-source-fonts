import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import parsePb from './parsePb.js';
const fsp = fs.promises;

let errors = [];

const badFonts = fs
	.readFileSync('./badFonts.env', 'utf8')
	.split(/\n/)
	.map(f => f.split('#')[0].trim())
	.filter(i => i)
	.reduce(
		(result, font) => ({
			...result,
			[font]: true,
		}),
		{}
	);


function simplestr(str = '') {
	return str.toLowerCase()
		// remove modifiers that often aren't included in short names
		.replace(/\b(bold|semibold|regular|italic)\b/g,' ')
		// convert to just alphanumeric
		.replace(/[^a-z0-9]/g, '');
}

function fuzzyMatch(a = '', b = '') {
	return simplestr(a).includes(simplestr(b));
}

async function getVariants(fontName) {
	let metadataFile = '';
	try {
		metadataFile = await fsp.readFile(`.google-fonts/ofl/${fontName}/METADATA.pb`, 'utf8');
	} catch (err) {
		throw new Error('no METADATA.pb');
	}
	const { fonts, subsets, source } = parsePb(metadataFile);
	const url =
		source?.[0]?.repository_url ||
		Array.from((await fsp.readFile(`.google-fonts/ofl/${fontName}/DESCRIPTION.en_us.html`, 'utf-8')).matchAll(/href="(.*?)"/g)).find(
			([, i]) => [fontName].concat(fonts.flatMap(f => [f.full_name, f.name])).filter(i => i).some(j => fuzzyMatch(i, j))
		)?.[1] ||
		`https://github.com/google/fonts/tree/main/ofl/${fontName}`;

	const subsetsString = (
		await Promise.all(
			subsets
				.filter(s => s !== 'menu')
				.map(s => s.trim())
				.map(async s => {
					try {
						const sample = (await fsp.readFile(`./subsets/${s}.txt`, 'utf8')).trim();
						return ['latin', 'latin-ext', 'math', 'emoji'].includes(s) ? sample : `${sample} (${s})`;
					} catch (err) {
						throw new Error(`no sample gylphs for subset: "${s}"`);
					}
				})
		)
	).join(' - ');

	if (!url) throw new Error('no repository source');
	return fonts.map(font => ({
		...font,
		fontName,
		subsets: subsetsString,
		url,
	}));
}

async function main() {
	// get font list
	const files = (await fsp.readdir('.google-fonts/ofl'));
	// read metadata from font list
	const fontVariants = await Promise.all(
		files.map(f =>
			getVariants(f).catch(err => {
				errors.push({
					font: f,
					error: err.message,
				});
			})
		)
	);
	// flatten sets
	const fonts = fontVariants.filter(f => f).reduce((result, sets) => result.concat(sets), []);

	// filter out bad fonts
	let validFonts = fonts.filter(({ fontName, full_name }) => {
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
	const browser = await puppeteer.launch({
		defaultViewport: {
			width: 1280,
			height: 720,
		},
	});
	const template = await fsp.readFile('./font.html', { encoding: 'utf-8' });
	const tmpPath = `./font-temp.html`;
	validFonts = await validFonts.reduce(async (acc, font) => {
		const arr = await acc;

		process.stdout.write(`${font.full_name} `);

		const page = await browser.newPage();
		try {
			await fsp.writeFile(
				tmpPath,
				template
					.replace(/%fontName%/g, font.fontName)
					.replace(/%filename%/g, font.filename)
					.replace(/%font%/g, font.full_name)
					.replace(/%weight%/g, font.weight)
					.replace(/%style%/g, font.style)
					.replace(/%subsets%/g, font.subsets)
					.replace(/%copyright%/g, font.copyright)
					.replace(/%teststring%/g, `${font.full_name} ${font.subsets} ${font.copyright}`)
			);
			await page.goto(path.resolve(tmpPath));
			const html = await page.waitForSelector('html:not(.wf-loading)');
			const fontLoaded = await html.evaluate(i => i.classList.contains('wf-active'));
			if (!fontLoaded) throw new Error('could not load font');
			await page.screenshot({ type: 'png', path: `./output/${font.full_name}.png` });

			console.log('✅');
			arr.push(font);
		} catch (err) {
			console.log('❌');
			errors.push({
				font: font.full_name,
				error: err.stdout || err.stderr || err.message,
			});
		} finally {
			await page.close();
			return arr;
		}
	}, Promise.resolve([]));
	await browser.close();

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
				main: ['#name# - https://#url##SVGstart##SVGlayout##SVGend#'],

				'wrapper for SVG (image) section': [],
				SVGstart: [
					'{svg <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="black"/>',
				],
				SVGend: ['</svg>}'],

				SVGlayout: ['<image xlink:href="https://raw.githubusercontent.com/seleb/open-source-fonts/main/output/#file#.png" width="1280" height="720"/>'],

				'list of directories in Google fonts': [],
				setFont: validFonts.map(({ full_name, name, url }) => `[file:${full_name}][name:${name}][url:${url.replace(/https?:\/\//, '')}]`),
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
