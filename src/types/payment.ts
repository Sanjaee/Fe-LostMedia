export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "expired";

export interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  amount: number;
  total_amount: number;
  status: PaymentStatus;
  payment_method: string;
  payment_type: string;
  item_name: string;
  item_category?: string;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  midtrans_transaction_id?: string;
  va_number?: string;
  bank_type?: string;
  qr_code_url?: string;
  redirect_url?: string;
  masked_card?: string;
  card_type?: string;
  expiry_time?: string;
  target_role?: string;
  created_at: string;
  updated_at: string;
}
