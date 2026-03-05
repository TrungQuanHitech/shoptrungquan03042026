
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, X, History, Eye, User, Edit, AlertCircle, AlertTriangle, FileText, Percent, CheckCircle2, Printer } from 'lucide-react';
import { Product, Order, Contact, Transaction, Settings } from '../types';

interface POSProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  settings: Settings;
  onNotify?: (text: string) => void;
}

const ViewOrderDetailsModal: React.FC<{
  order: Order;
  onClose: () => void;
  products: Product[];
  contacts: Contact[];
  onPrint: (order: Order) => void;
}> = ({ order, onClose, products, contacts, onPrint }) => {
  const customerName = contacts.find(c => c.id === order.customerId)?.name || 'Khách lẻ';

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in duration-300 max-h-[90vh]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800">Chi tiết đơn hàng</h3>
            <p className="text-xs font-mono text-indigo-600">{order.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong className="text-slate-500 block text-xs">Ngày:</strong> {new Date(order.date).toLocaleString('vi-VN')}</div>
            <div><strong className="text-slate-500 block text-xs">Khách hàng:</strong> {customerName}</div>
          </div>
          <table className="w-full text-left text-sm mt-4">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 font-bold">Sản phẩm</th>
                <th className="p-2 font-bold text-center">SL</th>
                <th className="p-2 font-bold text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item, idx) => {
                const p = products.find(prod => prod.id === item.productId);
                return (
                  <tr key={idx}>
                    <td className="p-2">{p?.name || 'Sản phẩm đã xóa'}</td>
                    <td className="p-2 text-center">{item.quantity}</td>
                    <td className="p-2 text-right font-semibold">{(item.price * item.quantity).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-1 text-sm">
            <div className="flex justify-between"><span>Tạm tính:</span><span>{(order.total - (order.taxAmount || 0)).toLocaleString()} đ</span></div>
            {(order.taxAmount || 0) > 0 && (
              <div className="flex justify-between"><span>Thuế VAT ({order.taxRate}%):</span><span>{order.taxAmount?.toLocaleString()} đ</span></div>
            )}
            <div className="flex justify-between font-bold text-base text-indigo-600"><span>Tổng cộng:</span><span>{order.total.toLocaleString()} đ</span></div>
            <div className="flex justify-between text-emerald-600"><span>Đã trả:</span><span>{order.paid.toLocaleString()} đ</span></div>
            {order.debt > 0 && (
              <div className="flex justify-between font-bold text-rose-600"><span>Còn nợ:</span><span>{order.debt.toLocaleString()} đ</span></div>
            )}
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
          <button onClick={() => onPrint(order)} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm uppercase hover:bg-indigo-700 flex items-center justify-center gap-2"><Printer size={18} /> In hóa đơn</button>
          <button onClick={onClose} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm uppercase hover:bg-slate-300">Đóng</button>
        </div>
      </div>
    </div>
  );
};


const POS: React.FC<POSProps> = ({ products, setProducts, orders, setOrders, contacts, setContacts, transactions, setTransactions, settings, onNotify }) => {
  const [cart, setCart] = useState<{ product: Product, quantity: number, price: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('default');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [checkoutSuccessId, setCheckoutSuccessId] = useState<string | null>(null);
  const [currentTaxRate, setCurrentTaxRate] = useState<number>(settings.taxRate);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const handlePrintInvoice = useCallback((order: Order) => {
    const customer = contacts.find(c => c.id === order.customerId);
    const customerName = customer?.name || 'Khách lẻ';
    const customerPhone = customer?.phone || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.items.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return `
        <tr>
          <td style="padding: 5px 0;">${p?.name || 'Sản phẩm đã xóa'}</td>
          <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
          <td style="padding: 5px 0; text-align: right;">${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Hóa đơn - ${order.id}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .shop-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
            .info { font-size: 9pt; margin: 2px 0; }
            .title { font-size: 12pt; font-weight: bold; margin: 10px 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 10px 0; }
            th { border-bottom: 1px solid #000; text-align: left; padding: 5px 0; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; font-size: 10pt; }
            .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-size: 12pt; font-weight: bold; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 9pt; border-top: 1px dashed #000; padding-top: 10px; }
            @media print {
              @page { size: 80mm auto; margin: 0; }
              body { width: 80mm; padding: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="shop-name">${settings.shopName}</h1>
            <p class="info">ĐC: ${settings.address || '---'}</p>
            <p class="info">SĐT: ${settings.phone || '---'}</p>
            <div class="title">HÓA ĐƠN BÁN HÀNG</div>
            <p class="info">Số: ${order.id}</p>
            <p class="info">Ngày: ${new Date(order.date).toLocaleString('vi-VN')}</p>
          </div>
          <div class="info">
            <strong>Khách hàng:</strong> ${customerName}<br/>
            ${customerPhone ? `<strong>SĐT:</strong> ${customerPhone}` : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style="text-align: center;">SL</th>
                <th style="text-align: right;">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            <div class="total-row">
              <span>Tạm tính:</span>
              <span>${(order.total - (order.taxAmount || 0)).toLocaleString()} đ</span>
            </div>
            ${order.taxAmount ? `
            <div class="total-row">
              <span>Thuế VAT (${order.taxRate}%):</span>
              <span>${order.taxAmount.toLocaleString()} đ</span>
            </div>` : ''}
            <div class="total-row grand-total">
              <span>TỔNG CỘNG:</span>
              <span>${order.total.toLocaleString()} đ</span>
            </div>
            <div class="total-row">
              <span>Đã thanh toán:</span>
              <span>${order.paid.toLocaleString()} đ</span>
            </div>
            ${order.debt > 0 ? `
            <div class="total-row" style="color: red; font-weight: bold;">
              <span>CÒN NỢ:</span>
              <span>${order.debt.toLocaleString()} đ</span>
            </div>` : ''}
          </div>
          <div class="footer">
            <p>Cảm ơn quý khách. Hẹn gặp lại!</p>
            <p style="font-size: 7pt;">Phần mềm SmartShop ERP</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [contacts, products, settings]);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1, price: product.price }];
    });
  }, []);

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const updateCartItemPrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, price: newPrice } : item));
  };
  const cartTax = useMemo(() => Math.round(cartSubtotal * (currentTaxRate / 100)), [cartSubtotal, currentTaxRate]);
  const cartTotal = useMemo(() => cartSubtotal + cartTax, [cartSubtotal, cartTax]);

  useEffect(() => { setPaidAmount(cartTotal); }, [cartTotal]);

  const generateSalesID = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = String(now.getFullYear()).slice(-2);
    const datePart = `${d}${m}${y}`;
    const prefix = `BH-${datePart}`;

    const todayOrders = orders.filter(o => o.id.startsWith(prefix));
    let nextNum = 1;

    if (todayOrders.length > 0) {
      const suffixes = todayOrders.map(o => {
        const numPart = o.id.replace(prefix, '');
        const parsed = parseInt(numPart);
        return isNaN(parsed) ? 0 : parsed;
      });
      nextNum = Math.max(...suffixes) + 1;
    }

    return `${prefix}${String(nextNum).padStart(3, '0')}`;
  };

  const handleCheckout = (shouldPrint: boolean = false) => {
    if (cart.length === 0) return;

    // --- REVERT PHASE (only if editing) ---
    if (isEditMode && editingOrderId) {
      const originalOrder = orders.find(o => o.id === editingOrderId);
      if (originalOrder) {
        // 1. Revert stock
        setProducts(prev => prev.map(p => {
          const itemInOldOrder = originalOrder.items.find(i => i.productId === p.id);
          return itemInOldOrder ? { ...p, stock: p.stock + itemInOldOrder.quantity } : p;
        }));
        // 2. Revert debt
        if (originalOrder.debt > 0 && originalOrder.customerId !== 'default') {
          setContacts(prev => prev.map(c =>
            c.id === originalOrder.customerId ? { ...c, debt: Math.max(0, c.debt - originalOrder.debt) } : c
          ));
        }
        // 3. Revert transactions (remove all related to this order)
        setTransactions(prev => prev.filter(t => t.relatedId !== editingOrderId));
      }
    }

    // --- APPLY PHASE (for both new and edited orders) ---
    const orderId = isEditMode && editingOrderId ? editingOrderId : generateSalesID();
    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString(),
      items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.price, cost: i.product.cost })),
      total: cartTotal,
      taxRate: currentTaxRate,
      taxAmount: cartTax,
      paid: paidAmount,
      debt: Math.max(0, cartTotal - paidAmount),
      customerId: selectedCustomerId
    };

    // 1. Apply new stock reduction
    setProducts(prev => prev.map(p => {
      const itemInNewOrder = newOrder.items.find(i => i.productId === p.id);
      return itemInNewOrder ? { ...p, stock: p.stock - itemInNewOrder.quantity } : p;
    }));

    // 2. Apply new debt
    if (newOrder.debt > 0 && newOrder.customerId !== 'default') {
      setContacts(prev => prev.map(c =>
        c.id === newOrder.customerId ? { ...c, debt: c.debt + newOrder.debt } : c
      ));
    }

    // 3. Apply new transaction for payment
    if (newOrder.paid > 0) {
      setTransactions(prev => [{
        id: `TX-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'IN',
        amount: newOrder.paid,
        description: `Thu tiền bán hàng ${orderId}`,
        category: 'Bán hàng',
        relatedId: orderId
      }, ...prev]);
    }

    // 4. Save order (add new or replace existing)
    setOrders(prev => {
      const existing = prev.find(o => o.id === orderId);
      if (existing) {
        return prev.map(o => o.id === orderId ? newOrder : o);
      }
      return [newOrder, ...prev];
    });

    // --- FINALIZATION ---
    const escapeHTML = (str: string) => str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
    if (settings.notifyOnSale && onNotify) {
      const customer = contacts.find(c => c.id === selectedCustomerId)?.name || 'Khách vãng lai';
      const itemsList = cart.map(i => `• ${escapeHTML(i.product.name)} x<b>${i.quantity}</b>`).join('\n');
      const action = isEditMode ? 'CẬP NHẬT ĐƠN HÀNG' : 'BÁN HÀNG MỚI';
      const text = `🛍️ <b>${action}: ${orderId}</b>\n━━━━━━━━━━━━━\n👤 <b>Khách:</b> ${escapeHTML(customer)}\n📦 <b>Chi tiết:</b>\n${itemsList}\n━━━━━━━━━━━━━\n💰 <b>Tổng đơn: ${cartTotal.toLocaleString()}đ</b>\n✅ <b>Đã thu:</b> ${paidAmount.toLocaleString()}đ\n⚠️ <b>Nợ lại:</b> ${newOrder.debt.toLocaleString()}đ`;
      onNotify(text);
    }

    // Print if requested
    if (shouldPrint) {
      handlePrintInvoice(newOrder);
    }

    // Reset UI state
    setCart([]);
    setIsEditMode(false);
    setEditingOrderId(null);
    setCheckoutSuccessId(orderId);
    setTimeout(() => setCheckoutSuccessId(null), 4000);
  };

  const handleEditOrder = (order: Order) => {
    const restoredCart = order.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? { product, quantity: item.quantity, price: item.price } : null;
    }).filter(Boolean) as { product: Product, quantity: number, price: number }[];
    setCart(restoredCart);
    setSelectedCustomerId(order.customerId);
    setPaidAmount(order.paid);
    setCurrentTaxRate(order.taxRate || 0);
    setIsEditMode(true);
    setEditingOrderId(order.id);
    setShowHistory(false);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row h-full gap-3 overflow-hidden relative">
      {checkoutSuccessId && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 bg-indigo-600 text-white border-2 border-indigo-400`}>
          <CheckCircle2 size={24} className="text-white" />
          <div>
            <p className="font-black text-[0.85rem] uppercase tracking-wide">Thanh toán thành công</p>
            <p className="font-bold text-[0.9rem] text-indigo-100">Đã tạo đơn hàng: {checkoutSuccessId}</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-2 border-b border-slate-100 flex flex-col sm:flex-row gap-2 bg-slate-50/50">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Tìm tên hoặc mã hàng hóa..." className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[0.85rem] focus:ring-2 focus:ring-indigo-100 outline-none font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <button onClick={() => setShowHistory(true)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-sm">
            <History size={16} className="text-indigo-500" />
            <span className="text-[10px] font-bold uppercase hidden sm:inline">Lịch sử</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-bold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-center w-12">Ảnh</th>
                <th className="px-3 py-2">Thông tin hàng hóa</th>
                <th className="px-3 py-2 text-right w-20">Tồn kho</th>
                <th className="px-3 py-2 text-right w-28">Giá bán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} onClick={() => addToCart(p)} className="cursor-pointer hover:bg-indigo-50/50 transition-colors group">
                  <td className="px-3 py-1.5 text-center">
                    <img src={p.imageUrl} alt="" className="w-8 h-8 object-cover rounded-lg border border-slate-100 shadow-sm mx-auto" />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="font-bold text-slate-700 leading-tight text-[0.85rem] group-hover:text-indigo-600 transition-colors">{p.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono font-bold mt-0.5">{p.sku}</div>
                  </td>
                  <td className={`px-3 py-1.5 text-right font-bold text-[0.85rem] ${p.stock <= 0 ? 'text-rose-500' : p.stock <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {p.stock}
                  </td>
                  <td className="px-3 py-1.5 text-right font-bold text-indigo-600 text-[0.85rem]">{p.price.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl shrink-0">
        <div className={`p-3 text-white flex items-center justify-between shadow-md ${isEditMode ? 'bg-amber-600' : 'bg-slate-900'}`}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} />
            <span className="font-bold uppercase tracking-wider text-[11px]">{isEditMode ? 'Sửa đơn hàng' : 'Giỏ hàng'}</span>
          </div>
          <button onClick={() => { setCart([]); setIsEditMode(false); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </div>

        <div className="flex-1 overflow-auto">
          {cart.map(item => (
            <div key={item.product.id} className="p-3 border-b border-slate-50 space-y-1.5 hover:bg-slate-50/30 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div className="font-bold text-slate-700 text-[0.85rem] leading-snug">{item.product.name}</div>
                <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={14} /></button>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className="w-5 h-5 bg-white hover:bg-slate-50 rounded flex items-center justify-center text-slate-600 shadow-sm transition-all text-xs font-bold">-</button>
                  <span className="font-bold text-[0.8rem] w-4 text-center">{item.quantity}</span>
                  <button onClick={() => setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i))} className="w-5 h-5 bg-white hover:bg-slate-50 rounded flex items-center justify-center text-slate-600 shadow-sm transition-all text-xs font-bold">+</button>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 mb-0.5">
                    <span className="text-[8px] text-slate-400 uppercase font-bold text">Đơn giá:</span>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateCartItemPrice(item.product.id, Number(e.target.value))}
                      className="w-20 text-right text-indigo-600 font-bold text-[0.85rem] border-b border-transparent hover:border-slate-200 outline-none focus:border-indigo-300 bg-transparent"
                    />
                  </div>
                  <div className="font-bold text-slate-900 text-[0.85rem]">{(item.price * item.quantity).toLocaleString()} đ</div>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-3">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center shadow-inner"><ShoppingCart size={28} /></div>
              <p className="text-[0.8rem] font-medium italic">Chọn sản phẩm để bán</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex justify-between text-slate-500 text-[9px] font-bold uppercase"><span>Tạm tính</span><span>{cartSubtotal.toLocaleString()} đ</span></div>
            <div className="flex justify-between items-center text-slate-500 text-[9px] font-bold uppercase">
              <span className="flex items-center gap-1">Thuế VAT <Percent size={10} /></span>
              <div className="flex items-center gap-1">
                <input type="number" className="w-8 border-b border-slate-300 bg-transparent text-right outline-none text-rose-500 font-bold text-[0.85rem]" value={currentTaxRate} onChange={(e) => setCurrentTaxRate(Number(e.target.value))} />
                <span className="text-rose-500 font-bold">%</span>
                <span className="text-rose-600 font-bold ml-1">{cartTax.toLocaleString()} đ</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-end">
              <span className="font-bold text-slate-900 uppercase text-[10px]">Tổng cộng</span>
              <span className="text-lg font-bold text-indigo-600 leading-none">{cartTotal.toLocaleString()} đ</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Chọn khách hàng</label>
            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[0.85rem] font-bold shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none">
              <option value="default">Khách vãng lai (Lẻ)</option>
              {contacts.filter(c => c.type === 'CUSTOMER').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Thực thu</label>
            <input type="number" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} className="w-full px-3 py-2 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-xl font-bold text-indigo-700 shadow-inner outline-none" />
          </div>

          <div className="flex gap-2">
            <button disabled={cart.length === 0} onClick={() => handleCheckout(false)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 text-[0.8rem]">
              <CreditCard size={18} /> Thanh toán
            </button>
            <button disabled={cart.length === 0} onClick={() => handleCheckout(true)} className="p-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400" title="Thanh toán & In hóa đơn">
              <Printer size={18} />
            </button>
          </div>
        </div>
      </div>

      {viewingOrder && (
        <ViewOrderDetailsModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          products={products}
          contacts={contacts}
          onPrint={handlePrintInvoice}
        />
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 uppercase text-[0.85rem]">Lịch sử đơn hàng gần đây</h3>
              <button onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase sticky top-0 border-b border-slate-100 z-10">
                  <tr>
                    <th className="px-4 py-2">Mã đơn</th>
                    <th className="px-4 py-2">Ngày giờ</th>
                    <th className="px-4 py-2">Khách hàng</th>
                    <th className="px-4 py-2 text-right">Tổng tiền</th>
                    <th className="px-4 py-2 text-center w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-mono font-bold text-indigo-600 text-[0.8rem]">{o.id}</td>
                      <td className="px-4 py-2 text-[0.8rem] text-slate-500">{new Date(o.date).toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2 font-bold text-slate-700 truncate text-[0.85rem]">{contacts.find(c => c.id === o.customerId)?.name || 'Khách lẻ'}</td>
                      <td className="px-4 py-2 text-right font-bold text-[0.85rem]">{o.total.toLocaleString()} đ</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setViewingOrder(o)} title="Xem chi tiết" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye size={16} /></button>
                          <button onClick={() => handleEditOrder(o)} title="Chỉnh sửa" className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"><Edit size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;