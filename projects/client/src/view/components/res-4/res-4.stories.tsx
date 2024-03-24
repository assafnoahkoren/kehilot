import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import Res4Section from './res-4';

// Correcting the TypeScript definition to match the component
const meta: Meta<typeof Res4Section> = {
	title: 'Components/res4Section', // Reflect the component name
	component: Res4Section,
};

// Correctly typing the Story object
type Story = StoryObj<typeof meta>;

export default meta;
// Defining the default story with correct props


export const Default: Story = {
	args: {
		a1: {
			label: "  פניות", // "List" in Hebrew
		},
		a2: {
			label: "   סקר תוצאות"	},
		a3: {
			label: "  אנשים קשורים" // "List" in Hebrew
		},
		a4: {
			label: "  נתונים כלליים "// "Map" in Hebrew
		}
	}
};