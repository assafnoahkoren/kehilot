import { FC, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { SearchBar } from "../../components/search-bar/search-bar";
import { Chip, Grow, Link, Tab, Tabs } from "@mui/material";

export const CasesPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const [value, setValue] = useState('2');
	const handleChange = (event: React.SyntheticEvent, newValue: string) => {
		setValue(newValue);
	};
	
	const cases = useMemo(() => [
		{
			id: 1,
			createdAt: new Date(),
			requester: {
				id: 1,
				name: 'אסף קורן',
				identifierValue: '208189449',
				communicationMeans: [{
					id: 1,
					identifier: '0522717039'
				}]
			},
			category: 'מזון'
		
		},
		{
			id: 2,
			createdAt: new Date(),
			requester: {
				id: 2,
				name: 'אסף קורן',
				identifierValue: '208189449',
				communicationMeans: [{
					id: 2,
					identifier: '0522717039'
				}]
			},
			category: 'מזון'
		},
		{
			id: 3,
			createdAt: new Date(),
			requester: {
				id: 3,
				name: 'אסף קורן',
				identifierValue: '208189449',
				communicationMeans: [{
					id: 3,
					identifier: '0522717039'
				}]
			},
			category: 'מזון'
		},
		{
			id: 3,
			createdAt: new Date(),
			requester: {
				id: 3,
				name: 'אסף קורן',
				identifierValue: '208189449',
				communicationMeans: [{
					id: 3,
					identifier: '0522717039'
				}]
			},
			category: 'מזון'
		},
		{
			id: 3,
			createdAt: new Date(),
			requester: {
				id: 3,
				name: 'אסף קורן',
				identifierValue: '208189449',
				communicationMeans: [{
					id: 3,
					identifier: '0522717039'
				}]
			},
			category: 'מזון'
		}
	], []);

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'פניות', topBarColor: '#FCE0A8', backgroundColor: '#f9f9f9'})
	}, []);

	return (
		<div className="p-4 pt-16">
			<Tabs variant="fullWidth" onChange={handleChange} value={value}  className="bg-white rounded-xl fixed top-12 start-0 z-40 w-[80%] mx-[10%] shadow-sm">
				<Tab className="text-lg font-normal" disabled label="סקרים" value="1" />
				<Tab className="text-lg font-normal" label="פניות" value="2" />
				<Tab className="text-lg font-normal" disabled label="תובנות" value="3" />
			</Tabs>
			<div className="bg-white w-full rounded-full mb-4">
				<SearchBar placeholder="חיפוש" />
			</div>

			<div className="font-bold mb-4">
				לפי תוצאות הסקר האחרון, ריכזנו לך מספר פניות ברמת דחיפות גבוהה:
			</div>

			{cases.map((caseItem, index) => (
				<Grow in timeout={(index + 1) * 200}>
					<div className="flex flex-col gap-1 mb-4 bg-white w-full rounded-xl shadow pt-2">
						<div className="flex justify-between px-4">
							<Chip className="font-bold" label="דחוף" size="small" color="error" variant="outlined" />
							<Link underline="none">
								לצפייה
								<i className="fas fa-chevron-right text-xs ms-2"></i>
							</Link>
						</div>
						<span className="px-4">{caseItem.createdAt.toLocaleDateString()}</span>
						<Link underline="none" className="px-4">
							{caseItem.requester.name}
						</Link>
						<div className="flex justify-between px-4">
							<span>{caseItem.requester.identifierValue}</span>
							<div className="w-[0px] border-[0.5px]"></div>
							<Link>{caseItem.requester.communicationMeans[0].identifier}</Link>
						</div>
						<span className="py-2 px-4 border-t-2">
							<Chip className="font-bold px-2" label={caseItem.category} size="small" color="warning" />
						</span>
					</div>
				</Grow>
			))}
		</div>
	);
}