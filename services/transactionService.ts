import { TransactionRepository } from '../repositories/transactionRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { AccountRepository } from '../repositories/accountRepository';
import { ParsedTransaction } from '../lib/ai/parser';
import { supabase } from '../lib/supabase/client';

export class TransactionService {
  static async addTransactionFromText(userId: string, parsed: ParsedTransaction) {
    // 1. Ensure user has a default account
    let accounts = await AccountRepository.findByUserId(userId);
    if (accounts.length === 0) {
      // Create a default account if none exists
      await AccountRepository.create({
        user_id: userId,
        name: 'Main Wallet',
        type: 'Wallet',
        balance: 0,
        is_default: true,
      });
      accounts = await AccountRepository.findByUserId(userId);
    }
    const defaultAccount = accounts.find(a => a.is_default) || accounts[0];

    // 2. Ensure category exists
    const categoryType = parsed.type === 'Income' ? 'Income' : 'Expense';
    const category = await CategoryRepository.findOrCreate(userId, parsed.category, categoryType);

    // 3. Create Transaction
    const transaction = await TransactionRepository.create({
      user_id: userId,
      account_id: defaultAccount.id,
      category_id: category.id,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description || parsed.category,
      transaction_date: parsed.date || new Date().toISOString(),
    });

    // 4. Update Account Balance
    const balanceChange = parsed.type === 'Income' ? parsed.amount : -parsed.amount;
    await supabase.from('accounts').update({ balance: defaultAccount.balance + balanceChange }).eq('id', defaultAccount.id);

    return transaction;
  }
}
