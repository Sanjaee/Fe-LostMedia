export interface RolePrice {
  id: string;
  role: string;
  name: string;
  description?: string;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
