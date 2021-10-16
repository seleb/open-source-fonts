const fs = require('fs');
const errors = require('./output/_errors.json');
fs.writeFileSync('./badFonts.txt', Array.from(new Set(errors.map(i => i.font))).join('\n'));
