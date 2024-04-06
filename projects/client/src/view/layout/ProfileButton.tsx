import { Avatar, Button, Popover } from '@mui/material';
import { FC } from 'react';
import React from 'react';
import { useTranslate } from '../../core/translations/useTranslate';
import { useQuery_Profile } from '../../core/api/api';
import { logout, useMe } from '../../core/api/hooks/auth';

export const ProfileButton: FC = () => {
	const t = useTranslate();

	const me = useMe();
	
	const query_Profile = useQuery_Profile();
	const profile = query_Profile.data?.Profile[0];

	const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	const open = Boolean(anchorEl);
	const id = open ? 'simple-popover' : undefined;
	return (
		<>
			<Button
				onClick={handleClick}
				variant="text"
				className="text-white rounded-none h-full flex gap-2 items-center"
			>
				<Avatar className="w-7 h-7" src={profile?.picture_url} />
				<span>
					{me.data?.identifier}
				</span>
			</Button>
			<Popover
				id={id}
				open={open}
				anchorEl={anchorEl}
				onClose={handleClose}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'left'
				}}
			>
				<Button variant="text" className="flex justify-between w-32">
					<span>{t('Edit profile')}</span>
					<i className="fa-solid fa-pencil "></i>
				</Button>
				<Button onClick={logout} variant="text" color="error" className="text-red-500 flex justify-between w-32">
					<span>{t('Sign out')}</span>
					<i className="fa-solid fa-sign-out "></i>
				</Button>
			</Popover>
		</>
	);
};
