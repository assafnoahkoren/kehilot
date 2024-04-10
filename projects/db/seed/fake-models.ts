import * as fake from '@ngneat/falso';
import { Issue, Subject } from '@prisma/client';
import { group } from 'console';

export const fakeModels = {
	subject: (): Subject => {
		return {
			id: fake.randUuid(),
			gov_id: fake.randNumber({min: 100000000, max: 999999999}).toString(),
			name: fake.randFullName({locale: 'he'}),
			phone: fake.randPhoneNumber(),
			updated_at: new Date(),
			created_at: new Date(),
		}
	},

	issue: (subjectId: string): Issue => {
		return {
			id: fake.randUuid(),
			subject_id: subjectId,
			title: fake.randSentence({locale: 'he'}),
			content: fake.randSentence({locale: 'he'}),
			status: 'open',
			priority: 'normal',
			updated_at: new Date(),
			created_at: new Date(),
		}
	}

}