import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/auth.guard';

@Controller('hello-world')
export class HelloWorldController {

	@Get('hello')
	getHelloWorld(): string {
		return 'Hello, World!';
	}

	@Get('goodbye')
	@UseGuards(JwtAuthGuard)
	getGoodbye(): string {
		return 'Goodbye, World!';
	}
}
