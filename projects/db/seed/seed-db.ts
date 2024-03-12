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

	console.log('Creating profiles...');
	const profiles = await db.profile.createMany({data: arrayOf(10, fakeModels.profile)})	
	console.log('Profiles created:', profiles.count);
	const allProfiles = await db.profile.findMany();

	console.log('Creating organizations...');
	const organizations = await db.organization.createMany({data: arrayOf(4, fakeModels.organization)})
	console.log('Organizations created:', organizations.count);
	const allOrganizations = await db.organization.findMany();

	console.log('Creating groups...');
	const groups = await db.group.createMany({data: arrayOf(5, fakeModels.group)})
	console.log('Groups created:', groups.count);
	const allGroups = await db.group.findMany();

	console.log('Creating GroupMembers...');
	const groupMembers = await db.groupMember.createMany({data: [
		// One Proile in One Group
		{
			group_id: allGroups[0].id,
			profile_id: allProfiles[0].id
		},
		
		// Two Profiles in One Group
		{
			group_id: allGroups[1].id,
			profile_id: allProfiles[1].id
		},
		{
			group_id: allGroups[1].id,
			profile_id: allProfiles[2].id
		},

		// One Profile in Two Groups
		{
			group_id: allGroups[3].id,
			profile_id: allProfiles[3].id
		},
		{
			group_id: allGroups[4].id,
			profile_id: allProfiles[3].id
		},
	]});
	console.log('GroupMembers created:', groupMembers.count);

	console.log('Creating OrganizationMembers...');
	const organizationMembers = await db.organizationMember.createMany({data: [
		// One Proile in One Organization
		{
			organization_id: allOrganizations[0].id,
			profile_id: allProfiles[4].id,
			role: 'ADMIN',
		},
		
		// Two Profiles in One Organization
		{
			organization_id: allOrganizations[1].id,
			profile_id: allProfiles[5].id,
			role: 'ADMIN',
		},
		{
			organization_id: allOrganizations[1].id,
			profile_id: allProfiles[6].id,
			role: 'ADMIN',
		},

		// One Profile in Two Organizations
		{
			organization_id: allOrganizations[2].id,
			profile_id: allProfiles[7].id,
			role: 'ADMIN',
		},
		{
			organization_id: allOrganizations[3].id,
			profile_id: allProfiles[7].id,
			role: 'ADMIN',
		},

	]});
	console.log('OrganizationMembers created:', organizationMembers.count);

	console.log('Creating Exams...');
	const exams = await db.exam.createMany({data: [
		{
			name: 'Math',
		},
		{
			name: 'Physics',
		},
		{
			name: 'Chemistry',
		},
		{
			name: 'Biology',
		},
	]});
	console.log('Exams created:', exams.count);
	const allExams = await db.exam.findMany();

	console.log('Creating Questions...');
	const questions = await db.question.createMany({data: [
		{
		// 5 Questions for the first exam
			exam_id: allExams[0].id,
			question: 'What is 2+2?',
			options: [
				'2',
				'3',
				'4',
				'5'
			],
			correct_options: [
				false,
				false,
				true,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[0].id,
			question: 'What is 2*2?',
			options: [
				'2',
				'3',
				'4',
				'5'
			],
			correct_options: [
				false,
				false,
				true,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[0].id,
			question: 'What is 2-2?',
			options: [
				'2',
				'3',
				'4',
				'0'
			],
			correct_options: [
				false,
				false,
				false,
				true
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[0].id,
			question: 'What is 2/2?',
			options: [
				'2',
				'3',
				'4',
				'1'
			],
			correct_options: [
				false,
				false,
				false,
				true
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[0].id,
			question: 'What is 2^2?',
			options: [
				'2',
				'3',
				'4',
				'5'
			],
			correct_options: [
				false,
				false,
				true,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		// 5 Questions for the second exam
		{
			exam_id: allExams[1].id,
			question: 'What is the formula for the area of a circle?',
			options: [
				'πr',
				'πr^2',
				'2πr',
				'πr^3'
			],
			correct_options: [
				false,
				true,
				false,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[1].id,
			question: 'What is the formula for the area of a square?',
			options: [
				'2l',
				'l^2',
				'2l^2',
				'l'
			],
			correct_options: [
				false,
				true,
				false,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[1].id,
			question: 'What is the formula for the area of a rectangle?',
			options: [
				'2lw',
				'l*w',
				'2l*w',
				'l+w'
			],
			correct_options: [
				false,
				true,
				false,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[1].id,
			question: 'What is the formula for the area of a triangle?',
			options: [
				'1/2bh',
				'bh',
				'1/2b*h',
				'b+h'
			],
			correct_options: [
				true,
				false,
				false,
				false
			],
			type: 'MULTIPLE_CHOICE',
		},
		{
			exam_id: allExams[1].id,
			question: 'What is the formula for the area of a trapezium?',
			options: [
				'1/2(a+b)h',
				'(a+b)h',
				'1/2(a+b)*h',
				'(a+b)*h'
			],
			correct_options: [
				true,
				false,
				false,
				false
			],
			type: 'MULTIPLE_CHOICE',
		}

	]});
	console.log('Questions created:', questions.count);
	const allQuestions = await db.question.findMany();

	console.log('Creating Scheduled Exams...');
	const scheduledExams = await db.scheduledExam.createMany({data: [{
		exam_id: allExams[0].id,
		group_id: allGroups[0].id,
		start_time: new Date(),
		end_time: new Date(new Date().getTime() + 60 * 60 * 1000),
	}, {
		exam_id: allExams[1].id,
		profile_id: allProfiles[1].id,
		start_time: new Date(),
		end_time: new Date(new Date().getTime() + 60 * 60 * 1000),
	},]});
})();



async function clearDb() {
	const allProperties = Object.keys(db)
	const modelNames = allProperties.filter(x => {
		if (x.toString().startsWith('$') || x.toString().startsWith('_')) return false;
		
		// @ts-expect-error Making checks in the line above, there is no way to create typing for props that are table names
		return db[x].deleteMany
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