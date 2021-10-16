function getVal(val) {
	return val.replace(/^"(.*)"$/, '$1').replace(/\\("|')/g, '"');
}

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
			const [key, val] = line.split(/: (.*)/);
			if (key.endsWith('s')) {
				cur[key] = cur[key] || [];
				cur[key].push(getVal(val));
			} else {
				try {
					cur[key] = getVal(val);
				} catch (err) {
					console.error(key, val, err);
					throw err;
				}
			}
		}
	}

	return result;
};

module.exports = parsePb;
