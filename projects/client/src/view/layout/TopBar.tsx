import { Button } from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { ProfileButton } from './ProfileButton';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from './layout-state';
import { useNavigate } from 'react-router-dom';

export const TopBar: FC = React.memo(() => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const navigate = useNavigate();
	return (
		<div className={`min-h-16 flex justify-between gap-3 items-center px-2`} style={{backgroundColor: layoutState.topBarColor}}>
			<div className='flex items-center gap-2'>
				<div onClick={()=> navigate(-1)} className='flex justify-center items-center bg-white h-10 w-10 rounded-full'>
					<i className='fas fa-arrow-left text-2xl text-primary-color'></i>
				</div>
				<h1 className='text-xl font-bold'>
					{layoutState.title}
				</h1>
			</div>
			<i className='fas fa-bars text-2xl text-primary-color p-2' onClick={() => setLayoutState({isMenuOpen: true})}></i>
			
		</div>
	);
});
