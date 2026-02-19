import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const BLOCKED_IPS = ['127.0.0.1', '0.0.0.0', '255.255.255.255'];
const MIN_PORT = 9100;
const MAX_PORT = 9109;

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);
  private readonly allowedIps: string[] | null;

  constructor(private configService: ConfigService) {
    const allowList = this.configService.get<string>('ALLOWED_PRINTER_IPS');
    if (allowList) {
      this.allowedIps = allowList.split(',').map(ip => ip.trim()).filter(Boolean);
      this.logger.log(`Printer IP whitelist active: ${this.allowedIps.join(', ')}`);
    } else {
      this.allowedIps = null;
      this.logger.warn('No ALLOWED_PRINTER_IPS configured — any valid IP can be targeted');
    }
  }

  private validatePrinterAddress(ip: string, port: number): void {
    const match = ip.match(IPV4_REGEX);
    if (!match) {
      throw new BadRequestException('Invalid printer IP address format');
    }

    const octets = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])];
    if (octets.some(o => o > 255)) {
      throw new BadRequestException('Invalid printer IP address');
    }

    if (BLOCKED_IPS.includes(ip) || octets[0] === 0) {
      throw new BadRequestException('Printer IP address not allowed');
    }

    if (this.allowedIps && !this.allowedIps.includes(ip)) {
      throw new BadRequestException('Printer IP address not in allow list');
    }

    if (port < MIN_PORT || port > MAX_PORT) {
      throw new BadRequestException(`Printer port must be between ${MIN_PORT} and ${MAX_PORT}`);
    }
  }

  /**
   * Send ZPL data to a Zebra printer over TCP
   */
  async sendToPrinter(
    zpl: string,
    printerIp: string,
    printerPort: number = 9100,
  ): Promise<{ bytesSent: number }> {
    this.validatePrinterAddress(printerIp, printerPort);
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const timeout = 10000; // 10 second timeout

      // Set timeout
      client.setTimeout(timeout);

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`Connection to printer timed out after ${timeout / 1000} seconds`));
      });

      client.on('error', (err) => {
        this.logger.error(`Printer connection error: ${err.message}`);
        reject(new Error(`Failed to connect to printer at ${printerIp}:${printerPort} - ${err.message}`));
      });

      client.connect(printerPort, printerIp, () => {
        this.logger.log(`Connected to printer at ${printerIp}:${printerPort}`);

        const buffer = Buffer.from(zpl, 'utf-8');

        client.write(buffer, (err) => {
          if (err) {
            this.logger.error(`Failed to send data: ${err.message}`);
            client.destroy();
            reject(new Error(`Failed to send data to printer: ${err.message}`));
            return;
          }

          this.logger.log(`Sent ${buffer.length} bytes to printer`);

          // Give the printer a moment to receive the data before closing
          setTimeout(() => {
            client.end();
            resolve({ bytesSent: buffer.length });
          }, 100);
        });
      });

      client.on('close', () => {
        this.logger.log('Connection to printer closed');
      });
    });
  }

  /**
   * Test connection to a printer
   */
  async testConnection(
    printerIp: string,
    printerPort: number = 9100,
  ): Promise<{ latencyMs: number }> {
    this.validatePrinterAddress(printerIp, printerPort);
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const client = new net.Socket();
      const timeout = 5000;

      client.setTimeout(timeout);

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`Connection timed out after ${timeout / 1000} seconds`));
      });

      client.on('error', (err) => {
        reject(new Error(`Failed to connect: ${err.message}`));
      });

      client.connect(printerPort, printerIp, () => {
        const latencyMs = Date.now() - startTime;
        this.logger.log(`Test connection to ${printerIp}:${printerPort} successful (${latencyMs}ms)`);
        client.end();
        resolve({ latencyMs });
      });
    });
  }

  /**
   * Send a test label to verify printer is working
   */
  async printTestLabel(printerIp: string, printerPort: number = 9100): Promise<{ bytesSent: number }> {
    const testZpl = `
^XA
^FO50,50^A0N,50,50^FDTest Label^FS
^FO50,120^A0N,30,30^FDPrinter: ${printerIp}^FS
^FO50,170^A0N,30,30^FDTime: ${new Date().toISOString()}^FS
^FO50,240^BY2^BCN,80,Y,N,N^FDTEST123^FS
^XZ
    `.trim();

    return this.sendToPrinter(testZpl, printerIp, printerPort);
  }
}
