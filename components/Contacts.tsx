
import React, { useState, useMemo } from 'react';
import { Search, Plus, Phone, Trash2, Edit, X, UserCheck, Truck, History, AlertTriangle, Eye, Calendar, DollarSign, CreditCard, Users, Save, RotateCcw } from 'lucide-react';
import { Contact, Order, Purchase } from '../types';

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  orders: Order[];
  purchases: Purchase[];
}

const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts, orders, purchases }) => {
  const [activeType, setActiveType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [historyContact, setHistoryContact] = useState<Contact | null>(null);

  // State cho việc điều chỉnh nợ trong lịch sử
  const [isAdjustingDebt, setIsAdjustingDebt] = useState(false);
  const [adjustDebtValue, setAdjustDebtValue] = useState(0);

  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '',
    phone: '',
    type: 'CUSTOMER',
    debt: 0
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) return;
    
    if (editingId) {
      setContacts(prev => prev.map(c => c.id === editingId ? { ...c, ...formData } as Contact : c));
    } else {
      const newContact: Contact = {
        ...formData as Contact,
        id: Date.now().toString()
      };
      setContacts(prev => [...prev, newContact]);
    }
    closeModal();
  };

  const handleUpdateDebt = () => {
    if (!historyContact) return;
    const newDebt = Math.max(0, adjustDebtValue);
    
    // Cập nhật state chung
    setContacts(prev => prev.map(c => c.id === historyContact.id ? { ...c, debt: newDebt } : c));
    
    // Cập nhật state hiển thị hiện tại
    setHistoryContact({ ...historyContact, debt: newDebt });
    setIsAdjustingDebt(false);
  };

  const openEditModal = (c: Contact) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      phone: c.phone,
      type: c.type,
      debt: c.debt
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (c: Contact) => {
    setContactToDelete(c);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (contactToDelete) {
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
    }
  };

  const openHistoryModal = (c: Contact) => {
    setHistoryContact(c);
    setAdjustDebtValue(c.debt); // Khởi tạo giá trị edit bằng nợ hiện tại
    setIsAdjustingDebt(false);
    setIsHistoryModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', phone: '', type: activeType, debt: 0 });
  };

  const filtered = contacts.filter(c => 
    c.type === activeType && 
    (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
  );

  const contactHistory = useMemo(() => {
    if (!historyContact) return [];
    if (historyContact.type === 'CUSTOMER') {
      return orders.filter(o => o.customerId === historyContact.id).slice().reverse();
    } else {
      return purchases.filter(p => p.supplierId === historyContact.id).slice().reverse();
    }
  }, [historyContact, orders, purchases]);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 no-print">
         <div className="flex bg-slate-200 p-1 rounded-xl shrink-0">
            <button onClick={() => setActiveType('CUSTOMER')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${activeType === 'CUSTOMER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
               <Users size={14} /> Khách hàng
            </button>
            <button onClick={() => setActiveType('SUPPLIER')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${activeType === 'SUPPLIER' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
               <Truck size={14} /> Nhà cung cấp
            </button>
         </div>
         <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder={`Tìm ${activeType === 'CUSTOMER' ? 'khách hàng' : 'nhà cung cấp'}...`} 
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-[0.85rem] focus:ring-2 focus:ring-indigo-100 outline-none bg-white font-medium" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
         </div>
         <button onClick={() => { setFormData({name: '', phone: '', type: activeType, debt: 0}); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-bold uppercase tracking-tight text-[10px] flex items-center gap-1.5 shadow-sm shadow-indigo-100 hover:bg-indigo-700 transition-all shrink-0">
            <Plus size={16} /> Thêm mới
         </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm no-print">
         <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-200 sticky top-0 z-10">
               <tr>
                  <th className="px-3 py-2 w-48">Tên đối tác</th>
                  <th className="px-3 py-2 w-28">Số điện thoại</th>
                  <th className="px-3 py-2 text-right">Dư nợ hiện tại</th>
                  <th className="px-3 py-2 w-24 text-right">Thao tác</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 group transition-colors">
                     <td className="px-3 py-2">
                        <div className="font-bold text-slate-700 text-[0.85rem] leading-tight truncate">{c.name}</div>
                        <div className="text-[8px] font-bold text-slate-300 uppercase mt-0.5">{c.type === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp'}</div>
                     </td>
                     <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[0.8rem]">
                           <Phone size={10} className="text-slate-300" /> {c.phone}
                        </div>
                     </td>
                     <td className={`px-3 py-2 text-right font-bold text-[0.85rem] ${c.debt > 0 ? (c.type === 'CUSTOMER' ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-300'}`}>
                        {c.debt.toLocaleString()} đ
                     </td>
                     <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => openHistoryModal(c)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors" title="Lịch sử"><History size={14} /></button>
                           <button onClick={() => openEditModal(c)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Sửa"><Edit size={14} /></button>
                           <button onClick={() => openDeleteModal(c)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Xóa"><Trash2 size={14} /></button>
                        </div>
                     </td>
                  </tr>
               ))}
               {filtered.length === 0 && (
                  <tr>
                     <td colSpan={4} className="px-4 py-16 text-center text-slate-300 italic text-[0.85rem]">Không tìm thấy dữ liệu đối tác.</td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      {/* Modal Thêm/Sửa */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in duration-200">
               <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-700 uppercase text-[0.8rem] tracking-tight">{editingId ? 'Cập nhật thông tin' : 'Thêm đối tác mới'}</h3>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
               </div>
               <form onSubmit={handleSave} className="p-5 space-y-4">
                  <div className="space-y-0.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Tên đối tác *</label>
                     <input required autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[0.9rem] font-bold focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Nhập tên..." />
                  </div>
                  <div className="space-y-0.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</label>
                     <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[0.9rem] font-medium focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="09xxxx..." />
                  </div>
                  <div className="space-y-0.5">
                     <label className="text-[10px] font-bold text-slate-400 uppercase">Phân loại</label>
                     <div className="flex gap-2">
                        <button type="button" onClick={() => setFormData({...formData, type: 'CUSTOMER'})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border ${formData.type === 'CUSTOMER' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}>Khách hàng</button>
                        <button type="button" onClick={() => setFormData({...formData, type: 'SUPPLIER'})} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border ${formData.type === 'SUPPLIER' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-slate-100 text-slate-400'}`}>Nhà cung cấp</button>
                     </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[0.8rem] tracking-wider shadow-lg active:scale-95 transition-all">Lưu thông tin</button>
               </form>
            </div>
         </div>
      )}

      {/* Modal Lịch sử & Chỉnh sửa Nợ */}
      {isHistoryModalOpen && historyContact && (
         <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
               <div className="px-4 py-3 border-b flex items-center justify-between bg-slate-50">
                  <div>
                     <h3 className="font-bold text-slate-800 text-[0.9rem] uppercase">{historyContact.name}</h3>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lịch sử giao dịch</p>
                  </div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 sticky top-0">
                        <tr>
                           <th className="px-4 py-2">Ngày</th>
                           <th className="px-4 py-2">Mã phiếu</th>
                           <th className="px-4 py-2 text-right">Tổng tiền</th>
                           <th className="px-4 py-2 text-right">Nợ</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {contactHistory.map((item: any) => (
                           <tr key={item.id} className="text-[0.8rem]">
                              <td className="px-4 py-2 text-slate-500 font-medium">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 font-mono font-bold text-indigo-600 text-[0.75rem]">{item.id}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-700">{item.total.toLocaleString()}</td>
                              <td className={`px-4 py-2 text-right font-bold ${item.debt > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.debt.toLocaleString()}</td>
                           </tr>
                        ))}
                        {contactHistory.length === 0 && (
                           <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic text-[0.8rem]">Chưa có giao dịch nào</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
               
               {/* Footer: Hiển thị và Chỉnh sửa Nợ */}
               <div className="p-3 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto bg-white border border-slate-200 rounded-xl p-2 px-3 shadow-sm">
                     {isAdjustingDebt ? (
                        <div className="flex items-center gap-2 animate-in fade-in duration-200 w-full">
                           <span className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap">Nợ mới:</span>
                           <input 
                              type="number" 
                              value={adjustDebtValue}
                              onChange={(e) => setAdjustDebtValue(Number(e.target.value))}
                              className="w-24 px-2 py-1 border border-slate-200 rounded text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                              autoFocus
                           />
                           <button onClick={handleUpdateDebt} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700" title="Lưu"><Save size={14}/></button>
                           <button onClick={() => setIsAdjustingDebt(false)} className="p-1 text-slate-400 hover:text-slate-600" title="Hủy"><X size={14}/></button>
                        </div>
                     ) : (
                        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Dư nợ hiện tại</span>
                              <span className={`text-[1.1rem] font-bold leading-none ${historyContact.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                 {historyContact.debt.toLocaleString()} đ
                              </span>
                           </div>
                           <button onClick={() => { setIsAdjustingDebt(true); setAdjustDebtValue(historyContact.debt); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors" title="Điều chỉnh nợ thủ công">
                              <Edit size={16} />
                           </button>
                        </div>
                     )}
                  </div>
                  <button onClick={() => setIsHistoryModalOpen(false)} className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold uppercase text-[9px] hover:bg-slate-100 shadow-sm transition-colors">Đóng</button>
               </div>
            </div>
         </div>
      )}

      {/* Modal Xóa */}
      {isDeleteModalOpen && contactToDelete && (
         <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-[280px] p-6 text-center space-y-4 shadow-2xl animate-in zoom-in duration-150">
               <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500"><Trash2 size={24} /></div>
               <h3 className="text-[1rem] font-bold text-slate-900 uppercase">Xóa đối tác này?</h3>
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

export default Contacts;
