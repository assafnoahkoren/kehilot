import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	controllers: [GroupController],
	imports: [AuthModule]
})
export class GroupModule {}
