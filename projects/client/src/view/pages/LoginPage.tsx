import { Button, CircularProgress, TextField } from '@mui/material';
import { FC, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignInGoogle, useSignInPassword } from '../../core/firebase/firebase';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslate } from '../../core/translations/useTranslate';
import { LanguagePicker } from '../../core/translations/LanguagePicker';
import { useLogin } from '../../core/api/hooks/auth';

type LoginFormFields = {
	email: string;
	password: string;
	password2: string;
};

export const LoginPage: FC = props => {
	const t = useTranslate();

	const navigate = useNavigate();

	const login = useLogin();
	
	useEffect(() => {
		if (login.data?.accessToken) {
			localStorage.setItem('__JWT__', login.data.accessToken);
			navigate('/s/home');
		}
	}, [login.data?.accessToken]);
	
	

	const { register, handleSubmit } = useForm<LoginFormFields>();
	const onSubmit: SubmitHandler<LoginFormFields> = async form => {
		login.mutate({
			email: form.email,
			password: form.password
		});
	};

	return (
		<div className="flex flex-col items-center bg-slate-200 h-full">
			<div className="flex flex-col items-center gap-4 bg-white p-4 pt-10 mt-8 h-min shadow-lg w-1/3 min-w-[350px] max-w-[90vw] rounded relative">
				<h1 className="text-5xl font-bold mb-4">kehilot</h1>
				<form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center gap-4 w-full">
					<TextField {...register('email')} placeholder={t('Email')} fullWidth />
					<TextField {...register('password')} type="password" placeholder={t('Password')} fullWidth />
					<div className='relative flex items-center gap-2'>
						<Button type="submit" className="px-10">
							{t('Login')}
						</Button>
						<div className='h-full absolute right-2 flex items-center text-white'>
							{login.isPending && <CircularProgress color="inherit" size={20} />}
						</div>
					</div>
				</form>
				<div className="flex items-center gap-2">
					<div className="h-px bg-gray-300 w-14"></div>
					<p className="text-sm opacity-50 mb-1">{t('or')}</p>
					<div className="h-px bg-gray-300 w-14"></div>
				</div>
				<Button
					onClick={() => navigate('/register')}
					variant="outlined"
					color="inherit"
					className="text-slate-400 w-full"
				>
					{t('Register')}
				</Button>
			</div>
			<div className="mt-5">
				<p className="text-sm opacity-50">{t('© 2023 kehilot. All rights reserved.')}</p>
			</div>
		</div>
	);
};
