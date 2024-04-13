import { Controller, HttpException } from '@nestjs/common';
import { Get, Module, Param, Request, UseGuards } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { db } from 'src/db';
import { JwtAuthGuard } from 'src/auth/auth.guard';

@Controller('group')

export class GroupController {
	@Get(':id/subjects')
	@UseGuards(JwtAuthGuard)
	async getSubjects(@Request() req, @Param('id') id: string) {
		const userId = req.user.userId;

		const group = await db.group.findUnique({where: {id: id}});
		if (containsDeletionKeywords(group.sql_where)) throw new HttpException('Bad request', 400);

		const subjects = await db.$queryRawUnsafe(`SELECT * FROM subject WHERE ${group.sql_where}`);
		return subjects;
	}

	@Get(':id/count-subjects')
	@UseGuards(JwtAuthGuard)
	async countSubjects(@Request() req, @Param('id') id: string) {
		const userId = req.user.userId;

		const group = await db.group.findUnique({where: {id: id}});
		if (containsDeletionKeywords(group.sql_where)) throw new HttpException('Bad request', 400);
		
		const result = await db.$queryRawUnsafe(`SELECT COUNT (*) FROM subject WHERE ${group.sql_where}`);
		return {
			count: result[0][""]
		};
	}

	@Get('mine')
	@UseGuards(JwtAuthGuard)
	async getMine(@Request() req) {
		const userId = req.user.userId;
		return getUserOwnedGroups(userId);
	}
}


export async function getUserOwnedGroups(userId: string) {
	const res = await db.user.findUnique({
		where: {id: userId},
		select: {
			GroupUserRole: {
				select: {
					group: {
						select: {
							id: true,
							name: true,
							sql_where: true,
						}
					}
				}
			}
		}
	})

	return res.GroupUserRole.map((gur) => gur.group);
}

function containsDeletionKeywords(text: string): boolean {
	// Define an array of keywords related to database deletion operations
	const deletionKeywords = [
		'delete',
		'remove',
		'drop',
		'truncate'
	];

	// Convert the input text to lowercase to ensure case-insensitive matching
	const lowerCaseText = text.toLowerCase();

	// Check if any of the keywords exist in the text
	return deletionKeywords.some(keyword => lowerCaseText.includes(keyword));
}
