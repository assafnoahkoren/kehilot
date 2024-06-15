import type { Meta, StoryObj } from '@storybook/react';
import { NavButtonGroup } from './nav-button-group';


const meta = {
	title: 'Components/ButtonGroup',
	component: NavButtonGroup,
	argTypes: {
		children: { control: 'text', name: 'content' },
	},

} satisfies Meta<typeof NavButtonGroup>;
export default meta;
type Story = StoryObj<typeof meta>;


export const Default: Story = {
	args: {
		buttons: ['תוצאות סקר', 'נתונים כלליים'].map(label => ({label}))
		
	},
	argTypes: {

	},
};

export const ThreeItems: Story = {
	args: {
		buttons: ['פניות מתועדפות', 'פניות חדשות', 'כל הפניות'].map(label => ({label}))
	},
	argTypes: {

	},
};

export const WithBreak: Story = {
	args: {
		buttons: [
			<div className='flex flex-col'>
				<span style={{lineHeight: '1em'}}>פניות</span>
			</div>,
			<div className='flex flex-col'>
				<span style={{lineHeight: '1em'}}>תוצאות</span>
				<span style={{lineHeight: '1em'}}>סקר</span>
			</div>,
			<div className='flex flex-col'>
				<span style={{lineHeight: '1em'}}>אנשים</span>
				<span style={{lineHeight: '1em'}}>קשורים</span>
			</div>,
			<div className='flex flex-col'>
				<span style={{lineHeight: '1em'}}>נתונים</span>
				<span style={{lineHeight: '1em'}}>כלליים</span>
			</div>,
		].map((label, index) => ({label, id: String(index)}))
	},
	argTypes: {

	},
};

