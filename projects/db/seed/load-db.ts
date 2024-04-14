import { PrismaClient, Subject } from "@prisma/client";
import csv from 'csv-parser';
import fs from 'fs';


const db = new PrismaClient();
db.$connect();


(async () => {
	console.log('┌────────────────────────┐');
	console.log('│    Loading Database    │');
	console.log('└────────────────────────┘');

	const results: Row[] = [];
	fs.createReadStream('seed/data.csv')
		.pipe(csv())
		.on('data', (data) => results.push(data))
		.on('end', () => {
			const subjects: Partial<Subject>[] = results.map((row) => {
				let date_of_birth;
				date_of_birth = new Date(`${row.year_of_birth}-${row.month_of_birth}-${row.day_of_birth}`);
				if (!isValidDate(date_of_birth)) {
					date_of_birth = undefined;
				}

				const subject: Partial<Subject> = {
					gov_id: row.id,
					first_name: row.first_name,
					last_name: row.last_name,
					middle_name: '',
					city: row.city,
					street: `${row.street} ${row.number} ${row.apt}`,
					phone: row.phone,
					mother_name: row.mother_name,
					father_name: row.father_name,
					sex: row.sex === '1' ? 'זכר' : 'נקבה',
					date_of_birth: date_of_birth,
					country: 'ישראל',
				}
				return subject;
			});

			db.subject.createMany({
				data: subjects
			}).then((res) => {
				console.log('Subjects created:', res.count);
			});


		});

	
})();

export type Row = {
  id: string
  first_name: string
  last_name: string
  age: string
  city: string
  street: string
  number: string
  apt: string
  phone: string
  mother_name: string
  father_name: string
  father_id: string
  mother_id: string
  sex: string
  year_of_birth: string
  day_of_birth: string
  month_of_birth: string
  status: string
  personal_status: string
}



function isValidDate(d: Date) {
	return d instanceof Date && !isNaN(d.getTime());
}