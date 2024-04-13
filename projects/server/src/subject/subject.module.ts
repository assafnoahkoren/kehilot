import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	controllers: [SubjectController],
	imports: [AuthModule],
})
export class SubjectModule {}
