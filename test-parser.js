const { parseTransactionMessage } = require('./lib/ai/parser');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function run() {
  const res = await parseTransactionMessage("Paid rent 1200");
  console.log(res);
}

run();
