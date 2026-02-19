import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrintService } from './print.service';
import { PrintZplDto } from './dto/print-zpl.dto';

@Controller('print')
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Post('zpl')
  async printZpl(@Body() printZplDto: PrintZplDto) {
    try {
      const result = await this.printService.sendToPrinter(
        printZplDto.zpl,
        printZplDto.printerIp,
        printZplDto.printerPort || 9100,
      );
      return {
        success: true,
        message: 'ZPL sent to printer successfully',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to send ZPL to printer',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('test')
  async testConnection(@Body() body: { printerIp: string; printerPort?: number }) {
    try {
      const result = await this.printService.testConnection(
        body.printerIp,
        body.printerPort || 9100,
      );
      return {
        success: true,
        message: 'Printer connection successful',
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to connect to printer',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
