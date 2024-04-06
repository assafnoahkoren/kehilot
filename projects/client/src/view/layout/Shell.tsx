import React, { ReactElement, FC, useEffect } from 'react';
import { SideMenu } from './SideMenu';
import { TopBar } from './TopBar';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { atom_layoutState } from './layout-state';

interface CompProps extends React.PropsWithChildren {
	children: ReactElement | ReactElement[];
}

export const Shell: FC<CompProps> = props => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);

	return (
		<div className="flex h-full">
			<div className='fixed left-0 top-0 w-full blur-[150px] scale-125 z-0'>
				<svg width="100vw" height="100vh" viewBox="0 0 360 640" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M-5.61574 462.172C65.6345 459.758 143.963 482.422 166.753 549.91C190.118 619.102 144.654 688.276 84.973 730.433C28.0119 770.669 -47.8981 782.577 -104.018 741.178C-159.024 700.602 -168.131 624.913 -145.408 560.485C-124.471 501.12 -68.5801 464.305 -5.61574 462.172Z" fill="#6E77E0" fill-opacity="0.45"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M242.457 433.1C204.741 372.602 185.205 293.436 232.256 239.955C280.495 185.124 363.133 189.911 429.483 220.517C492.81 249.729 541.077 309.515 533.284 378.816C525.647 446.74 464.653 492.472 397.494 505.007C335.614 516.557 275.786 486.562 242.457 433.1Z" fill="#FFF378"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M197.801 345.387C242.468 331.782 295.863 332.842 321.721 371.674C348.233 411.487 331.196 462.956 300.586 499.744C271.37 534.855 225.365 555.256 182.843 538.578C141.166 522.232 122.574 475.893 126.028 431.281C129.211 390.175 158.329 357.41 197.801 345.387Z" fill="#F2A0A0"/>
					<path fill-rule="evenodd" clip-rule="evenodd" d="M112.817 -64.8838C198.338 -62.0721 255.52 12.1311 283.033 93.28C312.043 178.844 322.628 284.185 248.757 336.066C177.055 386.423 88.34 331.627 17.9419 279.457C-49.7659 229.281 -118.064 162.148 -95.6588 80.8297C-70.7372 -9.62129 19.1799 -67.9623 112.817 -64.8838Z" fill="#FFC244"/>
				</svg>
			</div>
			<SideMenu />
			<div className="flex flex-col flex-1 z-10">
				{layoutState.topBarVisible && <TopBar />}
				<div className='fixed top-0 w-full'>
					{layoutState.topBarVisible && <TopBar />}
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
