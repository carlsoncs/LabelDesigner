# ZPL Label Designer

A standalone web application for designing and printing labels to Zebra printers. No Zebra Designer Pro license required.

## Features

- Visual drag-and-drop label designer with live preview
- Multiple label sizes (4x6, 4x3, 2x1, 3x2, 2.25x1.25, 4x2)
- Text elements with adjustable font sizes (center-anchored for variable data)
- Barcode support (Code 128, Code 39, QR Code, UPC-A, EAN-13)
- CSV import for variable data / mail merge
- Quantity column support — specify how many copies of each label to print
- Inline text editing — double-click text on the canvas to edit directly
- Save/load label designs as JSON files
- Session persistence — designs survive page refresh via localStorage
- Browser print — generate print-ready labels in a popup window
- Direct print to network Zebra printers via ZPL
- Download ZPL files for offline use
- Light/dark theme toggle
- JWT authentication — protect the app with a login page

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- PM2 (`npm install -g pm2`)
- NGINX (for production deployment)

### 1. Clone the repository

```bash
git clone https://github.com/carlsoncs/LabelDesigner.git
cd LabelDesigner
```

### 2. Configure environment

Create the backend environment file with your credentials:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

```env
AUTH_USERNAME=admin
AUTH_PASSWORD=your-secure-password
JWT_SECRET=your-random-secret-string
```

> **Important:** The `.env` file is gitignored and must be created manually on each deployment.

### 3. Install and build

```bash
# Frontend
cd frontend
npm install
npm run build

# Backend
cd ../backend
npm install
npm run build
```

### 4. Start with PM2

```bash
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

### 5. Configure NGINX

Copy and edit the nginx config:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/labels.yourdomain.com
sudo nano /etc/nginx/sites-available/labels.yourdomain.com
# Update server_name and root path
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/labels.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. (Optional) SSL with Certbot

```bash
sudo certbot --nginx -d labels.yourdomain.com
```

### 7. Add DNS

Add an A record for `labels.yourdomain.com` pointing to your server IP.

### 8. Access the app

Open `https://labels.yourdomain.com` and log in with the credentials from your `.env` file.

### Alternative: Use the setup script

Instead of steps 3-5, you can run the interactive setup script:

```bash
chmod +x setup.sh
./setup.sh
```

It handles `.env` creation, building, and PM2 startup. You'll still need to configure NGINX and DNS manually (steps 5-7).

---

## Architecture

```
zpl-label-app/
├── frontend/                 # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── LabelDesigner.tsx   # Main designer component
│   │   │   └── LoginPage.tsx       # Authentication page
│   │   ├── App.tsx                 # Auth routing
│   │   └── main.tsx
│   └── dist/                 # Built static files
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts  # POST /api/auth/login
│   │   │   ├── auth.service.ts     # Credential validation + JWT signing
│   │   │   ├── jwt-auth.guard.ts   # Global route protection
│   │   │   ├── public.decorator.ts # @Public() decorator for open routes
│   │   │   └── auth.constants.ts   # JWT expiration config
│   │   ├── print/
│   │   │   ├── print.module.ts
│   │   │   ├── print.controller.ts # POST /api/print/zpl, /api/print/test
│   │   │   ├── print.service.ts    # TCP socket to Zebra printer
│   │   │   └── dto/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env                  # Credentials (not committed)
│   └── dist/                 # Compiled JS
├── ecosystem.config.js       # PM2 configuration
├── nginx.conf                # NGINX configuration template
└── setup.sh                  # Installation script
```

---

## Authentication

The app uses JWT-based authentication. All API routes are protected by default; only the login endpoint is public.

- Credentials are stored in `backend/.env`
- Tokens expire after 24 hours
- The frontend stores the JWT in localStorage and auto-redirects to login when it expires

To change the password, edit `backend/.env` and restart the backend:

```bash
nano backend/.env
pm2 restart zpl-label-api
```

---

## API Endpoints

All endpoints except `/api/auth/login` require a valid JWT in the `Authorization: Bearer <token>` header.

### POST /api/auth/login

Authenticate and receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/print/zpl

Send ZPL code to a network printer.

**Request:**
```json
{
  "zpl": "^XA^FO50,50^A0N,50,50^FDHello^FS^XZ",
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

**Response:**
```json
{
  "success": true,
  "message": "ZPL sent to printer successfully",
  "bytesSent": 45
}
```

### POST /api/print/test

Test connection to a printer.

**Request:**
```json
{
  "printerIp": "192.168.1.100",
  "printerPort": 9100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Printer connection successful",
  "latencyMs": 12
}
```

---

## Using the Designer

### Creating a label

1. Select a **label size** from the dropdown in the left sidebar
2. Click **Add Text** or **Add Barcode** to place elements
3. **Drag** elements on the canvas to position them
4. **Double-click** text to edit inline, or use the properties panel on the right
5. Set a **Label Name** on each element to identify it (used for CSV mapping)

### Variable data with CSV

1. Go to the **Data** tab and upload a CSV file
2. Ensure your CSV column names match the **Label Name** on each element
3. Check **Variable field (from CSV)** on elements that should pull from CSV data
4. Use the **Quantity Column** dropdown to select which CSV column controls copy count

### Printing

- **Browser Print** — Opens a print-ready popup (works with any printer via the browser print dialog)
- **Direct Print** — Sends ZPL directly to a network Zebra printer (requires IP address)
- **Download .zpl** — Saves ZPL code as a file for manual use
- **Copy to Clipboard** — Copies generated ZPL to the clipboard

### Saving and loading designs

- **Save Design** — Downloads the current label layout as a `.json` file
- **Load Design** — Upload a previously saved `.json` design file
- Designs also auto-save to the browser via localStorage

---

## Printer Setup

Your Zebra printer must be:

1. **Network connected** — via Ethernet or WiFi
2. **Port 9100 accessible** — the standard ZPL port
3. **On the same network** — or routable from your server

### Find Printer IP

On most Zebra printers, hold the feed button for a few seconds to print a configuration label with the IP address.

### Test Connection

```bash
# Test TCP connection
nc -zv PRINTER_IP 9100

