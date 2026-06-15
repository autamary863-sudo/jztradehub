export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_sent' | 'transfer_received' | 'payment' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference: string;
  description: string;
  metadata: any;
  from_user_id?: string;
  to_user_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
}

export interface Bank {
  code: string;
  name: string;
}