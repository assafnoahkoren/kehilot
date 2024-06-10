import type { Meta, StoryObj } from '@storybook/react';
import { CallCard } from './call-card';
import { Button } from '@mui/material';
import { PollCard } from './poll-card.tsx';
import { Tag } from '../tag/tag.tsx';


const meta = {
  title: 'Components/PollCard',
  component: PollCard,
  argTypes: {
  },

} satisfies Meta<typeof PollCard>;
export default meta;
type Story = StoryObj<typeof meta>;


export const Default: Story = {
  args: {
    title: '5 תושבים',
    subtitle: 'שינו את מיקומם מהשבוע שעבר',
    upperButton: <Button variant="text">
      לצפייה
      <i className="fas fa-chevron-right ms-2"></i>
    </Button>,
    icon: <i className="fas fa-location-pin text-3xl p-4 px-5 text-primary"></i>
  },
  argTypes: {

  },
};

export const WithTags: Story = {
  args: {
    title: '3 פניות חדשות',
    subtitle: <div className="flex gap-2">
      בנושאים:
      <Tag type={'chip'} label={'מזון'}></Tag>
      <Tag type={'chip'} label={'חינוך'}></Tag>
      </div>,
    upperButton: <Button variant="text">
      לצפייה
      <i className="fas fa-chevron-right ms-2"></i>
    </Button>,
    icon: <i className="fas fa-user text-2xl p-4 px-5 text-primary"></i>
  },
  argTypes: {

  },
};
