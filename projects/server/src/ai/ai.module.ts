import { Module } from '@nestjs/common';
import { QuestionsController } from './questions/questions.controller';

@Module({
	controllers: [QuestionsController],
})
export class AiModule {}
