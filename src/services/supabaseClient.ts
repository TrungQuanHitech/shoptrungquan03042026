import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Settings } from '../../types';

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export const getSupabaseClient = (settings: Settings): SupabaseClient | null => {
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
        return null;
    }

    // Recreate client if url or key changes
    if (!supabaseInstance ||
        currentUrl !== settings.supabaseUrl ||
        currentKey !== settings.supabaseAnonKey) {
        supabaseInstance = createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
            auth: {
                persistSession: false // No need for standard auth in this app pattern
            }
        });
        currentUrl = settings.supabaseUrl;
        currentKey = settings.supabaseAnonKey;
    }

    return supabaseInstance;
};

// Hàm kiểm tra kết nối Supabase
export const verifySupabaseConnection = async (settings: Settings): Promise<boolean> => {
    try {
        const supabase = getSupabaseClient(settings);
        if (!supabase) return false;

        // Gọi thử một count trên bảng products để xem có báo lỗi cấu hình/RLS/Network hay không
        const { error } = await supabase.from('products').select('*', { count: 'exact', head: true });

        // Nếu có lỗi, kết nối không thành công
        if (error) {
            console.error("Supabase Connection Error:", error);
            return false;
        }

        return true;
    } catch (err) {
        console.error("Supabase Init Error:", err);
        return false;
    }
};
