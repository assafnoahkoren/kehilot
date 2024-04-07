import { FC, useEffect, useLayoutEffect } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";

export const MapPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'מיקום תושבים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);

	return (
		<div className="p-4">
			<h1>Map page</h1>
		</div>
	)
}