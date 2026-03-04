
import React from 'react';
import { Product, Order, Purchase, Transaction, Contact, Settings } from '../types';

const styles: { [key: string]: React.CSSProperties } = {
    page: { fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#333' },
    header: { textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' },
    shopName: { fontSize: '16px', fontWeight: 'bold', margin: 0 },
    shopInfo: { fontSize: '9px', margin: '2px 0' },
    reportTitle: { fontSize: '14px', fontWeight: 'bold', margin: '20px 0 5px 0' },
    reportDate: { fontSize: '9px', fontStyle: 'italic', color: '#666', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '9px' },
    th: { border: '1px solid #ddd', padding: '6px', backgroundColor: '#f2f2f2', fontWeight: 'bold', textAlign: 'left' },
    td: { border: '1px solid #ddd', padding: '6px' },
    summary: { marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px', width: '300px', marginLeft: 'auto', fontSize: '10px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0' },
    summaryLabel: { color: '#555' },
    summaryValue: { fontWeight: 'bold' },
    footer: { marginTop: '30px', textAlign: 'center', fontSize: '8px', color: '#999' },
    sectionTitle: { fontSize: '12px', fontWeight: 'bold', marginTop: '20px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }
};

const ReportShell: React.FC<{ title: string; settings: Settings; children: React.ReactNode }> = ({ title, settings, children }) => (
    <div style={styles.page}>
        <div style={styles.header}>
            <h1 style={styles.shopName}>{settings.shopName}</h1>
            <p style={styles.shopInfo}>{settings.address}</p>
            <p style={styles.shopInfo}>Hotline: {settings.phone}</p>
        </div>
        <h2 style={styles.reportTitle}>{title}</h2>
        <p style={styles.reportDate}>Ngày xuất báo cáo: {new Date().toLocaleString('vi-VN')}</p>
        {children}
        <div style={styles.footer}>
            <p>Báo cáo được tạo tự động từ hệ thống SmartShop ERP</p>
        </div>
    </div>
);

export const SalesTodayReport: React.FC<{ orders: Order[], products: Product[], contacts: Contact[], settings: Settings }> = ({ orders, products, contacts, settings }) => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paid, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);

    return (
        <ReportShell title="Báo Cáo Doanh Thu Bán Hàng Trong Ngày" settings={settings}>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Mã Đơn</th>
                        <th style={styles.th}>Thời gian</th>
                        <th style={styles.th}>Khách hàng</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Tổng Tiền</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Đã Trả</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Còn Nợ</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(order => {
                        const customer = contacts.find(c => c.id === order.customerId);
                        return (
                            <tr key={order.id}>
                                <td style={styles.td}>{order.id}</td>
                                <td style={styles.td}>{new Date(order.date).toLocaleTimeString('vi-VN')}</td>
                                <td style={styles.td}>{customer?.name || 'Khách lẻ'}</td>
                                <td style={{...styles.td, textAlign: 'right'}}>{order.total.toLocaleString()}</td>
                                <td style={{...styles.td, textAlign: 'right'}}>{order.paid.toLocaleString()}</td>
                                <td style={{...styles.td, textAlign: 'right', color: order.debt > 0 ? 'red' : 'inherit'}}>{order.debt.toLocaleString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div style={styles.summary}>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Tổng số đơn:</span> <span style={styles.summaryValue}>{orders.length}</span></div>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Tổng doanh thu:</span> <span style={styles.summaryValue}>{totalRevenue.toLocaleString()} đ</span></div>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Thực thu:</span> <span style={{...styles.summaryValue, color: 'green'}}>{totalPaid.toLocaleString()} đ</span></div>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Nợ phát sinh:</span> <span style={{...styles.summaryValue, color: 'red'}}>{totalDebt.toLocaleString()} đ</span></div>
            </div>
        </ReportShell>
    );
};

export const DebtReport: React.FC<{ contacts: Contact[], settings: Settings }> = ({ contacts, settings }) => {
    const customerDebts = contacts.filter(c => c.type === 'CUSTOMER' && c.debt > 0);
    const supplierDebts = contacts.filter(c => c.type === 'SUPPLIER' && c.debt > 0);
    const totalCustomerDebt = customerDebts.reduce((sum, c) => sum + c.debt, 0);
    const totalSupplierDebt = supplierDebts.reduce((sum, c) => sum + c.debt, 0);

    return (
        <ReportShell title="Báo Cáo Tổng Hợp Công Nợ" settings={settings}>
            <h3 style={styles.sectionTitle}>Công nợ Phải Thu (Khách hàng)</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Tên Khách Hàng</th>
                        <th style={styles.th}>Số điện thoại</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Số tiền nợ</th>
                    </tr>
                </thead>
                <tbody>
                    {customerDebts.map(c => (
                        <tr key={c.id}>
                            <td style={styles.td}>{c.name}</td>
                            <td style={styles.td}>{c.phone}</td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{c.debt.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{...styles.summary, width: '200px'}}>
               <div style={{...styles.summaryRow, color: 'green'}}><span style={styles.summaryLabel}>Tổng phải thu:</span> <span style={styles.summaryValue}>{totalCustomerDebt.toLocaleString()} đ</span></div>
            </div>

            <h3 style={styles.sectionTitle}>Công nợ Phải Trả (Nhà cung cấp)</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Tên Nhà Cung Cấp</th>
                        <th style={styles.th}>Số điện thoại</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Số tiền nợ</th>
                    </tr>
                </thead>
                <tbody>
                    {supplierDebts.map(c => (
                        <tr key={c.id}>
                            <td style={styles.td}>{c.name}</td>
                            <td style={styles.td}>{c.phone}</td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>{c.debt.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
             <div style={{...styles.summary, width: '200px'}}>
               <div style={{...styles.summaryRow, color: 'red'}}><span style={styles.summaryLabel}>Tổng phải trả:</span> <span style={styles.summaryValue}>{totalSupplierDebt.toLocaleString()} đ</span></div>
            </div>
        </ReportShell>
    );
};

export const InventoryReport: React.FC<{ products: Product[], settings: Settings }> = ({ products, settings }) => {
    const lowStockProducts = products.filter(p => p.stock <= 5).sort((a,b) => a.stock - b.stock);
    const inventoryValue = products.reduce((sum, p) => sum + p.cost * p.stock, 0);

    return (
        <ReportShell title="Báo Cáo Tình Hình Tồn Kho" settings={settings}>
                          <h3 style={styles.sectionTitle}>Cảnh báo Tồn kho thấp ({'<= 5'})</h3>
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>SKU</th>
                        <th style={styles.th}>Tên Sản Phẩm</th>
                        <th style={{...styles.th, textAlign: 'center'}}>Tồn Kho</th>
                    </tr>
                </thead>
                <tbody>
                    {lowStockProducts.map(p => (
                        <tr key={p.id}>
                            <td style={styles.td}>{p.sku}</td>
                            <td style={styles.td}>{p.name}</td>
                            <td style={{...styles.td, textAlign: 'center', fontWeight: 'bold', color: 'red'}}>{p.stock}</td>
                        </tr>
                    ))}
                    {lowStockProducts.length === 0 && (
                        <tr><td colSpan={3} style={styles.td}>Không có sản phẩm nào sắp hết hàng.</td></tr>
                    )}
                </tbody>
            </table>
            <div style={styles.summary}>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Tổng số loại sản phẩm:</span> <span style={styles.summaryValue}>{products.length}</span></div>
                <div style={styles.summaryRow}><span style={styles.summaryLabel}>Tổng giá trị tồn kho (giá vốn):</span> <span style={styles.summaryValue}>{inventoryValue.toLocaleString()} đ</span></div>
            </div>
        </ReportShell>
    );
};
