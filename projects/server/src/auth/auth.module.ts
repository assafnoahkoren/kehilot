import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';


@Module({
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard],
	exports: [AuthService]
})
export class AuthModule {}
