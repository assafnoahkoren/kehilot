import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../../core/api/hooks/auth';
import { Button } from '@mui/material';
import { SearchBar } from '../components/search-bar/search-bar';
import Lottie from 'react-lottie-player'
import lottieJson from '../../assets/home-page-animation.json'

export const HomePage: FC = () => {
	const query_me = useMe();
	const navigate = useNavigate();

	return <div className='flex flex-col justify-between h-full '>
		<div className='p-4'>
			<h1 className='text-2xl font-bold mb-0'>
				שלום {query_me.data?.name.split(' ')[0]}
			</h1>
			<h1 className='text-xl font-medium'>
				מה מעניין אותך לבדוק היום?
			</h1>
		</div>
		
		<div className='relative'>
			<div className='absolute -top-[120%] flex justify-center w-full'>
				<Lottie
					className='relative top-[5rem]'
					loop
					animationData={lottieJson}
					play
				/>
			</div>
			<div className='relative flex flex-col gap-4 w-full h-80 bg-white rounded-t-[2rem] p-4 px-3'>

				<SearchBar placeholder='חיפוש'/>
				<div className='flex flex-col gap-4 flex-1'>
					<div className='flex w-full gap-4 h-2/3'>
						<Button disabled className='flex-1 rounded-xl text-2xl'>
							סקרים
						</Button>
						<Button onClick={() => navigate('/s/cases')} className='flex-1 rounded-xl text-2xl'>
							<div className='absolute start-0 top-3 bg-yellow-500 text-black text-xl px-4 rounded-e-full'>{0}</div>
							פניות
						</Button>
					</div>
					<div className='flex w-full h-1/3'>
						<Button disabled className='flex-1 rounded-xl text-2xl'>
							{/* <div className='absolute start-0 top-3 bg-yellow-500 text-black text-xl px-4 rounded-e-full'>5</div> */}
							תובנות
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>;

};
