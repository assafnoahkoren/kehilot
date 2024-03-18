import type { Meta, StoryObj } from '@storybook/react';
import { LocationChangeCard } from './location-changed-card';

const meta = {
	title: 'Components/LocationChangeCard',
	component: LocationChangeCard,
} satisfies Meta<typeof LocationChangeCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};