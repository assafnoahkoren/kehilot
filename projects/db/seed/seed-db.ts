import { PrismaClient } from "@prisma/client";
import { fakeModels } from "./fake-models";
import { arrayOf } from "./utils";
import { AuthService } from '../../server/src/auth/auth.service';

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

	const authService = new AuthService();
	db.user.createMany({
		data: [{
			email: 'a@a.com',
			first_name: 'אסף',
			last_name: 'קורן',
			phone: '0522717039',
			password: authService.hashPassword('123123'),
		}]
	}).then((res) => {
		console.log('Users created:', res.count);
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