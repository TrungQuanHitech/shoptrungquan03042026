
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertCircle,
  Users,
  Zap,
  Wallet,
  FileText,
  Clock,
  ArrowRight,
  Loader2,
  CreditCard
} from 'lucide-react';
import { Product, Order, Purchase, Transaction, Contact, View, Settings } from '../types';
import { SalesTodayReport, DebtReport, InventoryReport } from './ReportTemplates';

interface DashboardProps {
  products: Product[];
  orders: Order[];
  purchases: Purchase[];
  transactions: Transaction[];
  contacts: Contact[];
  settings: Settings;
  onNavigate: (view: View) => void;
  onNotify?: (payload: string | { file: Blob; caption: string; filename: string }) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ products, orders, purchases, transactions, contacts, settings, onNavigate, onNotify }) => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.date.startsWith(today));
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
    
    let totalCostOfGoodsSold = 0;
    orders.forEach(order => {
      order.items.forEach(item => { totalCostOfGoodsSold += item.cost * item.quantity; });
    });
    
    const grossProfit = totalSales - totalCostOfGoodsSold;
    const totalReceived = transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0);
    const netCash = totalReceived - totalSpent;
    const receivable = contacts.filter(c => c.type === 'CUSTOMER').reduce((sum, c) => sum + c.debt, 0);
    const payable = contacts.filter(c => c.type === 'SUPPLIER').reduce((sum, c) => sum + c.debt, 0);
    const outOfStock = products.filter(p => p.stock < 5);
    
    return { 
      totalSales, 
      todaySales,
      totalPurchases, 
      grossProfit, 
      totalReceived, 
      totalSpent, 
      netCash, 
      receivable, 
      payable, 
      outOfStock 
    };
  }, [products, orders, purchases, transactions, contacts]);

  const generateAndSendReport = async (reportType: 'sales_today' | 'debt' | 'inventory', title: string) => {
    if (isGenerating) return;
    if (!onNotify) {
      alert("Chức năng thông báo chưa được cấu hình.");
      return;
    }

    setIsGenerating(reportType);
    let reportComponent;
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.date.startsWith(today));

    switch (reportType) {
        case 'sales_today':
            reportComponent = <SalesTodayReport orders={todayOrders} products={products} contacts={contacts} settings={settings} />;
            break;
        case 'debt':
            reportComponent = <DebtReport contacts={contacts} settings={settings} />;
            break;
        case 'inventory':
            reportComponent = <InventoryReport products={products} settings={settings} />;
            break;
        default:
            setIsGenerating(null);
            return;
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    document.body.appendChild(tempDiv);
    
    const root = ReactDOM.createRoot(tempDiv);
    root.render(reportComponent);
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const pdfBlob = await (window as any).html2pdf().from(tempDiv).set({
            margin: 10,
            filename: `${reportType}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).output('blob');

        onNotify({
            file: pdfBlob,
            caption: `📊 <b>${title}</b>\n\n- <i>Ngày xuất: ${new Date().toLocaleString('vi-VN')}</i>\n- <i>Từ hệ thống SmartShop ERP</i>`,
            filename: `${reportType}_${today}.pdf`
        });
        alert(`✅ Đã gửi báo cáo "${title}" tới Telegram!`);
    } catch (error) {
        console.error("PDF generation/sending failed:", error);
        alert(`Lỗi khi tạo hoặc gửi báo cáo: ${error}`);
    } finally {
        root.unmount();
        document.body.removeChild(tempDiv);
        setIsGenerating(null);
    }
  };

  const MetricCard = ({ icon, label, value, color, onClick, subtext }: { icon: React.ReactNode; label: string; value: string; color: string; onClick: () => void; subtext?: string }) => (
    <div onClick={onClick} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group animate-in zoom-in duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest group-hover:text-indigo-500 transition-colors">{label}</p>
          <p className={`text-[1.3rem] font-black tracking-tight ${color}`}>{value}</p>
          {subtext && <p className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full inline-block">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-').replace('-600', '-50')}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: color, size: 24 })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
            <ShoppingCart size={150} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Chỉ số Bán hàng</span>
               <div className="flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full border border-indigo-500/30">
                  <Clock size={12} className="text-indigo-300" />
                  <span className="text-[10px] font-bold">Thời gian thực</span>
               </div>
            </div>
            <div>
              <p className="text-[0.8rem] font-bold text-slate-400">Tổng doanh số (Bán hàng)</p>
              <h2 className="text-[2.2rem] font-black tracking-tighter leading-none mt-1">{stats.totalSales.toLocaleString()} <span className="text-[1rem] font-bold text-slate-500 uppercase ml-1">VNĐ</span></h2>
            </div>
            <div className="flex gap-4 pt-4 border-t border-white/10">
               <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500">Hôm nay</p>
                  <p className="text-[1.1rem] font-bold text-indigo-400">+{stats.todaySales.toLocaleString()}</p>
               </div>
               <div>
                  <p className="text-[9px] uppercase font-bold text-slate-500">Lợi nhuận gộp</p>
                  <p className="text-[1.1rem] font-bold text-emerald-400">{stats.grossProfit.toLocaleString()}</p>
               </div>
               <button onClick={() => onNavigate('REPORTS')} className="ml-auto bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all self-end border border-white/5">
                  <ArrowRight size={20} />
               </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-7 border border-slate-200 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-emerald-600">
            <Wallet size={150} />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Quỹ tiền mặt</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase">Cash flow</span>
            </div>
            <div>
              <p className="text-[0.8rem] font-bold text-slate-400">Số dư thực tế hiện có</p>
              <h2 className="text-[2.2rem] font-black tracking-tighter leading-none mt-1 text-slate-900">{stats.netCash.toLocaleString()} <span className="text-[1rem] font-bold text-slate-400 uppercase ml-1">VNĐ</span></h2>
            </div>
            <div className="flex gap-4 pt-4 border-t border-slate-100">
               <div className="flex-1">
                  <p className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1"><ArrowUpCircle size={10} className="text-emerald-500" /> Thực thu</p>
                  <p className="text-[1.1rem] font-bold text-emerald-600">{stats.totalReceived.toLocaleString()}</p>
               </div>
               <div className="flex-1 border-l border-slate-100 pl-4">
                  <p className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1"><ArrowDownCircle size={10} className="text-rose-500" /> Thực chi</p>
                  <p className="text-[1.1rem] font-bold text-rose-600">{stats.totalSpent.toLocaleString()}</p>
               </div>
               <button onClick={() => onNavigate('FINANCE')} className="bg-slate-50 hover:bg-slate-100 p-2.5 rounded-2xl transition-all self-end border border-slate-100">
                  <ArrowRight size={20} className="text-slate-400" />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={<Users />} label="Phải thu Khách" value={stats.receivable.toLocaleString() + ' đ'} color="text-emerald-600" onClick={() => onNavigate('DEBT')} subtext="Customer Debt" />
        <MetricCard icon={<ArrowDownCircle />} label="Phải trả NCC" value={stats.payable.toLocaleString() + ' đ'} color="text-rose-600" onClick={() => onNavigate('DEBT')} subtext="Supplier Debt" />
        <MetricCard icon={<Package />} label="Nhập hàng" value={stats.totalPurchases.toLocaleString() + ' đ'} color="text-orange-600" onClick={() => onNavigate('PURCHASES')} subtext="Total Purchases" />
        <MetricCard icon={<AlertCircle />} label="Hết hàng" value={stats.outOfStock.length.toString()} color="text-amber-600" onClick={() => onNavigate('INVENTORY')} subtext="Low Stock Items" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-500 fill-amber-500" />
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-700">Gửi Nhanh Báo cáo PDF qua Telegram</h3>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
          <ReportButton 
            icon={<FileText size={18} className="text-indigo-500" />} 
            label="Doanh thu Hôm nay" 
            onClick={() => generateAndSendReport('sales_today', 'Báo cáo Doanh thu Hôm nay')}
            isLoading={isGenerating === 'sales_today'}
          />
          <ReportButton 
            icon={<CreditCard size={18} className="text-emerald-500" />} 
            label="Tổng hợp Công nợ" 
            onClick={() => generateAndSendReport('debt', 'Báo cáo Tổng hợp Công nợ')}
            isLoading={isGenerating === 'debt'}
          />
          <ReportButton 
            icon={<Package size={18} className="text-orange-500" />} 
            label="Tình hình Tồn kho" 
            onClick={() => generateAndSendReport('inventory', 'Báo cáo Tình hình Tồn kho')}
            isLoading={isGenerating === 'inventory'}
          />
        </div>
      </div>
    </div>
  );
};

const ReportButton = ({ icon, label, onClick, isLoading }: { icon: React.ReactNode; label: string; onClick: () => void; isLoading: boolean }) => (
  <button 
    onClick={onClick} 
    disabled={isLoading}
    className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition-all active:scale-95 group bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="group-hover:scale-110 transition-transform h-5">
      {isLoading ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : icon}
    </div>
    <span className="text-[9px] font-bold uppercase text-center leading-tight tracking-tighter w-full truncate">
      {isLoading ? "Đang xử lý..." : label}
    </span>
  </button>
);

export default Dashboard;
