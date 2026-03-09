
import React, { useState, useEffect } from 'react';
import { Save, MapPin, CreditCard, Database, MessageSquare, Table, Send, CheckCircle2, XCircle, Shield, Lock, Eye, EyeOff, Copy, Check, RefreshCw, Type, Bell, Share2, Barcode, Laptop, Percent, Ruler, Link, ExternalLink, DatabaseBackup, Landmark, UserCheck, Eye as EyeIcon, Palette, LayoutTemplate, Trash2, FileJson, FolderPlus, FileSpreadsheet, LogOut, PlusSquare, FolderOpen, User, AlertTriangle } from 'lucide-react';
import { Settings, Product, Order, Purchase, Contact, Transaction, RepairTicket, RentalContract } from '../types';
import { syncToGoogleSheet, syncToGoogleSheetDirect, createSpreadsheet, createDriveFolder, createSheetTab } from '../src/services/googleSheetSync';
import { signInWithGoogle, signOutGoogle, getValidToken } from '../src/services/googleIdentity';
import { pushToSupabase, pullFromSupabase, pushSettingsToSupabase } from '../src/services/supabaseSync';
import { verifySupabaseConnection } from '../src/services/supabaseClient';
import * as XLSX from 'xlsx';

interface SettingsViewProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  onLoadSampleData?: () => void;
  getAllData: () => any; // Function to get all app data for sync
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setRepairTickets: React.Dispatch<React.SetStateAction<RepairTicket[]>>;
  setRentalContracts: React.Dispatch<React.SetStateAction<RentalContract[]>>;
  onClearData?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  settings, setSettings, onLoadSampleData, getAllData,
  setProducts, setOrders, setPurchases, setTransactions, setContacts, setRepairTickets, setRentalContracts,
  onClearData
}) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSettingUpGoogle, setIsSettingUpGoogle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingSheetTab, setIsCreatingSheetTab] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error' | 'token_expired'>('idle');
  const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);
  const [isSupabasePulling, setIsSupabasePulling] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setIsSaved(false);
  }, [settings]);

  useEffect(() => {
    setIsSaved(false);
  }, [localSettings]);

  useEffect(() => {
    setIsSaved(false);
  }, [localSettings]);

  const handleSupabaseConnect = async () => {
    if (!localSettings.supabaseUrl || !localSettings.supabaseAnonKey) {
      alert("⚠️ Vui lòng nhập Supabase URL và Supabase Anon Key!");
      return;
    }
    const isConn = await verifySupabaseConnection(localSettings);
    if (isConn) {
      const newSettings = { ...localSettings, isSupabaseConnected: true };
      setLocalSettings(newSettings);
      setSettings(newSettings);
      localStorage.setItem('erp_settings', JSON.stringify(newSettings));
      alert("✅ Kết nối Cơ sở dữ liệu Supabase thành công!");
    } else {
      const newSettings = { ...localSettings, isSupabaseConnected: false };
      setLocalSettings(newSettings);
      setSettings(newSettings);
      localStorage.setItem('erp_settings', JSON.stringify(newSettings));
      alert("🔴 Kết nối thất bại. Vui lòng kiểm tra lại URL hoặc Key.");
    }
  };

  const handleSupabasePush = async () => {
    if (!localSettings.isSupabaseConnected) return;
    setIsSupabaseSyncing(true);
    try {
      const data = getAllData();
      const success = await pushToSupabase(localSettings, data);
      if (success) {
        alert("✅ Đã GỬI (Push) toàn bộ dữ liệu lên mây thành công!");
      } else {
        alert("🔴 Gửi dữ liệu thất bại.");
      }
    } finally {
      setIsSupabaseSyncing(false);
    }
  };

  const handleSupabasePull = async () => {
    if (!localSettings.isSupabaseConnected) return;
    if (!window.confirm("⚠️ QUAN TRỌNG: Kéo dữ liệu từ Cloud sẽ XÓA ĐÈ toàn bộ dữ liệu hiện trên thiết bị này!\n\nBạn có chắc chắn muốn TẢI VỀ?")) return;
    setIsSupabasePulling(true);
    try {
      const data = await pullFromSupabase(localSettings);
      if (data) {
        if (data.products && setProducts) setProducts(data.products as Product[]);
        if (data.orders && setOrders) setOrders(data.orders as Order[]);
        if (data.purchases && setPurchases) setPurchases(data.purchases as Purchase[]);
        if (data.transactions && setTransactions) setTransactions(data.transactions as Transaction[]);
        if (data.contacts && setContacts) setContacts(data.contacts as Contact[]);
        if (data.repairTickets && setRepairTickets) setRepairTickets(data.repairTickets as RepairTicket[]);
        if (data.rentalContracts && setRentalContracts) setRentalContracts(data.rentalContracts as RentalContract[]);
        alert("✅ Đã TẢI (Pull) dữ liệu từ mây về thiết bị này thành công!");
      } else {
        alert("🔴 Không thể tải dữ liệu.");
      }
    } finally {
      setIsSupabasePulling(false);
    }
  };

  const handleGoogleConnect = async () => {
    if (!localSettings.googleClientId) {
      alert("⚠️ Vui lòng nhập Google Client ID trước khi kết nối!");
      return;
    }

    setIsConnectingGoogle(true);
    try {
      const result = await signInWithGoogle(localSettings.googleClientId);
      if (result && result.accessToken) {
        const newSettings = {
          ...localSettings,
          googleAccessToken: result.accessToken,
          googleTokenExpiry: result.tokenExpiry,
          googleUserEmail: result.user?.email,
          isGoogleConnected: true
        };
        setLocalSettings(newSettings);
        setSettings(newSettings);
        localStorage.setItem('erp_settings', JSON.stringify(newSettings));
        setSyncStatus('idle');

        if (result.user) {
          alert(`✅ Kết nối thành công!\n📧 Tài khoản: ${result.user.email}`);
        } else {
          alert(`✅ Kết nối thành công!`);
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      alert(`Không thể kết nối với Google: ${error.message}`);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleGoogleDisconnect = () => {
    if (window.confirm('Bạn có chắc chắn muốn ngắt kết nối Google?')) {
      signOutGoogle(localSettings.googleAccessToken);
      const newSettings = {
        ...localSettings,
        googleAccessToken: undefined,
        googleTokenExpiry: undefined,
        googleUserEmail: undefined,
        isGoogleConnected: false
      };
      setLocalSettings(newSettings);
      setSettings(newSettings);
      localStorage.setItem('erp_settings', JSON.stringify(newSettings));
      setSyncStatus('idle');
      alert('Đã ngắt kết nối Google');
    }
  };

  // Cập nhật token mới vào settings sau khi refresh
  const handleTokenRefreshed = (newToken: string, newExpiry: number) => {
    const updated = { ...localSettings, googleAccessToken: newToken, googleTokenExpiry: newExpiry };
    setLocalSettings(updated);
    setSettings(updated);
    localStorage.setItem('erp_settings', JSON.stringify(updated));
  };

  // Tạo Google Spreadsheet mới
  const handleCreateSpreadsheet = async () => {
    const title = window.prompt('Nhập tên cho Spreadsheet mới:', `SmartShop ERP - ${localSettings.shopName || 'Data'}`);
    if (!title) return;
    if (!localSettings.googleAccessToken) {
      alert('Vui lòng kết nối Google trước!');
      return;
    }
    setIsCreatingSheet(true);
    try {
      // Đảm bảo token hợp lệ
      const { accessToken, tokenExpiry, refreshed } = await getValidToken(
        localSettings.googleAccessToken,
        localSettings.googleTokenExpiry,
        localSettings.googleClientId
      );
      if (refreshed) handleTokenRefreshed(accessToken, tokenExpiry);

      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(accessToken, title);
      const newSettings = { ...localSettings, googleSheetId: spreadsheetId, googleAccessToken: accessToken, googleTokenExpiry: tokenExpiry };
      setLocalSettings(newSettings);
      setSettings(newSettings);
      localStorage.setItem('erp_settings', JSON.stringify(newSettings));
      alert(`✅ Đã tạo Spreadsheet mới!\n📋 Tên: ${title}\n🔗 ID: ${spreadsheetId}\n\nMở file: ${spreadsheetUrl}`);
    } catch (error: any) {
      console.error('Create spreadsheet error:', error);
      if (error.message?.includes('Token') || error.message?.includes('hết hạn')) {
        setSyncStatus('token_expired');
        alert('⚠️ Token đã hết hạn. Vui lòng nhấn "Kết nối Google" để đăng nhập lại.');
      } else {
        alert(`🔴 Lỗi tạo Spreadsheet: ${error.message}`);
      }
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Tạo sheet tab mới trong spreadsheet hiện tại
  const handleCreateSheetTab = async () => {
    if (!localSettings.googleSheetId) {
      alert('Vui lòng tạo hoặc nhập Google Sheet ID trước!');
      return;
    }
    const tabName = window.prompt('Nhập tên cho sheet tab mới:', 'Sheet mới');
    if (!tabName) return;
    if (!localSettings.googleAccessToken) {
      alert('Vui lòng kết nối Google trước!');
      return;
    }
    setIsCreatingSheetTab(true);
    try {
      const { accessToken, tokenExpiry, refreshed } = await getValidToken(
        localSettings.googleAccessToken,
        localSettings.googleTokenExpiry,
        localSettings.googleClientId
      );
      if (refreshed) handleTokenRefreshed(accessToken, tokenExpiry);

      await createSheetTab(accessToken, localSettings.googleSheetId, tabName);
      alert(`✅ Đã tạo sheet tab "${tabName}" thành công!`);
    } catch (error: any) {
      console.error('Create sheet tab error:', error);
      if (error.message?.includes('Token') || error.message?.includes('hết hạn')) {
        setSyncStatus('token_expired');
        alert('⚠️ Token đã hết hạn. Vui lòng nhấn "Kết nối Google" để đăng nhập lại.');
      } else {
        alert(`🔴 Lỗi tạo sheet tab: ${error.message}`);
      }
    } finally {
      setIsCreatingSheetTab(false);
    }
  };

  // Tạo thư mục mới trên Google Drive
  const handleCreateDriveFolder = async () => {
    const folderName = window.prompt('Nhập tên thư mục Drive mới:', `SmartShop - ${localSettings.shopName || 'Files'}`);
    if (!folderName) return;
    if (!localSettings.googleAccessToken) {
      alert('Vui lòng kết nối Google trước!');
      return;
    }
    setIsCreatingFolder(true);
    try {
      const { accessToken, tokenExpiry, refreshed } = await getValidToken(
        localSettings.googleAccessToken,
        localSettings.googleTokenExpiry,
        localSettings.googleClientId
      );
      if (refreshed) handleTokenRefreshed(accessToken, tokenExpiry);

      const { folderId, folderUrl } = await createDriveFolder(
        accessToken,
        folderName,
        localSettings.googleDriveFolderId || undefined
      );
      const newSettings = { ...localSettings, googleDriveFolderId: folderId, googleAccessToken: accessToken, googleTokenExpiry: tokenExpiry };
      setLocalSettings(newSettings);
      setSettings(newSettings);
      localStorage.setItem('erp_settings', JSON.stringify(newSettings));
      alert(`✅ Đã tạo thư mục Drive!\n📁 Tên: ${folderName}\n🔗 ID: ${folderId}\n\nMở thư mục: ${folderUrl}`);
    } catch (error: any) {
      console.error('Create folder error:', error);
      if (error.message?.includes('Token') || error.message?.includes('hết hạn')) {
        setSyncStatus('token_expired');
        alert('⚠️ Token đã hết hạn. Vui lòng nhấn "Kết nối Google" để đăng nhập lại.');
      } else {
        alert(`🔴 Lỗi tạo thư mục: ${error.message}`);
      }
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(localSettings);
    localStorage.setItem('erp_settings', JSON.stringify(localSettings));
    
    // Đồng bộ lên Supabase nếu đã kết nối
    if (localSettings.isSupabaseConnected) {
      const success = await pushSettingsToSupabase(localSettings);
      if (success) {
        console.log("Settings synced to Supabase successfully.");
      } else {
        alert("⚠️ Cấu hình đã được lưu cục bộ nhưng không thể đồng bộ lên Supabase Cloud.");
      }
    }

    setIsSaved(true);
    alert('✅ Đã lưu cấu hình hệ thống thành công!');
  };

  const copyToClipboard = () => {
    if (!localSettings.googleScriptUrl) return;
    navigator.clipboard.writeText(localSettings.googleScriptUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Không thể sao chép: ', err);
    });
  };

  const testTelegram = async () => {
    if (!localSettings.telegramBotToken || !localSettings.telegramChatId) {
      alert("Vui lòng nhập Token và Chat ID!");
      return;
    }
    setIsTestingTelegram(true);
    try {
      const text = `🔔 <b>TEST CONNECTION</b>\n━━━━━━━━━━━━━\n✅ Kết nối từ hệ thống SmartShop ERP thành công!\n👤 Shop: ${localSettings.shopName}`;
      const url = `https://api.telegram.org/bot${localSettings.telegramBotToken}/sendMessage?chat_id=${localSettings.telegramChatId}&text=${encodeURIComponent(text)}&parse_mode=HTML`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) {
        alert("🟢 Thành công! Vui lòng kiểm tra ứng dụng Telegram.");
      } else {
        alert(`🔴 Lỗi: ${data.description}`);
      }
    } catch (e) {
      alert("🔴 Không thể kết nối tới máy chủ Telegram.");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSync = async () => {
    if (!localSettings.isGoogleConnected || !localSettings.googleAccessToken) {
      alert("Vui lòng kết nối Google trước khi đồng bộ.");
      return;
    }
    if (!localSettings.googleSheetId) {
      alert("Vui lòng tạo hoặc nhập Google Sheet ID trước khi đồng bộ.");
      return;
    }
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      // Kiểm tra token hợp lệ trước khi sync
      const { accessToken, tokenExpiry, refreshed } = await getValidToken(
        localSettings.googleAccessToken,
        localSettings.googleTokenExpiry,
        localSettings.googleClientId
      );
      if (refreshed) handleTokenRefreshed(accessToken, tokenExpiry);

      const syncSettings = { ...localSettings, googleAccessToken: accessToken };
      const allData = getAllData();
      await syncToGoogleSheetDirect(syncSettings, allData, handleTokenRefreshed);
      setSyncStatus('success');
      alert('✅ Đồng bộ dữ liệu lên Google Sheets thành công!');
    } catch (error: any) {
      console.error("Lỗi khi đồng bộ:", error);
      if (error.message?.includes('hết hạn') || error.message?.includes('Token') || error.message?.includes('UNAUTHENTICATED')) {
        setSyncStatus('token_expired');
        alert(`⚠️ Phiên đăng nhập đã hết hạn!\n\nVui lòng nhấn "Kết nối Google" để đăng nhập lại rồi thử đồng bộ lại.`);
      } else {
        setSyncStatus('error');
        alert(`🔴 Lỗi đồng bộ: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Import Products
        if (wb.SheetNames.includes('PRODUCTS')) {
          const ws = wb.Sheets['PRODUCTS'];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          const mappedProducts: Product[] = data.map(row => ({
            id: String(row['MÃ SP'] || ''),
            name: String(row['TÊN SẢN PHẨM'] || ''),
            category: String(row['DANH MỤC'] || ''),
            sku: String(row['SKU'] || ''),
            cost: Number(row['GIÁ VỐN'] || 0),
            price: Number(row['GIÁ BÁN'] || 0),
            stock: Number(row['TỒN KHO'] || 0),
            description: String(row['MÔ TẢ'] || ''),
            imageUrl: '',
            specifications: {}
          })).filter(p => p.id);
          if (mappedProducts.length > 0) setProducts(mappedProducts);
        }

        // Import Contacts
        if (wb.SheetNames.includes('CONTACTS')) {
          const ws = wb.Sheets['CONTACTS'];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          const mappedContacts: Contact[] = data.map(row => ({
            id: String(row['MÃ ĐT'] || ''),
            name: String(row['TÊN'] || ''),
            phone: String(row['SỐ ĐIỆN THOẠI'] || ''),
            type: String(row['LOẠI'] || 'CUSTOMER') as any,
            debt: Number(row['CÔNG NỢ'] || 0)
          })).filter(c => c.id);
          if (mappedContacts.length > 0) setContacts(mappedContacts);
        }

        // Import Cashflow
        if (wb.SheetNames.includes('CASHFLOW')) {
          const ws = wb.Sheets['CASHFLOW'];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          const mappedTxs: Transaction[] = data.map(row => ({
            id: String(row['MÃ GD'] || ''),
            date: String(row['NGÀY'] || new Date().toISOString()),
            type: String(row['LOẠI'] || 'IN') as any,
            amount: Number(row['SỐ TIỀN'] || 0),
            description: String(row['MÔ TẢ'] || ''),
            category: String(row['DANH MỤC'] || ''),
            relatedId: String(row['LIÊN QUAN'] || '')
          })).filter(t => t.id);
          if (mappedTxs.length > 0) setTransactions(mappedTxs);
        }

        // Auto sync if enabled
        if (localSettings.isGoogleConnected && localSettings.googleAccessToken) {
          setIsSyncing(true);
          try {
            const allData = getAllData();
            await syncToGoogleSheetDirect(localSettings, allData);
            alert("✅ Đã đồng bộ xong!");
          } catch (syncErr) {
            console.error("Auto-sync after import failed:", syncErr);
            alert("✅ Đã nhập dữ liệu từ Excel thành công, nhưng lỗi khi tự động đồng bộ lên Google Sheet.");
          } finally {
            setIsSyncing(false);
          }
        } else {
          alert("✅ Đã nhập dữ liệu từ Excel thành công!");
        }
      } catch (error) {
        console.error("Excel Import Error:", error);
        alert("🔴 Lỗi khi đọc file Excel. Vui lòng kiểm tra lại cấu hình file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();

    const headers = {
      PRODUCTS: [['MÃ SP', 'TÊN SẢN PHẨM', 'DANH MỤC', 'SKU', 'GIÁ VỐN', 'GIÁ BÁN', 'TỒN KHO', 'GIÁ TRỊ TỒN', 'MÔ TẢ']],
      CONTACTS: [['MÃ ĐT', 'TÊN', 'SỐ ĐIỆN THOẠI', 'LOẠI', 'CÔNG NỢ']],
      CASHFLOW: [['MÃ GD', 'NGÀY', 'LOẠI', 'SỐ TIỀN', 'MÔ TẢ', 'DANH MỤC', 'LIÊN QUAN']]
    };

    Object.entries(headers).forEach(([name, data]) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });

    XLSX.writeFile(wb, 'SmartShop_Template.xlsx');
  };

  const handleClearData = () => {
    if (onClearData) {
      onClearData();
    } else {
      if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?")) {
        localStorage.clear();
        alert("✅ Đã reset dữ liệu!");
        window.location.reload();
      }
    }
  };

  const COLORS = [
    { id: 'indigo', name: 'Indigo', hex: '#4f46e5' },
    { id: 'blue', name: 'Blue', hex: '#2563eb' },
    { id: 'teal', name: 'Teal', hex: '#0d9488' },
    { id: 'rose', name: 'Rose', hex: '#e11d48' },
    { id: 'orange', name: 'Orange', hex: '#ea580c' },
    { id: 'slate', name: 'Slate', hex: '#475569' }
  ];

  const FONTS = [
    { id: 'Inter', name: 'Inter (Hiện đại)' },
    { id: 'Roboto', name: 'Roboto (Google)' },
    { id: 'Arial', name: 'Arial (Cổ điển)' },
    { id: 'Times New Roman', name: 'Serif (Trang trọng)' }
  ];

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-300">
      <form onSubmit={handleSave} className="space-y-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <Palette size={20} className="text-indigo-600" />
            <h3 className="font-bold uppercase text-xs tracking-wider">Tùy chỉnh Giao diện</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Màu chủ đạo</label>
              <div className="flex gap-3 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, themeColor: c.id })}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${localSettings.themeColor === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {localSettings.themeColor === c.id && <Check size={18} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1"><Type size={14} /> Phông chữ</label>
              <select
                value={localSettings.fontFamily || 'Inter'}
                onChange={(e) => setLocalSettings({ ...localSettings, fontFamily: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1"><LayoutTemplate size={14} /> Mật độ hiển thị</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, layoutDensity: 'COMFORTABLE' })}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${localSettings.layoutDensity !== 'COMPACT' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  Thoải mái (Mặc định)
                </button>
                <button
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, layoutDensity: 'COMPACT' })}
                  className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition-all ${localSettings.layoutDensity === 'COMPACT' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-400'}`}
                >
                  Nhỏ gọn (Nhiều dữ liệu)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4"><MapPin size={20} className="text-indigo-600" /><h3 className="font-bold uppercase text-xs tracking-wider">Định danh doanh nghiệp & QR Thanh toán</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tên doanh nghiệp hiển thị</label>
              <input value={localSettings.shopName} onChange={e => setLocalSettings({ ...localSettings, shopName: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Địa chỉ</label>
              <input value={localSettings.address} onChange={e => setLocalSettings({ ...localSettings, address: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Hotline</label>
              <input value={localSettings.phone} onChange={e => setLocalSettings({ ...localSettings, phone: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Thuế VAT (%)</label>
              <input type="number" value={localSettings.taxRate} onChange={e => setLocalSettings({ ...localSettings, taxRate: Number(e.target.value) })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>

            <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-50 bg-indigo-50/30 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase text-indigo-600 flex items-center gap-2"><Landmark size={14} /> Cấu hình VietQR</h4>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{localSettings.showQR ? 'Bật QR' : 'Tắt QR'}</span>
                  <button type="button" onClick={() => setLocalSettings({ ...localSettings, showQR: !localSettings.showQR })} className={`w-12 h-6 rounded-full relative transition-colors ${localSettings.showQR ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.showQR ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-[9px] font-bold uppercase text-slate-400">Ngân hàng (vcb, mbb...)</label><input value={localSettings.bankName} onChange={e => setLocalSettings({ ...localSettings, bankName: e.target.value.toLowerCase() })} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none" placeholder="vcb" /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-bold uppercase text-slate-400">Số tài khoản</label><input value={localSettings.bankAccount} onChange={e => setLocalSettings({ ...localSettings, bankAccount: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none" /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-bold uppercase text-slate-400">Chủ tài khoản</label><input value={localSettings.bankOwner} onChange={e => setLocalSettings({ ...localSettings, bankOwner: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none" /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <Share2 size={20} className="text-emerald-500" />
              <h3 className="font-bold uppercase text-xs tracking-wider">Tự động hóa Google</h3>
            </div>
            <div className="flex items-center gap-4">
              {localSettings.isGoogleConnected && (
                <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{localSettings.autoSync ? 'Tự động: Bật' : 'Tự động: Tắt'}</span>
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, autoSync: !localSettings.autoSync })}
                    className={`w-10 h-5 rounded-full relative transition-colors ${localSettings.autoSync ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.autoSync ? 'left-5.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              )}
              {localSettings.isGoogleConnected ? (
                <div className="flex items-center gap-2">
                  {localSettings.googleUserEmail && (
                    <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg text-[10px] text-slate-500 font-medium">
                      <User size={10} /> {localSettings.googleUserEmail}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 size={12} /> Đã kết nối
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    className="px-2 py-1 bg-rose-50 text-rose-500 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-rose-100 transition-all"
                    title="Ngắt kết nối"
                  >
                    <LogOut size={10} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isConnectingGoogle || isSettingUpGoogle}
                  onClick={handleGoogleConnect}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-indigo-700 flex items-center gap-1 transition-all shadow-md"
                >
                  {isConnectingGoogle || isSettingUpGoogle ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={12} />}
                  {isConnectingGoogle || isSettingUpGoogle ? "Đang xử lý..." : "Kết nối Google"}
                </button>
              )}
            </div>
          </div>

          {/* Cảnh báo token hết hạn */}
          {syncStatus === 'token_expired' && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-700">Phiên đăng nhập đã hết hạn</p>
                <p className="text-[10px] text-amber-600">Vui lòng nhấn "Kết nối Google" để làm mới phiên đăng nhập.</p>
              </div>
              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isConnectingGoogle}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold whitespace-nowrap hover:bg-amber-600 transition-all"
              >
                {isConnectingGoogle ? <RefreshCw size={10} className="animate-spin" /> : 'Đăng nhập lại'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Google Client ID</label>
              <input value={localSettings.googleClientId || ''} onChange={e => setLocalSettings({ ...localSettings, googleClientId: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Nhập Client ID của bạn" />
            </div>
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Google Client Secret</label>
              <div className="relative">
                <input
                  type="password"
                  value={localSettings.googleClientSecret || ''}
                  onChange={e => setLocalSettings({ ...localSettings, googleClientSecret: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none pr-10 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Nhập Client Secret của bạn"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>

            {/* Google Sheet ID - có thể chỉnh sửa */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <FileSpreadsheet size={16} />
                  <span className="text-[10px] font-bold uppercase">Google Sheet ID</span>
                </div>
                {localSettings.isGoogleConnected && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleCreateSpreadsheet}
                      disabled={isCreatingSheet}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-700 transition-all disabled:opacity-50"
                      title="Tạo Spreadsheet mới"
                    >
                      {isCreatingSheet ? <RefreshCw size={9} className="animate-spin" /> : <PlusSquare size={9} />}
                      Tạo mới
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSheetTab}
                      disabled={isCreatingSheetTab || !localSettings.googleSheetId}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-blue-600 transition-all disabled:opacity-50"
                      title="Thêm sheet tab mới vào spreadsheet hiện tại"
                    >
                      {isCreatingSheetTab ? <RefreshCw size={9} className="animate-spin" /> : <Table size={9} />}
                      Thêm tab
                    </button>
                  </div>
                )}
              </div>
              <input
                value={localSettings.googleSheetId || ''}
                onChange={e => setLocalSettings({ ...localSettings, googleSheetId: e.target.value })}
                className="bg-white border border-emerald-100 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-600 outline-none focus:ring-2 focus:ring-emerald-200 w-full"
                placeholder="Nhập hoặc tạo Sheet ID..."
              />
              {localSettings.googleSheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${localSettings.googleSheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={9} /> Mở trên Google Sheets
                </a>
              )}
            </div>

            {/* Drive Folder ID */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700">
                  <FolderPlus size={16} />
                  <span className="text-[10px] font-bold uppercase">Drive Folder ID</span>
                </div>
                {localSettings.isGoogleConnected && (
                  <button
                    type="button"
                    onClick={handleCreateDriveFolder}
                    disabled={isCreatingFolder}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-500 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-amber-600 transition-all disabled:opacity-50"
                    title="Tạo thư mục Drive mới"
                  >
                    {isCreatingFolder ? <RefreshCw size={9} className="animate-spin" /> : <FolderOpen size={9} />}
                    Tạo thư mục
                  </button>
                )}
              </div>
              <input
                value={localSettings.googleDriveFolderId || ''}
                onChange={e => setLocalSettings({ ...localSettings, googleDriveFolderId: e.target.value })}
                className="bg-white border border-amber-100 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-600 outline-none focus:ring-2 focus:ring-amber-200 w-full"
                placeholder="Nhập hoặc tạo Folder ID..."
              />
              {localSettings.googleDriveFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${localSettings.googleDriveFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-amber-600 font-bold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={9} /> Mở trên Google Drive
                </a>
              )}
            </div>
          </div>

          {localSettings.isGoogleConnected && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSync}
              className={`w-full py-3 text-white rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-[0.8rem] shadow-lg active:scale-95 transition-all disabled:bg-slate-300 ${syncStatus === 'success' ? 'bg-emerald-500' :
                syncStatus === 'error' ? 'bg-rose-500' :
                  syncStatus === 'token_expired' ? 'bg-amber-500' :
                    'bg-emerald-600'
                }`}
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Đang đồng bộ...' :
                syncStatus === 'success' ? '✅ Đã đồng bộ thành công!' :
                  syncStatus === 'token_expired' ? '⚠️ Token hết hạn - Đăng nhập lại' :
                    syncStatus === 'error' ? '🔴 Lỗi - Thử lại' :
                      'Đồng bộ dữ liệu ngay'}
            </button>
          )}

          <p className="text-[10px] text-slate-400 italic">
            💡 Nhấn "Tạo mới" để tạo Spreadsheet (với đầy đủ 6 sheet tab). Nhấn "Thêm tab" để tạo sheet tab bổ sung trong file hiện tại.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <MessageSquare size={20} className="text-blue-500" />
              <h3 className="font-bold uppercase text-xs tracking-wider">Thông báo Telegram</h3>
            </div>
            <button type="button" disabled={isTestingTelegram} onClick={testTelegram} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 flex items-center gap-1 transition-all">
              <RefreshCw size={12} className={isTestingTelegram ? "animate-spin" : ""} /> {isTestingTelegram ? "Đang gửi..." : "Gửi tin thử"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={localSettings.telegramBotToken} onChange={e => setLocalSettings({ ...localSettings, telegramBotToken: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none" placeholder="Token: 123456:ABC..." />
            <input value={localSettings.telegramChatId} onChange={e => setLocalSettings({ ...localSettings, telegramChatId: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none" placeholder="Chat ID: -100..." />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <Database size={20} className="text-blue-500" />
            <h3 className="font-bold uppercase text-xs tracking-wider">Cấu hình Cơ sở dữ liệu Supabase (Cloud)</h3>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <p className="text-xs text-blue-700 font-medium">Bật cơ sở dữ liệu Supabase để đồng bộ dữ liệu Realtime (Thời gian thực) và lưu trữ chuyên nghiệp thay thế Google Sheets. An toàn và không giới hạn thiết bị.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Supabase URL</label>
              <input
                type="text"
                value={localSettings.supabaseUrl || ''}
                onChange={e => setLocalSettings({ ...localSettings, supabaseUrl: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                placeholder="https://xxxxxx.supabase.co"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Supabase Anon Key</label>
              <input
                type="password"
                value={localSettings.supabaseAnonKey || ''}
                onChange={e => setLocalSettings({ ...localSettings, supabaseAnonKey: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleSupabaseConnect}
                className={`flex-1 py-3 ${localSettings.isSupabaseConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-200'} border rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:opacity-80 transition-all`}
              >
                <Link size={16} />
                {localSettings.isSupabaseConnected ? 'Đã Kết Nối Supabase' : 'Kiểm tra & Kết nối'}
              </button>
              <button
                type="button"
                onClick={handleSupabasePush}
                disabled={!localSettings.isSupabaseConnected || isSupabaseSyncing}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send size={16} className={isSupabaseSyncing ? "animate-spin" : ""} />
                {isSupabaseSyncing ? "Đang gửi..." : "GỬI LÊN (Push)"}
              </button>
              <button
                type="button"
                onClick={handleSupabasePull}
                disabled={!localSettings.isSupabaseConnected || isSupabasePulling}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <DatabaseBackup size={16} className={isSupabasePulling ? "animate-spin" : ""} />
                {isSupabasePulling ? "Đang tải..." : "TẢI VỀ (Pull)"}
              </button>
            </div>
          </div>
        </div>



        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <Shield size={20} className="text-purple-500" />
            <h3 className="font-bold uppercase text-xs tracking-wider">Cấu hình AI (Groq)</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Groq API Key</label>
            <div className="relative">
              <input
                type="password"
                value={localSettings.groqApiKey || ''}
                onChange={e => setLocalSettings({ ...localSettings, groqApiKey: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none pr-10"
                placeholder="gsk_..."
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <DatabaseBackup size={20} className="text-rose-500" />
            <h3 className="font-bold uppercase text-xs tracking-wider">Quản trị Dữ liệu</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelImport}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <button type="button" className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                <FileSpreadsheet size={18} /> Nhập từ Excel
              </button>
            </div>
            <button type="button" onClick={downloadExcelTemplate} className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
              <Table size={18} /> Tải file mẫu
            </button>
            <button type="button" onClick={onLoadSampleData} className="flex-1 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
              <FileJson size={18} /> Nạp dữ liệu mẫu
            </button>
            <button type="button" onClick={handleClearData} className="flex-1 py-3 bg-rose-50 text-rose-700 rounded-xl font-bold uppercase text-[0.8rem] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
              <Trash2 size={18} /> Xóa sạch dữ liệu (Reset)
            </button>
          </div>
        </div>

        <button type="submit" className={`w-full ${isSaved ? 'bg-emerald-600' : 'bg-indigo-600'} text-white py-5 rounded-3xl font-bold uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all sticky bottom-4 z-40`}>
          {isSaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {isSaved ? 'Đã lưu cấu hình' : 'Lưu thay đổi cấu hình'}
        </button>
      </form>
    </div>
  );
};

export default SettingsView;

