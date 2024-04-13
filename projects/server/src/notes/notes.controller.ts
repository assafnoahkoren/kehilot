import { Body, Controller, Get, HttpException, Param, Post, Request, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { db } from 'src/db';


class createNoteBody {
	@IsString()
		content: string;

	@IsString()
		entityType: string;

	@IsString()
		entityId: string;

}

@Controller('notes')
export class NotesController {
	@Post('')
	@UseGuards(JwtAuthGuard)
	async createNote(@Body() body: createNoteBody, @Request() req) {		
		const userId = req.user.userId;
		const note = await db.note.create({
			data: {
				user_id: userId,
				entity_id: body.entityId,
				entity_type: body.entityType,
				content: body.content,
			}
		});

		return note;
	}

		
	@Get(':entityId')
	async getNotes(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {

		return db.note.findMany({
			where: {
				entity_id: entityId
			},
		});
			
	}



}