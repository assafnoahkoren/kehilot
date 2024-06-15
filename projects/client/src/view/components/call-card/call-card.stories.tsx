import type { Meta, StoryObj } from '@storybook/react';
import { CallCard } from './call-card';
import { Button } from '@mui/material';


const meta = {
	title: 'Components/CallCard',
	component: CallCard,
	argTypes: {
	},

} satisfies Meta<typeof CallCard>;
export default meta;
type Story = StoryObj<typeof meta>;


export const Default: Story = {
	args: {
		date: new Date(),
		preTitle: 'שם הסקר',
		title: '150 תושבים טרם ענו לסקר',
		subtitle: 'מנהלי ענף רלוונטים',
		upperTags: undefined,
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text">
		לשליחה חוזרת
			<i className="fas fa-paper-plane ms-2"></i>
		</Button>,
		lowerButton: undefined,
	},
	argTypes: {

	},
};

export const Urgant: Story = {
	args: {
		date: new Date(),
		preTitle: undefined,
		title: 'נושא הפנייה',
		subtitle: undefined,
		upperTags: [{
			type: 'danger',
			label: 'דחוף'
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: 'ישראל ישראלי',
		personePhone: '050-1234567',
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,	},
	argTypes: {

	},
};

export const InCare: Story = {
	args: {
		date: new Date(),
		preTitle: undefined,
		title: 'נושא הפנייה',
		subtitle: undefined,
		upperTags: [{
			type: 'warning',
			label: 'בטיפול'
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: 'ישראל ישראלי',
		personePhone: '050-1234567',
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,	},
	argTypes: {

	},
};

export const UrgantNoPerson: Story = {
	args: {
		date: new Date(),
		preTitle: undefined,
		title: 'נושא הפנייה',
		subtitle: undefined,
		upperTags: [{
			type: 'danger',
			label: 'דחוף'
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,	},
	argTypes: {

	},
};

export const WithIcon: Story = {
	args: {
		date: new Date(),
		preTitle: undefined,
		title: 'מיקום תושבים והצפת פערים',
		icon: <div className='flex flex-col items-center py-4 px-5 pe-2 text-green-700'>
			<div className='text-2xl font-black leading-none'>90%</div>
			<div className='font-bold'>ענו</div>
		</div>,
		subtitle: undefined,
		upperTags: [{
			label: <div>
				<i className="fas fa-repeat me-1"></i>
				חוזר
			</div>
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מיקום'
		}, {
			type: 'chip',
			label: 'פערים'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לתוצאות
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,	},
	argTypes: {

	},
};

export const CustomTag: Story = {
	args: {
		date: new Date(),
		preTitle: undefined,
		title: 'נושא הפנייה',
		subtitle: undefined,
		upperTags: [{
			type: 'danger',
			label: 'מעל 3 ימים'
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,	},
	argTypes: {

	},
};

export const AllFeatures: Story = {
	args: {
		date: new Date(),
		preTitle: 'שם הסקר',
		title: '150 תושבים טרם ענו לסקר',
		subtitle: 'מנהלי ענף רלוונטים',
		upperTags: [{
			type: 'danger',
			label: 'דחוף'
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מזון'
		}, {
			type: 'chip',
			label: 'חינוך'
		}],
		personName: 'ישראל ישראלי',
		personePhone: '050-1234567',
		upperButton: <Button variant="text">
		לשליחה חוזרת
			<i className="fas fa-paper-plane ms-2"></i>
		</Button>,
		lowerButton: <Button variant="text">
		לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,
		contactName: 'אלי אליהו'
	},
	argTypes: {

	},
};
