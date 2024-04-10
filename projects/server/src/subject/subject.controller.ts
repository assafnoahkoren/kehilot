import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { db } from 'src/db';

@Controller('subject')
export class SubjectController {

	@Get('all')
	async getAll() {
		const subjects = await db.subject.findMany();
		return subjects;
	}

	@Get('guarded-all')
	@UseGuards(JwtAuthGuard)
	async getGuardedAll(@Request() req) {
		const userId = req.user.userId;

		const subjects = await db.subject.findMany();
		return subjects;
	}

}
