import { Module } from '@nestjs/common';
import { IssueController } from './issue.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	controllers: [IssueController],
	imports: [AuthModule]
})
export class IssueModule {}
