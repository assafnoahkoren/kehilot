import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './search-bar';

const meta = {
	title: 'Components/SearchBar',
	component: SearchBar as any,
	argTypes: {
		children: { control: 'text', name: 'content' },
	},

} satisfies Meta<typeof SearchBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: 'חיפוש',
	},
	argTypes: {

	},
};
