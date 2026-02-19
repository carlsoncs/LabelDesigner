# ZPL Label Designer

A standalone web application for designing and printing labels to Zebra printers. No Zebra Designer Pro license required.

## Features

- Visual drag-and-drop label designer
- Multiple label sizes (4x6, 4x3, 2x1, 3x2, etc.)
- Text elements with adjustable font sizes
- Barcode support (Code 128, Code 39, QR Code, UPC-A, EAN-13)
- CSV import for variable data / mail merge
- Direct print to network Zebra printers
- Download ZPL files for offline use

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm
- PM2 (`npm install -g pm2`)
- NGINX

### Installation

1. **Clone/copy the project to your server:**

```bash
# If you have it locally, scp it over:
scp -r zpl-label-app user@yourserver:/tmp/

# On the server:
cd /tmp/zpl-label-app
```

2. **Run the setup script:**

```bash
chmod +x setup.sh
./setup.sh
```

3. **Configure NGINX:**

Edit the domain in the nginx config:
```bash
sudo nano /etc/nginx/sites-available/labels.yourdomain.com
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/labels.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

4. **Add DNS record:**

Add an A record for `labels.yourdomain.com` pointing to your server IP.

5. **Access the app:**

Open `http://labels.yourdomain.com` in your browser.

---

## Manual Installation

If you prefer to set things up manually:

### Frontend

```bash
cd frontend
npm install
npm run build
```

The built files will be in `frontend/dist/`.

### Backend

```bash
cd backend
npm install
npm run build
npm run start:prod
```

The API will run on port 3001.

### PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to auto-start on boot
```

---

## Architecture

```
zpl-label-app/
├── frontend/                 # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   └── LabelDesigner.tsx   # Main component
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── dist/                 # Built static files
├── backend/                  # NestJS API
│   ├── src/
│   │   ├── print/
│   │   │   ├── print.module.ts
│   │   │   ├── print.controller.ts
│   │   │   ├── print.service.ts
│   │   │   └── dto/
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── dist/                 # Compiled JS
├── ecosystem.config.js       # PM2 configuration
├── nginx.conf               # NGINX configuration
└── setup.sh                 # Installation script
```

---

## API Endpoints

### POST /api/print/zpl

Send ZPL code to a printer.

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

## Printer Setup

Your Zebra printer must be:

1. **Network connected** - Either via Ethernet or WiFi
2. **Port 9100 accessible** - This is the standard ZPL port
3. **On the same network** - Or routable from your server

### Find Printer IP

On most Zebra printers, you can print a configuration label by holding the feed button for a few seconds. The IP address will be on that label.

### Test Connection

From your server:

```bash
# Test TCP connection
nc -zv PRINTER_IP 9100

# Send a test label
echo "^XA^FO50,50^A0N,50,50^FDTest^FS^XZ" | nc PRINTER_IP 9100
```

### Firewall

If your server has a firewall, ensure it can make outbound connections to port 9100:

```bash
# UFW
sudo ufw allow out 9100/tcp

# iptables
sudo iptables -A OUTPUT -p tcp --dport 9100 -j ACCEPT
```

---

## Configuration

### Change Ports

**Backend port:** Edit `ecosystem.config.js`:
```javascript
env: {
  PORT: 3001,  // Change this
}
```

**Frontend dev server:** Edit `frontend/vite.config.ts`:
```typescript
server: {
  port: 5174,  // Change this
}
```

### Add More Label Sizes

Edit `frontend/src/components/LabelDesigner.tsx`:

```typescript
const LABEL_SIZES: LabelSize[] = [
  { name: '4" x 6"', width: 4, height: 6 },
  // Add more here
  { name: '1" x 0.5"', width: 1, height: 0.5 },
];
```

### Change DPI

The default is 203 DPI (standard for most Zebra printers). For 300 DPI printers, edit `LabelDesigner.tsx`:

```typescript
const DPI = 300;  // Change from 203
```

---

## Troubleshooting

### "Failed to connect to printer"

1. Verify the IP is correct
2. Check that the server can reach the printer: `ping PRINTER_IP`
3. Test port 9100: `nc -zv PRINTER_IP 9100`
4. Check for firewall blocks

### Labels print garbled

1. Verify label size matches physical labels
2. Check DPI setting matches your printer
3. Ensure proper ZPL syntax (check logs)

### Barcodes won't scan

1. Increase barcode height
2. Increase module width (bar thickness)
3. Ensure adequate quiet zone around barcode
4. Check print quality (clean print head if needed)

### PM2 issues

```bash
# View logs
pm2 logs zpl-label-api

# Restart
pm2 restart zpl-label-api

# Check status
pm2 status
```

### NGINX issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check access logs
sudo tail -f /var/log/nginx/access.log
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

## Security Considerations

- The print API accepts any IP address - consider adding IP validation for production
- No authentication is included - add if exposing to the internet
- Consider adding rate limiting for the print endpoint

---

## License

MIT - Use it however you want.
