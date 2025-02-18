import { RouteObject } from 'react-router-dom';
import { Outlet, redirect } from 'react-router-dom';
import { HomePage } from '../../view/pages/HomePage';
import { Shell } from '../../view/layout/Shell';
import { GlobalJobs } from '../global-jobs/GlobalJobs';
import { OnboardingPage } from '../../view/pages/onboarding/OnboardingPage';
import { PersonalAreaPage } from '../../view/pages/personal-area/PersonalAreaPage';
import { IssuesPage } from '../../view/pages/issues/IssuesPage';
import { MapPage } from '../../view/pages/map/MapPage';
import { IssueDetailsPage } from '../../view/pages/issues/IssueDetailsPage';
import { SubjectDetailsPage } from '../../view/pages/subject/SubjectDetailsPage';
import { SettingsPage } from '../../view/pages/settings-page/SettingsPage';
import { PollsPage } from '../../view/pages/polls-page/PollsPage';
import { PollDetailsPage } from '../../view/pages/polls-page/PollDetailsPage';
import { LocationPollDetails } from '../../view/pages/polls-page/LocationPollDetails';

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
		{ path: 'issues', element: <IssuesPage /> },
		{ path: 'issues/details/:id', element: <IssueDetailsPage /> },
		{ path: 'subjects/details/:id', element: <SubjectDetailsPage /> },
		{ path: 'personal', element: <PersonalAreaPage /> },
		{ path: 'settings', element: <SettingsPage /> },
		{ path: 'polls', element: <PollsPage /> },
		{ path: 'poll-details', element: <PollDetailsPage />},
		{ path: 'location-poll-details', element: <LocationPollDetails />},
		{ path: 'map', element: <MapPage />}
	]
};
