import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { db } from 'src/db';

@Controller('subject')
export class SubjectController {

	@Get('all')
	@UseGuards(JwtAuthGuard)
	async getAll() {
		const subjects = await db.subject.findMany();
		return subjects;
	}

	// TODO: Get subject full details
	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getSubject(@Param('id') id: string) {
		const subject = await db.subject.findUnique({where: {id: id}});
		return subject;
	}

}
