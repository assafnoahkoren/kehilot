import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';
import { access } from 'fs';
import { db } from 'src/db';


export class LoginCredentials {
  @IsEmail()
  	email: string;

  @IsNotEmpty()
  	password: string;
}

type JwtResponse = {
	accessToken: string;
	// TODO: Add refresh token someday
	// refreshToken: string;
};

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login-with-email')
	async login(@Body() credentials: LoginCredentials): Promise<JwtResponse>{

		console.log(this.authService.hashPassword(credentials.password));
		
		const user = await db.user.findFirst({
			where: {
				email: credentials.email,
			},
			select: {
				id: true,
				password: true,
			}
		});

		if (!user) throw new HttpException('Not Authorized', 401);

		const isPasswordCorrect = this.authService.comparePasswords(credentials.password, user.password);

		if (!isPasswordCorrect) throw new HttpException('Not Authorized', 401);

		const jwt = this.authService.createJwt({ userId: user.id });

		return {
			accessToken: jwt
		};
	}


}
