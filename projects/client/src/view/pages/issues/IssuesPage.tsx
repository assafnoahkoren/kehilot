import { FC, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { SearchBar } from "../../components/search-bar/search-bar";
import { ButtonGroup, Chip, Grow, Link, Tab, Tabs } from "@mui/material";
import { useMyIssues } from "../../../core/api/hooks/issues";
import { useNavigate } from "react-router-dom";
import { Tag } from '../../components/tag/tag.tsx';
import { NavButtonGroup } from "../../components/button-group/nav-button-group.tsx";

export const IssuesPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const navigate = useNavigate();

	
	const query_MyIssues = useMyIssues();

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'פניות', topBarColor: '#FCE0A8', backgroundColor: '#f9f9f9'})
	}, []);

	return (
		<div className="p-4 pt-10">
			<div className="flex justify-center w-full fixed top-10 -top-4 z-[40]">
				<NavButtonGroup buttons={[{label: 'סקרים'}, {label: 'פניות'}, {label: 'תובנות',}]}/>
			</div>
			<div className="bg-white w-full rounded-full mb-4">
				<SearchBar placeholder="חיפוש" />
			</div>

			<div className="font-bold mb-4">
				לפי תוצאות הסקר האחרון, ריכזנו לך מספר פניות ברמת דחיפות גבוהה:
			</div>

			{query_MyIssues.data?.map((issue, index) => (
				<Grow key={issue.id} in timeout={(index + 1) * 200}>
					<div className="flex flex-col gap-1 mb-4 bg-white w-full rounded-xl shadow py-4" onClick={() => navigate(`/s/issues/details/${issue.id}`)}>
						<div className="flex justify-between px-4">
							<span className="flex gap-2">
								<Tag className="font-bold" label={issue.priority} size="small" color="error" variant="outlined" />
								<Tag className="font-bold" label={issue.status} size="small" color="error" variant="outlined" />
							</span>
							<Link underline="none" onClick={() => navigate(`/s/issues/details/${issue.id}`)}>
								לצפייה
								<i className="fas fa-chevron-right text-xs ms-2"></i>
							</Link>
						</div>
						<span className="px-4">{new Date(issue.created_at).toLocaleDateString()}</span>
						<Link underline="none" className="px-4 w-max" onClick={(event) => {event.stopPropagation(); navigate(`/s/subjects/details/${issue?.subject.id}`)}}>
							{issue.subject.first_name} {issue.subject.middle_name} {issue.subject.last_name}
						</Link>
						<div dir="ltr" className="flex justify-between px-4">
							<Link>{issue.subject.phone}</Link>
							<div className="w-[0px] border-[0.5px]"></div>
							<span>{issue.subject?.gov_id}</span>
						</div>
						{/* <span className="py-2 px-4 border-t-2">
							<Chip className="font-bold px-2" label={issue.category} size="small" color="warning" />
						</span> */}
					</div>
				</Grow>
			))}
		</div>
	);
}