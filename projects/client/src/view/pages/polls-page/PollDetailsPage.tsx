import { FC, useLayoutEffect, useState } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { SearchBar } from "../../components/search-bar/search-bar";
import { Button, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { CallCard, CallCardProps } from "../../components/call-card/call-card";
import { NavButtonGroup } from "../../components/button-group/nav-button-group";
import { PollCard, PollCardProps } from "../../components/poll-card/poll-card";
import { Tag } from "../../components/tag/tag";
import { ExpandableCard } from "../../components/expandable-card/expandable-card";
import { useNavigate } from "react-router-dom";

export const PollDetailsPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const [currentPoll, setCurrentPoll] = useState(10);
	const navigate = useNavigate();
	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'מיקום תושבים והעלאת פערים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);

	const locationPollProps: PollCardProps = {
		title: '5 תושבים',
		subtitle: 'שינו את מיקומם מהשבוע שעבר',
		upperButton: <Button variant="text" onClick={() => navigate('/s/location-poll-details')}>
      לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,
		icon: <i className="fas fa-location-pin text-3xl p-4 px-5 text-primary"></i>
	}

	const issuesPollProps: PollCardProps = {
		title: '3 פניות חדשות',
		subtitle: <div className="flex gap-2">
      בנושאים:
			<Tag type={'chip'} label={'מזון'}></Tag>
			<Tag type={'chip'} label={'חינוך'}></Tag>
		</div>,
		upperButton: <Button variant="text">
      לצפייה
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>,
		icon: <i className="fas fa-user text-2xl p-4 px-5 text-primary"></i>
	}

	return (
		<>
			<div className="flex justify-center w-full fixed top-14 z-[40]">
				<NavButtonGroup activeId="list" buttons={[{
					id: 'map',
					onClick: () => navigate('/s/map'),
					label: <>
					מפה
						<i className="fas fa-map-location ms-2"></i>
					</>
				}, {
					id: 'list',
					label: <>
					רשימה
						<i className="fas fa-list ms-2"></i>
					</>
				}]}/>

			</div>
			<div className="p-4 pt-12">
				<FormControl fullWidth>
					<InputLabel>הצגת תוצאות עבור </InputLabel>
					<Select
						className="bg-white"
						value={currentPoll}
						label="הצגת תוצאות עבור"
						onChange={(e) => setCurrentPoll(e.target.value)}
					>
						<MenuItem value={10}>סקר אחרון 18/03/24</MenuItem>
						<MenuItem value={20}>18/02/24</MenuItem>
						<MenuItem value={30}>18/01/24</MenuItem>
					</Select>
				</FormControl>

				<div className="pt-4 flex flex-col gap-4">
					<PollCard {...locationPollProps}/>
					<PollCard {...issuesPollProps}/>
					<ExpandableCard title="פרטים נוספים" icon={<i className="fas fa-info-circle text-3xl p-4 px-5 text-primary"></i>}>
						<div className="p-3 pt-0 flex flex-col gap-1">
							<Tag label={
								<div>
									<i className="fas fa-repeat me-2"></i>
									סקר חוזר
								</div>
							}/>
							<div>
        תדירות: 1 פעם בשבוע
							</div>
							<div>
        סקר הבא:  25/02/24
							</div>

						</div>
					</ExpandableCard>
				</div>
			</div>
		</>

	)

}