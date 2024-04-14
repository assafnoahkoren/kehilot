import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@fontsource/rubik/300.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';

import 'ag-grid-community/styles/ag-grid.css'; // Core CSS
import 'ag-grid-community/styles/ag-theme-quartz.css'; // Theme

import './core/translations/i18n';

import 'swiper/css';
import 'swiper/css/pagination';

import 'large-small-dynamic-viewport-units-polyfill';

import 'leaflet/dist/leaflet.css';


const originalFetch = window.fetch;

window.fetch = (...args) => {
	const url = args[0];
	const request = args[1];
	const isGraphql = request?.method === 'POST' && url.toString().includes('graphql');
	if (isGraphql && request.body?.toString()) {
		// remove backslashes from the body
		const body = JSON.parse(request.body?.toString());
		const queryName = body.query.split('{')[1].split('(')[0].trim();
		args[0] = url + `?${queryName}`
	}
	
	return originalFetch(...args);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

declare global {
	interface Window {
		__JWT__: string;
	}
}