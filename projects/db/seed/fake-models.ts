import * as fake from '@ngneat/falso';
import { Issue, Subject,Note } from '@prisma/client';
import { group } from 'console';


export const fakeModels = {
	subject: (): Subject => {
		return {
			id: fake.randUuid(),
			gov_id: fake.randNumber({min: 100000000, max: 999999999}).toString(),
			first_name: fake.randFirstName(),
			phone: fake.randPhoneNumber(),
			middle_name: fake.randFirstName(),
			last_name: fake.randLastName(),
			date_of_birth: randDateOfBirth(),
			mother_name: fake.randFirstName(),
			father_name: fake.randFirstName(),
			sex: randArrayElement(['male', 'female']),
			street: fake.randStreetName(),
			city: fake.randCity(),
			postal_code: fake.randNumber({ min: 10000, max: 99999 }).toString(),
			country: fake.randCountry(),
			updated_at: new Date(),
			created_at: new Date(),
		}
	},

	issue: (subjectId: string): Issue => {
		return {
			id: fake.randUuid(),
			subject_id: subjectId,
			title: fake.randSentence(),
			content: fake.randSentence(),
			status: 'open',
			priority: 'normal',
			updated_at: new Date(),
			created_at: new Date(),
		}
	},

	note: (userId: string, entityId: string, entityType: string): Note => {
		return {
			id: fake.randUuid(),
			user_id: userId,
			entity_id: entityId,
			entity_type: entityType,
			content: fake.randSentence(),
			created_at: new Date(),
			updated_at: new Date(),
		};
	},

}

function randArrayElement<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}


function randDateOfBirth(): Date {
	const minDate = new Date(1950, 0, 1);
	const maxDate = new Date();
	const randomTimestamp = Math.random() * (maxDate.getTime() - minDate.getTime()) + minDate.getTime();
	return new Date(randomTimestamp);
}