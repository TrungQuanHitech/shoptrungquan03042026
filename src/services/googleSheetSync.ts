
import { Product, Order, Purchase, Transaction, Contact, RepairTicket, RentalContract, Settings } from '../../types';
import { getValidToken } from './googleIdentity';

interface SyncData {
  products: Product[];
  orders: Order[];
  purchases: Purchase[];
  transactions: Transaction[];
  contacts: Contact[];
  repairTickets: RepairTicket[];
  rentalContracts: RentalContract[];
}

// ===== Helper: gọi API với retry khi 401 =====
const apiFetch = async (
  url: string,
  options: RequestInit,
  settings: Settings,
  onTokenRefreshed?: (newToken: string, newExpiry: number) => void
): Promise<Response> => {
  let response = await fetch(url, options);

  if (response.status === 401 && settings.googleClientId) {
    // Token hết hạn - thử refresh
    try {
      const refreshed = await getValidToken(undefined, undefined, settings.googleClientId);
      if (onTokenRefreshed) {
        onTokenRefreshed(refreshed.accessToken, refreshed.tokenExpiry);
      }
      // Retry với token mới
      const newOptions: RequestInit = {
        ...options,
        headers: {
          ...(options.headers as Record<string, string>),
          'Authorization': `Bearer ${refreshed.accessToken}`,
        }
      };
      response = await fetch(url, newOptions);
    } catch (refreshError) {
      throw new Error('Token đã hết hạn. Vui lòng nhấn "Kết nối Google" để đăng nhập lại.');
    }
  }

  return response;
};

// ===== Tạo Google Spreadsheet mới =====
export const createSpreadsheet = async (
  token: string,
  title: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'PRODUCTS', index: 0 } },
        { properties: { title: 'SALES', index: 1 } },
        { properties: { title: 'PURCHASES', index: 2 } },
        { properties: { title: 'CONTACTS', index: 3 } },
        { properties: { title: 'CASHFLOW', index: 4 } },
        { properties: { title: 'SERVICES', index: 5 } },
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không thể tạo Spreadsheet: ${errorText}`);
  }
  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
  };
};

// ===== Tạo thư mục mới trên Google Drive =====
export const createDriveFolder = async (
  token: string,
  folderName: string,
  parentFolderId?: string
): Promise<{ folderId: string; folderUrl: string }> => {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không thể tạo thư mục Drive: ${errorText}`);
  }
  const data = await response.json();
  return {
    folderId: data.id,
    folderUrl: `https://drive.google.com/drive/folders/${data.id}`,
  };
};

