import type { Meta, StoryObj } from '@storybook/react';
import { LocationChangeCard } from './location-changed-card';

const meta = {
	title: 'Components/LocationChangeCard',
	component: LocationChangeCard,
} satisfies Meta<typeof LocationChangeCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		amount: 10,
		location1: {
			name: 'מלון- גלי כינרת',
			amount: 150
		},
		location2: {
			name: 'מלון- אחוזת אוהלו',
			amount: 146
		}
	}
};