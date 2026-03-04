
import React, { useState, useMemo } from 'react';
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Trash2, X, Wallet, Tag, Edit, AlertTriangle, PlusCircle, Send } from 'lucide-react';
import { Transaction, Settings } from '../types';

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const Finance: React.FC<FinanceProps> = ({ transactions, setTransactions, settings, onNotify }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'IN',
    amount: 0,
    description: '',
    category: ''
  });

  const totalIn = useMemo(() => transactions.filter(t => t.type === 'IN').reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const totalOut = useMemo(() => transactions.filter(t => t.type === 'OUT').reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const uniqueCategories = useMemo(() => {
    const cats = transactions.map(t => t.category).filter(Boolean);
    const defaults = ['Bán hàng', 'Nhập hàng', 'Thu nợ', 'Trả nợ', 'Vận hành', 'Lương', 'Marketing', 'Dịch vụ'];
    return Array.from(new Set([...defaults, ...cats])).sort();
  }, [transactions]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const finalCategory = showNewCategoryInput ? newCategoryName : formData.category;
    if (!finalCategory && !showNewCategoryInput) {
      alert('Vui lòng chọn hoặc nhập phân loại!');
      return;
    }

    const dataToSave = {
      ...formData,
      category: finalCategory || 'Chung'
    };

    if (editingId) {
      setTransactions(prev => prev.map(t => 
        t.id === editingId ? { ...t, ...dataToSave } as Transaction : t
      ));
    } else {
      const txId = `TX-${Date.now()}`;
      const newTransaction: Transaction = {
        ...dataToSave as Transaction,
        id: txId,
        date: new Date().toISOString()
      };
      setTransactions(prev => [newTransaction, ...prev]);

      if (settings.notifyOnFinance && onNotify) {
        const typeStr = newTransaction.type === 'IN' ? '🟢 THU TIỀN' : '🔴 CHI TIỀN';
        const msg = `🧾 <b>GIAO DỊCH MỚI: ${txId}</b>\n━━━━━━━━━━━━━\n🏷️ <b>Loại:</b> ${typeStr}\n📂 <b>Danh mục:</b> ${newTransaction.category}\n📝 <b>Nội dung:</b> ${newTransaction.description}\n━━━━━━━━━━━━━\n💰 <b>Số tiền: ${newTransaction.amount.toLocaleString()}đ</b>\n📅 <b>Ngày:</b> ${new Date(newTransaction.date).toLocaleString('vi-VN')}`;
        onNotify(msg);
      }
    }
    
    closeModal();
  };

  const sendFinanceReport = () => {
    if (!settings.telegramBotToken || !settings.telegramChatId || !onNotify) {
      alert("Vui lòng cấu hình Telegram trong mục Cài đặt để sử dụng tính năng này!");
      return;
    }
    const msg = `📊 <b>BÁO CÁO QUỸ TIỀN MẶT</b>\n━━━━━━━━━━━━━\n📅 <b>Ngày:</b> ${new Date().toLocaleDateString('vi-VN')}\n🏢 <b>Cửa hàng:</b> ${settings.shopName}\n━━━━━━━━━━━━━\n🟢 <b>Tổng Thu:</b> ${totalIn.toLocaleString()}đ\n🔴 <b>Tổng Chi:</b> ${totalOut.toLocaleString()}đ\n💰 <b>Tiền ròng hiện có:</b> ${(totalIn - totalOut).toLocaleString()}đ\n━━━━━━━━━━━━━\n<i>Báo cáo được trích xuất từ hệ thống ERP.</i>`;
    onNotify(msg);
    alert("Đã gửi báo cáo quỹ tới Telegram!");
  };

  const openEditModal = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category
    });
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ type: 'IN', amount: 0, description: '', category: '' });
    setShowNewCategoryInput(false);
    setNewCategoryName('');
  };

  const openDeleteModal = (t: Transaction) => {
    setTransactionToDelete(t);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Cards Thống kê */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Thực thu</p>
          <p className="text-[1.1rem] font-bold text-emerald-600">+{totalIn.toLocaleString()}</p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Thực chi</p>
          <p className="text-[1.1rem] font-bold text-rose-600">-{totalOut.toLocaleString()}</p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Tiền ròng</p>
          <p className="text-[1.1rem] font-bold text-slate-900">{(totalIn - totalOut).toLocaleString()}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-slate-700 uppercase tracking-tight text-[11px] flex items-center gap-2">
          <Wallet size={16} className="text-indigo-600" /> Sổ quỹ tiền mặt
        </h3>
        <div className="flex gap-2">
          <button onClick={sendFinanceReport} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 uppercase tracking-tight text-[10px] hover:bg-slate-50 transition-colors shadow-sm">
            <Send size={14} className="text-blue-500" /> Báo cáo
          </button>
          <button onClick={() => { setFormData({ type: 'IN', amount: 0, description: '', category: '' }); setEditingId(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 uppercase tracking-tight text-[10px] shadow-sm shadow-indigo-100 active:scale-95 transition-all">
            <Plus size={16} /> Lập phiếu
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-24">Thời gian</th>
              <th className="px-3 py-2 w-16">Loại</th>
              <th className="px-3 py-2">Nội dung & Phân loại</th>
              <th className="px-3 py-2 w-28 text-right">Số tiền</th>
              <th className="px-3 py-2 w-16 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 group transition-colors">
                <td className="px-3 py-1.5 text-slate-400 text-[10px] whitespace-nowrap">
                  <div className="font-semibold text-slate-500">{new Date(t.date).toLocaleDateString()}</div>
                  <div className="text-[9px] font-bold text-slate-300">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td className="px-3 py-1.5">
                  {t.type === 'IN' ? (
                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-[9px] uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit">
                       Thu
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-600 font-bold text-[9px] uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 w-fit">
                       Chi
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <p className="text-[0.85rem] font-bold text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors truncate">{t.description}</p>
                  <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">{t.category}</p>
                </td>
                <td className={`px-3 py-1.5 text-right font-bold text-[0.85rem] ${t.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right">
                   <div className="flex items-center justify-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(t)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Edit size={14} /></button>
                      <button onClick={() => openDeleteModal(t)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button>
                   </div>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-20 text-center text-slate-300 italic text-[0.85rem]">Chưa có giao dịch nào phát sinh</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Lập/Sửa phiếu */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-3 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 uppercase text-[11px] tracking-tight">{editingId ? 'Sửa phiếu Thu / Chi' : 'Lập phiếu Thu / Chi'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                 <button type="button" onClick={() => setFormData({...formData, type: 'IN'})} className={`py-2 rounded-lg font-bold flex items-center justify-center gap-2 border ${formData.type === 'IN' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 text-slate-400'} text-[11px] transition-all`}>
                   <ArrowDownLeft size={16} /> Phiếu Thu
                 </button>
                 <button type="button" onClick={() => setFormData({...formData, type: 'OUT'})} className={`py-2 rounded-lg font-bold flex items-center justify-center gap-2 border ${formData.type === 'OUT' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-100 text-slate-400'} text-[11px] transition-all`}>
                   <ArrowUpRight size={16} /> Phiếu Chi
                 </button>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Số tiền thanh toán *</label>
                <input type="number" required autoFocus value={formData.amount || ''} onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-indigo-100 outline-none" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                  <span>Danh mục</span>
                  <button type="button" onClick={() => setShowNewCategoryInput(!showNewCategoryInput)} className="text-indigo-600 hover:underline">{showNewCategoryInput ? 'Chọn có sẵn' : 'Tạo mới'}</button>
                </label>
                {showNewCategoryInput ? (
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nhập tên danh mục..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[0.85rem] font-bold" />
                ) : (
                  <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[0.85rem] font-bold bg-white">
                    <option value="">-- Chọn danh mục --</option>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">Nội dung chi tiết</label>
                <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[0.85rem] min-h-[60px] outline-none" placeholder="VD: Thu tiền bán hàng..." />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-[0.8rem] shadow-lg shadow-slate-200 active:scale-95 transition-all">Lưu phiếu</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {isDeleteModalOpen && transactionToDelete && (
         <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm no-print">
            <div className="bg-white rounded-2xl w-full max-w-[280px] p-6 text-center space-y-4 shadow-2xl animate-in zoom-in duration-150">
               <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500"><Trash2 size={24} /></div>
               <h3 className="text-[1rem] font-bold text-slate-900 uppercase">Xóa giao dịch này?</h3>
               <div className="flex gap-2">
                  <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 font-bold rounded-lg text-[0.75rem] uppercase">Hủy</button>
                  <button onClick={confirmDelete} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-lg text-[0.75rem] uppercase shadow-lg shadow-rose-100">Xóa</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Finance;
