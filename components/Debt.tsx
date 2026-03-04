
import React, { useState, useMemo } from 'react';
import { Search, X, CreditCard, History, UserCheck, Truck, Calendar, DollarSign, ShoppingBag } from 'lucide-react';
import { Contact, Transaction, Order, Purchase, Settings } from '../types';

interface DebtProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const Debt: React.FC<DebtProps> = ({ contacts, setContacts, transactions, setTransactions, orders, setOrders, purchases, setPurchases, settings, onNotify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [processingContact, setProcessingContact] = useState<Contact | null>(null);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [targetOrderId, setTargetOrderId] = useState<string | null>(null);

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

  const filtered = contacts.filter(c => 
    c.debt > 0 && 
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
  );

  const handleProcessDebt = () => {
    if (!processingContact || paymentAmount <= 0) return;

    const amountToApply = Math.min(paymentAmount, processingContact.debt);
    const isCustomer = processingContact.type === 'CUSTOMER';
    
    setContacts(prev => prev.map(c => c.id === processingContact.id ? { ...c, debt: Math.max(0, c.debt - amountToApply) } : c));

    const updatedRemainingDebt = Math.max(0, processingContact.debt - amountToApply);

    const updateOrderDebt = (prevList: any[]) => {
       let moneyToPay = amountToApply;
       
       if (targetOrderId) {
          return prevList.map(item => {
             if (item.id === targetOrderId) {
                const pay = Math.min(item.debt, moneyToPay);
                return { ...item, paid: item.paid + pay, debt: item.debt - pay };
             }
             return item;
          });
       }

       const itemsToPay = prevList
          .map((item, idx) => ({ ...item, originalIdx: idx }))
          .filter(item => (isCustomer ? item.customerId : item.supplierId) === processingContact.id && item.debt > 0)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

       const updates = new Map();

       for (const item of itemsToPay) {
          if (moneyToPay <= 0) break;
          const pay = Math.min(item.debt, moneyToPay);
          moneyToPay -= pay;
          updates.set(item.originalIdx, {
             ...prevList[item.originalIdx],
             paid: prevList[item.originalIdx].paid + pay,
             debt: prevList[item.originalIdx].debt - pay
          });
       }

       return prevList.map((item, idx) => updates.get(idx) || item);
    };

    if (isCustomer) {
        setOrders(prev => updateOrderDebt(prev));
    } else {
        setPurchases(prev => updateOrderDebt(prev));
    }

    const description = targetOrderId 
      ? `${isCustomer ? 'Thu nợ' : 'Trả nợ'} cho đơn hàng ${targetOrderId}`
      : `${isCustomer ? 'Thu nợ' : 'Trả nợ'} của ${processingContact.name}`;

    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      date: new Date().toISOString(),
      type: isCustomer ? 'IN' : 'OUT',
      amount: amountToApply,
      description: description,
      category: isCustomer ? 'Thu nợ' : 'Trả nợ',
      relatedId: targetOrderId || processingContact.id
    };
    
    setTransactions(prev => [newTx, ...prev]);

    if (settings.notifyOnFinance && onNotify) {
        const typeStr = isCustomer ? '🟢 THU NỢ KHÁCH HÀNG' : '🔴 TRẢ NỢ NHÀ CUNG CẤP';
        const msg = `💸 <b>XỬ LÝ CÔNG NỢ: ${newTx.id}</b>\n━━━━━━━━━━━━━\n👤 <b>Đối tác:</b> ${escapeHTML(processingContact.name)}\n🏷️ <b>Loại:</b> ${typeStr}\n📝 <b>Nội dung:</b> ${description}\n━━━━━━━━━━━━━\n💰 <b>Số tiền: ${amountToApply.toLocaleString()}đ</b>\n⚠️ <b>Dư nợ còn lại: ${updatedRemainingDebt.toLocaleString()}đ</b>`;
        onNotify(msg);
    }

    setProcessingContact(null);
    setPaymentAmount(0);
    setTargetOrderId(null);
  };

  const contactDebtHistory = useMemo(() => {
    if (!historyContact) return [];
    if (historyContact.type === 'CUSTOMER') {
      return orders.filter(o => o.customerId === historyContact.id && o.debt > 0).slice().reverse();
    } else {
      return purchases.filter(p => p.supplierId === historyContact.id && p.debt > 0).slice().reverse();
    }
  }, [historyContact, orders, purchases]);

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="relative no-print">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input 
          type="text" 
          placeholder="Tìm đối tác đang có công nợ..." 
          className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-[0.85rem] bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2">Đối tác nợ</th>
              <th className="px-3 py-2 w-28">Phân loại</th>
              <th className="px-3 py-2 w-32 text-right">Số nợ hiện tại</th>
              <th className="px-3 py-2 w-24 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 group cursor-pointer transition-colors" onClick={() => setHistoryContact(c)}>
                <td className="px-3 py-2">
                  <p className="font-bold text-slate-700 text-[0.85rem] leading-tight group-hover:text-indigo-600 transition-colors truncate">{c.name}</p>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">{c.phone}</p>
                </td>
                <td className="px-3 py-2">
                   <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${c.type === 'CUSTOMER' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                      {c.type === 'CUSTOMER' ? <UserCheck size={10} /> : <Truck size={10} />}
                      {c.type === 'CUSTOMER' ? 'Khách nợ mình' : 'Mình nợ NCC'}
                   </div>
                </td>
                <td className={`px-3 py-2 text-right font-bold text-[1rem] ${c.type === 'CUSTOMER' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {c.debt.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => {setProcessingContact(c); setPaymentAmount(c.debt); setTargetOrderId(null);}}
                    className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-tight text-white shadow-sm transition-all active:scale-95 ${c.type === 'CUSTOMER' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                  >
                    {c.type === 'CUSTOMER' ? 'Thu nợ' : 'Trả nợ'}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-20 text-center text-slate-300 italic text-[0.85rem]">Không có công nợ phát sinh cần xử lý.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {processingContact && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print">
           <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-700 uppercase text-[0.85rem] tracking-tight">Xử lý {processingContact.type === 'CUSTOMER' ? 'Thu nợ' : 'Trả nợ'}</h3>
                <button onClick={() => {setProcessingContact(null); setTargetOrderId(null);}} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Dư nợ hiện tại của {processingContact.name}</p>
                    {targetOrderId && (
                      <p className="text-[8px] text-indigo-500 font-bold mb-1 uppercase">Đang xử lý cho đơn: {targetOrderId}</p>
                    )}
                    <p className={`text-[1.5rem] font-bold ${processingContact.type === 'CUSTOMER' ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {processingContact.debt.toLocaleString()} đ
                    </p>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Số tiền thanh toán thực tế</label>
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input 
                        type="number" 
                        autoFocus
                        value={paymentAmount} 
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-100 rounded-xl text-lg font-bold text-slate-800 focus:border-indigo-200 focus:ring-0 outline-none transition-all"
                      />
                    </div>
                    <p className="text-[0.7rem] text-slate-400 italic font-medium">Số tiền này sẽ được tự động ghi vào sổ quỹ Tài chính.</p>
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button onClick={() => {setProcessingContact(null); setTargetOrderId(null);}} className="flex-1 py-3 bg-slate-50 text-slate-400 font-bold rounded-xl uppercase text-[0.8rem] tracking-wider transition-colors hover:bg-slate-100">Hủy bỏ</button>
                    <button 
                      onClick={handleProcessDebt}
                      className={`flex-[2] py-3 rounded-xl text-white font-bold uppercase tracking-wider shadow-lg transition-transform active:scale-95 text-[0.8rem] ${processingContact.type === 'CUSTOMER' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
                    >
                      Xác nhận {processingContact.type === 'CUSTOMER' ? 'Thu nợ' : 'Trả nợ'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {historyContact && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm no-print">
           <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className={`px-4 py-3 border-b flex items-center justify-between ${historyContact.type === 'CUSTOMER' ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${historyContact.type === 'CUSTOMER' ? 'bg-indigo-600' : 'bg-orange-600'} text-white shadow-sm`}>
                       <ShoppingBag size={16} />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-800 text-[0.9rem] leading-tight uppercase">{historyContact.name}</h3>
                       <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-tighter">
                          <History size={10} /> Chi tiết các đơn hàng còn nợ
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setHistoryContact(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm border border-slate-100"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left table-fixed">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100">
                       <tr>
                          <th className="px-4 py-2 flex items-center gap-1 w-24"><Calendar size={10} /> Ngày lập</th>
                          <th className="px-4 py-2 w-28">Mã đơn</th>
                          <th className="px-4 py-2 text-right">Tổng đơn</th>
                          <th className="px-4 py-2 text-right">Tiền còn nợ</th>
                          <th className="px-4 py-2 text-center w-20">Thao tác</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {contactDebtHistory.map((item: Order | Purchase) => (
                          <tr key={item.id} className="hover:bg-slate-50 text-[0.85rem] transition-colors">
                             <td className="px-4 py-2 text-slate-500 font-medium text-[0.8rem]">{new Date(item.date).toLocaleDateString()}</td>
                             <td className="px-4 py-2 font-mono font-bold text-indigo-600 text-[0.75rem]">{item.id}</td>
                             <td className="px-4 py-2 text-right font-medium text-slate-400">{item.total.toLocaleString()}</td>
                             <td className="px-4 py-2 text-right font-bold text-rose-600">
                                {item.debt.toLocaleString()}
                             </td>
                             <td className="px-4 py-2 text-center">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetOrderId(item.id);
                                    setProcessingContact(historyContact);
                                    setPaymentAmount(item.debt);
                                    setHistoryContact(null);
                                  }}
                                  className="p-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                  title="Xử lý nợ cho đơn này"
                                >
                                   <CreditCard size={14} />
                                </button>
                             </td>
                          </tr>
                       ))}
                       {contactDebtHistory.length === 0 && (
                          <tr>
                             <td colSpan={5} className="px-4 py-16 text-center text-slate-300 italic text-[0.8rem] font-medium">Đối tác này hiện không có đơn hàng nợ riêng lẻ.</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              <div className="p-3 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                 <div className="text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tổng nợ phải xử lý</p>
                    <p className="text-[1.1rem] font-bold text-rose-600">{historyContact.debt.toLocaleString()} đ</p>
                 </div>
                 <button onClick={() => { setProcessingContact(historyContact); setPaymentAmount(historyContact.debt); setTargetOrderId(null); setHistoryContact(null); }} className={`px-5 py-2 text-white rounded-xl text-[0.8rem] font-bold uppercase shadow-lg transition-all active:scale-95 ${historyContact.type === 'CUSTOMER' ? 'bg-emerald-600 shadow-emerald-50' : 'bg-rose-600 shadow-rose-50'}`}>
                    Xử lý nợ tổng
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Debt;
