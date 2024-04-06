import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { ProfileButton } from './ProfileButton';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from './layout-state';

export const TopBar: FC = React.memo(() => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	
	return (
		<div className="min-h-12 bg-primary-color flex justify-between items-center px-2">
			<span>
				{layoutState.title}
			</span>
			<ProfileButton />
		</div>
	);
});
