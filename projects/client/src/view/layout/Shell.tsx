import React, { ReactElement, FC, useEffect } from 'react';
import { SideMenu } from './SideMenu';
import { TopBar } from './TopBar';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

interface CompProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}

export const Shell: FC<CompProps> = props => {
	return (
		<div className="flex h-full">
			<SideMenu />
			<div className="flex flex-col flex-1">
				<TopBar />
				<div className='fixed top-0 w-full'>
					<TopBar />
				</div>
				<div className="flex-1">{props.children}</div>
				<BottomNav />
				<div className='fixed bottom-0 w-full'>
					<BottomNav />
				</div>
			</div>
		</div>
	);
};

const BottomNav: FC = () => {
	const [value, setValue] = React.useState('');
	const location = useLocation();
	const navigate = useNavigate();
	useEffect(() => {
		if (location.pathname !== value) setValue(location.pathname);
	}, [location]);

	useEffect(() => {
		if (value === '') return;
		if (location.pathname !== value) navigate(value);
	}, [value]);

	return (
		<BottomNavigation className='font-black shadow-inner min-h-16'
			showLabels
			value={value}
			onChange={(event, newValue) => {
				setValue(newValue);
			}}
		>
			<BottomNavigationAction value="/s/home" label="בית" icon={<i className="fas fa-home text-xl h-6"></i>} />
			<BottomNavigationAction disabled label="מיקום" icon={<i className="fas fa-map-marker-alt text-xl h-6"></i>} />
			<BottomNavigationAction value="/s/cases" label="פניות" icon={<span className='-scale-x-100 flex'><i className="fas fa-comment-question text-xl h-6"></i></span>} />
			<BottomNavigationAction disabled label="אזור אישי" icon={<i className="fas fa-circle-user text-xl h-6"></i>} />
		</BottomNavigation>
	)
}
