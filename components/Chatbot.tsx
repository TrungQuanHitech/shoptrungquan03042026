
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, X, MessageSquare, BrainCircuit, Bot, User, Loader2, Trash2, GripVertical, FileText, ShoppingCart, Truck, Wallet, Users } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion } from "motion/react";
import { Product, Order, Purchase, Transaction, Contact, Settings } from '../types';

interface ChatbotProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  settings: Settings;
}

const Chatbot: React.FC<ChatbotProps> = ({ 
  products, setProducts, 
  orders, setOrders, 
  purchases, setPurchases, 
  transactions, setTransactions, 
  contacts, setContacts,
  settings 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string, isThinking?: boolean, isTool?: boolean}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const generateSystemContext = () => {
    return `Bạn là AI Business Tool - trợ lý điều hành cấp cao cho hệ thống SmartShop ERP. 
    Bạn KHÔNG CHỈ trả lời câu hỏi, mà còn có thể THỰC HIỆN các hành động nghiệp vụ thông qua các công cụ được cung cấp.

    QUY TẮC QUAN TRỌNG:
    1. LUÔN sử dụng dữ liệu thật từ hệ thống. KHÔNG BAO GIỜ bịa đặt số liệu báo cáo.
    2. Khi người dùng yêu cầu "bán hàng", "nhập hàng", "thêm khách hàng", "nhập thu chi", hãy sử dụng công cụ tương ứng.
    3. Sau khi thực hiện xong một hành động (gọi tool), hãy xác nhận rõ ràng cho người dùng.
    4. Nếu thiếu thông tin để thực hiện (ví dụ: bán hàng mà không biết tên sản phẩm), hãy hỏi lại người dùng.

    Dữ liệu hiện tại:
    - Sản phẩm: ${products.length} mặt hàng.
    - Đơn bán hàng: ${orders.length} đơn.
    - Đơn nhập hàng: ${purchases.length} đơn.
    - Khách hàng/NCC: ${contacts.length} đối tác.
    - Tổng doanh thu: ${orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} VNĐ.
    
    Bạn có quyền can thiệp trực tiếp vào dữ liệu web thông qua các hàm được cung cấp.`;
  };

  const tools = [
    {
      functionDeclarations: [
        {
          name: "get_business_report",
          description: "Lấy báo cáo chi tiết về tình hình kinh doanh (doanh thu, chi phí, lợi nhuận, nợ).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              period: { type: Type.STRING, description: "Khoảng thời gian (ví dụ: 'tháng này', 'hôm nay', 'tất cả')" }
            }
          }
        },
        {
          name: "add_new_order",
          description: "Thực hiện bán hàng (tạo đơn hàng mới).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              customer_name: { type: Type.STRING, description: "Tên khách hàng" },
              product_name: { type: Type.STRING, description: "Tên sản phẩm" },
              quantity: { type: Type.NUMBER, description: "Số lượng" },
              price: { type: Type.NUMBER, description: "Giá bán thực tế" },
              paid: { type: Type.NUMBER, description: "Số tiền khách đã trả" }
            },
            required: ["product_name", "quantity", "price"]
          }
        },
        {
          name: "add_new_purchase",
          description: "Thực hiện nhập hàng (tạo đơn nhập hàng mới).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              supplier_name: { type: Type.STRING, description: "Tên nhà cung cấp" },
              product_name: { type: Type.STRING, description: "Tên sản phẩm" },
              quantity: { type: Type.NUMBER, description: "Số lượng" },
              cost: { type: Type.NUMBER, description: "Giá nhập" },
              paid: { type: Type.NUMBER, description: "Số tiền đã trả NCC" }
            },
            required: ["product_name", "quantity", "cost"]
          }
        },
        {
          name: "add_new_transaction",
          description: "Ghi nhận một khoản thu hoặc chi tài chính.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["IN", "OUT"], description: "Loại giao dịch: IN (Thu), OUT (Chi)" },
              amount: { type: Type.NUMBER, description: "Số tiền" },
              description: { type: Type.STRING, description: "Nội dung thu chi" },
              category: { type: Type.STRING, description: "Phân loại (ví dụ: Vận hành, Lương, Mặt bằng)" }
            },
            required: ["type", "amount", "description"]
          }
        },
        {
          name: "add_new_contact",
          description: "Thêm mới một khách hàng hoặc nhà cung cấp vào danh sách đối tác.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Tên đối tác" },
              phone: { type: Type.STRING, description: "Số điện thoại" },
              type: { type: Type.STRING, enum: ["CUSTOMER", "SUPPLIER"], description: "Loại đối tác" }
            },
            required: ["name", "type"]
          }
        }
      ]
    }
  ];

  const handleFunctionCall = (call: any) => {
    const { name, args } = call;
    
    switch (name) {
      case "get_business_report":
        const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
        const totalCost = purchases.reduce((sum, p) => sum + p.total, 0);
        const totalDebt = contacts.reduce((sum, c) => sum + c.debt, 0);
        return JSON.stringify({
          status: "success",
          data: {
            total_sales: totalSales,
            total_purchases: totalCost,
            customer_debt: contacts.filter(c => c.type === 'CUSTOMER').reduce((sum, c) => sum + c.debt, 0),
            supplier_debt: contacts.filter(c => c.type === 'SUPPLIER').reduce((sum, c) => sum + c.debt, 0),
            inventory_value: products.reduce((sum, p) => sum + (p.stock * p.cost), 0)
          }
        });

      case "add_new_order":
        const product = products.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
        if (!product) return JSON.stringify({ status: "error", message: "Không tìm thấy sản phẩm này trong kho." });
        
        const orderId = `BH-AI-${Date.now()}`;
        const newOrder: Order = {
          id: orderId,
          date: new Date().toISOString(),
          items: [{ productId: product.id, quantity: args.quantity, price: args.price, cost: product.cost }],
          total: args.price * args.quantity,
          paid: args.paid || (args.price * args.quantity),
          debt: Math.max(0, (args.price * args.quantity) - (args.paid || (args.price * args.quantity))),
          customerId: contacts.find(c => c.name.toLowerCase().includes((args.customer_name || '').toLowerCase()))?.id || 'default'
        };
        
        setOrders(prev => [newOrder, ...prev]);
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - args.quantity } : p));
        if (newOrder.paid > 0) {
          setTransactions(prev => [{
            id: `TX-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'IN',
            amount: newOrder.paid,
            description: `AI: Bán hàng ${orderId}`,
            category: 'Bán hàng',
            relatedId: orderId
          }, ...prev]);
        }
        return JSON.stringify({ status: "success", message: `Đã tạo đơn hàng ${orderId} thành công.` });

      case "add_new_purchase":
        const pToBuy = products.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
        if (!pToBuy) return JSON.stringify({ status: "error", message: "Không tìm thấy sản phẩm này để nhập hàng." });
        
        const purchaseId = `NH-AI-${Date.now()}`;
        const newPurchase: Purchase = {
          id: purchaseId,
          date: new Date().toISOString(),
          items: [{ productId: pToBuy.id, quantity: args.quantity, cost: args.cost, price: pToBuy.price }],
          total: args.cost * args.quantity,
          paid: args.paid || (args.cost * args.quantity),
          debt: Math.max(0, (args.cost * args.quantity) - (args.paid || (args.cost * args.quantity))),
          supplierId: contacts.find(c => c.name.toLowerCase().includes((args.supplier_name || '').toLowerCase()))?.id || 'default'
        };
        
        setPurchases(prev => [newPurchase, ...prev]);
        setProducts(prev => prev.map(p => p.id === pToBuy.id ? { ...p, stock: p.stock + args.quantity, cost: args.cost } : p));
        return JSON.stringify({ status: "success", message: `Đã nhập hàng ${purchaseId} thành công.` });

      case "add_new_transaction":
        const tx: Transaction = {
          id: `TX-AI-${Date.now()}`,
          date: new Date().toISOString(),
          type: args.type as 'IN' | 'OUT',
          amount: args.amount,
          description: args.description,
          category: args.category || 'Khác'
        };
        setTransactions(prev => [tx, ...prev]);
        return JSON.stringify({ status: "success", message: "Đã ghi nhận giao dịch tài chính thành công." });

      case "add_new_contact":
        const newContact: Contact = {
          id: `C-AI-${Date.now()}`,
          name: args.name,
          phone: args.phone || '',
          type: args.type as 'CUSTOMER' | 'SUPPLIER',
          debt: 0
        };
        setContacts(prev => [newContact, ...prev]);
        return JSON.stringify({ status: "success", message: `Đã thêm đối tác ${args.name} thành công.` });

      default:
        return JSON.stringify({ status: "error", message: "Công cụ không tồn tại." });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelName = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
      
      const config: any = {
        systemInstruction: generateSystemContext(),
        tools: tools
      };

      if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: userMessage,
        config: config
      });

      if (response.functionCalls) {
        const toolResults = response.functionCalls.map(call => ({
          name: call.name,
          response: handleFunctionCall(call)
        }));

        // Send results back to model for final response
        const finalResponse = await ai.models.generateContent({
          model: modelName,
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
            { role: 'model', parts: response.candidates[0].content.parts },
            { role: 'user', parts: toolResults.map(res => ({
                functionResponse: {
                  name: res.name,
                  response: { result: res.response }
                }
              }))
            }
          ],
          config: config
        });

        const finalText = finalResponse.text || "Đã thực hiện xong yêu cầu của bạn.";
        setMessages(prev => [...prev, { role: 'model', content: finalText, isThinking: useThinking, isTool: true }]);
      } else {
        const text = response.text || "Xin lỗi, tôi không thể xử lý yêu cầu này.";
        setMessages(prev => [...prev, { role: 'model', content: text, isThinking: useThinking }]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', content: "Có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Vui lòng kiểm tra lại cấu hình API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Draggable Floating Toggle Button */}
      <motion.button 
        drag
        dragMomentum={false}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group no-print cursor-move"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
      </motion.button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-[100] flex flex-col animate-in slide-in-from-right duration-300 no-print border-l border-slate-200">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <BrainCircuit size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  AI Business Tool
                  <span className="bg-indigo-500 text-[8px] px-1.5 py-0.5 rounded-full">PRO</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Hệ thống đã sẵn sàng can thiệp</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Quick Actions Bar */}
          <div className="bg-slate-800 p-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-700">
            <button onClick={() => setInput("Xuất báo cáo doanh thu tổng quát")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap"><FileText size={12}/> Báo cáo</button>
            <button onClick={() => setInput("Bán 1 sản phẩm [Tên SP] cho khách hàng [Tên KH]")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap"><ShoppingCart size={12}/> Bán hàng</button>
            <button onClick={() => setInput("Nhập thêm 10 [Tên SP] từ nhà cung cấp [Tên NCC]")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap"><Truck size={12}/> Nhập hàng</button>
            <button onClick={() => setInput("Ghi nhận chi phí tiền điện 500k")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap"><Wallet size={12}/> Thu chi</button>
            <button onClick={() => setInput("Thêm khách hàng mới: [Tên] - [SĐT]")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap"><Users size={12}/> Đối tác</button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-indigo-500 border border-slate-100">
                  <Bot size={40} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">AI Tool Điều Hành</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Tôi có thể giúp bạn thực hiện các tác vụ ERP trực tiếp bằng giọng lệnh. Hãy thử yêu cầu tôi bán hàng hoặc xuất báo cáo.</p>
                </div>
                <div className="w-full p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-left space-y-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gợi ý lệnh:</p>
                  <ul className="text-[11px] text-indigo-700 space-y-1 font-medium">
                    <li>• "Bán 2 Laptop Dell cho anh Quân giá 32tr"</li>
                    <li>• "Nhập 5 Máy in Canon giá 3.2tr từ Viễn Sơn"</li>
                    <li>• "Chi 2 triệu tiền thuê mặt bằng tháng này"</li>
                    <li>• "Thêm khách hàng mới: Chị Lan - 0905123456"</li>
                  </ul>
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-2xl p-4 shadow-md ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
                  {msg.role === 'model' && (
                    <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                        {msg.isTool ? <Sparkles size={10} /> : <Bot size={10} />}
                        {msg.isTool ? "Action Executed" : "AI Response"}
                      </div>
                      {msg.isThinking && <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded">Deep Analysis</span>}
                    </div>
                  )}
                  <p className="text-[0.85rem] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-bl-none shadow-md flex items-center gap-3">
                  <div className="relative">
                    <Loader2 size={20} className="animate-spin text-indigo-600" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-1 bg-indigo-600 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI đang xử lý nghiệp vụ...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-3">
              <button 
                onClick={() => setUseThinking(!useThinking)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${useThinking ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
              >
                <BrainCircuit size={14} /> Phân tích chuyên sâu
              </button>
              <button onClick={() => setMessages([])} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Nhập lệnh điều hành (VD: Bán hàng, Nhập hàng...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-10 py-3.5 text-sm focus:ring-4 focus:ring-indigo-50 outline-none font-bold transition-all placeholder:font-normal placeholder:text-slate-400"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <MessageSquare size={18} />
                </div>
              </div>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
               <p className="text-[8px] text-slate-300 uppercase font-black tracking-[0.2em]">Enterprise AI Tool v2.0</p>
               <div className="h-px w-8 bg-slate-100"></div>
               <p className="text-[8px] text-slate-300 uppercase font-black tracking-[0.2em]">Secure Data Access</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
