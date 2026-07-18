import { supabase } from '../lib/supabase/client';
import { Account } from '../types/database';

export class AccountRepository {
  static async findByUserId(userId: string): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async create(account: Partial<Account>): Promise<Account> {
    const { data, error } = await supabase
      .from('accounts')
      .insert(account)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
