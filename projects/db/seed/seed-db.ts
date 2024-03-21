import { PrismaClient } from "@prisma/client";
import { fakeModels } from "./fake-models";
import { arrayOf } from "./utils";

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