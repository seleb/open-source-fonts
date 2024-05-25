import fs from 'fs';
import minimist from 'minimist';
import fetch from 'node-fetch';

const { file } = minimist(process.argv.slice(2));
const { name } = JSON.parse(fs.readFileSync(file, 'utf8'));

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
