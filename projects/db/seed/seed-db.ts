import { Issue, Note, PrismaClient } from "@prisma/client";
import { fakeModels } from "./fake-models";
import { arrayOf } from "./utils";
import { AuthService } from '../../server/src/auth/auth.service';
import { randUuid } from "@ngneat/falso";

const db = new PrismaClient();
db.$connect();

(async () => {
	
	
	console.log('┌───────────────────────┐');
	console.log('│   Clearing Database   │');
	console.log('└───────────────────────┘');
	
	const totalDeleted = await clearDb();
	console.log('Total deleted:', totalDeleted);
	
	
	console.log('┌───────────────────────┐');
	console.log('│   Seeding database    │');
	console.log('└───────────────────────┘');

	// ===========================================================================
	// Creating Users
	// ===========================================================================
	const authService = new AuthService();
	const userId = randUuid();
	db.user.createMany({
		data: [{
			id: userId,
			email: 'a@a.com',
			first_name: 'אסף',
			last_name: 'קורן',
			phone: '0522717039',
			password: authService.hashPassword('123123'),
		}]
	}).then((res) => {
		console.log('Users created:', res.count);
	});

	// ===========================================================================
	//  Creating Subjects
	// ===========================================================================
	const subjects = arrayOf(10,fakeModels.subject);
	const subjectsRes = await db.subject.createMany({
		data: subjects
	});
	console.log('Subjects created:', subjectsRes.count);

	// ===========================================================================
	// Creating Issues for each subject
	// ===========================================================================
	const issues: Issue[] = []
	subjects.forEach(subject => issues.push(fakeModels.issue(subject.id)));
	
	const issuesRes = await db.issue.createMany({
		data: issues
	});
	console.log('Issues created:', issuesRes.count);

	// ===========================================================================
	// Create Notes for each Issue
	// ===========================================================================
	const notes: Note[] = [];
	issues.forEach(issue => {
		const amountOfNotes = Math.floor(Math.random() * 10);
		for (let i = 0; i < amountOfNotes; i++) {
			notes.push(fakeModels.note(userId, issue.id, 'issue'))
		}
	});

	const notesRes = await db.note.createMany({
		data: notes
	});
	console.log('Notes created:', notesRes.count);

	// ===========================================================================
	// Create A Group and a GroupUserRole
	// ===========================================================================
	const groupId = randUuid();
	const res = await db.group.create({
		data: {
			id: groupId,
			name: 'יישוב דפנה',
			sql_where: '1 = 1',
			created_at: new Date(),
			updated_at: new Date(),
		}
	})
	console.log('Group created:', 1);

	db.groupUserRole.create({
		data: {
			user_id: userId,
			group_id: groupId,
			role: 'manager',
			created_at: new Date(),
			updated_at: new Date(),
		}
	}).then((res) => {
		console.log('GroupUserRole created:', 1);
	});



})();



async function clearDb() {
	const database: any = db;
	const allProperties = Object.keys(db)
	const modelNames = allProperties.filter(x => {
		if (x.toString().startsWith('$') || x.toString().startsWith('_')) return false;
		return database[x].deleteMany as any;
	})
	let totalDeleted = 0;
	let modelName: any;
	for (modelName of modelNames) {
		console.log('Deleting', modelName);
		const model: any = db[modelName];
		if (model.deleteMany) {
			const deleted = await model.deleteMany()
			totalDeleted += deleted.count;
			console.log('Deleted', deleted.count, modelName);
		}
	}

	return totalDeleted;
}