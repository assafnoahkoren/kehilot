import { useMutation, useQuery } from "@tanstack/react-query";
import { appFetch } from "../app-fetch";
import { useState } from "react";

type LoginResponse = {
	accessToken: string;
};

type MeResponse = {
		userId: string;
		name: string;
		identifier: string;
		iat?: number;
	} & ExtraFields;
	
	type ExtraFields = {
		[key: string]: any;
	};


export const useMe = () => {
	return useQuery({
		queryKey: ['me'],
		queryFn: () => appFetch<MeResponse>('/api/v1/auth/me')
	});
}

export const useLogin = () => {
	return useMutation({
		mutationFn: (creds: {email: string, password: string}) => {
			return appFetch<LoginResponse>('/api/v1/auth/login-with-email', {
				method: 'POST',
				body: JSON.stringify(creds)
			})
		},
		onSettled: (data, error) => {
			error && console.error(error);
		}
	});
};

export const logout = () => {
	localStorage.removeItem('__JWT__');
	window.location.reload();
}