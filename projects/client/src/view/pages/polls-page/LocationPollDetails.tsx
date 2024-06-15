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
import { LocationChangeCard } from "../../components/location-changed-card/location-changed-card";

export const LocationPollDetails: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const [currentView, setCurrentView] = useState('all');
	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'תמונת מצב מיקום  תושבים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);


	return (
		<>
			<div className="flex justify-center w-full fixed top-14 z-[40] p-4 pt-0">
				<SearchBar placeholder="חיפוש" />
			</div>
			<div className="p-4 pt-12">
				<div className="w-full flex justify-center">
					<NavButtonGroup activeId={currentView} onActiveChange={setCurrentView} buttons={[{
						id: 'latest',
						label: 'תנועות אחרונות',
					}, {
						id: 'all',
						label: 'כל המיקומים',
					}]}/>
				</div>

				<div className="pt-4 flex flex-col gap-4">
					{currentView ==='all' &&<>
						<div className="flex gap-4">
							<PollCard 
								title={'ענו'}
								upperButton={<Button className="min-w-0" variant="text"><i className="fas fa-chevron-right"></i></Button>}
								subtitle={<div className="text-xl">
								1,107
								</div>}
							/>
							<PollCard 
								title={'טרם ענו'}
								upperButton={<Button className="min-w-0" variant="text"><i className="fas fa-chevron-right"></i></Button>}
								subtitle={<div className="text-xl">
								150
								</div>}
							/>
						</div>
						<PollCard 
							title={'תושבים במלונות'}
							upperButton={<Button variant="text">לצפייה<i className="fas fa-chevron-right ms-2"></i></Button>}
							subtitle={<div>
								<div className="text-xl my-3">
									<i className="fas fa-arrow-up-arrow-down me-2  "></i>
									650
								</div>
								<div>
								5 תושבים שינו מיקום מהשבוע שעבר
								</div>
							</div>}
						/>

						<PollCard 
							title={'תושבים ביישוב'}
							upperButton={<Button variant="text">לצפייה<i className="fas fa-chevron-right ms-2"></i></Button>}
							subtitle={<div>
								<div className="text-xl my-3">
									<i className="far fa-circle-minus me-2  "></i>
									25
								</div>
								<div>
								ללא שינוי מהשבוע שעבר
								</div>
							</div>}
						/>

						<PollCard 
							title={'תושבים בדיור עצמאי'}
							upperButton={<Button variant="text">לצפייה<i className="fas fa-chevron-right ms-2"></i></Button>}
							subtitle={<div>
								<div className="text-xl my-3">
									<i className="far fa-circle-minus me-2  "></i>
									432
								</div>
								<div>
								ללא שינוי מהשבוע שעבר
								</div>
							</div>}
						/>
					</>}
					{currentView ==='latest' &&<>
						<LocationChangeCard 
							amount={5}
							location1={{
								amount: 150,
								name: 'מלון- גלי כינרת'
							}}
							location2={{
								amount: 146,
								name: 'מלון- אחוזת אוהלו'
							}}
						/>
					</>}
				</div>
			</div>
		</>

	)

}