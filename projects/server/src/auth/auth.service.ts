import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";


type JWT = {
  userId: string;
	name: string;
	identifier: string;
} & ExtraFields;

type ExtraFields = {
  [key: string]: any;
};

@Injectable()
export class AuthService {
	hashPassword(password: string): string {
		return bcrypt.hashSync(addSalt(password), getRounds());
	}
	
	comparePasswords(password: string, hash: string): boolean {
		return bcrypt.compareSync(addSalt(password), hash);
	}

	createJwt(data: JWT): string {
		return jwt.sign({
			...data,
			iat: secondsFromNow(0), // issued at now
			// TODO: add expiration time functionality also to the backend
			// exp: secondsFromNow(60 * 60 * 24), // expires in X seconds
		}, getJwtSecret())
	}

	verifyJwt(token: string): JWT {
		return jwt.verify(token, getJwtSecret()) as JWT;
	}
}

function getJwtSecret() {
	return process.env.JWT_SECRET || 'secret';

}

function addSalt(password: string) {
	return password + process.env.SALT;
}

function getRounds(): number {
	return parseInt(process.env.SALT_ROUNDS || '10');
}

function secondsFromNow(seconds: number) {
	return Math.floor(Date.now() / 1000) + seconds;
}