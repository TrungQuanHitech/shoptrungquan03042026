
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Wallet, Users, CreditCard, FileText, Settings as SettingsIcon, Menu, X, Wrench
} from 'lucide-react';
import { Product, Order, Purchase, Transaction, Contact, Settings, View, RepairTicket, RentalContract } from './types';

// Components
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Purchases from './components/Purchases';
import Finance from './components/Finance';
import Contacts from './components/Contacts';
import Debt from './components/Debt';
import Reports from './components/Reports';
import SettingsView from './components/SettingsView';
import Services from './components/Services';
import Chatbot from './components/Chatbot';
import { pullFromSupabase, pushToSupabase } from './src/services/supabaseSync';

const getTodayPrefix = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = String(now.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
};

const INITIAL_SETTINGS: Settings = {
  shopName: "CÔNG TY TNHH TRUNG QUÂN HI-TECH",
  address: "15 Trần Phú, Phường Phan Rang, Tỉnh Khánh Hòa",
  phone: "0949.901.434",
  bankName: "Vietcombank",
  bankAccount: "1015568888",
  bankOwner: "NGUYEN TRUNG QUAN",
  showQR: true,
  taxRate: 10,
  fontSize: 'DEFAULT',
  themeColor: 'indigo',
  fontFamily: 'Inter',
  layoutDensity: 'COMFORTABLE',
  telegramBotToken: import.meta.env.VITE_TELEGRAM_TOKEN || "",
  telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || "",
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY || "",
  notifyOnSale: true,
  notifyOnPurchase: true,
  notifyOnFinance: true,
  googleSheetId: "1y5al0bzBLv37CsuFMrDuNFgGI83GeALAA-9O5L9xt90",
  googleScriptUrl: "https://script.google.com/macros/s/AKfycby6Ui7rHvPqzQjWzfp7sDeZnTCuw-eiPuFFWAiMhkD1os_GqmIqssClClBKsPV_nzVe/exec",
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  autoSync: true,
  // Supabase Cloud Database - Tự động kết nối trên mọi thiết bị
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  isSupabaseConnected: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
};

const COLOR_PALETTES: Record<string, any> = {
  indigo: { "50": '#eef2ff', "100": '#e0e7ff', "200": '#c7d2fe', "500": '#6366f1', "600": '#4f46e5', "700": '#4338ca' },
  blue: { "50": '#eff6ff', "100": '#dbeafe', "200": '#bfdbfe', "500": '#3b82f6', "600": '#2563eb', "700": '#1d4ed8' },
  teal: { "50": '#f0fdfa', "100": '#ccfbf1', "200": '#99f6e4', "500": '#14b8a6', "600": '#0d9488', "700": '#0f766e' },
  rose: { "50": '#fff1f2', "100": '#ffe4e6', "200": '#fecdd3', "500": '#f43f5e', "600": '#e11d48', "700": '#be123c' },
  orange: { "50": '#fff7ed', "100": '#ffedd5', "200": '#fed7aa', "500": '#f97316', "600": '#ea580c', "700": '#c2410c' },
  slate: { "50": '#f8fafc', "100": '#f1f5f9', "200": '#e2e8f0', "500": '#64748b', "600": '#475569', "700": '#334155' }
};

