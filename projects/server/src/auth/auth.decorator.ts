// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JWT } from './auth.service';

export const Requester = createParamDecorator(
	(data: any, ctx: ExecutionContext): JWT => {
		const request = ctx.switchToHttp().getRequest();
		return request.user as JWT;
	},
);