import { Module } from '@nestjs/common';
import { HelloWorldController } from './hello-world.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
	imports: [AuthModule],
	controllers: [HelloWorldController]
})
export class ExampleModule {}
