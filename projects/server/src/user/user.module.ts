import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	controllers: [UserController],
	imports: [AuthModule]
})
export class UserModule {}
