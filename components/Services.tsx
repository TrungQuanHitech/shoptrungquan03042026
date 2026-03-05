
import React, { useState, useMemo } from 'react';
import { Wrench, Printer, Plus, Search, User, Calendar, Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, Settings as SettingsIcon, MoreHorizontal, PenTool, Hash, DollarSign, X, Save, Edit, Trash2, History } from 'lucide-react';
import { RepairTicket, RentalContract, Contact, Settings, RepairHistoryEvent, Transaction } from '../types';

interface ServicesProps {
  repairTickets: RepairTicket[];
  setRepairTickets: React.Dispatch<React.SetStateAction<RepairTicket[]>>;
  rentalContracts: RentalContract[];
  setRentalContracts: React.Dispatch<React.SetStateAction<RentalContract[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const Services: React.FC<ServicesProps> = ({
  repairTickets, setRepairTickets,
  rentalContracts, setRentalContracts,
  contacts, setContacts,
  transactions, setTransactions,
  settings, onNotify
}) => {
  const [activeTab, setActiveTab] = useState<'REPAIR' | 'RENTAL'>('REPAIR');
  const [searchTerm, setSearchTerm] = useState('');

  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [isTicketHistoryOpen, setIsTicketHistoryOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const [editingTicket, setEditingTicket] = useState<Partial<RepairTicket>>({});
  const [editingContract, setEditingContract] = useState<Partial<RentalContract>>({});
  const [counterData, setCounterData] = useState<{ contractId: string, newCounter: number }>({ contractId: '', newCounter: 0 });
  const [viewingHistoryTicket, setViewingHistoryTicket] = useState<RepairTicket | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'DELIVERED': return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-200';
      default: return 'bg-slate-50 text-slate-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'PENDING': 'Chờ tiếp nhận',
      'IN_PROGRESS': 'Đang sửa chữa',
      'COMPLETED': 'Đã hoàn thành',
      'DELIVERED': 'Đã trả khách',
      'CANCELLED': 'Đã hủy'
    };
    return map[status] || status;
  };

  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket.customerId || !editingTicket.deviceName) return;

