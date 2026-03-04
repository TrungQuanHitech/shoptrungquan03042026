declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

export const loadGIS = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
    });
};

export const signInWithGoogle = async (clientId: string): Promise<any> => {
    if (!clientId) {
        throw new Error('Thiếu Google Client ID');
    }

    await loadGIS();

    return new Promise((resolve, reject) => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: async (resp: any) => {
                    if (resp.error) {
                        reject(new Error(resp.error));
                        return;
                    }
                    try {
                        // Get user info
                        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${resp.access_token}` }
                        });
                        const userInfo = await userInfoResponse.json();

                        // Calculate expiry time (expires_in is in seconds, typically 3600)
                        const expiresIn = resp.expires_in ?? 3600;
                        const tokenExpiry = Date.now() + (expiresIn - 120) * 1000; // Trừ 2 phút buffer

                        resolve({
                            accessToken: resp.access_token,
                            tokenExpiry,
                            user: {
                                email: userInfo.email,
                                name: userInfo.name,
                                picture: userInfo.picture,
                            }
                        });
                    } catch (e) {
                        console.error('Failed to get user info', e);
                        const expiresIn = resp.expires_in ?? 3600;
                        const tokenExpiry = Date.now() + (expiresIn - 120) * 1000;
                        resolve({ accessToken: resp.access_token, tokenExpiry, user: null });
                    }
                }
            });
            client.requestAccessToken();
        } catch (e: any) {
            reject(new Error('Lỗi khởi tạo Google Client: ' + e?.message));
        }
    });
};

/**
 * Silent token refresh - không hiện popup nếu đã có phiên đăng nhập.
 * Trả về token mới hoặc throw nếu cần đăng nhập lại.
 */
export const refreshGoogleToken = async (clientId: string): Promise<{ accessToken: string; tokenExpiry: number }> => {
    if (!clientId) throw new Error('Thiếu Google Client ID');

    await loadGIS();

    return new Promise((resolve, reject) => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                prompt: '', // Empty string = silent, no popup
                callback: (resp: any) => {
                    if (resp.error) {
                        reject(new Error(`Token refresh failed: ${resp.error}`));
                        return;
                    }
                    const expiresIn = resp.expires_in ?? 3600;
                    const tokenExpiry = Date.now() + (expiresIn - 120) * 1000;
                    resolve({ accessToken: resp.access_token, tokenExpiry });
                }
            });
            client.requestAccessToken();
        } catch (e: any) {
            reject(new Error('Lỗi làm mới token: ' + e?.message));
        }
    });
};

/**
 * Kiểm tra token còn hạn không; nếu sắp hết thì tự động làm mới.
 * Nếu không thể làm mới (cần đăng nhập lại), throw lỗi rõ ràng.
 */
export const getValidToken = async (
    currentToken: string | undefined,
    tokenExpiry: number | undefined,
    clientId: string | undefined
): Promise<{ accessToken: string; tokenExpiry: number; refreshed: boolean }> => {
    // Token còn hạn (có ít nhất 2 phút)
    if (currentToken && tokenExpiry && Date.now() < tokenExpiry) {
        return { accessToken: currentToken, tokenExpiry, refreshed: false };
    }

    // Token hết hạn - thử làm mới
    if (!clientId) {
        throw new Error('Token đã hết hạn. Vui lòng kết nối lại Google!');
    }

    try {
        const refreshed = await refreshGoogleToken(clientId);
        return { ...refreshed, refreshed: true };
    } catch (e: any) {
        throw new Error('Token đã hết hạn. Vui lòng nhấn "Kết nối Google" để đăng nhập lại.');
    }
};

export const signOutGoogle = (accessToken?: string) => {
    if (accessToken && window.google?.accounts) {
        window.google.accounts.oauth2.revoke(accessToken, () => { });
    }
};
