import { FC, useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMe } from '../../core/api/hooks/auth';
import { Button } from '@mui/material';
import { SearchBar } from '../components/search-bar/search-bar';
import Lottie from 'react-lottie-player'
import lottieJson from '../../assets/home-page-animation.json'
import { atom_layoutState } from '../layout/layout-state';
import { useRecoilState } from 'recoil';
import { useCountMyIssues } from '../../core/api/hooks/issues';

export const HomePage: FC = () => {
	const query_me = useMe();
	const navigate = useNavigate();
	const [layoutState, setLayoutState] = useRecoilState(atom_layoutState);
	const query_CountMyIssues = useCountMyIssues();

	useLayoutEffect(() => {
		setLayoutState({topBarVisible: false, title: '', backgroundColor: 'blur'})
	}, []);
	
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
			<div className='absolute -top-[20rem] flex justify-center w-full'>
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
						<Button disabled className='flex flex-col flex-1 rounded-xl text-2xl'>
							<svg className='opacity-50' width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path fillRule="evenodd" clipRule="evenodd" d="M25.4392 8.89011C32.1701 8.58802 39.6577 3.25069 44.6253 7.88127C49.8256 12.7288 47.8832 21.2991 46.2363 28.2763C44.62 35.1237 41.8966 41.998 35.7898 45.3133C29.4097 48.7768 21.2834 49.0711 15.1699 45.1414C9.60842 41.5665 9.32569 34.0505 8.05301 27.4842C6.85446 21.3004 3.99436 14.0799 8.26441 9.51313C12.4184 5.07055 19.418 9.16033 25.4392 8.89011Z" fill="#CDFDD7"/>
								<path d="M12.127 11.0468L11.8773 12.25H13.1062H22.6462C25.1429 12.25 26.8469 14.8219 25.866 17.1359C25.8659 17.1363 25.8657 17.1366 25.8656 17.1369L21.0537 28.3797C20.4893 29.6633 19.2254 30.5 17.8312 30.5H4.51116C2.58844 30.5 1.01116 28.9227 1.01116 27V13.9725C1.01116 13.0446 1.37788 12.1626 2.04942 11.5255L2.05896 11.5164L2.06826 11.5071L11.0683 2.5071L11.0683 2.50715L11.0763 2.49893C11.645 1.91704 12.598 1.90317 13.2024 2.50048C13.5671 2.88349 13.7181 3.40104 13.6137 3.88366L13.6137 3.88365L13.612 3.89178L12.127 11.0468ZM41.8953 42.9532L42.145 41.75H40.9162H31.3762C28.8609 41.75 27.174 39.1819 28.1562 36.8643C28.1564 36.8639 28.1566 36.8634 28.1567 36.863L32.967 25.624C32.9675 25.6228 32.9681 25.6216 32.9686 25.6204C33.5329 24.3368 34.7969 23.5 36.1912 23.5H49.5112C51.4357 23.5 53.0061 25.077 52.9887 26.9909H52.9887V27V40.0275C52.9887 40.9491 52.6256 41.8214 51.954 42.4929L42.954 51.4929L42.954 51.4928L42.946 51.5011C42.3773 52.0829 41.4244 52.0968 40.82 51.4996C40.4552 51.1165 40.3042 50.599 40.4086 50.1163L40.4086 50.1163L40.4103 50.1082L41.8953 42.9532Z" fill="white" stroke="#4E5461" strokeWidth="2"/>
							</svg>

							סקרים
						</Button>
						<Button onClick={() => navigate('/s/issues')} className='flex flex-col flex-1 rounded-xl text-2xl'>
							<div className='absolute start-0 top-3 bg-yellow-500 text-black text-xl px-4 rounded-e-full'>{query_CountMyIssues.data?.count ?? '?'}</div>
							<svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path fillRule="evenodd" clipRule="evenodd" d="M22.3699 4.03894C26.8287 3.68927 31.2739 5.73321 34.6916 8.61479C37.9035 11.3229 39.3459 15.4381 40.6308 19.4355C41.7935 23.0529 42.3711 26.8004 41.7412 30.5471C41.1214 34.234 39.6107 37.7419 37.0888 40.5043C34.6048 43.2253 31.0772 44.4277 27.7069 45.92C23.8196 47.6413 20.0616 50.5693 15.862 49.9032C11.5517 49.2195 8.05691 45.903 5.46907 42.3928C2.99545 39.0375 2.51266 34.822 1.72677 30.7298C0.901932 26.4348 -1.08924 21.8719 0.767538 17.9113C2.62217 13.9552 7.55329 12.8169 11.232 10.4545C14.9115 8.09169 18.009 4.38094 22.3699 4.03894Z" fill="#CDFDD7"/>
								<path d="M28.2514 21.375C28.2514 25.7933 24.6697 29.375 20.2514 29.375C15.8331 29.375 12.2514 25.7933 12.2514 21.375C12.2514 16.9567 15.8331 13.375 20.2514 13.375C24.6697 13.375 28.2514 16.9567 28.2514 21.375ZM3.2514 43.875C3.2514 42.746 3.80901 41.6831 4.89733 40.6787C5.99244 39.668 7.55696 38.7854 9.37046 38.0589C12.9991 36.6053 17.3727 35.875 20.2514 35.875C23.1301 35.875 27.5037 36.6053 31.1323 38.0589C32.9459 38.7854 34.5104 39.668 35.6055 40.6787C36.6938 41.6831 37.2514 42.746 37.2514 43.875V47.375H3.2514V43.875ZM35.206 25.6038C36.7299 22.9589 36.7299 19.7686 35.206 17.1237L37.6537 14.6615C40.9504 18.8762 40.9245 24.227 37.6827 28.0952L35.206 25.6038ZM42.8438 33.3957C48.5895 26.1729 48.6183 16.2785 42.859 9.33914L45.1312 7.0669C52.6354 15.5263 52.6024 27.5707 45.1443 35.6962L42.8438 33.3957Z" fill="white" stroke="#4E5461" strokeWidth="2"/>
							</svg>
							פניות
						</Button>
					</div>
					<div className='flex w-full h-1/3'>
						<Button disabled className='flex-1 rounded-xl text-2xl'>
							{/* <div className='absolute start-0 top-3 bg-yellow-500 text-black text-xl px-4 rounded-e-full'>5</div> */}
							<svg className='opacity-50' width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path fillRule="evenodd" clipRule="evenodd" d="M32.5347 0.267061C38.5199 1.43868 39.949 8.20203 42.9508 13.084C45.0599 16.5141 47.4045 19.7834 46.9407 23.6964C46.394 28.3085 44.5068 32.8579 40.3001 35.4459C35.2724 38.539 29.0418 40.0047 23.2983 38.2414C16.6038 36.1861 10.3411 31.9488 8.54811 25.6978C6.70142 19.2596 9.73163 12.5502 14.4841 7.5116C19.001 2.72273 25.7753 -1.05609 32.5347 0.267061Z" fill="#CDFDD7"/>
								<path d="M46.8128 19.741L47.149 19.5865L47.3035 19.2503L47.8125 18.1435L48.3215 19.2503L48.476 19.5865L48.8122 19.741L49.919 20.25L48.8122 20.759L48.476 20.9135L48.3215 21.2497L47.8125 22.3565L47.3035 21.2497L47.149 20.9135L46.8128 20.759L45.706 20.25L46.8128 19.741ZM42.7624 10.2052L42.4227 10.3602L42.2677 10.6999L41.0625 13.3411L39.8573 10.6999L39.7023 10.3602L39.3626 10.2052L36.7214 9L39.3626 7.79476L39.7023 7.63978L39.8573 7.30013L41.0625 4.65886L42.2677 7.30013L42.4227 7.63978L42.7624 7.79476L45.4036 9L42.7624 10.2052ZM21.9156 48.25C21.4819 49.6907 20.1382 50.75 18.5625 50.75C16.9868 50.75 15.6431 49.6907 15.2094 48.25H21.9156ZM11.8125 44C11.1273 44 10.5625 43.4352 10.5625 42.75C10.5625 42.0648 11.1273 41.5 11.8125 41.5H25.3125C25.9977 41.5 26.5625 42.0648 26.5625 42.75C26.5625 43.4352 25.9977 44 25.3125 44H11.8125ZM34.4375 23.625C34.4375 31.4484 29.1606 35.7509 26.6818 37.25H10.4432C7.96438 35.7509 2.6875 31.4484 2.6875 23.625C2.6875 14.8623 9.79979 7.75 18.5625 7.75C27.3252 7.75 34.4375 14.8623 34.4375 23.625Z" fill="white" stroke="#4E5461" strokeWidth="2"/>
							</svg>
							&nbsp;
							 תובנות
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>;

};
