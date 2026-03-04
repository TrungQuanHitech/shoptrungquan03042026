
import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Truck, Calendar, Trash2, ChevronDown, ChevronRight, AlertTriangle, Send, User } from 'lucide-react';
import { Order, Purchase, Product, Contact, Transaction, Settings } from '../types';

interface ReportsProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ 
  orders, setOrders, 
  purchases, setPurchases, 
  products, setProducts, 
  contacts, setContacts, 
  transactions, setTransactions,
  settings,
  onNotify
}) => {
  const [reportType, setReportType] = useState<'SALES' | 'PURCHASES'>('SALES');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [query, setQuery] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingRecord, setDeletingRecord] = useState<Order | Purchase | null>(null);

  const escapeHTML = (str: string) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, (m) => map[m] || m);
  };

  const reportData = useMemo(() => {
    let data: (Order | Purchase)[] = reportType === 'SALES' ? orders : purchases;
    
    if (dateFrom) data = data.filter(d => new Date(d.date) >= new Date(dateFrom));
    if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        data = data.filter(d => new Date(d.date) <= endDate);
    }
    if (query) {
      const lowerQ = query.toLowerCase();
      data = data.filter(d => 
        d.id.toLowerCase().includes(lowerQ) || 
        contacts.find(c => c.id === (reportType === 'SALES' ? (d as Order).customerId : (d as Purchase).supplierId))?.name.toLowerCase().includes(lowerQ)
      );
    }
    
    return data.slice().reverse();
  }, [reportType, orders, purchases, dateFrom, dateTo, query, contacts]);

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const exportToExcel = () => {
    const isSales = reportType === 'SALES';
    const filename = `Bao_cao_${isSales ? 'Ban_hang' : 'Nhap_hang'}_${new Date().toISOString().slice(0, 10)}.csv`;
    const headers = ["Mã đơn", "Ngày lập", "Đối tác", "Tổng tiền", "Đã trả", "Còn nợ", "Trạng thái"];
    const rows = reportData.map(item => {
      const contact = contacts.find(c => c.id === (isSales ? (item as Order).customerId : (item as Purchase).supplierId));
      return [
        item.id,
        new Date(item.date).toLocaleString('vi-VN'),
        contact?.name || (isSales ? 'Khách lẻ' : 'N/A'),
        item.total.toString(),
        item.paid.toString(),
        item.debt.toString(),
        item.debt === 0 ? "Hoàn tất" : "Còn nợ"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSendTelegram = () => {
    if (!onNotify || !settings.telegramBotToken) {
        alert("Vui lòng cấu hình Telegram trong phần Cài đặt trước!");
        return;
    }
    if (reportData.length === 0) {
        alert("Không có dữ liệu để báo cáo!");
        return;
    }

    const isSales = reportType === 'SALES';
    const title = isSales ? "BÁO CÁO BÁN HÀNG" : "BÁO CÁO NHẬP KHO";
    const totalAmount = reportData.reduce((sum, item) => sum + item.total, 0);
    const totalPaid = reportData.reduce((sum, item) => sum + item.paid, 0);
    const totalDebt = reportData.reduce((sum, item) => sum + item.debt, 0);
    const count = reportData.length;
    const fromStr = dateFrom ? new Date(dateFrom).toLocaleDateString('vi-VN') : '...';
    const toStr = dateTo ? new Date(dateTo).toLocaleDateString('vi-VN') : 'Hiện tại';
    const range = dateFrom || dateTo ? `${fromStr} - ${toStr}` : "Toàn bộ lịch sử";

    const msg = `📊 <b>${title} TỔNG HỢP</b>\n━━━━━━━━━━━━━\n📅 <b>Thời gian:</b> ${range}\n🔢 <b>Số lượng đơn:</b> ${count}\n━━━━━━━━━━━━━\n💰 <b>Tổng doanh số:</b> ${totalAmount.toLocaleString()}đ\n✅ <b>Thực thu/chi:</b> ${totalPaid.toLocaleString()}đ\n⚠️ <b>Công nợ phát sinh:</b> ${totalDebt.toLocaleString()}đ\n━━━━━━━━━━━━━\n<i>Báo cáo được xuất từ hệ thống SmartShop ERP</i>`;
    onNotify(msg);
    alert("✅ Đã gửi báo cáo tổng hợp tới Telegram!");
  };

  const handleDelete = () => {
    if (!deletingRecord) return;
    const record = deletingRecord;
    const isSales = reportType === 'SALES';

    setProducts(prev => prev.map(p => {
        const item = record.items.find(i => i.productId === p.id);
        if (item) {
            return { ...p, stock: isSales ? p.stock + item.quantity : Math.max(0, p.stock - item.quantity) };
        }
        return p;
    }));

    const contactId = isSales ? (record as Order).customerId : (record as Purchase).supplierId;
    if (record.debt > 0 && contactId !== 'default') {
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, debt: Math.max(0, c.debt - record.debt) } : c));
    }

    setTransactions(prev => prev.filter(t => t.relatedId !== record.id));

    if (isSales) {
        setOrders(prev => prev.filter(o => o.id !== record.id));
    } else {
        setPurchases(prev => prev.filter(p => p.id !== record.id));
    }

    if (onNotify) {
      const typeStr = isSales ? '🔴 ĐÃ XÓA ĐƠN BÁN HÀNG' : '🔴 ĐÃ XÓA ĐƠN NHẬP KHO';
      const contact = contacts.find(c => c.id === contactId)?.name || 'Khách vãng lai';
      const msg = `⚠️ <b>${typeStr}</b>\n━━━━━━━━━━━━━\n🆔 <b>Mã đơn:</b> ${record.id}\n👤 <b>Đối tác:</b> ${escapeHTML(contact)}\n💰 <b>Tổng tiền:</b> ${record.total.toLocaleString()}đ\n━━━━━━━━━━━━━\n<i>Dữ liệu tồn kho và công nợ đã được hệ thống tự động hoàn lại.</i>`;
      onNotify(msg);
    }
    setDeletingRecord(null);
  };

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3 no-print">
         <div className="flex flex-wrap gap-2">
            <button 
                onClick={() => { setReportType('SALES'); setExpandedIds(new Set()); }} 
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${reportType === 'SALES' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
            >
                <ShoppingBag size={14} /> Báo cáo bán hàng
            </button>
            <button 
                onClick={() => { setReportType('PURCHASES'); setExpandedIds(new Set()); }} 
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${reportType === 'PURCHASES' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
            >
                <Truck size={14} /> Báo cáo nhập hàng
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Tìm mã đơn, tên khách..." className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-[0.85rem] font-medium focus:ring-2 focus:ring-indigo-100 outline-none" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">Từ</span>
                    <input type="date" className="w-full pl-8 pr-2 py-1.5 bg-transparent text-[0.8rem] font-bold outline-none text-slate-700" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">Đến</span>
                    <input type="date" className="w-full pl-9 pr-2 py-1.5 bg-transparent text-[0.8rem] font-bold outline-none text-slate-700" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={handleSendTelegram} className="flex-1 bg-blue-500 text-white py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-sm shadow-blue-200 active:scale-95">
                   <Send size={16} /> Gửi
                </button>
                <button onClick={exportToExcel} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95">
                   EXCEL
                </button>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
         <table className="w-full text-left table-auto border-collapse">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
               <tr>
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2 border-r border-slate-200">Mã đơn</th>
                  <th className="px-3 py-2 border-r border-slate-200">Ngày lập</th>
                  <th className="px-3 py-2 border-r border-slate-200">Đối tác</th>
                  <th className="px-3 py-2 text-right border-r border-slate-200">Tổng tiền</th>
                  <th className="px-3 py-2 text-right border-r border-slate-200">Đã trả</th>
                  <th className="px-3 py-2 text-right border-r border-slate-200">Còn nợ</th>
                  <th className="px-3 py-2 text-center w-24">Trạng thái</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {reportData.map((item) => {
                 const isExpanded = expandedIds.has(item.id);
                 const contact = contacts.find(c => c.id === (reportType === 'SALES' ? (item as Order).customerId : (item as Purchase).supplierId));
                 const relatedTxs = transactions.filter(t => t.relatedId === item.id);
                 return (
                   <React.Fragment key={item.id}>
                     <tr 
                        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                        onClick={() => toggleExpand(item.id)}
                     >
                        <td className="px-3 py-2 text-center text-slate-400">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td className={`px-3 py-2 font-mono font-bold text-[0.8rem] ${reportType === 'SALES' ? 'text-indigo-600' : 'text-orange-600'}`}>
                          {item.id}
                        </td>
                        <td className="px-3 py-2 text-[0.8rem] text-slate-500 font-medium whitespace-nowrap">
                          {new Date(item.date).toLocaleString('vi-VN')}
                        </td>
                        <td className="px-3 py-2 text-[0.85rem] font-bold text-slate-700">
                          {contact?.name || 'Khách vãng lai'}
                        </td>
                        <td className="px-3 py-2 text-right text-[0.85rem] font-bold text-slate-800">
                          {item.total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-[0.85rem] font-medium text-emerald-600">
                          {item.paid.toLocaleString()}
                        </td>
                        <td className={`px-3 py-2 text-right text-[0.85rem] font-bold ${item.debt > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                          {item.debt > 0 ? item.debt.toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.debt === 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">Hoàn tất</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200">Còn nợ</span>
                          )}
                        </td>
                     </tr>
                     {isExpanded && (
                       <tr className="bg-slate-50/80 animate-in fade-in slide-in-from-top-1 duration-200">
                         <td colSpan={8} className="p-4 border-b border-slate-200 shadow-inner">
                            <div className="flex flex-col lg:flex-row gap-6">
                              <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                  <h4 className="text-[10px] font-bold uppercase text-slate-600 flex items-center gap-1">
                                    <ShoppingBag size={12} /> Chi tiết sản phẩm ({item.items.length})
                                  </h4>
                                </div>
                                <table className="w-full text-left">
                                  <thead className="bg-white border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase">
                                    <tr>
                                      <th className="px-3 py-1.5">Tên sản phẩm</th>
                                      <th className="px-3 py-1.5 text-center">SL</th>
                                      <th className="px-3 py-1.5 text-right">Đơn giá</th>
                                      <th className="px-3 py-1.5 text-right">Thành tiền</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {item.items.map((prod, idx) => {
                                      const productInfo = products.find(p => p.id === prod.productId);
                                      return (
                                        <tr key={idx}>
                                          <td className="px-3 py-2 text-[0.8rem] font-medium text-slate-700">
                                            {productInfo?.name || 'Sản phẩm đã xóa'}
                                            <div className="text-[8px] text-slate-400 font-mono">{productInfo?.sku}</div>
                                          </td>
                                          <td className="px-3 py-2 text-center text-[0.8rem] font-bold">{prod.quantity}</td>
                                          <td className="px-3 py-2 text-right text-[0.8rem] text-slate-500">{prod.price.toLocaleString()}</td>
                                          <td className="px-3 py-2 text-right text-[0.8rem] font-bold text-slate-900">{(prod.price * prod.quantity).toLocaleString()}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 text-[0.8rem]">
                                   <div className="flex gap-1 items-center text-slate-500 font-medium">
                                      <span>Thuế ({item.taxRate}%):</span>
                                      <span>{item.taxAmount?.toLocaleString() || 0}</span>
                                   </div>
                                   <div className="flex gap-1 items-center text-indigo-700 font-bold">
                                      <span>Tổng cộng:</span>
                                      <span>{item.total.toLocaleString()} đ</span>
                                   </div>
                                </div>
                              </div>
                              <div className="w-full lg:w-80 space-y-3 shrink-0">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                   <h4 className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-50 pb-1 mb-1">Thông tin đối tác</h4>
                                   <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <User size={16} />
                                      </div>
                                      <div>
                                        <p className="text-[0.85rem] font-bold text-slate-800">{contact?.name || 'Vãng lai'}</p>
                                        <p className="text-[0.75rem] text-slate-500 font-medium">{contact?.phone || '---'}</p>
                                      </div>
                                   </div>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                   <h4 className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-50 pb-1 mb-1">Lịch sử thanh toán</h4>
                                   {relatedTxs.length > 0 ? (
                                     <div className="space-y-1.5">
                                       {relatedTxs.map(tx => (
                                         <div key={tx.id} className="flex justify-between items-center text-[0.75rem]">
                                            <span className="text-slate-500">{new Date(tx.date).toLocaleDateString()}</span>
                                            <span className={`font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                              {tx.type === 'IN' ? '+' : '-'}{tx.amount.toLocaleString()}
                                            </span>
                                         </div>
                                       ))}
                                     </div>
                                   ) : (
                                     <p className="text-[0.75rem] text-slate-400 italic">Chưa có giao dịch ghi nhận.</p>
                                   )}
                                </div>
                                <div className="flex justify-end pt-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setDeletingRecord(item); }} 
                                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[0.8rem] font-bold uppercase flex items-center justify-center gap-2 transition-colors border border-rose-100"
                                  >
                                    <Trash2 size={14} /> Xóa đơn này
                                  </button>
                                </div>
                              </div>
                            </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 );
               })}
               {reportData.length === 0 && (
                 <tr>
                    <td colSpan={8} className="px-4 py-20 text-center text-slate-300 italic text-[0.85rem] font-medium">Không tìm thấy dữ liệu báo cáo trong khoảng thời gian này.</td>
                 </tr>
               )}
            </tbody>
         </table>
      </div>

      {deletingRecord && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl w-full max-w-[320px] overflow-hidden shadow-2xl border border-rose-100">
                <div className="p-8 text-center space-y-5">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 ring-4 ring-rose-50">
                        <AlertTriangle size={32} className="text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-[1.2rem] font-bold text-slate-900 uppercase tracking-tight">Xác nhận xóa?</h3>
                        <p className="text-[0.85rem] text-slate-500 leading-relaxed px-2">
                            Xóa bản ghi đơn hàng <span className="font-bold text-slate-800">"{deletingRecord.id}"</span>? 
                            Hệ thống sẽ tự động <span className="text-rose-600 font-bold">hoàn tồn kho</span> và <span className="text-rose-600 font-bold">khấu trừ công nợ</span> tương ứng.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                        <button onClick={handleDelete} className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-2xl uppercase tracking-wider text-[0.8rem] shadow-lg shadow-rose-100 active:scale-95 transition-all">Xóa vĩnh viễn</button>
                        <button onClick={() => setDeletingRecord(null)} className="w-full py-3.5 bg-slate-50 text-slate-500 font-bold rounded-2xl uppercase tracking-wider text-[0.8rem] hover:bg-slate-100 transition-colors">Bỏ qua</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
