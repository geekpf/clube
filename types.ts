export interface Profile {
  id: string;
  email: string | null;
  is_member: boolean;
  credits: number;
  created_at: string;
  member_code?: string;
  membership_expires_at?: string;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  type: 'standard' | 'premium';
  cost_credits?: number; // Cost in internal credits (for standard)
  cost_monetary?: number; // Cost in R$ (for premium)
  value_real: number; // The actual value the user gets
  image_url: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  coupon_id: string;
  status: 'active' | 'used';
  code: string;
  created_at: string;
  coupons?: Coupon; // Joined data
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'membership_fee' | 'credit_usage' | 'premium_purchase';
  description: string;
  created_at: string;
}

export interface AbacatePayResponse {
  billingId: string;
  url: string; // Payment URL or QR Code payload
  pixCode?: string; // O Código Copia e Cola do PIX
  status: 'PENDING' | 'PAID' | 'EXPIRED';
}