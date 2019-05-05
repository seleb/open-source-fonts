const fs = require('fs');

function parsePb(string){
	const result = {};
	const stack = [];
	let cur = result;

	const lines = string.split(/\n/).map(l => l.trim());
	while(lines.length > 0) {
		const line = lines.shift();
		if (!line) {
			continue;
		}
		if(line === '}') {
			cur = stack.pop();
		} else if(line.endsWith('{')) {
			stack.push(cur);
			const [group] = line.split(' {');
			result[group] = result[group] || [];
			cur = {};
			result[group].push(cur);
		} else {
			const [key, val] = line.split(': ');
			if (key.endsWith('s')) {
				cur[key] = cur[key] || [];
				cur[key].push(JSON.parse(val));
			} else {
				cur[key] = JSON.parse(val);
			}
		}
	}

	return result;
};

module.exports = parsePb;
