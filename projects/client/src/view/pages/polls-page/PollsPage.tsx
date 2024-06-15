import { FC, useLayoutEffect } from "react"
import { useRecoilState } from "recoil";
import { atom_layoutState } from "../../layout/layout-state";
import { SearchBar } from "../../components/search-bar/search-bar";
import { Button } from "@mui/material";
import { CallCard, CallCardProps } from "../../components/call-card/call-card";
import { useNavigate } from "react-router-dom";

export const PollsPage: FC = () => {
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const navigate = useNavigate();
	useLayoutEffect(() => {
		setLayoutState({topBarVisible: true, title: 'סקרים', topBarColor: '#F6D1D1', backgroundColor: '#f9f9f9'})
	}, []);

	const cardProps: CallCardProps = {
		date: new Date(),
		preTitle: undefined,
		title: 'מיקום תושבים והצפת פערים',
		icon: <div className='flex flex-col items-center py-4 px-5 pe-2 text-green-700'>
			<div className='text-2xl font-black leading-none'>90%</div>
			<div className='font-bold'>ענו</div>
		</div>,
		subtitle: undefined,
		upperTags: [{
			label: <div>
				<i className="fas fa-repeat me-1"></i>
				חוזר
			</div>
		}],
		lowerTags: [{
			type: 'chip',
			label: 'מיקום'
		}, {
			type: 'chip',
			label: 'פערים'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text" onClick={() => navigate('/s/poll-details')}>
		לתוצאות
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>
	}

	const cardProps2: CallCardProps = {
		date: new Date(),
		preTitle: undefined,
		title: 'שם הסקר',
		icon: <div className='flex flex-col items-center py-4 px-5 pe-2 text-red-700'>
			<div className='text-2xl font-black leading-none'>12%</div>
			<div className='font-bold'>ענו</div>
		</div>,
		subtitle: undefined,
		lowerTags: [{
			type: 'chip',
			label: 'רווחה'
		}],
		personName: undefined,
		personePhone: undefined,
		contactName: undefined,
		upperButton: <Button variant="text" className='min-w-0 p-0 text-lg'>
			<i className="fas fa-ellipsis-vertical"></i>
		</Button>,
		lowerButton: <Button variant="text" onClick={() => navigate('/s/poll-details')}>
		לתוצאות
			<i className="fas fa-chevron-right ms-2"></i>
		</Button>
	}
	return (
		<div className="p-4">
			<div className="flex gap-2">
				<div className="w-full">
					<SearchBar placeholder="חיפוש" />
				</div>
				<Button className="rounded-lg border-primary-color" variant="outlined">
					<i className="fas fa-bars-filter me-2"></i>
				סינון
				</Button>
			</div>

			<div className="mt-4">
				<CallCard {...cardProps} />
			</div>
			<div className="mt-4">
				<CallCard {...cardProps2} />
			</div>
		</div>

	)

}