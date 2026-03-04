# 📜 TÀI LIỆU CHỈ TIÊU KỸ THUẬT & LOGIC (APP SPECIFICATION)
*Hệ thống SmartShop ERP & POS - Phiên bản Toàn diện*

> **Lưu ý cho AI/Developer:** Đây là file tham chiếu bắt buộc. Mọi thay đổi về code hoặc tính năng mới phải tuân thủ các logic và cấu trúc được liệt kê dưới đây để đảm bảo tính đồng bộ của hệ thống.

---

## 🚀 1. TỔNG QUAN HỆ THỐNG (MASTER PROMPT)

**Mục tiêu:** Ứng dụng Single Page Application (SPA) quản trị doanh nghiệp (ERP) và điểm bán hàng (POS) chuyên sâu cho thiết bị công nghệ và dịch vụ kỹ thuật.

### Công nghệ chủ đạo:
- **Frontend:** React 18/19, TypeScript, Vite.
- **Styling:** Tailwind CSS (Modern, Premium Look).
- **Icons & Motion:** Lucide React, Framer Motion.
- **Persistence:** LocalStorage (Lưu trữ bền vững tại trình duyệt).
- **Integrations:** Google GenAI (Gemini), Telegram Bot API, Google Apps Script.

### Cấu trúc dữ liệu cốt lõi:
- **Sản phẩm:** ID, Tên, SKU, Tồn kho, Giá vốn, Giá bán, Danh mục, Thông số kỹ thuật.
- **Đơn hàng:** ID (BH-DDMMYYXXX), Ngày, Khách hàng, Tổng tiền, VAT, Thanh toán, Công nợ.
- **Đối tác:** ID, Tên, SĐT, Loại (Khách/NCC), Tổng nợ hiện tại.
- **Dịch vụ:** Phiếu sửa chữa (Trạng thái, Lỗi, Phí) & Hợp đồng cho thuê (Counter, Giá trang).

---

## 🔢 2. CÁC LUỒNG TÍNH TOÁN & LOGIC NGHIỆP VỤ (CALCULATION FLOWS)

### A. Phân hệ Bán hàng (POS)
1. **Thành tiền mặt hàng** = `Số lượng * Giá bán`.
2. **Tổng cộng (Chưa thuế)** = `Σ Thành tiền các mặt hàng`.
3. **Tiền thuế VAT** = `Tổng cộng * (Tỉ lệ thuế / 100)`.
4. **Tổng thanh toán** = `Tổng cộng + Tiền thuế VAT`.
5. **Tiền nợ khách hàng** = `Tổng thanh toán - Tiền khách đã trả`.
6. **Liên kết:** 
   - Hoàn tất đơn -> Trừ `Tồn kho`.
   - Nếu `Trả tiền > 0` -> Tạo giao dịch `THU (IN)` vào Sổ quỹ.
   - Nếu `Nợ > 0` -> Cộng vào `Công nợ` của Khách hàng.

### B. Phân hệ Nhập hàng (Purchases)
1. **Thành tiền nhập** = `Số lượng * Giá vốn`.
2. **Tổng cộng đơn nhập** = `Σ Thành tiền nhập + Thuế VAT`.
3. **Tiền nợ nhà cung cấp** = `Tổng cộng đơn nhập - Tiền đã trả`.
4. **Liên kết:**
   - Hoàn tất đơn -> Cộng `Tồn kho`.
   - Nếu `Trả tiền > 0` -> Tạo giao dịch `CHI (OUT)` vào Sổ quỹ.
   - Nếu `Nợ > 0` -> Cộng vào `Công nợ` của Nhà cung cấp.

### C. Phân hệ Dịch vụ (Services)
- **Sửa chữa:** `Tổng chi phí = Chi phí linh kiện + Tiền công`.
- **Cho thuê máy:**
  - `Số trang vượt` = `Chỉ số mới - Chỉ số cũ - Hạn mức miễn phí` (Nếu kết quả < 0 thì = 0).
  - `Tiền vượt` = `Số trang vượt * Giá mỗi trang`.
  - `Tổng hóa đơn` = `Giá thuê cố định + Tiền vượt`.

### D. Tài chính & Báo cáo
- **Số dư quỹ** = `Tổng Thu - Tổng Chi`.
- **Lợi nhuận gộp đơn hàng** = `Tổng cộng bán - (Số lượng * Giá vốn)`.
- **Lợi nhuận ròng** = `Doanh thu thuần - Tổng vốn - Chi phí vận hành (từ Sổ quỹ)`.

---

## 📊 3. TIÊU CHUẨN ĐỒNG BỘ GOOGLE SHEET (SYNC STANDARDS)

Hệ thống đồng bộ phải đảm bảo dữ liệu được phân tách vào các Sheet chuyên biệt:

1. **📦 Sản_phẩm:** Lưu trữ danh mục hàng hóa và tồn kho hiện tại.
2. **💰 Đơn_bán_hàng:** Nhật ký bán lẻ và tình trạng thanh toán của khách.
3. **🛒 Đơn_nhập_hàng:** Nhật ký nhập kho và công nợ nhà cung cấp.
4. **💸 Sổ_quỹ:** Toàn bộ biến động tiền mặt (Thu/Chi).
5. **👥 Đối_tác:** Danh sách khách hàng, nhà cung cấp và tổng nợ lũy kế.
6. **🛠 Sửa_chữa & Cho_thuê:** Theo dõi trạng thái thiết bị và hợp đồng dịch vụ.

---

## 🎨 4. QUY TẮC UI/UX & TRẢI NGHIỆM
- **Màu sắc:** Sử dụng hệ màu Indigo/Slate (Premium).
- **Tương tác:** Mọi hành động quan trọng (Xóa dữ liệu, Lưu cấu hình) phải có thông báo xác nhận.
- **In ấn:** Tối ưu hóa giao diện in cho Hóa đơn và Phiếu sửa chữa (Ẩn các thành phần thừa như Sidebar/Header).
- **Responsive:** Ưu tiên hiển thị dạng lưới (Grid) trên Desktop và dạng danh sách (List/Card) trên Mobile.

---
*Tài liệu này được cập nhật lần cuối vào: 2026-03-03*