// ===== Tạo sheet tab mới trong spreadsheet =====
export const createSheetTab = async (
  token: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> => {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title: sheetTitle }
          }
        }]
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Không thể tạo sheet tab: ${errorText}`);
  }
};

// ===== Kiểm tra và tạo các sheet tab cần thiết =====
const ensureSheetsExist = async (
  token: string,
  spreadsheetId: string,
  requiredSheets: string[]
): Promise<void> => {
  // Lấy danh sách sheet hiện có
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  if (!res.ok) return; // Bỏ qua nếu không đọc được

  const data = await res.json();
  const existingSheets: string[] = (data.sheets || []).map((s: any) => s.properties.title);

  // Tạo các sheet còn thiếu
  for (const sheetName of requiredSheets) {
    if (!existingSheets.includes(sheetName)) {
      await createSheetTab(token, spreadsheetId, sheetName);
    }
  }
};

// ===== Hàm gốc qua Apps Script (giữ nguyên để tương thích) =====
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

  const headers = {
    products: ['id', 'name', 'sku', 'stock', 'cost', 'price', 'category', 'description', 'specifications'],
    orders: ['id', 'date', 'customerId', 'total', 'paid', 'debt', 'taxRate', 'taxAmount', 'items'],
    purchases: ['id', 'date', 'supplierId', 'total', 'paid', 'debt', 'taxRate', 'taxAmount', 'items'],
    transactions: ['id', 'date', 'type', 'amount', 'description', 'category', 'relatedId'],
    contacts: ['id', 'name', 'phone', 'type', 'debt'],
    repairTickets: ['id', 'date', 'customerId', 'deviceName', 'issueDescription', 'status', 'estimatedCost', 'technicianNotes'],
    rentalContracts: ['id', 'customerId', 'machineName', 'model', 'startDate', 'rentalPrice', 'freeCopiesLimit', 'currentCounter', 'pricePerPage', 'lastBillDate']
  };

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

  await fetch(scriptUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { success: true };
};

// ===== Đồng bộ trực tiếp qua Google Sheets API (với auto-retry 401) =====
export const syncToGoogleSheetDirect = async (
  settings: Settings,
  data: SyncData,
  onTokenRefreshed?: (newToken: string, newExpiry: number) => void
) => {
  let token = settings.googleAccessToken;
  if (!token) throw new Error("Chưa kết nối Google. Vui lòng nhấn 'Kết nối Google'.");

  const spreadsheetId = settings.googleSheetId;
  if (!spreadsheetId) throw new Error("Vui lòng tạo hoặc nhập Google Sheet ID.");

  const sheetHeaders = {
    PRODUCTS: ['MÃ SP', 'TÊN SẢN PHẨM', 'DANH MỤC', 'SKU', 'GIÁ VỐN', 'GIÁ BÁN', 'TỒN KHO', 'GIÁ TRỊ TỒN', 'MÔ TẢ'],
    SALES: ['MÃ ĐƠN', 'NGÀY', 'KHÁCH HÀNG', 'TỔNG CỘNG', 'ĐÃ THANH TOÁN', 'CÒN NỢ', 'THUẾ', 'CHI TIẾT'],
    PURCHASES: ['MÃ NHẬP', 'NGÀY', 'NHÀ CUNG CẤP', 'TỔNG CỘNG', 'ĐÃ THANH TOÁN', 'CÒN NỢ', 'THUẾ', 'CHI TIẾT'],
    CONTACTS: ['MÃ ĐT', 'TÊN', 'SỐ ĐIỆN THOẠI', 'LOẠI', 'CÔNG NỢ'],
    CASHFLOW: ['MÃ GD', 'NGÀY', 'LOẠI', 'SỐ TIỀN', 'MÔ TẢ', 'DANH MỤC', 'LIÊN QUAN'],
    SERVICES: ['MÃ DV', 'LOẠI', 'KHÁCH HÀNG', 'THIẾT BỊ/MÁY', 'TRẠNG THÁI', 'CHI PHÍ/GIÁ THUÊ', 'GHI CHÚ']
  };

  // Đảm bảo các sheet tab tồn tại trước khi ghi
  try {
    await ensureSheetsExist(token, spreadsheetId, Object.keys(sheetHeaders));
  } catch (_) {
    // Bỏ qua lỗi kiểm tra sheet - thử ghi trực tiếp
  }

  const payload: Record<string, any[][]> = {
    PRODUCTS: [sheetHeaders.PRODUCTS, ...data.products.map(p => [
      p.id, p.name, p.category, p.sku, p.cost, p.price, p.stock, p.cost * p.stock, p.description
    ])],
    SALES: [sheetHeaders.SALES, ...data.orders.map(o => {
      const customer = data.contacts.find(c => c.id === o.customerId);
      return [o.id, o.date, customer ? customer.name : o.customerId, o.total, o.paid, o.debt, o.taxAmount, JSON.stringify(o.items)];
    })],
    PURCHASES: [sheetHeaders.PURCHASES, ...data.purchases.map(p => {
      const supplier = data.contacts.find(c => c.id === p.supplierId);
      return [p.id, p.date, supplier ? supplier.name : p.supplierId, p.total, p.paid, p.debt, p.taxAmount, JSON.stringify(p.items)];
    })],
    CONTACTS: [sheetHeaders.CONTACTS, ...data.contacts.map(c => [
      c.id, c.name, c.phone, c.type, c.debt
    ])],
    CASHFLOW: [sheetHeaders.CASHFLOW, ...data.transactions.map(t => [
      t.id, t.date, t.type, t.amount, t.description, t.category, t.relatedId
    ])],
    SERVICES: [sheetHeaders.SERVICES,
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

  // Gửi từng sheet - với retry 401
  for (const [sheetName, rows] of Object.entries(payload)) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=USER_ENTERED`;
    const options: RequestInit = {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows, majorDimension: 'ROWS' }),
    };

    const response = await apiFetch(url, options, settings, (newToken, newExpiry) => {
      token = newToken; // Cập nhật token cho các request tiếp theo
      if (onTokenRefreshed) onTokenRefreshed(newToken, newExpiry);
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API Error (${sheetName}): ${errorText}`);
    }
  }

  return { success: true };
};
