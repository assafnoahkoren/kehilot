import {
	Divider,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	ListItemIcon,
	SwipeableDrawer,
	Box
} from '@mui/material';
import React from 'react';
import { FC } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from './layout-state';
const version = import.meta.env.PACKAGE_VERSION;

export const SideMenu: FC = React.memo(() => {
	const location = useLocation();
	const navigate = useNavigate();
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	
	const goto = (path: string) => {
		return () => {
			navigate(path);
			setLayoutState({isMenuOpen: false});
		}
	}

	const isActive = (path: string) => location.pathname === path ? 'bg-gray-300' : '';

	if (location.pathname === '/s/onboarding') return null;	
	return (
		<SwipeableDrawer
		  sx={{width: '100%'}}
			anchor={'left'}
			open={layoutState.isMenuOpen}
			onOpen={() => setLayoutState({isMenuOpen: true})}
			onClose={() => setLayoutState({isMenuOpen: false})}
		>
			
			 <Box className="flex flex-col h-full" sx={{ maxWidth: 360, minWidth: 220}}>
			 <ListItem className='w-full h-[48px] bg-primary-color flex justify-between items-center'>
					<div onClick={() => setLayoutState({isMenuOpen: false})} className='w-[48px] h-full flex justify-center items-center opacity-50 text-white text-xl'>
						<i className='fal fa-times'></i>
					</div>
					<span className='font-bold text-white'>
					תפריט
					</span>
					<div className='w-[48px]'></div>
				</ListItem>
				<nav className='flex-1'>
					<List className='p-0'>
						<ListItem className={isActive('/s/home')}>
							<ListItemButton onClick={goto('/s/home')}>
								<i className='fa-solid w-5 fa-home me-2 text-primary-color opacity-75'></i>
								<ListItemText primary="בית" />
							</ListItemButton>
						</ListItem>
						<ListItem className={isActive('/s/personal')}>
							<ListItemButton onClick={goto('/s/personal')}>
								<i className='fa-solid w-5 fa-user-circle me-2 text-primary-color opacity-75'></i>
								<ListItemText primary="איזור אישי" />
							</ListItemButton>
						</ListItem>
						<ListItem className={isActive('/s/settings')}>
							<ListItemButton  onClick={goto('/s/settings')}>
								<i className='fa-solid w-5 fa-cog me-2 text-primary-color opacity-75'></i>
								<ListItemText primary="הגדרות"/>
							</ListItemButton>
						</ListItem>
					</List>
				</nav>
				<Divider />
				<nav>
					<List>
						<ListItem>
							<ListItemButton>
								<div className='text-sm opacity-50 w-full text-center'>
								Version {version}
								</div>
							</ListItemButton>
						</ListItem>
					</List>
				</nav>
			</Box>
		</SwipeableDrawer>
	);
});
