export type User = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  currency: string;
  timezone: string;
  language: string;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  is_default: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: 'Expense' | 'Income' | 'Transfer';
  amount: number;
  description: string | null;
  transaction_date: string;
  attachment_url: string | null;
  created_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  monthly_limit: number;
  month: number;
  year: number;
  created_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
  created_at: string;
};

export type RecurringTransaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  next_run: string;
  description: string | null;
  created_at: string;
};

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  reminder_date: string;
  status: 'pending' | 'completed';
  created_at: string;
};
