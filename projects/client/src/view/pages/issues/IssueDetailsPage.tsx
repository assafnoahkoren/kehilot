import { FC, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { SearchBar } from "../../components/search-bar/search-bar";
import { Chip, Grow, Link, Tab, Tabs } from "@mui/material";
import { useMyIssues } from "../../../core/api/hooks/issues";
import { useNavigate, useParams } from "react-router-dom";

export const IssueDetailsPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const query_MyIssues = useMyIssues();
	const issue = query_MyIssues.data?.find(issue => issue.id === id);
	

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'תיאור פנייה', topBarColor: '#FCE0A8', backgroundColor: '#f9f9f9'})
	}, []);

	return ( 
		<div className="p-4">
			<div className="flex flex-col gap-1 mb-4 bg-white w-full rounded-xl shadow py-4">
				<div className="flex justify-between px-4">
					<span className="flex gap-2">
						<Chip className="font-bold" label={issue?.priority} size="small" color="error" variant="outlined" />
						<Chip className="font-bold" label={issue?.status} size="small" color="error" variant="outlined" />
					</span>
				</div>
				{issue?.created_at && <span className="px-4">{new Date(issue.created_at).toLocaleDateString()}</span>}
				<Link underline="none" className="px-4" onClick={() => navigate(`/s/subjects/details/${issue?.subject.id}`)}>
					{issue?.subject.first_name} {issue?.subject.middle_name} {issue?.subject.last_name}
				</Link>
				<div dir="ltr" className="flex justify-between px-4">
					<Link>{issue?.subject.phone}</Link>
					<div className="w-[0px] border-[0.5px]"></div>
					<span>{issue?.subject?.gov_id}</span>
				</div>
				{/* <span className="py-2 px-4 border-t-2">
							<Chip className="font-bold px-2" label={issue.category} size="small" color="warning" />
						</span> */}
			</div>

			<div>
				<h2 className="text-2xl mb-4">
					{issue?.title}
				</h2>
				{issue?.content}
			</div>
		</div>
	);
}