import { useQuery } from "@tanstack/react-query";
import { appFetch } from "../app-fetch";



type CountMyIssuesResponse = {
	count: number
}

export const useCountMyIssues = () => {
	return useQuery({
		queryKey: ['count-my-issues'],
		queryFn: () => {
			return appFetch<CountMyIssuesResponse>('/api/v1/issue/count-mine')
		},

	});
};


type MyIssuesResponse = {
	id: string;
	title: string;
	content: string;
	created_at: string;
	updated_at: string;
	priority: string;
	status: string;
	subject: {
		id: string;
		first_name: string;
		middle_name: string;
		last_name: string;
		gov_id: string;
		phone: string;
		street: string;
		city: string;
		country: string;
	};
};

export const useMyIssues = () => {
	return useQuery({
		queryKey: ['my-issues'],
		queryFn: () => {
			return appFetch<Array<MyIssuesResponse>>('/api/v1/issue/mine')
		},

	});
};