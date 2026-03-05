
import React, { useState, useRef, useMemo } from 'react';
import Barcode from 'react-barcode';
import { Search, Plus, Trash2, Edit, X, Image as ImageIcon, Upload, Eye, ListPlus, AlertTriangle, Settings2, Check, ShieldCheck, Tag, Info, ListTree, FolderOpen, ChevronDown, ChevronUp, RefreshCcw, Printer, FileDown, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Product, Settings } from '../types';
import * as XLSX from 'xlsx';
import { syncToGoogleSheetDirect } from '../src/services/googleSheetSync';
import { getValidToken } from '../src/services/googleIdentity';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: Settings;
  getAllData: () => any;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, settings, getAllData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [visibleColumns, setVisibleColumns] = useState({
    image: true,
    sku: true,
    category: true,
    description: true,
    specs: true,
    warranty: true,
    cost: true,
    price: true,
    stock: true
  });

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);
  const [barcodeConfig, setBarcodeConfig] = useState({
    showShopName: true,
    showPrice: true,
    showSKU: true
  });

  const handlePrintBarcode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use a simple SVG generation or just copy the SVG from the modal
    // For simplicity, we'll use a data URL or just the SVG string
    const barcodeSvg = document.querySelector('#barcode-preview svg');
    const barcodeSvgHtml = barcodeSvg ? barcodeSvg.outerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>In mã vạch - ${barcodeProduct?.sku}</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; }
            .label { 
              width: 50mm; 
              height: 30mm; 
              border: 1px solid #eee; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              padding: 1mm;
              box-sizing: border-box;
              text-align: center;
              overflow: hidden;
            }
            .shop-name { font-size: 7pt; font-weight: bold; margin-bottom: 0.5mm; text-transform: uppercase; color: #333; }
            .sku { font-size: 9pt; font-weight: 600; margin-bottom: 0.5mm; font-family: monospace; letter-spacing: 0.5px; color: #000; }
            .barcode-container { width: 100%; display: flex; justify-content: center; margin-bottom: 0.5mm; }
            .barcode-container svg { max-width: 100%; height: auto; max-height: 12mm; }
            .price { font-size: 11pt; font-weight: 900; color: #000; }
            @media print {
              @page { size: 50mm 30mm; margin: 0; }
              body { height: auto; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            ${barcodeConfig.showShopName ? `<div class="shop-name">${settings.shopName}</div>` : ''}
            ${barcodeConfig.showSKU ? `<div class="sku">${barcodeProduct?.sku}</div>` : ''}
            <div class="barcode-container">
              ${barcodeSvgHtml}
            </div>
            ${barcodeConfig.showPrice ? `<div class="price">${barcodeProduct?.price.toLocaleString()} đ</div>` : ''}
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
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cập nhật token mới vào settings sau khi refresh nội bộ
  const handleTokenRefreshed = (newToken: string, newExpiry: number) => {
    localStorage.setItem('erp_settings', JSON.stringify({
      ...settings,
      googleAccessToken: newToken,
      googleTokenExpiry: newExpiry
    }));
  };

  const downloadProductTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [['MÃ SP', 'TÊN SẢN PHẨM', 'DANH MỤC', 'SKU', 'GIÁ VỐN', 'GIÁ BÁN', 'TỒN KHO', 'MÔ TẢ']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, 'PRODUCTS');
    XLSX.writeFile(wb, 'SmartShop_Products_Template.xlsx');
  };

  const handleExcelImportProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        // Ưu tiên sheet tên PRODUCTS, nếu không lấy sheet đầu tiên
        const sheetName = wb.SheetNames.includes('PRODUCTS') ? 'PRODUCTS' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        if (!ws) throw new Error("Không tìm thấy dữ liệu trong file Excel.");

        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const importedProducts: Product[] = data.map(row => {
          // Xử lý id. Nếu không có mã thì tự random.
          const rawId = String(row['MÃ SP'] || row['ID'] || '');
          const id = rawId.trim() !== '' ? rawId : `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          return {
            id,
            name: String(row['TÊN SẢN PHẨM'] || row['NAME'] || ''),
            category: String(row['DANH MỤC'] || row['CATEGORY'] || ''),
            sku: String(row['SKU'] || ''),
            cost: Number(row['GIÁ VỐN'] || row['COST'] || 0),
            price: Number(row['GIÁ BÁN'] || row['PRICE'] || 0),
            stock: Number(row['TỒN KHO'] || row['STOCK'] || 0),
            description: String(row['MÔ TẢ'] || row['DESCRIPTION'] || ''),
            imageUrl: '',
            specifications: {}
          };
        }).filter(p => p.name); // Bỏ qua dòng trống không có tên

        if (importedProducts.length === 0) {
          alert('Không tìm thấy sản phẩm hợp lệ nào trong file Excel!');
          if (excelInputRef.current) excelInputRef.current.value = '';
          return;
        }

        // Merge dữ liệu với products hiện tại (dựa vào id hoặc sku)
        setProducts(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          const skuMap = new Map(prev.map(p => [p.sku, p.id])); // Map SKU -> ID để trách duplicate SKU

          importedProducts.forEach((newP: Product) => {
            if (map.has(newP.id)) {
              // Cập nhật nguyên object
              map.set(newP.id, { ...(map.get(newP.id) as Product), ...newP });
            } else if (newP.sku && skuMap.has(newP.sku)) {
              // Trùng SKU -> update
              const existingId = skuMap.get(newP.sku)!;
              map.set(existingId, { ...(map.get(existingId) as Product), ...newP, id: existingId });
            } else {
              // Thêm mới
              map.set(newP.id, newP);
            }
          });

          const mergedProducts = Array.from(map.values()) as Product[];

          // Trigger Auto Backup
          setTimeout(() => {
            if (settings.isGoogleConnected && settings.googleAccessToken && settings.autoSync) {
              autoSyncToGoogle(mergedProducts);
            }
          }, 500);

          return mergedProducts;
        });

        alert(`✅ Đã nhập thành công ${importedProducts.length} sản phẩm từ file Excel!`);
      } catch (error) {
        console.error("Excel Import Error:", error);
        alert("🔴 Lỗi khi đọc file Excel. Định dạng không đúng.");
      } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoSyncToGoogle = async (updatedProducts: Product[]) => {
    setIsSyncing(true);
    try {
      const { accessToken, tokenExpiry, refreshed } = await getValidToken(
        settings.googleAccessToken,
        settings.googleTokenExpiry,
        settings.googleClientId
      );
      if (refreshed) handleTokenRefreshed(accessToken, tokenExpiry);

      const syncSettings = { ...settings, googleAccessToken: accessToken, googleTokenExpiry: tokenExpiry };
      const allData = { ...getAllData(), products: updatedProducts };
      await syncToGoogleSheetDirect(syncSettings, allData, handleTokenRefreshed);
      // console.log("Auto-sync success");
    } catch (error: any) {
      console.error("Lỗi tự động đồng bộ:", error);
      alert(`⚠️ Cập nhật kho thành công, nhưng tự động đồng bộ bị lỗi: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean) as string[];
    return Array.from(new Set(cats)).sort();
  }, [products]);

  const generateSmartSKU = (name: string, category: string, specs: Record<string, string>) => {
    if (!name) return '';
    let prefix = "SP";
    if (category) {
      prefix = category.slice(0, 3).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");
    }
    const cleanName = name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s]/g, "");
    const words = cleanName.split(/\s+/).filter(w => w.length > 0 && !category.toUpperCase().includes(w) && w !== "LAPTOP" && w !== "MAY" && w !== "TINH");
    const brandModel = words.slice(0, 2).join('').replace(/[^A-Z0-9]/g, '');
    let specsPart = "";
    const priorityKeys = ['CPU', 'RAM', 'SSD', 'HDD', 'VGA'];
    priorityKeys.forEach(key => {
      const foundKey = Object.keys(specs).find(k => k.toUpperCase().includes(key));
      if (foundKey) {
        let val = specs[foundKey].toUpperCase().replace(/[^A-Z0-9]/g, '');
        specsPart += val;
      }
    });
    let finalSKU = `${prefix}-${brandModel}-${specsPart}`.slice(0, 20);
    if (finalSKU.endsWith('-')) finalSKU = finalSKU.slice(0, -1);
    return finalSKU;
  };

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', stock: 0, cost: 0, price: 0, category: '', imageUrl: '', description: '', warranty: '', specifications: {}
  });

  const [currentSpecs, setCurrentSpecs] = useState<{ key: string, value: string }[]>([]);

  const addSpec = () => setCurrentSpecs([...currentSpecs, { key: '', value: '' }]);
  const removeSpec = (index: number) => setCurrentSpecs(currentSpecs.filter((_, i) => i !== index));
  const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...currentSpecs];
    newSpecs[index][field] = value;
    setCurrentSpecs(newSpecs);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({ ...prev, name }));
  };

  const autoGenerateSKU = () => {
    if (formData.name) {
      const specObject: Record<string, string> = {};
      currentSpecs.forEach(s => { if (s.key.trim()) specObject[s.key.trim()] = s.value; });
      const newSKU = generateSmartSKU(formData.name, formData.category || '', specObject);
      setFormData(prev => ({ ...prev, sku: newSKU }));
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;

      // If Google is connected and folder ID exists, upload to Drive
      if (settings.isGoogleConnected && settings.googleDriveFolderId) {
        setIsUploading(true);
        try {
          const tokensStr = localStorage.getItem('google_tokens');
          if (tokensStr) {
            const tokens = JSON.parse(tokensStr);
            const response = await fetch('/api/google/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tokens,
                folderId: settings.googleDriveFolderId,
                fileName: `product_${Date.now()}_${file.name}`,
                base64Data
              })
            });
            const data = await response.json();
            if (data.url) {
              setFormData({ ...formData, imageUrl: data.url });
              return;
            }
          }
        } catch (error) {
          console.error("Drive upload failed:", error);
        } finally {
          setIsUploading(false);
        }
      }

      // Fallback to local base64 if Drive upload fails or not connected
      setFormData({ ...formData, imageUrl: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const specObject: Record<string, string> = {};
    currentSpecs.forEach(s => { if (s.key.trim()) specObject[s.key.trim()] = s.value; });
    const finalData = { ...formData, specifications: specObject };
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...finalData } as Product : p));
    } else {
      const newProduct: Product = {
        ...finalData as Product,
        id: Date.now().toString(),
        sku: formData.sku || generateSmartSKU(formData.name || 'SP', formData.category || '', specObject),
        imageUrl: formData.imageUrl || `https://picsum.photos/seed/${Date.now()}/200/200`
      };
      setProducts(prev => [newProduct, ...prev]);
    }
    closeModal();
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
      setCurrentSpecs(Object.entries(product.specifications || {}).map(([key, value]) => ({ key, value })));
    } else {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', stock: 0, cost: 0, price: 0, category: '', imageUrl: '', description: '', warranty: '', specifications: {} });
      setCurrentSpecs([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingProduct(null); };
  const toggleColumn = (col: keyof typeof visibleColumns) => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  const toggleExpandRow = (id: string) => {
    const newSet = new Set(expandedProductIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedProductIds(newSet);
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setProductToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalVisibleColumns = Object.values(visibleColumns).filter(Boolean).length + 1;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-3 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên, SKU hoặc phân loại..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-[0.95rem] font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <button onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)} className={`p-2 rounded-xl border border-slate-200 transition-colors ${isColumnSelectorOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            <Settings2 size={20} />
          </button>
          {isColumnSelectorOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-2 tracking-widest border-b border-slate-50 pb-1">Cài đặt hiển thị</p>
              <div className="space-y-1">
                {Object.keys(visibleColumns).map(col => (
                  <button key={col} onClick={() => toggleColumn(col as any)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-xl text-[0.9rem] transition-colors">
                    <span className={visibleColumns[col as keyof typeof visibleColumns] ? 'text-slate-800 font-semibold' : 'text-slate-400'}>{col.toUpperCase()}</span>
                    {visibleColumns[col as keyof typeof visibleColumns] && <Check size={16} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={downloadProductTemplate} className="hidden sm:flex p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl border border-slate-200 bg-white transition-colors group" title="Tải file mẫu Excel">
          <FileDown size={20} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="relative">
          <input type="file" ref={excelInputRef} onChange={handleExcelImportProduct} accept=".xlsx, .xls" className="hidden" />
          <button disabled={isSyncing} onClick={() => excelInputRef.current?.click()} className="hidden md:flex items-center gap-2 p-2.5 px-4 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors font-bold text-[0.85rem] uppercase tracking-wider">
            {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />} Nhập Excel
          </button>
        </div>

        <button onClick={() => openModal()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold uppercase tracking-wider text-[0.85rem] shadow-lg shadow-indigo-100 whitespace-nowrap active:scale-95 transition-all">
          <Plus size={20} /> <span>Thêm mới</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-2xl shadow-sm no-print">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {visibleColumns.image && <th className="px-4 py-3 w-14 text-center">Ảnh</th>}
              <th className="px-4 py-3 w-60">Sản phẩm</th>
              {visibleColumns.category && <th className="px-4 py-3 w-36">Phân loại</th>}
              {visibleColumns.description && <th className="px-4 py-3 w-48">Mô tả</th>}
              {visibleColumns.stock && <th className="px-4 py-3 w-24 text-right">Tồn</th>}
              {visibleColumns.cost && <th className="px-4 py-3 w-28 text-right">Giá vốn</th>}
              {visibleColumns.price && <th className="px-4 py-3 w-28 text-right">Giá bán</th>}
              <th className="px-4 py-3 w-40 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map(p => {
              const isExpanded = expandedProductIds.has(p.id);
              return (
                <React.Fragment key={p.id}>
                  <tr className={`group transition-colors ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}>
                    {visibleColumns.image && (
                      <td className="px-4 py-2 text-center">
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-xl border border-slate-100 shadow-sm mx-auto" />
                      </td>
                    )}
                    <td className="px-4 py-2 cursor-pointer" onClick={() => toggleExpandRow(p.id)}>
                      <div className="font-bold text-slate-800 leading-tight text-[0.95rem] line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.name}</div>
                      {visibleColumns.sku && <div className="text-[10px] text-slate-400 font-mono uppercase font-bold tracking-tight mt-1">{p.sku}</div>}
                    </td>
                    {visibleColumns.category && (
                      <td className="px-4 py-2">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border border-slate-200">{p.category || '---'}</span>
                      </td>
                    )}
                    {visibleColumns.description && (
                      <td className="px-4 py-2">
                        <div className="text-[0.9rem] text-slate-400 line-clamp-1 italic">{p.description || '---'}</div>
                      </td>
                    )}
                    {visibleColumns.stock && (
                      <td className={`px-4 py-2 text-right font-bold text-[1rem] ${p.stock <= 0 ? 'text-rose-600' : p.stock <= 5 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </td>
                    )}
                    {visibleColumns.cost && <td className="px-4 py-2 text-right text-slate-400 font-semibold text-[0.9rem]">{p.cost.toLocaleString()}</td>}
                    {visibleColumns.price && <td className="px-4 py-2 text-right font-bold text-indigo-600 text-[1rem]">{p.price.toLocaleString()}</td>}
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(p)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"><Edit size={16} /></button>
                        <button onClick={() => { setBarcodeProduct(p); setIsBarcodeModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"><Printer size={16} /></button>
                        <button onClick={() => { setProductToDelete(p); setIsDeleteModalOpen(true); }} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={totalVisibleColumns} className="p-6 border-b border-indigo-100 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col lg:flex-row gap-8">
                          <div className="w-full lg:w-56 aspect-square bg-white rounded-3xl border border-slate-200 p-1.5 shadow-sm shrink-0">
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                              <div>
                                <h3 className="text-xl font-bold text-slate-800">{p.name}</h3>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 uppercase">{p.sku}</span>
                                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 uppercase">{p.category || 'CHƯA PHÂN LOẠI'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                              <div>
                                <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-200 pb-1">Mô tả sản phẩm</h4>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{p.description || "Chưa có mô tả chi tiết."}</p>
                              </div>
                              {p.specifications && Object.keys(p.specifications).length > 0 && (
                                <div>
                                  <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 border-b border-slate-200 pb-1">Thông số kỹ thuật</h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(p.specifications).map(([key, value]) => (
                                      <div key={key} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">{key}</div>
                                        <div className="text-xs font-bold text-slate-700">{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 uppercase tracking-widest text-[0.9rem]">{editingProduct ? 'Sửa sản phẩm' : 'Thêm mới sản phẩm'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-2 rounded-full border border-slate-100 bg-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 overflow-y-auto">
              {/* ... (Giữ nguyên form nhập liệu như cũ) ... */}
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-44 space-y-4">
                  <div className="aspect-square rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 relative group overflow-hidden">
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCcw className="animate-spin text-indigo-600" size={32} />
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">Đang tải...</span>
                      </div>
                    ) : formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={48} />
                    )}
                    {!isUploading && (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Upload size={24} />
                      </button>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã SKU</label>
                      <button type="button" onClick={autoGenerateSKU} className="text-indigo-600 hover:text-indigo-800 transition-colors"><RefreshCcw size={14} /></button>
                    </div>
                    <input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[0.9rem] font-bold uppercase tracking-tight" placeholder="AUTO-GENERATE" />
                  </div>
                </div>
                <div className="flex-1 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên hàng hóa *</label>
                    <input required value={formData.name} onChange={handleNameChange} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[1.1rem] font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm" placeholder="VD: Laptop Asus VivoBook..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân loại</label>
                      <input list="cats" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none" placeholder="VD: Laptop, PC..." />
                      <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tồn kho</label>
                      <input type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá vốn (Nhập)</label>
                      <input type="number" required value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 bg-slate-50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giá bán (Lẻ)</label>
                      <input type="number" required value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-indigo-700 bg-indigo-50/30" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thông số kỹ thuật</label>
                  <button type="button" onClick={addSpec} className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1 hover:underline"><ListPlus size={14} /> Thêm dòng</button>
                </div>
                {currentSpecs.map((spec, index) => (
                  <div key={index} className="flex gap-2">
                    <input value={spec.key} onChange={(e) => handleSpecChange(index, 'key', e.target.value)} className="w-1/3 px-3 py-2 border border-slate-200 rounded-xl text-[0.85rem] font-bold placeholder:font-normal" placeholder="Tên thông số (VD: CPU)" />
                    <input value={spec.value} onChange={(e) => handleSpecChange(index, 'value', e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-[0.85rem] placeholder:font-normal" placeholder="Giá trị" />
                    <button type="button" onClick={() => removeSpec(index)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
                {currentSpecs.length === 0 && (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[0.85rem] italic">Chưa có thông số nào.</div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mô tả chi tiết</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-[0.95rem] min-h-[120px]" placeholder="Nhập mô tả sản phẩm..." />
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-slate-400 uppercase text-[0.85rem] bg-slate-100 rounded-2xl tracking-widest transition-all hover:bg-slate-200">Hủy bỏ</button>
                <button type="submit" className="flex-[2] py-4 font-bold text-white uppercase text-[0.85rem] bg-slate-900 rounded-2xl tracking-widest shadow-xl shadow-slate-100 active:scale-95 transition-all">Lưu sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBarcodeModalOpen && barcodeProduct && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 uppercase tracking-widest text-[0.9rem]">Cấu hình in tem nhãn</h3>
              <button onClick={() => setIsBarcodeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full border border-slate-100 bg-white"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200" id="barcode-print-area">
                <div className="bg-white border border-slate-300 p-4 shadow-sm flex flex-col items-center justify-center w-56 text-center" id="barcode-preview">
                  {barcodeConfig.showShopName && <div className="text-[8px] font-bold uppercase mb-1 truncate w-full text-slate-500">{settings.shopName}</div>}
                  {barcodeConfig.showSKU && <div className="text-[10px] font-bold font-mono mb-1 tracking-tight text-slate-900">{barcodeProduct.sku}</div>}
                  <div className="w-full flex justify-center mb-1">
                    <Barcode
                      value={barcodeProduct.sku}
                      width={1.5}
                      height={40}
                      displayValue={false}
                      margin={0}
                      background="#ffffff"
                    />
                  </div>
                  {barcodeConfig.showPrice && <div className="text-sm font-black text-indigo-600">{barcodeProduct.price.toLocaleString()} đ</div>}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Tùy chọn hiển thị</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setBarcodeConfig(prev => ({ ...prev, showShopName: !prev.showShopName }))}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${barcodeConfig.showShopName ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    <span className="text-sm font-bold">Hiện tên Shop</span>
                    {barcodeConfig.showShopName && <Check size={16} />}
                  </button>
                  <button
                    onClick={() => setBarcodeConfig(prev => ({ ...prev, showSKU: !prev.showSKU }))}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${barcodeConfig.showSKU ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    <span className="text-sm font-bold">Hiện mã SKU (Phụ)</span>
                    {barcodeConfig.showSKU && <Check size={16} />}
                  </button>
                  <button
                    onClick={() => setBarcodeConfig(prev => ({ ...prev, showPrice: !prev.showPrice }))}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${barcodeConfig.showPrice ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
                  >
                    <span className="text-sm font-bold">Hiện giá bán</span>
                    {barcodeConfig.showPrice && <Check size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button onClick={() => setIsBarcodeModalOpen(false)} className="flex-1 py-4 font-bold text-slate-400 uppercase text-[0.85rem] bg-slate-100 rounded-2xl tracking-widest transition-all hover:bg-slate-200">Đóng</button>
                <button onClick={handlePrintBarcode} className="flex-[2] py-4 font-bold text-white uppercase text-[0.85rem] bg-indigo-600 rounded-2xl tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Printer size={18} /> Xác nhận in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-[320px] p-6 text-center space-y-4 shadow-2xl border border-rose-100">
            <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500 ring-4 ring-rose-50"><AlertTriangle size={28} /></div>
            <div className="space-y-1">
              <h3 className="text-[1.1rem] font-bold text-slate-900 uppercase">Xác nhận xóa?</h3>
              <p className="text-slate-500 text-[0.85rem]">Bạn có chắc muốn xóa sản phẩm <span className="font-bold text-slate-800">"{productToDelete.name}"</span> không?</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-[0.8rem] uppercase hover:bg-slate-200 transition-colors">Hủy bỏ</button>
              <button onClick={handleDeleteProduct} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl text-[0.8rem] uppercase shadow-lg shadow-rose-100 hover:bg-rose-700 transition-colors">Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
