import { FC, useLayoutEffect } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { Avatar, Chip, Divider, Link } from "@mui/material";
import { useMyIssues } from "../../../core/api/hooks/issues";
import { useParams } from "react-router-dom";
import { useSubjectById } from "../../../core/api/hooks/subjects";

export const SubjectDetailsPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);

	const { id } = useParams<{ id: string }>();

	const query_Subject = useSubjectById(id);
	const subject = query_Subject?.data;
	
	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'פרטים', topBarColor: '#FCE0A8', backgroundColor: '#f9f9f9'})
	}, []);

	return ( 
		<div className="p-4">
			<div className="flex gap-1 mb-4 bg-white w-full rounded-xl shadow p-4">
				<Avatar className="me-4" sx={{ width: 100, height: 100 }} />
				<div className="flex flex-col justify-center">
					<span className="text-xl">
						{subject?.first_name} {subject?.middle_name} {subject?.last_name}
					</span>
					<span className="text-lg opacity-50">
						{subject?.phone}
					</span>
				</div>
			</div>

			<div>
				<h2 className="text-xl mb-2">
					מידע
				</h2>
				<table className="table-auto w-full">
					<tbody>
						<tr>
							<td className="font-semibold">שם פרטי:</td>
							<td>{subject?.first_name}</td>
						</tr>
						<tr>
							<td className="font-semibold">שם אמצעי:</td>
							<td>{subject?.middle_name}</td>
						</tr>
						<tr>
							<td className="font-semibold">שם משפחה:</td>
							<td>{subject?.last_name}</td>
						</tr>
						<tr>
							<td className="font-semibold">טלפון:</td>
							<td>
								<Link underline="none">
									{subject?.phone}
								</Link>
							</td>
						</tr>
						<tr>
							<td className="font-semibold">תעודת זהות:</td>
							<td>{subject?.gov_id}</td>
						</tr>
						<tr>
							<td className="font-semibold">תאריך לידה:</td>
							<td>{new Date(subject?.date_of_birth || 0).toLocaleDateString()}</td>
						</tr>
						<tr>
							<td className="font-semibold">שם האם:</td>
							<td>{subject?.mother_name}</td>
						</tr>
						<tr>
							<td className="font-semibold">שם האב:</td>
							<td>{subject?.father_name}</td>
						</tr>
						<tr>
							<td className="font-semibold">מין:</td>
							<td>{subject?.sex}</td>
						</tr>
						<tr>
							<td className="font-semibold">רחוב:</td>
							<td>{subject?.street}</td>
						</tr>
						<tr>
							<td className="font-semibold">עיר:</td>
							<td>{subject?.city}</td>
						</tr>
						<tr>
							<td className="font-semibold">מיקוד:</td>
							<td>{subject?.postal_code}</td>
						</tr>
						<tr>
							<td className="font-semibold">מדינה:</td>
							<td>{subject?.country}</td>
						</tr>
						<tr>
							<td className="font-semibold">נוצר בתאריך:</td>
							<td>{new Date(subject?.created_at || 0).toLocaleString()}</td>
						</tr>
						<tr>
							<td className="font-semibold">עודכן בתאריך:</td>
							<td>{new Date(subject?.updated_at || 0).toLocaleString()}</td>
						</tr>
					</tbody>
				</table>
				
				<Divider  className="my-6"/>

				<h2 className="text-xl mb-2">
					קשרים
				</h2>
				<p>
					לא נמצאו
				</p>
			</div>
		</div>
	);
}