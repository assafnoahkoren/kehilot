import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';
import { SubjectModule } from './subject/subject.module';

@Module({
	imports: [AuthModule, ExampleModule, SubjectModule],
	controllers: [],
	providers: []
})
export class AppModule {}
