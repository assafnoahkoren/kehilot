import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import res4Section from './res-4';

// Correcting the TypeScript definition to match the component
const meta: Meta<typeof res4Section> = {
	title: 'Components/res4Section', // Reflect the component name
	component: res4Section,
};

// Correctly typing the Story object
type Story = StoryObj<typeof meta>;

export default meta;
// Defining the default story with correct props


export const Default: Story = {
	args: {
		a1: {
			label: " סקר פניות", // "List" in Hebrew
		},
		a2: {
			label: " קשורים תוצאות	"	},
		a3: {
			label: " כלליים אנשים" // "List" in Hebrew
		},
		a4: {
			label: " נתונים  "// "Map" in Hebrew
		}
	}
};