const SAMPLE_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Laptop Dell XPS 13 9315', sku: 'LAP-DELL-XPS13-9315', stock: 5, cost: 24500000, price: 32500000, category: 'Laptop', imageUrl: 'https://picsum.photos/seed/dellxps/400/400', description: 'Dòng laptop cao cấp mỏng nhẹ, vỏ nhôm nguyên khối bền bỉ.', specifications: { CPU: 'i7-1250U', RAM: '16GB LPDDR5', SSD: '512GB NVMe', Screen: '13.4 inch FHD+ IPS' } },
  { id: 'p2', name: 'Laptop MacBook Air M2 2022', sku: 'LAP-APPLE-AIRM2-8256', stock: 8, cost: 22000000, price: 26900000, category: 'Laptop', imageUrl: 'https://picsum.photos/seed/macair/400/400', description: 'Thiết kế mới vuông vức, chip M2 cực mạnh và tiết kiệm pin.', specifications: { Chip: 'Apple M2 8-core', RAM: '8GB', SSD: '256GB', Screen: '13.6 inch Liquid Retina' } },
  { id: 'p3', name: 'PC Gaming Trung Quân Hi-Tech G1', sku: 'PC-TQHT-G1-3060', stock: 3, cost: 15500000, price: 19800000, category: 'Máy bộ', imageUrl: 'https://picsum.photos/seed/pcgaming/400/400', description: 'Máy bộ chuyên chơi game và đồ họa trung bình.', specifications: { CPU: 'i5-12400F', Main: 'B660M', VGA: 'RTX 3060 12GB', RAM: '16GB 3200Mhz', PSU: '650W 80 Plus' } },
  { id: 'p4', name: 'Máy in Canon LBP 2900', sku: 'PRT-CANON-LBP2900', stock: 15, cost: 3200000, price: 3950000, category: 'Máy in', imageUrl: 'https://picsum.photos/seed/canon2900/400/400', description: 'Huyền thoại máy in văn phòng, bền bỉ, dễ nạp mực.', specifications: { Type: 'Laser trắng đen', Speed: '12 ppm', Resolution: '2400 x 600 dpi', Connection: 'USB 2.0' } },
  { id: 'p5', name: 'Máy Photocopy Ricoh IM 5055', sku: 'COP-RICOH-IM5055', stock: 2, cost: 35000000, price: 48000000, category: 'Máy Photocopy', imageUrl: 'https://picsum.photos/seed/ricoh5055/400/400', description: 'Máy photocopy công nghiệp cho văn phòng lớn.', specifications: { Function: 'Copy/Print/Scan', Speed: '55 ppm', Memory: '2GB RAM', HDD: '320GB', Size: 'A3-A6' } },
  { id: 'p6', name: 'Màn hình ASUS ProArt PA248QV', sku: 'MON-ASUS-PA248QV', stock: 10, cost: 4800000, price: 5650000, category: 'Linh kiện', imageUrl: 'https://picsum.photos/seed/proart/400/400', description: 'Màn hình chuyên đồ họa với độ sai lệch màu Delta E < 2.', specifications: { Size: '24.1 inch', Ratio: '16:10', Color: '100% sRGB', Port: 'DP, HDMI, VGA' } },
  { id: 'p7', name: 'Chuột Logitech MX Master 3S', sku: 'ACC-LOGI-MX3S', stock: 12, cost: 1850000, price: 2450000, category: 'Phụ kiện', imageUrl: 'https://picsum.photos/seed/mx3s/400/400', description: 'Chuột không dây cao cấp nhất cho công việc văn phòng.', specifications: { Sensor: '8K DPI Darkfield', Button: '7 nút yên tĩnh', Battery: '70 ngày', Connect: 'Logi Bolt, BT' } },
  { id: 'p8', name: 'Bàn phím cơ AKKO 3087 v2 Steam Engine', sku: 'ACC-AKKO-3087-STEAM', stock: 7, cost: 1150000, price: 1550000, category: 'Phụ kiện', imageUrl: 'https://picsum.photos/seed/akko/400/400', description: 'Bàn phím cơ thiết kế cổ điển, switch Akko chất lượng cao.', specifications: { Layout: 'TKL 87 phím', Switch: 'Akko Orange V2', Keycap: 'PBT Dye-sub', Type: 'Wired' } },
  { id: 'p9', name: 'Ổ cứng SSD Samsung 980 Pro 1TB', sku: 'SSD-SAM-980PRO-1TB', stock: 20, cost: 2150000, price: 2850000, category: 'Linh kiện', imageUrl: 'https://picsum.photos/seed/ssd980/400/400', description: 'Ổ cứng NVMe Gen 4 tốc độ cực cao cho PC/PS5.', specifications: { Speed: '7000MB/s Read', MTBF: '1.5 triệu giờ', Cache: '1GB LPDDR4', Warranty: '5 năm' } },
  { id: 'p10', name: 'Router Mikrotik RB5009UG+S+IN', sku: 'NET-MIK-RB5009', stock: 4, cost: 4500000, price: 5850000, category: 'Thiết thiết bị mạng', imageUrl: 'https://picsum.photos/seed/mikrotik/400/400', description: 'Router chịu tải cao cho doanh nghiệp, quán cafe.', specifications: { CPU: 'Quad-core 1.4GHz', RAM: '1GB', Port: '7x GbE, 1x 2.5G, 1x SFP+', OS: 'RouterOS v7' } }
];

