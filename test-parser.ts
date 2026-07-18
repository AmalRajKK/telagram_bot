import { parseTransactionMessage } from './lib/ai/parser';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const res = await parseTransactionMessage("Paid rent 1200");
  console.log("Result:", res);
}

run();
