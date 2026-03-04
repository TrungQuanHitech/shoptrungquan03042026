import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: "smartshop-erp-secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true
    }
  }));

  // Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const { clientId, clientSecret } = req.query;
    const cId = (clientId as string) || process.env.GOOGLE_CLIENT_ID;
    const cSecret = (clientSecret as string) || process.env.GOOGLE_CLIENT_SECRET;

    let stateStr = '';
    if (clientId || clientSecret) {
      const stateObj = { clientId: cId, clientSecret: cSecret };
      stateStr = Buffer.from(JSON.stringify(stateObj)).toString('base64');
    }

    const client = new google.auth.OAuth2(
      cId,
      cSecret,
      `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
    );

    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets"
      ],
      prompt: "consent",
      state: stateStr || undefined
    });
    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    try {
      let cId = process.env.GOOGLE_CLIENT_ID;
      let cSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (state) {
        try {
          const stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString('ascii'));
          if (stateObj.clientId) cId = stateObj.clientId;
          if (stateObj.clientSecret) cSecret = stateObj.clientSecret;
        } catch (e) {
          console.error("State parse error", e);
        }
      }

      const client = new google.auth.OAuth2(
        cId,
        cSecret,
        `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`
      );

      const { tokens } = await client.getToken(code as string);
      // In a real app, store these tokens securely (e.g., in a database)
      // For this demo, we'll pass them back to the client or store in session
      (req.session as any).tokens = tokens;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Đăng nhập thành công! Cửa sổ này sẽ tự đóng.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Google API Routes
  app.post("/api/google/setup", async (req, res) => {
    const { tokens, shopName } = req.body;
    if (!tokens) return res.status(401).json({ error: "Unauthorized" });

    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    try {
      // 1. Create Folder for Images
      const folderMetadata = {
        name: `SmartShop_Images_${shopName}`,
        mimeType: "application/vnd.google-apps.folder",
      };
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: "id",
      });
      const folderId = folder.data.id;

      // 2. Create Spreadsheet
      const spreadsheetMetadata = {
        properties: {
          title: `SmartShop_ERP_${shopName}`,
        },
      };
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: spreadsheetMetadata,
        fields: "spreadsheetId",
      });
      const spreadsheetId = spreadsheet.data.spreadsheetId;

      // 3. Setup Sheets (Tabs)
      const requests = [
        { addSheet: { properties: { title: "DASHBOARD" } } },
        { addSheet: { properties: { title: "PRODUCTS" } } },
        { addSheet: { properties: { title: "SALES" } } },
        { addSheet: { properties: { title: "PURCHASES" } } },
        { addSheet: { properties: { title: "CASHFLOW" } } },
        { addSheet: { properties: { title: "CONTACTS" } } },
        { addSheet: { properties: { title: "SERVICES" } } },
        { addSheet: { properties: { title: "SYSTEM" } } },
        { deleteSheet: { sheetId: 0 } } // Delete default Sheet1
      ];

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId!,
        requestBody: { requests },
      });

      res.json({ spreadsheetId, folderId });
    } catch (error) {
      console.error("Google Setup Error:", error);
      res.status(500).json({ error: "Failed to setup Google resources" });
    }
  });

  app.post("/api/google/upload", express.json({ limit: '10mb' }), async (req, res) => {
    const { tokens, folderId, fileName, base64Data } = req.body;
    if (!tokens || !folderId) return res.status(401).json({ error: "Unauthorized" });

    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    const drive = google.drive({ version: "v3", auth });

    try {
      // Convert base64 to stream
      const buffer = Buffer.from(base64Data.split(",")[1], 'base64');
      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      const media = {
        mimeType: base64Data.split(";")[0].split(":")[1],
        body: stream,
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink",
      });

      // Make file public so it can be viewed in the app
      await drive.permissions.create({
        fileId: file.data.id!,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // Get the direct link
      const result = await drive.files.get({
        fileId: file.data.id!,
        fields: "thumbnailLink, webContentLink",
      });

      res.json({
        id: file.data.id,
        url: result.data.webContentLink?.replace('&export=download', '') || result.data.thumbnailLink
      });
    } catch (error) {
      console.error("Drive Upload Error:", error);
      res.status(500).json({ error: "Failed to upload to Drive" });
    }
  });

  app.post("/api/google/sync", async (req, res) => {
    const { tokens, spreadsheetId, data } = req.body;
    if (!tokens || !spreadsheetId) return res.status(401).json({ error: "Unauthorized" });

    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);
    const sheets = google.sheets({ version: "v4", auth });

    try {
      const requests = Object.entries(data).map(([sheetName, rows]: [string, any]) => ({
        updateCells: {
          range: { sheetId: 0 }, // This is tricky, need to find sheetId by name
          fields: "*"
        }
      }));

      // For simplicity, we'll use values.update for each sheet
      for (const [sheetName, rows] of Object.entries(data)) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: rows as any[][] },
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Sheets Sync Error:", error);
      res.status(500).json({ error: "Failed to sync to Sheets" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
