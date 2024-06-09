import { FC, useEffect, useLayoutEffect, useState } from 'react';
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import * as L from 'leaflet';
import { useMyIssues } from "../../../core/api/hooks/issues";
import { useAddressesToGeoLocations } from "../../../core/api/hooks/geo";
import { Chip, Tab, Tabs } from '@mui/material';

import './MapPage.css';



export const MapPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const [map, setMap] = useState<ReturnType<typeof useMap> | null>(null);


	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'מיקום תושבים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);

	// const query_MyIssues = useMyIssues();
	// const addresses = (query_MyIssues.data?.map && query_MyIssues.data?.map(issue => `${issue.subject.city}, ${issue.subject.street}, ${issue.subject.country}`)) || [];
	//
	// const query_Locations = useAddressesToGeoLocations(addresses);
	// let points = query_Locations.data?.map(res => (res.features && res.features[0]?.geometry?.coordinates) || []);
	const points = [
		[34.629790, 31.788170],
		[34.629790, 31.788170],
		[34.629790, 31.788170],
		[34.629790, 31.788170],
		[34.629790, 31.888170],
		[34.629790, 31.988170],
		[34.629790, 31.688170],
		[34.629790, 31.588170],
		[34.629790, 31.488170],
	]

	if (map) {
		const markers = L.markerClusterGroup({
			iconCreateFunction: function(cluster) {
				return L.divIcon({
					html: `<div class="cluster">${cluster.getChildCount()}</div>`,
					className: 'cluster-icon',
					iconSize: L.point(40, 40)
				});
			}
		});
		points.map(point => markers.addLayer(L.marker([point[1], point[0]])));
		map.addLayer(markers);
	}

	const [value, setValue] = useState('2');


	return (
		<div className="h-full">
			<Tabs variant="fullWidth" onChange={setValue} value={value}  className="bg-white rounded-xl fixed top-12 start-0 z-[99999] w-[50%] mx-[25%] shadow-sm">
				<Tab className="text-lg font-normal" disabled label="רשימה" value="1" />
				<Tab className="text-lg font-normal" label="מפה" value="2" />
			</Tabs>
			<MapContainer ref={setMap} center={[31.788170, 34.629790]} zoom={8} style={{width: '100%', height: '100%'}} >
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{/*{points?.map((point, index) => (*/}
				{/*	point?.length && <Marker key={index} position={{*/}
				{/*		lat: point[1],*/}
				{/*		lng: point[0]*/}
				{/*	}}>*/}
				{/*		/!*<Popup>*!/*/}
				{/*		/!*	<div className="flex gap-2 justify-center mb-2">*!/*/}
				{/*		/!*		{query_MyIssues.data && query_MyIssues.data[index].subject.first_name}{' '}*!/*/}
				{/*		/!*		{query_MyIssues.data && query_MyIssues.data[index].subject.last_name}*!/*/}
				{/*		/!*	</div>*!/*/}
				{/*		/!*	<div className="flex gap-2 justify-center">*!/*/}
				{/*		/!*		<Chip className="font-bold" label={query_MyIssues.data && query_MyIssues.data[index].status} size="small" color="error" variant="outlined" />*!/*/}
				{/*		/!*		<Chip className="font-bold" label={query_MyIssues.data && query_MyIssues.data[index].priority} size="small" color="error" variant="outlined" />*!/*/}
				{/*		/!*	</div>*!/*/}
				{/*		/!*</Popup>*!/*/}
				{/*	</Marker>*/}

				{/*))}*/}
			</MapContainer>
		</div>
	)
}