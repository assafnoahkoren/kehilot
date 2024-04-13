import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { db } from 'src/db';


class UserUpdateBody {
	@IsOptional()
		first_name: string;

	@IsOptional()
		last_name: string;

	@IsOptional()
		picture_url: string | null;
}

@Controller('user')
export class UserController {
	// TODO: Get user details
	@Get('me')
	@UseGuards(JwtAuthGuard)
	async getMe(@Request() req) {
		const userId = req.user.userId;
		const user = await db.user.findUnique({where: {id: userId}});
		delete user.password;
		return user;
	}

	// TODO: Update user details
	@Post('update')
	@UseGuards(JwtAuthGuard)
	async update(@Body() body: UserUpdateBody, @Request() req) {
		const userId = req.user.userId;
		const user = await db.user.update({
			where: {id: userId},
			data: {
				...body
			}
		});
		delete user.password;
		return user;
	}
}