const SAMPLE_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Nguyễn Trung Quân', phone: '0949901434', type: 'CUSTOMER', debt: 0 },
  { id: 'c2', name: 'Công ty Cổ phần Tin học Nha Trang', phone: '02583811222', type: 'CUSTOMER', debt: 15000000 },
  { id: 'c3', name: 'Anh Hoàng Laptop', phone: '0912345678', type: 'CUSTOMER', debt: 5500000 },
  { id: 'c4', name: 'UBND Phường Phan Rang', phone: '02593822111', type: 'CUSTOMER', debt: 0 },
  { id: 'c5', name: 'Bệnh viện Đa khoa Tỉnh', phone: '02583822333', type: 'CUSTOMER', debt: 45000000 },
  { id: 's1', name: 'Tổng kho Viễn Sơn', phone: '02839250707', type: 'SUPPLIER', debt: 120000000 },
  { id: 's2', name: 'Nhà phân phối Synnex FPT', phone: '02873006666', type: 'SUPPLIER', debt: 0 },
  { id: 's3', name: 'Công ty Thủy Linh (TLC)', phone: '02435371525', type: 'SUPPLIER', debt: 35000000 },
  { id: 's4', name: 'Phân phối Ricoh Việt Nam', phone: '02838112233', type: 'SUPPLIER', debt: 0 },
  { id: 's5', name: 'Đại lý Linh kiện Minh Thông', phone: '02838334455', type: 'SUPPLIER', debt: 15000000 }
];

