const fs = require('fs');

const content = fs.readFileSync('./test.txt').toString();
let c = 0;

content.split('\n').forEach(row => {
  const split1 = row.split(' ');
  if (split1.length > 2) {
    const noDate = row.substr(split1[0].length + split1[1].length + 1).trim();
    const size = parseInt(noDate.split(' ')[0].trim(), 10);
    console.log(noDate);
    c += size;
  }
});

console.log(c);
