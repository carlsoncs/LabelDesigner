import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const validUser = this.configService.get<string>('AUTH_USERNAME');
    const validPass = this.configService.get<string>('AUTH_PASSWORD');

    if (username !== validUser || password !== validPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: username, username };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
