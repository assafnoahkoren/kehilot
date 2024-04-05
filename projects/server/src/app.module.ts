import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';

@Module({
	imports: [AuthModule, ExampleModule],
	controllers: [],
	providers: []
})
export class AppModule {}
