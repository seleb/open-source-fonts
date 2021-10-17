const fs = require('fs');
const errors = require('./output/_errors.json');
fs.writeFileSync('./badFonts.env', Array.from(new Set(errors.map(i => `${i.font} # ${typeof i.error === 'string' ? i.error : JSON.stringify(i.error)}`.trim()))).join('\n'));
