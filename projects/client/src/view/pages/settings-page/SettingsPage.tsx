import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { FC, useLayoutEffect } from 'react';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from '../../layout/layout-state';

export const SettingsPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'הגדרות', topBarColor: '#D0DAF2', backgroundColor: '#f9f9f9'})
	}, []);

	return (
		<div className="p-4">
			<List>
				<ListItem disablePadding 
					secondaryAction={<i className='fas fa-chevron-right text-primary-color'></i>}>
					<ListItemButton>
						<ListItemIcon>
							<i className="fas fa-users text-2xl text-primary-color"></i>
						</ListItemIcon>
						<ListItemText primary="הגדרת גורמי טיפול" />
					</ListItemButton>
				</ListItem>
				<Divider/>
			</List>
		</div>
	);
};
