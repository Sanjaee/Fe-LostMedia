export type PaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "cancelled"
  | "expired";

/** From GET /api/v1/payments/plisio/currencies — crypto payment currencies */
export interface PlisioCurrency {
  name: string;
  cid: string;
  currency: string;
  icon: string;
  price_usd: string;
  rate_usd?: string;
  min_sum_in?: string;
  hidden?: number;
  maintenance?: boolean;
}

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
  redirect_url?: string; // For crypto: invoice URL — redirect user here to pay
  plisio_currency?: string; // crypto currency code (e.g. SOL, BTC)
  plisio_source_amount?: number;
  masked_card?: string;
  card_type?: string;
  expiry_time?: string;
  target_role?: string;
  created_at: string;
  updated_at: string;
}