    if (editingTicket.id) {
      setRepairTickets(prev => prev.map(t => {
        if (t.id === editingTicket.id) {
          const changes = [];
          if (editingTicket.status && editingTicket.status !== t.status) {
            changes.push(`Trạng thái: ${getStatusLabel(t.status)} -> ${getStatusLabel(editingTicket.status)}`);
          }
          if (editingTicket.estimatedCost !== undefined && editingTicket.estimatedCost !== t.estimatedCost) {
            changes.push(`Chi phí: ${t.estimatedCost.toLocaleString()} -> ${editingTicket.estimatedCost.toLocaleString()}`);
          }
          if (editingTicket.technicianNotes && editingTicket.technicianNotes !== t.technicianNotes) {
            changes.push(`Ghi chú KT: ${editingTicket.technicianNotes}`);
          }

          const newHistoryItem: RepairHistoryEvent = {
            date: new Date().toISOString(),
            action: 'Cập nhật',
            details: changes.length > 0 ? changes.join('; ') : 'Cập nhật thông tin chung'
          };

          const updatedHistory = t.history ? [...t.history, newHistoryItem] : [newHistoryItem];

          // AUTOMATION: Create transaction if status changes to COMPLETED
          if (editingTicket.status === 'COMPLETED' && t.status !== 'COMPLETED' && (editingTicket.estimatedCost || t.estimatedCost) > 0) {
            const amount = editingTicket.estimatedCost ?? t.estimatedCost;
            const newTx: any = {
              id: `TX-${Date.now()}`,
              date: new Date().toISOString(),
              type: 'IN',
              amount: amount,
              description: `Thu tiền sửa chữa ${t.id} - ${t.deviceName}`,
              category: 'Dịch vụ',
              relatedId: t.id
            };
            setTransactions(prev => [newTx, ...prev]);

            if (onNotify && settings.notifyOnFinance) {
              onNotify(`💰 <b>THU TIỀN DỊCH VỤ</b>\n━━━━━━━━━━━━━\n🆔 <b>Phiếu:</b> ${t.id}\n🔧 <b>Thiết bị:</b> ${t.deviceName}\n💵 <b>Số tiền: ${amount.toLocaleString()}đ</b>\n✅ Trạng thái: Đã thu tiền & Nhập sổ`);
            }
          }

          return { ...t, ...editingTicket, history: updatedHistory } as RepairTicket;
        }
        return t;
      }));
    } else {
      const newTicket: RepairTicket = {
        ...editingTicket as RepairTicket,
        id: `SC-${Date.now()}`,
        date: new Date().toISOString(),
        status: 'PENDING',
        estimatedCost: editingTicket.estimatedCost || 0,
        history: [{
          date: new Date().toISOString(),
          action: 'Tạo mới',
          details: `Tiếp nhận: ${editingTicket.issueDescription}`
        }]
      };
      setRepairTickets(prev => [newTicket, ...prev]);
      if (onNotify && settings.notifyOnSale) {
        const customer = contacts.find(c => c.id === newTicket.customerId)?.name;
        onNotify(`🛠️ <b>TIẾP NHẬN SỬA CHỮA MỚI</b>\n━━━━━━━━━━━━━\n🆔 <b>Phiếu:</b> ${newTicket.id}\n👤 <b>Khách:</b> ${customer}\n💻 <b>Thiết bị:</b> ${newTicket.deviceName}\n⚠️ <b>Lỗi:</b> ${newTicket.issueDescription}`);
      }
    }
    setIsRepairModalOpen(false);
    setEditingTicket({});
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract.customerId || !editingContract.machineName) return;

    if (editingContract.id) {
      setRentalContracts(prev => prev.map(c => c.id === editingContract.id ? { ...c, ...editingContract } as RentalContract : c));
    } else {
      const newContract: RentalContract = {
        ...editingContract as RentalContract,
        id: `HD-${Date.now()}`,
        startDate: new Date().toISOString(),
        currentCounter: editingContract.currentCounter || 0,
        rentalPrice: editingContract.rentalPrice || 0,
        freeCopiesLimit: editingContract.freeCopiesLimit || 0,
        pricePerPage: editingContract.pricePerPage || 0
      };
      setRentalContracts(prev => [newContract, ...prev]);
    }
    setIsRentalModalOpen(false);
    setEditingContract({});
  };

  const calculateBill = () => {
    const contract = rentalContracts.find(c => c.id === counterData.contractId);
    if (!contract) return null;

    const diff = Math.max(0, counterData.newCounter - contract.currentCounter);
    const excess = Math.max(0, diff - (contract.freeCopiesLimit || 0));
    const excessCost = excess * contract.pricePerPage;
    const total = contract.rentalPrice + excessCost;

    return { diff, excess, excessCost, total, contract };
  };

  const handleUpdateCounter = () => {
    const bill = calculateBill();
    if (!bill) return;
    if (counterData.newCounter < bill.contract.currentCounter) {
      alert("Số counter mới không thể nhỏ hơn số cũ!");
      return;
    }

    if (!window.confirm(`XÁC NHẬN CHỐT SỔ?\n\n- Sử dụng: ${bill.diff} bản\n- Vượt mức: ${bill.excess} bản\n- Tổng tiền: ${bill.total.toLocaleString()} đ\n\nHệ thống sẽ tự động cộng khoản này vào công nợ khách hàng.`)) {
      return;
    }

    setRentalContracts(prev => prev.map(c => c.id === bill.contract.id ? { ...c, currentCounter: counterData.newCounter, lastBillDate: new Date().toISOString() } : c));
    setContacts(prev => prev.map(c => c.id === bill.contract.customerId ? { ...c, debt: c.debt + bill.total } : c));

    if (onNotify) {
      const customer = contacts.find(c => c.id === bill.contract.customerId)?.name;
      const msg = `🖨️ <b>CHỐT SỔ MÁY PHOTOCOPY</b>\n━━━━━━━━━━━━━\n👤 <b>Khách:</b> ${customer}\n🖨️ <b>Máy:</b> ${bill.contract.machineName}\n🔢 <b>Số cũ:</b> ${bill.contract.currentCounter}\n🔢 <b>Số mới:</b> ${counterData.newCounter}\n📈 <b>Sử dụng:</b> ${bill.diff} bản\n🚫 <b>Vượt mức:</b> ${bill.excess} bản\n━━━━━━━━━━━━━\n💰 <b>Thành tiền: ${bill.total.toLocaleString()}đ</b>\n<i>(Đã ghi nhận công nợ)</i>`;
      onNotify(msg);
    }

    setIsCounterModalOpen(false);
  };

  const handleDeleteTicket = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phiếu này?")) {
      setRepairTickets(prev => prev.filter(t => t.id !== id));
    }
  }

  const handleDeleteContract = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này?")) {
      setRentalContracts(prev => prev.filter(c => c.id !== id));
    }
  }

  const filteredTickets = repairTickets.filter(t => t.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm));
  const filteredContracts = rentalContracts.filter(c => c.machineName.toLowerCase().includes(searchTerm.toLowerCase()) || contacts.find(con => con.id === c.customerId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const currentBill = calculateBill();

  const reportStats = useMemo(() => {
    if (activeTab === 'REPAIR') {
      const total = filteredTickets.length;
      const revenue = filteredTickets.reduce((sum, t) => sum + (t.status === 'COMPLETED' || t.status === 'DELIVERED' ? t.estimatedCost : 0), 0);
      const potential = filteredTickets.reduce((sum, t) => sum + t.estimatedCost, 0);
      const pending = filteredTickets.filter(t => t.status === 'PENDING').length;
      const processing = filteredTickets.filter(t => t.status === 'IN_PROGRESS').length;
      const done = filteredTickets.filter(t => t.status === 'COMPLETED' || t.status === 'DELIVERED').length;
      return { type: 'REPAIR', total, revenue, potential, pending, processing, done };
    } else {
      const total = filteredContracts.length;
      const revenue = filteredContracts.reduce((sum, c) => sum + c.rentalPrice, 0);
      return { type: 'RENTAL', total, revenue };
    }
  }, [filteredTickets, filteredContracts, activeTab]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex gap-2 no-print">
        <button
          onClick={() => setActiveTab('REPAIR')}
          className={`flex-1 py-3 rounded-xl font-bold uppercase text-[0.85rem] flex items-center justify-center gap-2 transition-all ${activeTab === 'REPAIR' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Wrench size={18} /> Dịch vụ Sửa chữa
        </button>
        <button
          onClick={() => setActiveTab('RENTAL')}
          className={`flex-1 py-3 rounded-xl font-bold uppercase text-[0.85rem] flex items-center justify-center gap-2 transition-all ${activeTab === 'RENTAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Printer size={18} /> Cho thuê Máy Photo
        </button>
      </div>

      <div className="flex items-center gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'REPAIR' ? "Tìm phiếu sửa, tên máy..." : "Tìm hợp đồng, máy photo..."}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium text-[0.9rem]"
          />
        </div>
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-[0.8rem] flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-all"
        >
          <FileText size={18} className="text-orange-500" /> Báo cáo
        </button>
        <button
          onClick={() => activeTab === 'REPAIR' ? setIsRepairModalOpen(true) : setIsRentalModalOpen(true)}
          className={`px-4 py-2.5 rounded-xl text-white font-bold uppercase text-[0.8rem] flex items-center gap-2 shadow-md active:scale-95 transition-all ${activeTab === 'REPAIR' ? 'bg-indigo-600' : 'bg-blue-600'}`}
        >
          <Plus size={18} /> {activeTab === 'REPAIR' ? 'Tiếp nhận máy' : 'Tạo hợp đồng'}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm no-print">
        {activeTab === 'REPAIR' ? (
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-32">Mã phiếu</th>
                <th className="px-4 py-3 w-48">Thiết bị</th>
                <th className="px-4 py-3 w-40">Khách hàng</th>
                <th className="px-4 py-3">Mô tả lỗi</th>
                <th className="px-4 py-3 w-32">Ngày nhận</th>
                <th className="px-4 py-3 w-32 text-right">Chi phí</th>
                <th className="px-4 py-3 w-36 text-center">Trạng thái</th>
                <th className="px-4 py-3 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-indigo-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[0.8rem] font-bold text-indigo-600">{ticket.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-700 text-[0.9rem] leading-tight line-clamp-2">{ticket.deviceName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[0.85rem] font-medium text-slate-600 truncate">
                      {contacts.find(c => c.id === ticket.customerId)?.name || 'Vãng lai'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[0.85rem] text-slate-500 italic truncate" title={ticket.issueDescription}>
                      {ticket.issueDescription}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[0.8rem] text-slate-500">{new Date(ticket.date).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-[0.9rem] font-bold text-indigo-600">{ticket.estimatedCost.toLocaleString()} đ</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getStatusColor(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setViewingHistoryTicket(ticket); setIsTicketHistoryOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Lịch sử"><History size={16} /></button>
                      <button onClick={() => { setEditingTicket(ticket); setIsRepairModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteTicket(ticket.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-20 text-center text-slate-400 italic">Chưa có dữ liệu phiếu sửa chữa.</td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 w-32">Mã HĐ</th>
                <th className="px-4 py-3 w-48">Tên máy & Model</th>
                <th className="px-4 py-3 w-40">Khách hàng</th>
                <th className="px-4 py-3 w-32 text-right">Giá thuê</th>
                <th className="px-4 py-3 w-40 text-right">Counter hiện tại</th>
                <th className="px-4 py-3 w-28 text-right">Free / Vượt</th>
                <th className="px-4 py-3 w-28 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredContracts.map(contract => (
                <tr key={contract.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <span className="font-mono text-[0.8rem] font-bold text-blue-600">{contract.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-700 text-[0.9rem] leading-tight">{contract.machineName}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{contract.model}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[0.85rem] font-medium text-slate-600 truncate">
                      {contacts.find(c => c.id === contract.customerId)?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-[0.9rem] font-bold text-blue-600">{contract.rentalPrice.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-400">/tháng</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono font-bold text-[1rem] text-slate-800">{contract.currentCounter.toLocaleString()}</span>
                      <button
                        onClick={() => { setCounterData({ contractId: contract.id, newCounter: contract.currentCounter }); setIsCounterModalOpen(true); }}
                        className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded transition-colors"
                        title="Cập nhật Counter"
                      >
                        <Hash size={14} />
                      </button>
                    </div>
                    {contract.lastBillDate && <div className="text-[9px] text-slate-400 italic mt-0.5">Cập nhật: {new Date(contract.lastBillDate).toLocaleDateString('vi-VN')}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-[0.9rem] font-medium text-slate-600">{contract.freeCopiesLimit?.toLocaleString() || 0}</div>
                    <div className="text-[9px] text-rose-500 font-bold">+{contract.pricePerPage}đ</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingContract(contract); setIsRentalModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteContract(contract.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-slate-400 italic">Chưa có hợp đồng thuê máy.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <FileText className="text-orange-500" size={24} />
                <div>
                  <h3 className="font-bold text-slate-800 uppercase text-sm">Báo cáo tổng hợp</h3>
                  <p className="text-[10px] text-slate-500 font-bold">
                    {activeTab === 'REPAIR' ? 'Dịch vụ sửa chữa' : 'Hợp đồng cho thuê'} • {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsReportModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng số lượng</p>
                  <p className="text-2xl font-black text-slate-800">{reportStats.total}</p>
                </div>
                {activeTab === 'REPAIR' ? (
                  <>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doanh thu hoàn thành</p>
                      <p className="text-2xl font-black text-emerald-600">{reportStats.revenue?.toLocaleString()} đ</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiềm năng (Đang xử lý)</p>
                      <p className="text-2xl font-black text-indigo-600">{((reportStats.potential || 0) - (reportStats.revenue || 0)).toLocaleString()} đ</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doanh thu cố định (Tháng)</p>
                    <p className="text-2xl font-black text-blue-600">{reportStats.revenue?.toLocaleString()} đ</p>
                  </div>
                )}
              </div>

              {activeTab === 'REPAIR' && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-100 p-3 rounded-lg text-center">
                    <span className="block text-xl font-bold text-slate-600">{reportStats.pending}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Chờ tiếp nhận</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <span className="block text-xl font-bold text-blue-600">{reportStats.processing}</span>
                    <span className="text-[10px] font-bold uppercase text-blue-400">Đang xử lý</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg text-center">
                    <span className="block text-xl font-bold text-emerald-600">{reportStats.done}</span>
                    <span className="text-[10px] font-bold uppercase text-emerald-400">Hoàn thành</span>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[0.85rem]">
                  <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="px-4 py-2">Mã</th>
                      <th className="px-4 py-2">Khách hàng</th>
                      <th className="px-4 py-2">{activeTab === 'REPAIR' ? 'Thiết bị' : 'Máy'}</th>
                      <th className="px-4 py-2 text-right">Giá trị</th>
                      <th className="px-4 py-2 text-center">Trạng thái / Counter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeTab === 'REPAIR' ? filteredTickets.map(t => (
                      <tr key={t.id}>
                        <td className="px-4 py-2 font-mono font-bold text-indigo-600 text-[10px]">{t.id}</td>
                        <td className="px-4 py-2">{contacts.find(c => c.id === t.customerId)?.name}</td>
                        <td className="px-4 py-2">{t.deviceName}</td>
                        <td className="px-4 py-2 text-right font-bold">{t.estimatedCost.toLocaleString()}</td>
                        <td className="px-4 py-2 text-center text-[10px] uppercase font-bold text-slate-500">{getStatusLabel(t.status)}</td>
                      </tr>
                    )) : filteredContracts.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-mono font-bold text-blue-600 text-[10px]">{c.id}</td>
                        <td className="px-4 py-2">{contacts.find(con => con.id === c.customerId)?.name}</td>
                        <td className="px-4 py-2">{c.machineName}</td>
                        <td className="px-4 py-2 text-right font-bold">{c.rentalPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-center font-mono">{c.currentCounter.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsReportModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold uppercase text-[0.8rem] hover:bg-slate-200 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {isRepairModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 uppercase text-sm">Phiếu Sửa Chữa</h3>
              <button onClick={() => setIsRepairModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveTicket} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Khách hàng</label>
                <select required value={editingTicket.customerId || ''} onChange={e => setEditingTicket({ ...editingTicket, customerId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-sm outline-none">
                  <option value="">-- Chọn khách hàng --</option>
                  {contacts.filter(c => c.type === 'CUSTOMER').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tên thiết bị & Model</label>
                <input required value={editingTicket.deviceName || ''} onChange={e => setEditingTicket({ ...editingTicket, deviceName: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none" placeholder="VD: Laptop Dell XPS 13..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mô tả lỗi</label>
                <textarea required value={editingTicket.issueDescription || ''} onChange={e => setEditingTicket({ ...editingTicket, issueDescription: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none min-h-[80px]" placeholder="VD: Không lên nguồn, màn hình xanh..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Trạng thái</label>
                  <select value={editingTicket.status || 'PENDING'} onChange={e => setEditingTicket({ ...editingTicket, status: e.target.value as any })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none">
                    <option value="PENDING">Chờ tiếp nhận</option>
                    <option value="IN_PROGRESS">Đang sửa</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="DELIVERED">Đã trả khách</option>
                    <option value="CANCELLED">Hủy bỏ</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Chi phí dự kiến</label>
                  <input type="number" value={editingTicket.estimatedCost || 0} onChange={e => setEditingTicket({ ...editingTicket, estimatedCost: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none text-right" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-colors">Lưu phiếu sửa chữa</button>
            </form>
          </div>
        </div>
      )}

      {isTicketHistoryOpen && viewingHistoryTicket && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-800 uppercase text-sm">Lịch sử phiếu sửa chữa</h3>
                <p className="text-[10px] text-indigo-600 font-mono font-bold">{viewingHistoryTicket.id}</p>
              </div>
              <button onClick={() => setIsTicketHistoryOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {viewingHistoryTicket.history && viewingHistoryTicket.history.length > 0 ? (
                viewingHistoryTicket.history.slice().reverse().map((event, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5"></div>
                      <div className="w-0.5 flex-1 bg-slate-100 my-1"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-[10px] font-bold text-slate-400">{new Date(event.date).toLocaleString('vi-VN')}</p>
                      <p className="text-[0.85rem] font-bold text-slate-700">{event.action}</p>
                      <p className="text-[0.8rem] text-slate-500 mt-0.5">{event.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-[0.85rem]">Chưa có lịch sử ghi nhận.</div>
              )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setIsTicketHistoryOpen(false)} className="w-full py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase shadow-sm hover:bg-slate-50">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {isRentalModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 uppercase text-sm">Hợp Đồng Thuê Máy</h3>
              <button onClick={() => setIsRentalModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveContract} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Khách hàng</label>
                <select required value={editingContract.customerId || ''} onChange={e => setEditingContract({ ...editingContract, customerId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl font-medium text-sm outline-none">
                  <option value="">-- Chọn khách hàng --</option>
                  {contacts.filter(c => c.type === 'CUSTOMER').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên máy</label>
                  <input required value={editingContract.machineName || ''} onChange={e => setEditingContract({ ...editingContract, machineName: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none" placeholder="Ricoh IM 5000..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Model</label>
                  <input required value={editingContract.model || ''} onChange={e => setEditingContract({ ...editingContract, model: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none" placeholder="2023 Series" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Giá thuê cứng / tháng</label>
                  <input type="number" required value={editingContract.rentalPrice || 0} onChange={e => setEditingContract({ ...editingContract, rentalPrice: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none text-blue-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Định mức miễn phí</label>
                  <input type="number" value={editingContract.freeCopiesLimit || 0} onChange={e => setEditingContract({ ...editingContract, freeCopiesLimit: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none text-emerald-600" placeholder="VD: 3000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Giá vượt mức (đ/trang)</label>
                  <input type="number" value={editingContract.pricePerPage || 0} onChange={e => setEditingContract({ ...editingContract, pricePerPage: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-sm outline-none text-rose-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Counter khởi điểm</label>
                  <input type="number" required value={editingContract.currentCounter || 0} onChange={e => setEditingContract({ ...editingContract, currentCounter: Number(e.target.value) })} className="w-full p-2.5 border border-slate-200 rounded-xl font-mono font-bold text-lg outline-none bg-slate-50" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-colors">Lưu hợp đồng</button>
            </form>
          </div>
        </div>
      )}

      {isCounterModalOpen && currentBill && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-200 overflow-hidden">
            <div className="bg-blue-600 p-4 text-center text-white">
              <h3 className="font-bold uppercase text-sm">Chốt sổ Counter</h3>
              <p className="text-[10px] opacity-80">{currentBill.contract.machineName}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1 text-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nhập Counter Mới</label>
                <input
                  type="number"
                  autoFocus
                  value={counterData.newCounter}
                  onChange={e => setCounterData({ ...counterData, newCounter: Number(e.target.value) })}
                  className="w-full p-3 border-2 border-blue-100 rounded-xl font-mono text-3xl font-bold text-center outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100 text-[0.85rem]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Số cũ:</span>
                  <span className="font-mono font-bold">{currentBill.contract.currentCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sử dụng:</span>
                  <span className="font-mono font-bold text-blue-600">{currentBill.diff} bản</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Miễn phí:</span>
                  <span className="font-mono font-bold text-emerald-600">{currentBill.contract.freeCopiesLimit}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Vượt mức:</span>
                  <span className="font-mono font-bold text-rose-500">{currentBill.excess} bản</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-slate-700">Tổng tiền:</span>
                  <span className="font-bold text-lg text-indigo-700">{currentBill.total.toLocaleString()} đ</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setIsCounterModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl uppercase text-xs">Hủy</button>
                <button onClick={handleUpdateCounter} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl uppercase text-xs shadow-lg shadow-blue-200">
                  Ghi nhận doanh thu
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 italic">Số tiền sẽ được tự động cộng vào nợ khách hàng.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Services;
