import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	controllers: [NotesController],
	imports: [AuthModule]
})
export class NotesModule {}
