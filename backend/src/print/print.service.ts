import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);

  /**
   * Send ZPL data to a Zebra printer over TCP
   */
  async sendToPrinter(
    zpl: string,
    printerIp: string,
    printerPort: number = 9100,
  ): Promise<{ bytesSent: number }> {
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
