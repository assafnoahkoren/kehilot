import type { Meta, StoryObj } from '@storybook/react';
import { CallCard } from './call-card';
import { Button } from '@mui/material';
import { ExpandableCard } from './expandable-card.tsx';
import { Tag } from '../tag/tag.tsx';


const meta = {
	title: 'Components/ExpandableCard',
	component: ExpandableCard,
	argTypes: {
	},

} satisfies Meta<typeof ExpandableCard>;
export default meta;
type Story = StoryObj<typeof meta>;


export const Default: Story = {
	args: {
		title: 'פרטים נוספים',
		icon: <i className="fas fa-info-circle text-3xl p-4 px-5 text-primary"></i>,
		children: <div className="p-3 flex flex-col gap-1">
			<Tag label="סקר חוזר"/>
			<div>
        תדירות: 1 פעם בשבוע
			</div>
			<div>
        סקר הבא:  25/02/24
			</div>

		</div>
	},
	argTypes: {

	},
};

