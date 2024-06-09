import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './tag';

const meta = {
	title: 'Components/Tag',
	component: Tag,
	argTypes: {
		children: { control: 'text', name: 'content' },
	},

} satisfies Meta<typeof Tag>;
export default meta;
type Story = StoryObj<typeof meta>;


export const Default: Story = {
	args: {
		type: 'default',
		label: <> סטטוס </>,
	},
	argTypes: {
		type: {
			options: [
				'default',
				'solid',
				'danger',
				'warning',
				'info',
				'light'
			],
			control: { type: 'select' },
		}
	},
};

export const WithIcon: Story = {
	args: {
		type: 'default',
		label: <> 
			<i className="fas fa-repeat me-1.5 relative top-[ 1px]"></i>
		סקר חוזר
		</>,
	},
	argTypes: {
		type: {
			options: [
				'default',
				'solid',
				'danger',
				'warning',
				'info',
				'light'
			],
			control: { type: 'select' },
		}
	},
};
