import { Settings, Product, Order, Purchase, Transaction, Contact, RepairTicket, RentalContract } from '../../types';
import { getSupabaseClient } from './supabaseClient';

export interface SyncData {
    products: Product[];
    orders: Order[];
    purchases: Purchase[];
    transactions: Transaction[];
    contacts: Contact[];
    repairTickets: RepairTicket[];
    rentalContracts: RentalContract[];
}

export const pushToSupabase = async (settings: Settings, data: SyncData): Promise<boolean> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return false;

    try {
        // 1. App Settings
        // Lưu các biến môi trường không nhạy cảm (bỏ accessToken và keys)
        const safeSettings = { ...settings };
        delete safeSettings.googleAccessToken;
        delete safeSettings.supabaseAnonKey;
        delete safeSettings.groqApiKey;

        await supabase.from('app_settings').upsert({
            id: 'default',
            settings: safeSettings,
            updated_at: new Date().toISOString()
        });

        // 2. Products
        if (data.products.length > 0) {
            const formattedProducts = data.products.map(p => ({
                id: p.id,
                name: p.name,
                sku: p.sku || null,
                stock: p.stock || 0,
                cost: p.cost || 0,
                price: p.price || 0,
                category: p.category || null,
                image_url: p.imageUrl || null,
                description: p.description || null,
                warranty: p.warranty || null,
                specifications: p.specifications || {},
                updated_at: new Date().toISOString()
            }));
            await supabase.from('products').upsert(formattedProducts);
        }

        // 3. Orders
        if (data.orders.length > 0) {
            const formattedOrders = data.orders.map(o => ({
                id: o.id,
                date: o.date,
                items: o.items,
                total: o.total,
                paid: o.paid,
                debt: o.debt,
                customer_id: o.customerId || null,
                tax_rate: o.taxRate || 0,
                tax_amount: o.taxAmount || 0,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('orders').upsert(formattedOrders);
        }

        // 4. Purchases
        if (data.purchases.length > 0) {
            const formattedPurchases = data.purchases.map(p => ({
                id: p.id,
                date: p.date,
                items: p.items,
                total: p.total,
                paid: p.paid,
                debt: p.debt,
                supplier_id: p.supplierId || null,
                tax_rate: p.taxRate || 0,
                tax_amount: p.taxAmount || 0,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('purchases').upsert(formattedPurchases);
        }

        // 5. Transactions
        if (data.transactions.length > 0) {
            const formattedTxs = data.transactions.map(t => ({
                id: t.id,
                date: t.date,
                type: t.type,
                amount: t.amount,
                description: t.description || null,
                category: t.category || null,
                related_id: t.relatedId || null,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('transactions').upsert(formattedTxs);
        }

        // 6. Contacts
        if (data.contacts.length > 0) {
            const formattedContacts = data.contacts.map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone || null,
                type: c.type,
                debt: c.debt || 0,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('contacts').upsert(formattedContacts);
        }

        // 7. Repair Tickets
        if (data.repairTickets.length > 0) {
            const formattedTickets = data.repairTickets.map(t => ({
                id: t.id,
                date: t.date,
                customer_id: t.customerId,
                device_name: t.deviceName,
                issue_description: t.issueDescription || null,
                status: t.status,
                estimated_cost: t.estimatedCost || null,
                technician_notes: t.technicianNotes || null,
                parts_used: t.partsUsed || null,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('repair_tickets').upsert(formattedTickets);
        }

        // 8. Rental Contracts
        if (data.rentalContracts.length > 0) {
            const formattedContracts = data.rentalContracts.map(c => ({
                id: c.id,
                customer_id: c.customerId,
                machine_name: c.machineName,
                model: c.model || null,
                start_date: c.startDate,
                rental_price: c.rentalPrice,
                free_copies_limit: c.freeCopiesLimit || null,
                current_counter: c.currentCounter || null,
                price_per_page: c.pricePerPage || null,
                last_bill_date: c.lastBillDate || null,
                updated_at: new Date().toISOString()
            }));
            await supabase.from('rental_contracts').upsert(formattedContracts);
        }

        return true;
    } catch (error) {
        console.error("Supabase Push Error:", error);
        return false;
    }
};

export const pullFromSupabase = async (settings: Settings): Promise<Partial<SyncData> | null> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return null;

    try {
        const data: Partial<SyncData> = {};

        // Pull queries
        const [
            { data: products }, { data: orders }, { data: purchases },
            { data: transactions }, { data: contacts }, { data: repairTickets }, { data: rentalContracts }
        ] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('purchases').select('*'),
            supabase.from('transactions').select('*'),
            supabase.from('contacts').select('*'),
            supabase.from('repair_tickets').select('*'),
            supabase.from('rental_contracts').select('*')
        ]);

        if (products) {
            data.products = products.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                stock: Number(p.stock) || 0,
                cost: Number(p.cost) || 0,
                price: Number(p.price) || 0,
                category: p.category || '',
                imageUrl: p.image_url || '',
                description: p.description || '',
                warranty: p.warranty || '',
                specifications: p.specifications || {}
            }));
        }

        if (orders) {
            data.orders = orders.map((o: any) => ({
                id: o.id,
                date: o.date,
                items: o.items || [],
                total: Number(o.total) || 0,
                paid: Number(o.paid) || 0,
                debt: Number(o.debt) || 0,
                customerId: o.customer_id || '',
                taxRate: Number(o.tax_rate) || 0,
                taxAmount: Number(o.tax_amount) || 0
            }));
        }

        if (purchases) {
            data.purchases = purchases.map((p: any) => ({
                id: p.id,
                date: p.date,
                items: p.items || [],
                total: Number(p.total) || 0,
                paid: Number(p.paid) || 0,
                debt: Number(p.debt) || 0,
                supplierId: p.supplier_id || '',
                taxRate: Number(p.tax_rate) || 0,
                taxAmount: Number(p.tax_amount) || 0
            }));
        }

        if (transactions) {
            data.transactions = transactions.map((t: any) => ({
                id: t.id,
                date: t.date,
                type: t.type as 'IN' | 'OUT',
                amount: Number(t.amount) || 0,
                description: t.description || '',
                category: t.category || '',
                relatedId: t.related_id || ''
            }));
        }

        if (contacts) {
            data.contacts = contacts.map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone || '',
                type: c.type as 'CUSTOMER' | 'SUPPLIER',
                debt: Number(c.debt) || 0
            }));
        }

        if (repairTickets) {
            data.repairTickets = repairTickets.map((t: any) => ({
                id: t.id,
                date: t.date,
                customerId: t.customer_id,
                deviceName: t.device_name,
                issueDescription: t.issue_description || '',
                status: t.status,
                estimatedCost: t.estimated_cost ? Number(t.estimated_cost) : undefined,
                technicianNotes: t.technician_notes || '',
                partsUsed: t.parts_used || ''
            }));
        }

        if (rentalContracts) {
            data.rentalContracts = rentalContracts.map((c: any) => ({
                id: c.id,
                customerId: c.customer_id,
                machineName: c.machine_name,
                model: c.model || '',
                startDate: c.start_date,
                rentalPrice: Number(c.rental_price) || 0,
                freeCopiesLimit: c.free_copies_limit ? Number(c.free_copies_limit) : undefined,
                currentCounter: c.current_counter ? Number(c.current_counter) : undefined,
                pricePerPage: c.price_per_page ? Number(c.price_per_page) : undefined,
                lastBillDate: c.last_bill_date || undefined
            }));
        }

        return data;
    } catch (error) {
        console.error("Supabase Pull Error:", error);
        return null;
    }
};

export const pullSettingsFromSupabase = async (settings: Settings): Promise<Partial<Settings> | null> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return null;
    try {
        const { data, error } = await supabase.from('app_settings').select('settings').eq('id', 'default').single();
        if (!error && data && data.settings) {
            return data.settings as Partial<Settings>;
        }
        return null;
    } catch (error) {
        console.error("Fetch Supabase settings error:", error);
        return null;
    }
};

export const clearSupabaseData = async (settings: Settings): Promise<boolean> => {
    const supabase = getSupabaseClient(settings);
    if (!supabase) return false;

    try {
        const tables = [
            'products',
            'orders',
            'purchases',
            'transactions',
            'contacts',
            'repair_tickets',
            'rental_contracts'
        ];

        // Delete all rows from each table
        // Note: Using a condition that is always true for IDs (assuming UUID or non-zero strings)
        const deletePromises = tables.map(table => 
            supabase.from(table).delete().neq('id', '0')
        );

        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error("Supabase Clear Data Error:", error);
        return false;
    }
};
