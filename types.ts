
export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  cost: number;
  price: number;
  imageUrl?: string;
  category?: string;
  description?: string;
  specifications?: Record<string, string>;
  warranty?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  paid: number;
  debt: number;
  customerId: string;
  taxRate?: number;
  taxAmount?: number;
}

export interface Purchase {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  paid: number;
  debt: number;
  supplierId: string;
  taxRate?: number;
  taxAmount?: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  amount: number;
  description: string;
  category: string;
  relatedId?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  debt: number;
}

export interface RepairHistoryEvent {
  date: string;
  action: string;
  details?: string;
}

export interface RepairTicket {
  id: string;
  date: string;
  customerId: string;
  deviceName: string;
  issueDescription: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED';
  estimatedCost: number;
  technicianNotes?: string;
  partsUsed?: string; // Tạm thời lưu dạng text
  history?: RepairHistoryEvent[];
}

export interface RentalContract {
  id: string;
  customerId: string;
  machineName: string;
  model: string;
  startDate: string;
  endDate?: string;
  rentalPrice: number; // Giá thuê cứng hàng tháng
  freeCopiesLimit: number; // Định mức bản chụp miễn phí
  currentCounter: number; // Số counter hiện tại
  pricePerPage: number; // Giá vượt mức (nếu có)
  lastBillDate?: string;
}

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  showQR: boolean;
  taxRate: number;
  fontSize: 'SMALL' | 'DEFAULT' | 'LARGE';
  // UI Customization
  themeColor: string; // Hex code hoặc tên định danh màu
  fontFamily: string; // Tên font
  layoutDensity: 'COMFORTABLE' | 'COMPACT'; // Độ dày giao diện
  // Telegram settings
  telegramBotToken?: string;
  telegramChatId?: string;
  notifyOnSale: boolean;
  notifyOnPurchase: boolean;
  notifyOnFinance: boolean;
  // AI Settings
  groqApiKey?: string;
  // Google Sheets settings
  googleSheetId?: string;
  googleScriptUrl?: string;
  googleDriveFolderId?: string;
  isGoogleConnected?: boolean;
  autoSync: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  googleAccessToken?: string;
  googleUserEmail?: string;
  googleTokenExpiry?: number; // Unix timestamp (ms) khi token hết hạn
  // Supabase settings
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  isSupabaseConnected?: boolean;
}

export type View = 'DASHBOARD' | 'INVENTORY' | 'POS' | 'PURCHASES' | 'SERVICES' | 'FINANCE' | 'CONTACTS' | 'DEBT' | 'REPORTS' | 'SETTINGS';