import { FC, useEffect, useLayoutEffect } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { useMyIssues } from "../../../core/api/hooks/issues";
import { useAddressesToGeoLocations } from "../../../core/api/hooks/geo";
import { Chip } from "@mui/material";




export const MapPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'מיקום תושבים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);

	const query_MyIssues = useMyIssues();
	const addresses = (query_MyIssues.data?.map && query_MyIssues.data?.map(issue => `${issue.subject.city}, ${issue.subject.street}, ${issue.subject.country}`)) || [];

	const query_Locations = useAddressesToGeoLocations(addresses);
	const points = query_Locations.data?.map(res => res.features[0]?.geometry?.coordinates || []);
	console.log(points);
	

	return (
		<div className="h-full">
			<MapContainer center={[31.788170, 34.629790]} zoom={13} style={{width: '100%', height: '100%'}} >
				<TileLayer
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{points?.map((point, index) => (
					<>
						{point?.length && <Marker key={index} position={{
							lat: point[1],
							lng: point[0]
						}}>
							<Popup>
								<div className="flex gap-2 justify-center mb-2">
									{query_MyIssues.data && query_MyIssues.data[index].subject.first_name}{' '}
									{query_MyIssues.data && query_MyIssues.data[index].subject.last_name}
								</div>
								<div className="flex gap-2 justify-center">
									<Chip className="font-bold" label={query_MyIssues.data && query_MyIssues.data[index].status} size="small" color="error" variant="outlined" />
									<Chip className="font-bold" label={query_MyIssues.data && query_MyIssues.data[index].priority} size="small" color="error" variant="outlined" />
								</div>
							</Popup>
						</Marker>}
					</>
				))}
			</MapContainer>
		</div>
	)
}