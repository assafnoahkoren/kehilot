import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { count } from 'console';
import { JwtAuthGuard } from 'src/auth/auth.guard';
import { db } from 'src/db';
import { getUserOwnedGroups } from 'src/group/group.controller';

@Controller('issue')
export class IssueController {
	@Get('count-mine')
	@UseGuards(JwtAuthGuard)
	async getMyIssuesCount(@Request() req) {
		const userId = req.user.userId;
		const groups = await getUserOwnedGroups(userId);
		const where_clasue = groups.map(group => `(${group.sql_where})`).join(' OR ');
		const result = await db.$queryRawUnsafe(`SELECT COUNT (*) FROM issue WHERE ${where_clasue}`);
		return {
			count: result[0][""]
		}
	}

	@Get('mine')
	@UseGuards(JwtAuthGuard)
	async getMyIssues(@Request() req) {
		const userId = req.user.userId;
		const groups = await getUserOwnedGroups(userId);
		const where_clasue = groups.map(group => `(${group.sql_where})`).join(' OR ');
		const result = await db.$queryRawUnsafe(`SELECT * FROM issue WHERE ${where_clasue}`);
		return result;
	}

	// TODO: update issue
	
	
}
 