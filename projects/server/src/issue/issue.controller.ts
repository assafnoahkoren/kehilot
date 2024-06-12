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
		if (groups.length == 0) {
			return {
				count: 0
			}
		}
		const where_clasue = groups.map(group => `(${group.sql_where})`).join(' OR ');
		const result = await db.$queryRawUnsafe(`SELECT COUNT (*) FROM "Issue" WHERE ${where_clasue}`);
		console.log(result);
		
		return result[0]
	}

	@Get('mine')
	@UseGuards(JwtAuthGuard)
	async getMyIssues(@Request() req) {
		const userId = req.user.userId;
		const groups = await getUserOwnedGroups(userId);
		const where_clasue = groups.map(group => `(${group.sql_where})`).join(' OR ');
		const issues = await db.$queryRawUnsafe<{id: string}[]>(`SELECT id FROM "Issue" WHERE ${where_clasue}`);
		return db.issue.findMany({
			where: {
				id: {
					in: issues.map(issue => issue.id)
				}
			},
			select: {
				id: true,
				title: true,
				content: true,
				created_at: true,
				updated_at: true,
				priority: true,
				status: true,
				subject: {
					select: {
						id: true,
						first_name: true,
						middle_name: true,
						last_name: true,
						gov_id: true,
						phone: true,
						street: true,
						city: true,
						country: true,
					}
				}
			}
			
		});
	}

	// TODO: update issue
	
	
}
 