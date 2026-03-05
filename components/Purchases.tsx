
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Trash2, Truck, X, History, Eye, Minus, Package, PlusCircle, ListPlus, Edit, Percent, AlertTriangle } from 'lucide-react';
import { Product, Purchase, Contact, Transaction, Settings } from '../types';

interface PurchasesProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ products, setProducts, purchases, setPurchases, contacts, setContacts, transactions, setTransactions, settings, onNotify }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<{ product: Product, quantity: number, cost: number }[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [currentTaxRate, setCurrentTaxRate] = useState<number>(settings.taxRate);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);

  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickQty, setQuickQty] = useState(1);
  const [quickCost, setQuickCost] = useState(0);

  useEffect(() => {
    if (!isEditMode) {
      setCurrentTaxRate(settings.taxRate);
    }
  }, [settings.taxRate, isEditMode]);

  const suppliers = useMemo(() => contacts.filter(c => c.type === 'SUPPLIER'), [contacts]);
  const filteredProducts = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ), [products, searchTerm]);

  const addItem = (product: Product) => {
    setPurchaseItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, cost: product.cost }];
    });
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName) return;
    const newProduct: Product = {
      id: 'p-' + Date.now(),
      name: quickName,
      sku: 'NK-' + Math.floor(Math.random() * 1000),
      stock: 0, cost: quickCost, price: quickCost * 1.2,
      imageUrl: `https://picsum.photos/seed/${Date.now()}/200/200`
    };
    setProducts(prev => [newProduct, ...prev]);
    setPurchaseItems(prev => [...prev, { product: newProduct, quantity: quickQty, cost: quickCost }]);
    setIsQuickModalOpen(false);
    setQuickName('');
    setQuickQty(1);
    setQuickCost(0);
  };

  const updateItem = (id: string, field: 'quantity' | 'cost', value: number) => {
    setPurchaseItems(prev => prev.map(i => i.product.id === id ? { ...i, [field]: value } : i));
  };

  const removeFromCart = (id: string) => {
    setPurchaseItems(prev => prev.filter(i => i.product.id !== id));
  };

  const subtotalCost = useMemo(() => purchaseItems.reduce((sum, i) => sum + i.cost * i.quantity, 0), [purchaseItems]);
  const taxAmount = useMemo(() => Math.round(subtotalCost * (currentTaxRate / 100)), [subtotalCost, currentTaxRate]);
  const totalCost = useMemo(() => subtotalCost + taxAmount, [subtotalCost, taxAmount]);

  useEffect(() => {
    setPaidAmount(totalCost);
  }, [totalCost]);

  const generatePurchaseID = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const datePart = `${d}${m}${y}`;
    const prefixStr = `NH-${datePart}`;

    const todayPurchases = purchases.filter(p => p.id && p.id.startsWith(prefixStr));
    let nextNum = 1;

    if (todayPurchases.length > 0) {
      const suffixes = todayPurchases.map(p => {
        const numPart = p.id.slice(prefixStr.length);
        const parsed = parseInt(numPart);
        return isNaN(parsed) ? 0 : parsed;
      });
      nextNum = Math.max(...suffixes, 0) + 1;
    }

    return `${prefixStr}${String(nextNum).padStart(3, '0')}`;
  };

  const handleSave = () => {
    if (!selectedSupplierId) {
      alert('Vui lòng chọn Nhà cung cấp!');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Vui lòng thêm sản phẩm vào phiếu nhập!');
      return;
    }

    // --- REVERT PHASE (only if editing) ---
    if (isEditMode && editingPurchaseId) {
      const originalPurchase = purchases.find(p => p.id === editingPurchaseId);
      if (originalPurchase) {
        // 1. Revert stock
        setProducts(prev => prev.map(p => {
          const itemInOld = originalPurchase.items.find(i => i.productId === p.id);
          return itemInOld ? { ...p, stock: Math.max(0, p.stock - itemInOld.quantity) } : p;
        }));
        // 2. Revert debt
        if (originalPurchase.debt > 0 && originalPurchase.supplierId) {
          setContacts(prev => prev.map(c =>
            c.id === originalPurchase.supplierId ? { ...c, debt: Math.max(0, c.debt - originalPurchase.debt) } : c
          ));
        }
        // 3. Revert transactions
        setTransactions(prev => prev.filter(t => t.relatedId !== editingPurchaseId));
      }
    }

    // --- APPLY PHASE (for new and edited) ---
    const purchaseId = isEditMode && editingPurchaseId ? editingPurchaseId : generatePurchaseID();
    const newPurchase: Purchase = {
      id: purchaseId,
      date: new Date().toISOString(),
      items: purchaseItems.map(i => ({ productId: i.product.id, quantity: i.quantity, cost: i.cost, price: i.product.price })),
      total: totalCost,
      taxRate: currentTaxRate,
      taxAmount: taxAmount,
      paid: paidAmount,
      debt: Math.max(0, totalCost - paidAmount),
      supplierId: selectedSupplierId
    };

    // 1. Apply new stock addition & update cost
    setProducts(prev => prev.map(p => {
      const item = newPurchase.items.find(i => i.productId === p.id);
      return item ? { ...p, stock: p.stock + item.quantity, cost: item.cost } : p;
    }));

    // 2. Apply new transaction for payment
    if (newPurchase.paid > 0) {
      setTransactions(prev => [{
        id: `TX-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'OUT',
        amount: newPurchase.paid,
        description: `Trả tiền nhập hàng ${purchaseId}`,
        category: 'Nhập hàng',
        relatedId: purchaseId
      }, ...prev]);
    }

    // 3. Apply new debt
    if (newPurchase.debt > 0 && newPurchase.supplierId) {
      setContacts(prev => prev.map(c =>
        c.id === newPurchase.supplierId ? { ...c, debt: (c.debt || 0) + newPurchase.debt } : c
      ));
    }

    // 4. Save purchase (add new or replace existing)
    setPurchases(prev => {
      const existing = prev.find(p => p.id === purchaseId);
      if (existing) {
        return prev.map(p => p.id === purchaseId ? newPurchase : p);
      }
      return [newPurchase, ...prev];
    });

    // --- FINALIZATION ---
    if (settings.notifyOnPurchase && onNotify) {
      const supplier = contacts.find(c => c.id === selectedSupplierId)?.name || 'N/A';
      const itemsList = purchaseItems.map(i => `• ${i.product.name} x<b>${i.quantity}</b>`).join('\n');
      const action = isEditMode ? 'CẬP NHẬT PHIẾU NHẬP' : 'NHẬP HÀNG MỚI';
      const text = `🚚 <b>${action}: ${purchaseId}</b>\n━━━━━━━━━━━━━\n🏢 <b>NCC:</b> ${supplier}\n📦 <b>Hàng hóa:</b>\n${itemsList}\n━━━━━━━━━━━━━\n💰 <b>Tổng chi: ${totalCost.toLocaleString()}đ</b>\n✅ <b>Đã trả:</b> ${paidAmount.toLocaleString()}đ\n⚠️ <b>Nợ NCC:</b> ${newPurchase.debt.toLocaleString()}đ`;
      onNotify(text);
    }

    // Reset UI state
    setPurchaseItems([]);
    setSelectedSupplierId('');
    setIsEditMode(false);
    setEditingPurchaseId(null);
    alert('Đã lập phiếu nhập kho thành công!');
  };


  const startEditPurchase = (purchase: Purchase) => {
    setIsEditMode(true);
    setEditingPurchaseId(purchase.id);
    setSelectedSupplierId(purchase.supplierId);
    setCurrentTaxRate(purchase.taxRate || 0);
    setPaidAmount(purchase.paid);

    const restoredItems = purchase.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? { product, quantity: item.quantity, cost: item.cost } : null;
    }).filter(i => i !== null) as { product: Product, quantity: number, cost: number }[];

    setPurchaseItems(restoredItems);
    setShowHistory(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-2 border-b border-slate-100 flex gap-2 bg-slate-50/50 no-print">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Tìm sản phẩm nhập kho..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-[0.85rem] bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setIsQuickModalOpen(true)} className="bg-indigo-600 text-white p-1.5 rounded-lg flex items-center gap-1.5 px-3 transition-colors shadow-sm">
            <ListPlus size={16} />
            <span className="text-[9px] font-bold uppercase tracking-tight">Tạo nhanh</span>
          </button>
          <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 px-3 shadow-sm transition-colors">
            <History size={16} className="text-orange-500" />
            <span className="text-[9px] font-bold uppercase tracking-tight hidden sm:inline">Lịch sử</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 w-12 text-center">Ảnh</th>
                <th className="px-3 py-2">Sản phẩm & SKU</th>
                <th className="px-3 py-2 w-20 text-right">Tồn</th>
                <th className="px-3 py-2 w-24 text-right">Giá vốn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} onClick={() => addItem(p)} className="cursor-pointer hover:bg-orange-50 transition-colors group">
                  <td className="px-3 py-1.5 text-center">
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover rounded border border-slate-100 mx-auto" />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="font-bold text-slate-700 leading-tight truncate group-hover:text-orange-600 transition-colors text-[0.85rem]">{p.name}</div>
                    <div className="text-[8px] text-slate-400 font-mono uppercase font-bold">{p.sku}</div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-slate-500 font-bold text-[0.85rem]">{p.stock}</td>
                  <td className="px-3 py-1.5 text-right font-bold text-orange-600 text-[0.85rem]">{p.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg shrink-0 ${isEditMode ? 'ring-2 ring-emerald-500' : ''}`}>
        <div className={`p-2.5 text-white flex items-center justify-between ${isEditMode ? 'bg-emerald-600' : 'bg-orange-600'}`}>
          <div className="flex items-center gap-2">
            <Package size={16} />
            <span className="font-bold uppercase tracking-tight text-[11px]">
              {isEditMode ? `Đang sửa: ${editingPurchaseId}` : `Phiếu nhập (${purchaseItems.length})`}
            </span>
          </div>
          <button onClick={() => { setPurchaseItems([]); setIsEditMode(false); }} title="Làm mới" className="p-1 hover:bg-black/10 rounded transition-colors"><Trash2 size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/10">
          <table className="w-full text-left divide-y divide-slate-100">
            <tbody>
              {purchaseItems.map(item => (
                <tr key={item.product.id} className="bg-white">
                  <td className="px-3 py-2">
                    <div className="font-bold text-slate-700 line-clamp-1 text-[0.85rem] leading-tight">{item.product.name}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button onClick={() => updateItem(item.product.id, 'quantity', Math.max(1, item.quantity - 1))} className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 text-[0.8rem]">-</button>
                      <span className="font-bold w-6 text-center text-[0.8rem]">{item.quantity}</span>
                      <button onClick={() => updateItem(item.product.id, 'quantity', item.quantity + 1)} className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 text-[0.8rem]">+</button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <span className="text-[8px] text-slate-400 uppercase font-bold">Giá nhập:</span>
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => updateItem(item.product.id, 'cost', Number(e.target.value))}
                        className="w-20 text-right text-orange-600 font-bold text-[0.8rem] border-b border-transparent hover:border-slate-200 outline-none focus:border-orange-300 bg-transparent"
                      />
                    </div>
                    <div className="font-bold text-slate-900 text-[0.85rem]">{(item.cost * item.quantity).toLocaleString()} đ</div>
                  </td>
                  <td className="px-1 py-2">
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {purchaseItems.length === 0 && <div className="p-8 text-center text-slate-300 italic text-xs">Hãy chọn hàng từ bảng trái</div>}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase tracking-tight">
              <span>Tiền hàng</span>
              <span className="text-slate-700">{subtotalCost.toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase tracking-tight items-center">
              <span>Thuế ({currentTaxRate}%)</span>
              <span className="text-rose-500 font-bold">{taxAmount.toLocaleString()} đ</span>
            </div>
            <div className="flex justify-between text-slate-900 text-[0.85rem] font-bold uppercase pt-1 border-t border-slate-100 mt-1">
              <span>Tổng chi</span>
              <span className="text-orange-600 text-[1.1rem] leading-none">{totalCost.toLocaleString()} đ</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Nhà cung cấp</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg font-bold text-[0.85rem] bg-white focus:ring-2 focus:ring-orange-200 outline-none"
            >
              <option value="">-- Chọn Nhà cung cấp --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Số tiền đã trả</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl font-bold text-emerald-600 text-[1.2rem] outline-none focus:border-emerald-400 bg-white"
            />
          </div>

          <button
            disabled={purchaseItems.length === 0}
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 text-[0.8rem] shadow-lg active:scale-95 transition-all ${purchaseItems.length === 0 ? 'bg-slate-300' : 'bg-orange-600'}`}
          >
            <PlusCircle size={16} /> {isEditMode ? 'Cập nhật phiếu' : 'Hoàn tất nhập hàng'}
          </button>
        </div>
      </div>

      {isQuickModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 animate-in zoom-in duration-200">
            <h3 className="font-bold text-slate-700 uppercase mb-4 text-[0.85rem]">Tạo nhanh sản phẩm</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tên sản phẩm</label>
                <input autoFocus value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="VD: Màn hình Dell..." className="w-full p-2.5 border border-slate-200 rounded-xl text-[0.9rem] font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Số lượng</label>
                  <input type="number" value={quickQty} onChange={e => setQuickQty(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-[0.9rem] font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Giá vốn</label>
                  <input type="number" value={quickCost} onChange={e => setQuickCost(Number(e.target.value))} className="w-full p-2.5 border border-slate-200 rounded-xl text-[0.9rem] font-bold text-orange-600" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsQuickModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 text-slate-400 rounded-xl font-bold text-[0.8rem] uppercase">Hủy</button>
                <button onClick={handleQuickAdd} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-[0.8rem] uppercase shadow-md active:scale-95 transition-all">Thêm ngay</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-3 backdrop-blur-sm animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 uppercase text-[0.85rem] tracking-tight">Lịch sử phiếu nhập</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-2">Mã phiếu</th>
                    <th className="px-4 py-2">Ngày</th>
                    <th className="px-4 py-2">Nhà cung cấp</th>
                    <th className="px-4 py-2 text-right">Tổng chi</th>
                    <th className="px-4 py-2 text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors text-[0.85rem]">
                      <td className="px-4 py-2 font-mono font-bold text-orange-600 text-[0.8rem]">{p.id}</td>
                      <td className="px-4 py-2 text-slate-400 text-[0.8rem]">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-bold text-slate-700">{contacts.find(c => c.id === p.supplierId)?.name || 'N/A'}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{p.total.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center flex justify-center gap-1">
                        <button onClick={() => setViewingPurchase(p)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Xem"><Eye size={16} /></button>
                        <button onClick={() => startEditPurchase(p)} className="p-1.5 text-slate-400 hover:text-orange-600" title="Sửa"><Edit size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewingPurchase && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm no-print">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
              <div className="px-4 py-3 border-b flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-700 uppercase text-[0.9rem]">Phiếu nhập: {viewingPurchase.id}</h3>
                <button onClick={() => setViewingPurchase(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <table className="w-full text-[0.85rem] text-left border-collapse">
                  <thead className="bg-slate-50 text-[9px] font-bold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-2">Sản phẩm</th>
                      <th className="py-2 text-center">SL</th>
                      <th className="py-2 text-right">Giá nhập</th>
                      <th className="py-2 text-right">T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {viewingPurchase.items.map((item, idx) => {
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <tr key={idx}>
                          <td className="py-2 font-medium text-slate-700">{prod?.name || 'SP đã xóa'}</td>
                          <td className="py-2 text-center font-bold text-slate-500">{item.quantity}</td>
                          <td className="py-2 text-right text-slate-500">{item.cost.toLocaleString()}</td>
                          <td className="py-2 text-right font-bold text-slate-800">{(item.cost * item.quantity).toLocaleString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="border-t border-slate-100 pt-3 space-y-1 text-[0.85rem]">
                  <div className="flex justify-between font-bold text-orange-600 text-lg"><span>Tổng cộng:</span><span>{viewingPurchase.total.toLocaleString()} đ</span></div>
                  <div className="flex justify-between"><span>Đã trả:</span><span className="font-bold text-emerald-600">{viewingPurchase.paid.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Nợ NCC:</span><span className="font-bold text-rose-600">{viewingPurchase.debt.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="p-3 border-t bg-slate-50 flex gap-2">
                <button onClick={() => setViewingPurchase(null)} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase text-[0.8rem]">Đóng</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Purchases;
