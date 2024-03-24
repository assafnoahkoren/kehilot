import { Meta, StoryObj } from '@storybook/react';
import NestedButtonsSection from './open-Inquiries'; // Correct import based on component name


// Correcting the TypeScript definition to match the component
const meta: Meta<typeof NestedButtonsSection> = {
	title: 'Components/NestedButtonsSection', // Reflect the component name
	component: NestedButtonsSection,
};

// Correctly typing the Story object
type Story = StoryObj<typeof meta>;
export default meta;
// Defining the default story with correct props
export const Default: Story = {
	args: {
		openInquiries: {
			label: "תמונת מצב תושבים", // "List" in Hebrew
		},
		statusUpdate: {
			label: "פניות פתוחות", // "Map" in Hebrew
		}
	}
};