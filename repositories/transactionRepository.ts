import { supabase } from '../lib/supabase/client';
import { Transaction } from '../types/database';

export class TransactionRepository {
  static async create(transaction: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async getRecentByUserId(userId: string, limit: number = 10): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(name), accounts(name)')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  }
}