# Send a test label
echo "^XA^FO50,50^A0N,50,50^FDTest^FS^XZ" | nc PRINTER_IP 9100
```

---

## Configuration

### Environment Variables (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_USERNAME` | Login username | `admin` |
| `AUTH_PASSWORD` | Login password | *(required)* |
| `JWT_SECRET` | Secret key for signing JWTs | *(required)* |
| `PORT` | Backend API port | `3001` |
| `ALLOWED_PRINTER_IPS` | Comma-separated whitelist of printer IPs | *(all IPs allowed)* |

### Change Backend Port

Edit `ecosystem.config.js`:

```javascript
env: {
  PORT: 3001,  // Change this
}
```

### Add Label Sizes

Edit `frontend/src/components/LabelDesigner.tsx`:

```typescript
const LABEL_SIZES: LabelSize[] = [
  { name: '4" x 6"', width: 4, height: 6 },
  // Add more here
  { name: '1" x 0.5"', width: 1, height: 0.5 },
];
```

### Change DPI

The default is 203 DPI (standard for most Zebra printers). For 300 DPI printers:

```typescript
const DPI = 300;  // Change from 203
```

---

## Development

### Frontend

```bash
cd frontend
npm run dev
```

Runs on http://localhost:5174 with hot reload.

### Backend

```bash
cd backend
npm run start:dev
```

Runs on http://localhost:3001 with hot reload.

---

## Troubleshooting

### "Failed to connect to printer"

1. Verify the IP is correct
2. Check connectivity: `ping PRINTER_IP`
3. Test port 9100: `nc -zv PRINTER_IP 9100`
4. Check for firewall blocks

### Labels print garbled

1. Verify label size matches physical labels
2. Check DPI setting matches your printer
3. Ensure proper ZPL syntax (check generated output)

### Barcodes won't scan

1. Increase barcode height
2. Increase module width (bar thickness)
3. Ensure adequate quiet zone around the barcode
4. Clean the print head if print quality is poor

### PM2 issues

```bash
pm2 logs zpl-label-api     # View logs
pm2 restart zpl-label-api  # Restart
pm2 status                 # Check status
```

### NGINX issues

```bash
sudo nginx -t                          # Test configuration
sudo tail -f /var/log/nginx/error.log  # Error logs
sudo tail -f /var/log/nginx/access.log # Access logs
```

---

## Security

This app is designed for use on **trusted internal networks**. The print API opens TCP connections to printer IPs supplied by authenticated users, so proper hardening is important.

### Authentication

- All API routes are JWT-protected by default. Only the login endpoint is public.
- **Change the default credentials** in `backend/.env` before deploying.
- **Generate a strong JWT secret** — use `openssl rand -base64 32` and paste the result into `JWT_SECRET`.
- Tokens expire after 24 hours. The frontend auto-redirects to the login page when a token expires.

### HTTPS

Always run behind HTTPS in production. The included NGINX config supports Certbot:

```bash
sudo certbot --nginx -d labels.yourdomain.com
```

Without HTTPS, credentials and JWT tokens are sent in plaintext.

### Print API

The print API lets authenticated users send ZPL data to a printer IP over TCP port 9100. This is powerful but carries risk — a compromised account could target any reachable IP on your network.

**Built-in protections:**
- Printer IPs must be valid IPv4 addresses
- Ports restricted to 9100–9109 (standard ZPL range)
- Localhost, 0.0.0.0, and broadcast addresses are blocked (SSRF prevention)
- All print requests require a valid JWT

**Recommended: set a printer IP whitelist.** Add the IPs of your actual printers to `backend/.env`:

```env
ALLOWED_PRINTER_IPS=192.168.1.100,192.168.1.101
```

When set, the API will refuse to connect to any IP not in the list. If not set, any valid network IP is allowed for authenticated users.

### NGINX Hardening

Add these security headers to your NGINX server block:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Add rate limiting to protect the API from brute-force login attempts. In `/etc/nginx/nginx.conf` inside the `http {}` block:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

Then in your site's `/api` location block:

```nginx
limit_req zone=api burst=20 nodelay;
```

### Network Isolation

For maximum security, place the backend server on the same VLAN as your printers and restrict which subnets can reach port 9100. The backend only needs to be reachable by NGINX (for the API proxy) and by the printers (for TCP printing).

### Checklist

- [ ] Changed `AUTH_PASSWORD` from the default
- [ ] Generated a random `JWT_SECRET` with `openssl rand -base64 32`
- [ ] Set `ALLOWED_PRINTER_IPS` to your actual printer addresses
- [ ] HTTPS enabled via Certbot or other certificate
- [ ] NGINX security headers added
- [ ] NGINX rate limiting enabled on `/api`
- [ ] Firewall restricts access to ports 3001 (backend) and 9100 (printers)

---

## License

MIT — Use it however you want.
