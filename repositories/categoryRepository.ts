import { supabase } from '../lib/supabase/client';
import { Category } from '../types/database';

export class CategoryRepository {
  static async findByUserId(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async findOrCreate(userId: string, name: string, type: 'Expense' | 'Income'): Promise<Category> {
    const categories = await this.findByUserId(userId);
    const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name, type })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
