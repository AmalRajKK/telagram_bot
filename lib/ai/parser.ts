import { z } from 'zod';

const TransactionSchema = z.object({
  type: z.enum(['Expense', 'Income', 'Transfer']),
  amount: z.number(),
  category: z.string(),
  description: z.string().optional(),
  date: z.string().optional(), // ISO date string if recognizable
});

export type ParsedTransaction = z.infer<typeof TransactionSchema>;

export async function parseTransactionMessage(message: string): Promise<ParsedTransaction | null> {
  const normalized = message.toLowerCase();
  
  // Pattern: [Action] [Category] [Amount] (e.g. Paid rent 1200)
  // Or: [Category] [Amount] (e.g. Coffee 15)
  const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)/);
  if (!amountMatch) return null;
  
  const amount = parseFloat(amountMatch[1]);
  
  let type: 'Expense' | 'Income' | 'Transfer' = 'Expense'; // default
  if (normalized.includes('received') || normalized.includes('salary') || normalized.includes('income')) {
    type = 'Income';
  }
  
  // Extract a rough category by removing numbers and common words
  let category = normalized
    .replace(amountMatch[0], '')
    .replace(/paid|spent|bought|received|for|on/g, '')
    .trim();
    
  if (!category) category = 'Misc';
  
  // Capitalize category
  category = category.charAt(0).toUpperCase() + category.slice(1);

  return {
    type,
    amount,
    category,
    description: message,
    date: new Date().toISOString()
  };
}
