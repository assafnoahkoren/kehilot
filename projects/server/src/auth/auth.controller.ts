import { Body, Controller, Get, HttpException, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { AuthService, JWT } from './auth.service';
import { access } from 'fs';
import { db } from 'src/db';
import { Requester } from './auth.decorator';
import { JwtAuthGuard } from './auth.guard';


class EmailLoginBody {
  @IsEmail()
  	email: string;

  @IsNotEmpty()
  	password: string;
}

class EmailRegisterBody {
	@IsEmail()
		email: string;

	@IsNotEmpty()
		password: string;

	@IsNotEmpty()
		firstName: string;

	@IsNotEmpty()
		lastName: string;

	@IsNotEmpty()
		phoneNumber: string;
}

type JwtResponse = {
	accessToken: string;
	// TODO: Add refresh token someday
	// refreshToken: string;
};

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	async me(@Requester() user: JWT): Promise<any> {
		return user;
	}
	
	@Post('login-with-email')
	async loginWithEmail(@Body() body: EmailLoginBody): Promise<JwtResponse>{

		console.log(this.authService.hashPassword(body.password));
		
		const user = await db.user.findFirst({
			where: {
				email: body.email,
			}
		});

		if (!user) throw new HttpException('Not Authorized', 401);

		const isPasswordCorrect = this.authService.comparePasswords(body.password, user.password);

		if (!isPasswordCorrect) throw new HttpException('Not Authorized', 401);

		const jwt = this.authService.createJwt({ 
			userId: user.id,
			name: `${user.first_name} ${user.last_name}`,
			identifier: user.email
		});

		return {
			accessToken: jwt
		};
	}

	@Post('register-with-email')
	async registerWithEmail(@Body() body: EmailRegisterBody): Promise<JwtResponse> {
		const user = await db.user.create({
			data: {
				email: body.email,
				password: this.authService.hashPassword(body.password),
				first_name: body.firstName,
				last_name: body.lastName,
				phone: body.phoneNumber
			}
		});

		const jwt = this.authService.createJwt({ 
			userId: user.id,
			name: `${user.first_name} ${user.last_name}`,
			identifier: user.email
		});

		return {
			accessToken: jwt
		};
	}


}
