import { useQuery } from "@tanstack/react-query";
import { appFetch } from "../app-fetch";


export type SubjectByIdResponse = {
	id: string;
	gov_id: string;
	phone: string;
	first_name: string;
	middle_name: string;
	last_name: string;
	date_of_birth: string;
	mother_name: string;
	father_name: string;
	sex: string;
	street: string;
	city: string;
	postal_code: string;
	country: string;
	created_at: string;
	updated_at: string;
};

export const useSubjectById = (id?: string) => {
	return useQuery({
		enabled: !!id,
		queryKey: [`subject-details-${id}`],
		queryFn: () => {
			return appFetch<SubjectByIdResponse>(`/api/v1/subject/${id}`)
		},

	});
};