const prefix = getTodayPrefix();

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('erp_products');
    return saved ? JSON.parse(saved) : SAMPLE_PRODUCTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('erp_orders');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: 10 }).map((_, i) => ({
      id: `BH-${prefix}${String(i + 1).padStart(3, '0')}`,
      date: new Date(Date.now() - i * 86400000).toISOString(),
      items: [{ productId: `p${(i % 10) + 1}`, quantity: 1, price: SAMPLE_PRODUCTS[i % 10].price, cost: SAMPLE_PRODUCTS[i % 10].cost }],
      total: SAMPLE_PRODUCTS[i % 10].price,
      paid: i % 2 === 0 ? SAMPLE_PRODUCTS[i % 10].price : Math.floor(SAMPLE_PRODUCTS[i % 10].price / 2),
      debt: i % 2 === 0 ? 0 : SAMPLE_PRODUCTS[i % 10].price - Math.floor(SAMPLE_PRODUCTS[i % 10].price / 2),
      customerId: `c${(i % 5) + 1}`,
      taxRate: 10,
      taxAmount: Math.floor(SAMPLE_PRODUCTS[i % 10].price * 0.1)
    }));
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('erp_purchases');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: 10 }).map((_, i) => ({
      id: `NH-${prefix}${String(i + 1).padStart(3, '0')}`,
      date: new Date(Date.now() - i * 43200000).toISOString(),
      items: [{ productId: `p${(i % 10) + 1}`, quantity: 5, cost: SAMPLE_PRODUCTS[i % 10].cost, price: SAMPLE_PRODUCTS[i % 10].price }],
      total: SAMPLE_PRODUCTS[i % 10].cost * 5,
      paid: i % 3 === 0 ? 0 : SAMPLE_PRODUCTS[i % 10].cost * 5,
      debt: i % 3 === 0 ? SAMPLE_PRODUCTS[i % 10].cost * 5 : 0,
      supplierId: `s${(i % 5) + 1}`,
      taxRate: 10,
      taxAmount: Math.floor(SAMPLE_PRODUCTS[i % 10].cost * 5 * 0.1)
    }));
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('erp_transactions');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: 10 }).map((_, i): Transaction => ({
      id: `TX-${Date.now() - i * 100000}`,
      date: new Date(Date.now() - i * 3600000).toISOString(),
      type: i % 2 === 0 ? 'IN' : 'OUT',
      amount: (i + 1) * 500000,
      description: i % 2 === 0 ? `Thu tiền dịch vụ sửa chữa #${i}` : `Chi tiền điện nước tháng ${i + 1}`,
      category: i % 2 === 0 ? 'Bán hàng' : 'Vận hành',
      relatedId: ''
    }));
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('erp_contacts');
    return saved ? JSON.parse(saved) : SAMPLE_CONTACTS;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('erp_settings');
    const merged = saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    // Luôn ưu tiên cấu hình kết nối mặc định từ mã nguồn (Environment Variables)
    // để bất kỳ thiết bị nào cũng tự kết nối mọi dịch vụ ngay khi mở web
    merged.supabaseUrl = INITIAL_SETTINGS.supabaseUrl;
    merged.supabaseAnonKey = INITIAL_SETTINGS.supabaseAnonKey;
    merged.isSupabaseConnected = INITIAL_SETTINGS.isSupabaseConnected;
    merged.groqApiKey = INITIAL_SETTINGS.groqApiKey;
    merged.googleClientId = INITIAL_SETTINGS.googleClientId;
    merged.telegramBotToken = INITIAL_SETTINGS.telegramBotToken;
    merged.telegramChatId = INITIAL_SETTINGS.telegramChatId;
    return merged;
  });

  const [repairTickets, setRepairTickets] = useState<RepairTicket[]>(() => {
    const saved = localStorage.getItem('erp_repair_tickets');
    return saved ? JSON.parse(saved) : [];
  });

  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>(() => {
    const saved = localStorage.getItem('erp_rental_contracts');
    return saved ? JSON.parse(saved) : [];
  });

  const getAllDataForSync = () => ({
    products,
    orders,
    purchases,
    transactions,
    contacts,
    repairTickets,
    rentalContracts
  });

  // Background Pull on Startup
  useEffect(() => {
    const initData = async () => {
      if (settings.isSupabaseConnected) {
        console.log("Supabase: Background pulling data...");
        const data = await pullFromSupabase(settings);
        if (data) {
          if (data.products) setProducts(data.products as Product[]);
          if (data.orders) setOrders(data.orders as Order[]);
          if (data.purchases) setPurchases(data.purchases as Purchase[]);
          if (data.transactions) setTransactions(data.transactions as Transaction[]);
          if (data.contacts) setContacts(data.contacts as Contact[]);
          if (data.repairTickets) setRepairTickets(data.repairTickets as RepairTicket[]);
          if (data.rentalContracts) setRentalContracts(data.rentalContracts as RentalContract[]);
          console.log("Supabase: Background pull complete.");
        }
      }
    };
    initData();
  }, [settings.isSupabaseConnected]); // Only runs once on mount or when connection toggled

  // Auto-sync (Push) to Supabase debounced
  useEffect(() => {
    if (settings.isSupabaseConnected && settings.autoSync) {
      const timer = setTimeout(() => {
        console.log("Supabase: Auto-syncing data to cloud...");
        pushToSupabase(settings, getAllDataForSync());
      }, 5000); // 5 seconds debounce
      return () => clearTimeout(timer);
    }
  }, [products, orders, purchases, transactions, contacts, repairTickets, rentalContracts, settings]);

  useEffect(() => {
    localStorage.setItem('erp_products', JSON.stringify(products));
    localStorage.setItem('erp_orders', JSON.stringify(orders));
    localStorage.setItem('erp_purchases', JSON.stringify(purchases));
    localStorage.setItem('erp_transactions', JSON.stringify(transactions));
    localStorage.setItem('erp_contacts', JSON.stringify(contacts));
    localStorage.setItem('erp_settings', JSON.stringify(settings));
    localStorage.setItem('erp_repair_tickets', JSON.stringify(repairTickets));
    localStorage.setItem('erp_rental_contracts', JSON.stringify(rentalContracts));

    const root = document.documentElement;
    if (settings.fontFamily) {
      document.body.style.fontFamily = `"${settings.fontFamily}", sans-serif`;
    }

    if (settings.layoutDensity === 'COMPACT') {
      root.style.setProperty('--spacing-unit', '0.75rem');
      root.style.fontSize = '12px';
    } else {
      root.style.setProperty('--spacing-unit', '1rem');
      root.style.fontSize = '';
    }

    const color = COLOR_PALETTES[settings.themeColor || 'indigo'] || COLOR_PALETTES['indigo'];
    const styleId = 'theme-override';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      :root {
        --color-primary-50: ${color["50"]};
        --color-primary-100: ${color["100"]};
        --color-primary-200: ${color["200"]};
        --color-primary-500: ${color["500"]};
        --color-primary-600: ${color["600"]};
        --color-primary-700: ${color["700"]};
      }
      .bg-indigo-50 { background-color: var(--color-primary-50) !important; }
      .bg-indigo-100 { background-color: var(--color-primary-100) !important; }
      .bg-indigo-500 { background-color: var(--color-primary-500) !important; }
      .bg-indigo-600 { background-color: var(--color-primary-600) !important; }
      .bg-indigo-700 { background-color: var(--color-primary-700) !important; }
      .hover\\:bg-indigo-50:hover { background-color: var(--color-primary-50) !important; }
      .hover\\:bg-indigo-100:hover { background-color: var(--color-primary-100) !important; }
      .hover\\:bg-indigo-600:hover { background-color: var(--color-primary-600) !important; }
      .hover\\:bg-indigo-700:hover { background-color: var(--color-primary-700) !important; }
      .text-indigo-400 { color: var(--color-primary-500) !important; }
      .text-indigo-500 { color: var(--color-primary-500) !important; }
      .text-indigo-600 { color: var(--color-primary-600) !important; }
      .text-indigo-700 { color: var(--color-primary-700) !important; }
      .hover\\:text-indigo-600:hover { color: var(--color-primary-600) !important; }
      .border-indigo-100 { border-color: var(--color-primary-100) !important; }
      .border-indigo-200 { border-color: var(--color-primary-200) !important; }
      .border-indigo-500 { border-color: var(--color-primary-500) !important; }
      .focus\\:ring-indigo-100:focus { --tw-ring-color: var(--color-primary-100) !important; }
      .focus\\:ring-indigo-500:focus { --tw-ring-color: var(--color-primary-500) !important; }
      .shadow-indigo-100 { --tw-shadow-color: var(--color-primary-100) !important; }
      .shadow-indigo-200 { --tw-shadow-color: var(--color-primary-200) !important; }
    `;
  }, [products, orders, purchases, transactions, contacts, settings, repairTickets, rentalContracts]);

  const loadSampleData = useCallback(() => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dữ liệu hiện tại và nạp 10 dòng mẫu cho tất cả các bảng?")) {
      setProducts(SAMPLE_PRODUCTS);
      setContacts(SAMPLE_CONTACTS);

      const newOrders = Array.from({ length: 10 }).map((_, i) => ({
        id: `BH-${prefix}${String(i + 1).padStart(3, '0')}`,
        date: new Date(Date.now() - i * 86400000).toISOString(),
        items: [{ productId: `p${(i % 10) + 1}`, quantity: 1, price: SAMPLE_PRODUCTS[i % 10].price, cost: SAMPLE_PRODUCTS[i % 10].cost }],
        total: SAMPLE_PRODUCTS[i % 10].price,
        paid: i % 2 === 0 ? SAMPLE_PRODUCTS[i % 10].price : Math.floor(SAMPLE_PRODUCTS[i % 10].price / 2),
        debt: i % 2 === 0 ? 0 : SAMPLE_PRODUCTS[i % 10].price - Math.floor(SAMPLE_PRODUCTS[i % 10].price / 2),
        customerId: `c${(i % 5) + 1}`,
        taxRate: 10,
        taxAmount: Math.floor(SAMPLE_PRODUCTS[i % 10].price * 0.1)
      }));
      setOrders(newOrders);

      const newPurchases = Array.from({ length: 10 }).map((_, i) => ({
        id: `NH-${prefix}${String(i + 1).padStart(3, '0')}`,
        date: new Date(Date.now() - i * 43200000).toISOString(),
        items: [{ productId: `p${(i % 10) + 1}`, quantity: 5, cost: SAMPLE_PRODUCTS[i % 10].cost, price: SAMPLE_PRODUCTS[i % 10].price }],
        total: SAMPLE_PRODUCTS[i % 10].cost * 5,
        paid: i % 3 === 0 ? 0 : SAMPLE_PRODUCTS[i % 10].cost * 5,
        debt: i % 3 === 0 ? SAMPLE_PRODUCTS[i % 10].cost * 5 : 0,
        supplierId: `s${(i % 5) + 1}`,
        taxRate: 10,
        taxAmount: Math.floor(SAMPLE_PRODUCTS[i % 10].cost * 5 * 0.1)
      }));
      setPurchases(newPurchases);

      const newTxs: Transaction[] = Array.from({ length: 10 }).map((_, i): Transaction => ({
        id: `TX-${Date.now() - i * 100000}`,
        date: new Date(Date.now() - i * 3600000).toISOString(),
        type: i % 2 === 0 ? 'IN' : 'OUT',
        amount: (i + 1) * 500000,
        description: i % 2 === 0 ? `Thu tiền dịch vụ sửa chữa #${i}` : `Chi tiền điện nước tháng ${i + 1}`,
        category: i % 2 === 0 ? 'Bán hàng' : 'Vận hành',
        relatedId: ''
      }));
      setTransactions(newTxs);

      const newTickets = Array.from({ length: 10 }).map((_, i) => ({
        id: `SC-${prefix}${String(i + 1).padStart(3, '0')}`,
        date: new Date(Date.now() - i * 86400000).toISOString(),
        customerId: `c${(i % 5) + 1}`,
        deviceName: i % 2 === 0 ? `Laptop Dell XPS - Serial ${i}` : `Máy in Canon 2900 - ID ${i}`,
        issueDescription: i % 3 === 0 ? 'Không lên nguồn, quạt kêu to' : 'Lỗi phần mềm, chạy chậm, màn hình xanh',
        status: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'][i % 5] as any,
        estimatedCost: (i + 1) * 150000,
        technicianNotes: 'Đã kiểm tra sơ bộ',
        partsUsed: ''
      }));
      setRepairTickets(newTickets);

      const newContracts = Array.from({ length: 10 }).map((_, i) => ({
        id: `HD-${prefix}${String(i + 1).padStart(3, '0')}`,
        customerId: `c${(i % 5) + 1}`,
        machineName: `Ricoh MP ${4000 + i}`,
        model: `Model ${2020 + (i % 5)}`,
        startDate: new Date(Date.now() - i * 30 * 86400000).toISOString(),
        rentalPrice: 1000000 + (i * 200000),
        freeCopiesLimit: 3000 + (i * 500),
        currentCounter: 5000 + (i * 1000),
        pricePerPage: 100 + (i * 10),
        lastBillDate: new Date(Date.now() - i * 86400000).toISOString()
      }));
      setRentalContracts(newContracts);

      alert("✅ Đã nạp dữ liệu mẫu thành công cho tất cả các phân hệ!");
      setActiveView('DASHBOARD');
    }
  }, [prefix]);

  const clearAllData = useCallback(() => {
    if (window.confirm("HÀNH ĐỘNG NÀY SẼ XÓA TOÀN BỘ DỮ LIỆU VÀ CẤU HÌNH. Bạn có chắc chắn muốn reset toàn bộ hệ thống?")) {
      // Clear all state
      setProducts([]);
      setOrders([]);
      setPurchases([]);
      setTransactions([]);
      setContacts([]);
      setRepairTickets([]);
      setRentalContracts([]);
      setSettings(INITIAL_SETTINGS);

      // Clear all localStorage
      localStorage.clear();

      alert("✅ Hệ thống đã được reset về trạng thái ban đầu!");
      window.location.reload(); // Force reload to ensure clean state
    }
  }, []);

  const notifyTelegram = useCallback(async (
    payload: string | { file: Blob; caption: string; filename: string }
  ) => {
    if (!settings.telegramBotToken || !settings.telegramChatId) return;

    try {
      if (typeof payload === 'string') {
        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage?chat_id=${settings.telegramChatId}&text=${encodeURIComponent(payload)}&parse_mode=HTML`;
        await fetch(url);
      } else {
        const formData = new FormData();
        formData.append('chat_id', settings.telegramChatId);
        formData.append('document', payload.file, payload.filename);
        formData.append('caption', payload.caption);
        formData.append('parse_mode', 'HTML');

        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendDocument`;
        const response = await fetch(url, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        if (!result.ok) {
          console.error('Telegram file send error:', result);
          alert(`Lỗi gửi file tới Telegram: ${result.description}`);
        }
      }
    } catch (e) {
      console.error('Telegram Error:', e);
      alert('Lỗi: Không thể kết nối tới máy chủ Telegram.');
    }
  }, [settings.telegramBotToken, settings.telegramChatId]);

  const navigate = (view: View) => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };

  const menuItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Tổng quan', view: 'DASHBOARD' as View },
    { icon: <Package size={18} />, label: 'Kho hàng', view: 'INVENTORY' as View },
    { icon: <ShoppingCart size={18} />, label: 'Bán hàng', view: 'POS' as View },
    { icon: <Truck size={18} />, label: 'Nhập hàng', view: 'PURCHASES' as View },
    { icon: <Wrench size={18} />, label: 'Dịch vụ', view: 'SERVICES' as View },
    { icon: <Wallet size={18} />, label: 'Thu - Chi', view: 'FINANCE' as View },
    { icon: <Users size={18} />, label: 'Đối tác', view: 'CONTACTS' as View },
    { icon: <CreditCard size={18} />, label: 'Công nợ', view: 'DEBT' as View },
    { icon: <FileText size={18} />, label: 'Báo cáo', view: 'REPORTS' as View },
    { icon: <SettingsIcon size={18} />, label: 'Cấu hình', view: 'SETTINGS' as View }
  ];

  const renderView = () => {
    switch (activeView) {
      case 'DASHBOARD': return <Dashboard products={products} orders={orders} purchases={purchases} transactions={transactions} contacts={contacts} settings={settings} onNavigate={navigate} onNotify={notifyTelegram} />;
      case 'INVENTORY': return <Inventory products={products} setProducts={setProducts} settings={settings} getAllData={getAllDataForSync} />;
      case 'POS': return <POS products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} contacts={contacts} setContacts={setContacts} transactions={transactions} setTransactions={setTransactions} settings={settings} onNotify={notifyTelegram} />;
      case 'PURCHASES': return <Purchases products={products} setProducts={setProducts} purchases={purchases} setPurchases={setPurchases} contacts={contacts} setContacts={setContacts} transactions={transactions} setTransactions={setTransactions} settings={settings} onNotify={notifyTelegram} />;
      case 'SERVICES': return <Services repairTickets={repairTickets} setRepairTickets={setRepairTickets} rentalContracts={rentalContracts} setRentalContracts={setRentalContracts} contacts={contacts} setContacts={setContacts} settings={settings} onNotify={notifyTelegram} />;
      case 'FINANCE': return <Finance transactions={transactions} setTransactions={setTransactions} settings={settings} onNotify={notifyTelegram} />;
      case 'CONTACTS': return <Contacts contacts={contacts} setContacts={setContacts} orders={orders} purchases={purchases} />;
      case 'DEBT': return <Debt contacts={contacts} setContacts={setContacts} transactions={transactions} setTransactions={setTransactions} orders={orders} setOrders={setOrders} purchases={purchases} setPurchases={setPurchases} settings={settings} onNotify={notifyTelegram} />;
      case 'REPORTS': return <Reports orders={orders} setOrders={setOrders} purchases={purchases} setPurchases={setPurchases} products={products} setProducts={setProducts} contacts={contacts} setContacts={setContacts} transactions={transactions} setTransactions={setTransactions} settings={settings} onNotify={notifyTelegram} />;
      case 'SETTINGS': return <SettingsView
        settings={settings}
        setSettings={setSettings}
        onLoadSampleData={loadSampleData}
        getAllData={getAllDataForSync}
        setProducts={setProducts}
        setOrders={setOrders}
        setPurchases={setPurchases}
        setTransactions={setTransactions}
        setContacts={setContacts}
        setRepairTickets={setRepairTickets}
        setRentalContracts={setRentalContracts}
        onClearData={clearAllData}
      />;
      default: return <Dashboard products={products} orders={orders} purchases={purchases} transactions={transactions} contacts={contacts} settings={settings} onNavigate={navigate} onNotify={notifyTelegram} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 leading-normal text-[0.9rem]">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`fixed lg:static inset-y-0 left-0 w-56 bg-slate-900 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-out z-50 flex flex-col shadow-2xl no-print`}>
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">S</div>
          <h1 className="font-bold text-sm tracking-tight uppercase">SmartShop ERP</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {menuItems.map((item) => (
            <button key={item.view} onClick={() => navigate(item.view)} className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all text-[0.85rem] ${activeView === item.view ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/20' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="font-semibold truncate uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"><Menu size={20} /></button>
            <h2 className="font-bold text-slate-800 uppercase tracking-widest text-[0.8rem]">{menuItems.find(i => i.view === activeView)?.label}</h2>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-4 relative">
          {renderView()}
        </div>
      </main>

      <Chatbot
        products={products}
        setProducts={setProducts}
        orders={orders}
        setOrders={setOrders}
        purchases={purchases}
        setPurchases={setPurchases}
        transactions={transactions}
        setTransactions={setTransactions}
        contacts={contacts}
        setContacts={setContacts}
        settings={settings}
      />
    </div>
  );
};

export default App;
