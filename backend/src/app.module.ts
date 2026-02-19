import { Module } from '@nestjs/common';
import { PrintModule } from './print/print.module';

@Module({
  imports: [PrintModule],
})
export class AppModule {}
