import React from 'react';

export const RtlDecorator = (storyFn: any) => (
	<div dir="rtl">
		{storyFn()}
	</div>
);