import { RouteObject } from 'react-router-dom';
import { Outlet, redirect } from 'react-router-dom';
import { HomePage } from '../../view/pages/HomePage';
import { Shell } from '../../view/layout/Shell';
import { GlobalJobs } from '../global-jobs/GlobalJobs';
import { OnboardingPage } from '../../view/pages/onboarding/OnboardingPage';
import { PersonalAreaPage } from '../../view/pages/personal-area/PersonalAreaPage';
import { CasesPage } from '../../view/pages/cases/CasesPage';
import { MapPage } from '../../view/pages/map/MapPage';

const authGuard = async () => {
	const isAuthenticated = checkAuth();
	if (!isAuthenticated) {
		throw redirect('/login');
	}

	return true;
};

const checkAuth = () => !!localStorage.getItem('__JWT__');

export const ProtectedRoutes: RouteObject = {
	path: '/s',
	element: (
		<>
			<GlobalJobs />
			<Shell>
				<Outlet />
			</Shell>
		</>
	),
	loader: authGuard,
	children: [
		{ path: 'home', element: <HomePage /> },
		{ path: 'onboarding', element: <OnboardingPage /> },
		{ path: 'cases', element: <CasesPage /> },
		{ path: 'personal', element: <PersonalAreaPage /> },
		{ path: 'map', element: <MapPage />}
	]
};
