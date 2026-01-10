
export type ViewTab = 'dashboard' | 'history' | 'chat' | 'reports' | 'settings';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AccountStatus = 'trial' | 'active' | 'expired';

export interface UserContext {
  user_name: string;
  email: string; // Identificador único universal
  dietary_regime: string;
  monthly_budget: number;
  current_month_spend: number;
  family_context: string;
  goals: string[];
  // Novos campos para robustez de negócio v1.1.8
  account_status: AccountStatus;
  promo_code?: string;
  joined_at: string;
}

export interface ReceiptItem {
  name_raw: string;
  name_clean: string;
  category: string;
  qty: number;
  unit_price: number;
  total_price: number;
  is_discounted: boolean;
  tags: string[];
}

export interface ReceiptAnalysis {
  budget_impact_percentage: number;
  dietary_compliance: boolean;
  flagged_items: string[];
  insights: string[];
}

export interface ReceiptData {
  id: string; 
  imageUrl?: string; 
  meta: {
    store: string;
    date: string;
    total_spent: number;
    total_saved: number;
    scan_quality: 'High' | 'Medium' | 'Low';
  };
  items: ReceiptItem[];
  analysis: ReceiptAnalysis;
  coach_message: string;
}

export interface AppState {
  userProfile: UserContext;
  lastAnalysis: ReceiptData | null;
  history: ReceiptData[];
  isLoading: boolean;
  error: string | null;
  chatHistory: ChatMessage[];
  isCloudEnabled: boolean;
}
