import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const request = context.switchToHttp().getRequest();
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer ')) {
			const token = authHeader.split(' ')[1];
			try {
				const jwt = this.authService.verifyJwt(token);
				request.user = jwt;
				return true;
			} catch (e) {
				return false;
			}
			
		}
		return false;
	}
}