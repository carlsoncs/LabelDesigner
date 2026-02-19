import { IsString, IsNumber, IsOptional, IsNotEmpty, IsIP, Min, Max } from 'class-validator';

export class PrintZplDto {
  @IsString()
  @IsNotEmpty()
  zpl: string;

  @IsString()
  @IsNotEmpty()
  printerIp: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  printerPort?: number = 9100;
}
