import type { Meta, StoryObj } from '@storybook/react';
import {buttonnav} from './nav-button';

const meta = {
    title: 'Components/buttonnav',
    component: buttonnav,
} satisfies Meta<typeof buttonnav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
