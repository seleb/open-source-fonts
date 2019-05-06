const fs = require('fs');
const file = fs.readFileSync('./errorOutput.txt', 'utf8');
const lines = file.split(/\n/).map(l => l.trim()).filter(l => l).reduce((lines, line, idx, arr) => {
	if (line.startsWith('(node') && !arr[idx+1].startsWith('(node')) {
		return lines.concat(arr[idx+1]);
	}
	return lines;
}, []);
console.log(lines.join('\n'));
