import fs from 'fs';
const errors = JSON.parse(fs.readFileSync('./output/_errors.json', { encoding: 'utf-8' }));
let badFonts = fs.readFileSync('./badFonts.env', { encoding: 'utf-8' }).trim();
badFonts = badFonts
	.split('\n')
	.map(i => {
		const [font, ...err] = i.split('#');
		return { font: font.trim(), error: err.join('#').trim() };
	})
	.concat(errors.filter(i => i.error !== 'manually excluded'));

fs.writeFileSync('./badFonts.env', Array.from(new Set(badFonts.map(i => `${i.font} # ${typeof i.error === 'string' ? i.error : JSON.stringify(i.error)}`.trim()))).join('\n'), { encoding: 'utf-8' });
