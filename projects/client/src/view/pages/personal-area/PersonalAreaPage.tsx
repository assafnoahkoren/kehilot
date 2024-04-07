import { FC, useCallback, useEffect, useLayoutEffect } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const PersonalAreaPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const navigate = useNavigate();

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'איזור אישי', topBarColor: '#D0DAF2', backgroundColor: '#f9f9f9'})
	}, []);

	const handleLogout = () => {
		localStorage.removeItem('__JWT__');
		navigate('/login');
	};

	return (
		<div className="p-4">
			<Button color="error" onClick={handleLogout}>
				<i className="fas fa-sign-out-alt me-2"></i>
				התנתק
			</Button>
		</div>

	)

}