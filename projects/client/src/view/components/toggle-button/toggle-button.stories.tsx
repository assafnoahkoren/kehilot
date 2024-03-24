import { Meta, StoryObj } from '@storybook/react';
import ToggleButtonSection from './toggle-button'; // Correct import based on component name

// Correcting the TypeScript definition to match the component
const meta: Meta<typeof ToggleButtonSection> = {
	title: 'Components/ToggleButtonSection', // Reflect the component name
	component: ToggleButtonSection,
};
export default meta;

// Correctly typing the Story object
type Story = StoryObj<typeof meta>;

// Defining the default story with correct props
export const Default: Story = {
	args: {
		buttonList: {
			label: "רשימה", // "List" in Hebrew
			iconClass: "fas fa-list"
		},
		buttonMap: {
			label: "מפה", // "Map" in Hebrew
			iconClass: "fas fa-map"
		}
	}
};