declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

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
                scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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

                        resolve({
                            accessToken: resp.access_token,
                            user: {
                                email: userInfo.email,
                                name: userInfo.name,
                                picture: userInfo.picture,
                            }
                        });
                    } catch (e) {
                        console.error('Failed to get user info', e);
                        // Even if getting user info fails, we still have the token
                        resolve({ accessToken: resp.access_token, user: null });
                    }
                }
            });
            client.requestAccessToken();
        } catch (e: any) {
            reject(new Error('Lỗi khởi tạo Google Client: ' + e?.message));
        }
    });
};

export const signOutGoogle = (accessToken?: string) => {
    if (accessToken && window.google?.accounts) {
        window.google.accounts.oauth2.revoke(accessToken, () => { });
    }
};
