
import { Product, Order, Purchase, Transaction, Contact, RepairTicket, RentalContract } from '../../types';

interface SyncData {
  products: Product[];
  orders: Order[];
  purchases: Purchase[];
  transactions: Transaction[];
  contacts: Contact[];
  repairTickets: RepairTicket[];
  rentalContracts: RentalContract[];
}

// Hàm để chuyển đổi object thành một hàng trong sheet, dựa vào headers
const objectToRow = (obj: any, headers: string[]) => {
    return headers.map(header => {
        const value = obj[header] || '';
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value;
    });
};

export const syncToGoogleSheet = async (scriptUrl: string, data: SyncData) => {
  if (!scriptUrl) {
    throw new Error("URL của Google Apps Script chưa được cấu hình.");
  }

  // Define headers for each sheet
  const headers = {
    products: ['id', 'name', 'sku', 'stock', 'cost', 'price', 'category', 'description', 'specifications'],
    orders: ['id', 'date', 'customerId', 'total', 'paid', 'debt', 'taxRate', 'taxAmount', 'items'],
    purchases: ['id', 'date', 'supplierId', 'total', 'paid', 'debt', 'taxRate', 'taxAmount', 'items'],
    transactions: ['id', 'date', 'type', 'amount', 'description', 'category', 'relatedId'],
    contacts: ['id', 'name', 'phone', 'type', 'debt'],
    repairTickets: ['id', 'date', 'customerId', 'deviceName', 'issueDescription', 'status', 'estimatedCost', 'technicianNotes'],
    rentalContracts: ['id', 'customerId', 'machineName', 'model', 'startDate', 'rentalPrice', 'freeCopiesLimit', 'currentCounter', 'pricePerPage', 'lastBillDate']
  };

  // Prepare data payload
  const payload = {
    Sản_phẩm: [headers.products, ...data.products.map(p => objectToRow(p, headers.products))],
    Đơn_bán_hàng: [headers.orders, ...data.orders.map(o => {
        const customer = data.contacts.find(c => c.id === o.customerId);
        return objectToRow({ ...o, customerId: customer ? customer.name : o.customerId }, headers.orders);
    })],
    Đơn_nhập_hàng: [headers.purchases, ...data.purchases.map(p => {
        const supplier = data.contacts.find(c => c.id === p.supplierId);
        return objectToRow({ ...p, supplierId: supplier ? supplier.name : p.supplierId }, headers.purchases);
    })],
    Đối_tác: [headers.contacts, ...data.contacts.map(c => objectToRow(c, headers.contacts))],
    Sổ_quỹ: [headers.transactions, ...data.transactions.map(t => objectToRow(t, headers.transactions))],
    Sửa_chữa: [headers.repairTickets, ...data.repairTickets.map(t => {
        const customer = data.contacts.find(c => c.id === t.customerId);
        return objectToRow({ ...t, customerId: customer ? customer.name : t.customerId }, headers.repairTickets);
    })],
    Cho_thuê: [headers.rentalContracts, ...data.rentalContracts.map(c => {
        const customer = data.contacts.find(con => con.id === c.customerId);
        return objectToRow({ ...c, customerId: customer ? customer.name : c.customerId }, headers.rentalContracts);
    })],
  };

  const response = await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors', // Important for Google Apps Script web apps
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Note: With no-cors, we can't read the response, but the request is sent.
  // We assume success if no network error is thrown.
  return { success: true };
};

export const syncToGoogleSheetDirect = async (spreadsheetId: string, data: SyncData) => {
  const tokensStr = localStorage.getItem('google_tokens');
  if (!tokensStr) throw new Error("Chưa kết nối Google.");
  const tokens = JSON.parse(tokensStr);

  const headers = {
    PRODUCTS: ['MÃ SP', 'TÊN SẢN PHẨM', 'DANH MỤC', 'SKU', 'GIÁ VỐN', 'GIÁ BÁN', 'TỒN KHO', 'GIÁ TRỊ TỒN', 'MÔ TẢ'],
    SALES: ['MÃ ĐƠN', 'NGÀY', 'KHÁCH HÀNG', 'TỔNG CỘNG', 'ĐÃ THANH TOÁN', 'CÒN NỢ', 'THUẾ', 'CHI TIẾT'],
    PURCHASES: ['MÃ NHẬP', 'NGÀY', 'NHÀ CUNG CẤP', 'TỔNG CỘNG', 'ĐÃ THANH TOÁN', 'CÒN NỢ', 'THUẾ', 'CHI TIẾT'],
    CONTACTS: ['MÃ ĐT', 'TÊN', 'SỐ ĐIỆN THOẠI', 'LOẠI', 'CÔNG NỢ'],
    CASHFLOW: ['MÃ GD', 'NGÀY', 'LOẠI', 'SỐ TIỀN', 'MÔ TẢ', 'DANH MỤC', 'LIÊN QUAN'],
    SERVICES: ['MÃ DV', 'LOẠI', 'KHÁCH HÀNG', 'THIẾT BỊ/MÁY', 'TRẠNG THÁI', 'CHI PHÍ/GIÁ THUÊ', 'GHI CHÚ']
  };

  const payload = {
    PRODUCTS: [headers.PRODUCTS, ...data.products.map(p => [
      p.id, p.name, p.category, p.sku, p.cost, p.price, p.stock, p.cost * p.stock, p.description
    ])],
    SALES: [headers.SALES, ...data.orders.map(o => {
        const customer = data.contacts.find(c => c.id === o.customerId);
        return [o.id, o.date, customer ? customer.name : o.customerId, o.total, o.paid, o.debt, o.taxAmount, JSON.stringify(o.items)];
    })],
    PURCHASES: [headers.PURCHASES, ...data.purchases.map(p => {
        const supplier = data.contacts.find(c => c.id === p.supplierId);
        return [p.id, p.date, supplier ? supplier.name : p.supplierId, p.total, p.paid, p.debt, p.taxAmount, JSON.stringify(p.items)];
    })],
    CONTACTS: [headers.CONTACTS, ...data.contacts.map(c => [
      c.id, c.name, c.phone, c.type, c.debt
    ])],
    CASHFLOW: [headers.CASHFLOW, ...data.transactions.map(t => [
      t.id, t.date, t.type, t.amount, t.description, t.category, t.relatedId
    ])],
    SERVICES: [headers.SERVICES, 
      ...data.repairTickets.map(t => {
        const customer = data.contacts.find(c => c.id === t.customerId);
        return [t.id, 'SỬA CHỮA', customer ? customer.name : t.customerId, t.deviceName, t.status, t.estimatedCost, t.issueDescription];
      }),
      ...data.rentalContracts.map(c => {
        const customer = data.contacts.find(con => con.id === c.customerId);
        return [c.id, 'CHO THUÊ', customer ? customer.name : c.customerId, c.machineName, 'ĐANG THUÊ', c.rentalPrice, c.model];
      })
    ]
  };

  const response = await fetch('/api/google/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens, spreadsheetId, data: payload }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Lỗi đồng bộ.");
  }

  return await response.json();
};
