import { useMutation, useQuery } from '@tanstack/react-query';
import { chain, scalars } from '../../generated/zeus/chain';
import { ModelTypes } from '../../generated/zeus';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import { queryClient } from './query-client';
import { useAppMutation } from './hooks';


// ---- Profile --------------------------------------------------------------------------
export type Profile = DeepPartial<ModelTypes['Profile']>;

export const useQuery_Profile = () => {
	return useQuery({
		queryKey: ['profile'],
		queryFn: () =>
			chain('query', { scalars })({
				Profile: [{
					where: {
						email: { _eq: '' }
					}
				}, {
					id: true,
					email: true,
					first_name: true,
					last_name: true,
					phone: true,
					picture_url: true,
					updated_at: true,
					created_at: true
				}]
			})
	});
};

export const useQuery_ProfileId = () => {
	const query_Profile = useQuery_Profile();
	return query_Profile.data?.Profile?.[0]?.id;
};

export const useMutation_CreateProfile = () => {
	return useMutation({
		mutationFn: (profile: DeepPartial<ModelTypes['Profile']>) => {
			return chain('mutation', { scalars })({
				insert_Profile_one: [{
					object: {
						...toInput(profile)
					}
				}, {
					id: true
				}]
			});
		},
		onSettled: (data, error) => {
			queryClient.invalidateQueries({ queryKey: ['profile'] });
		}
	});
};

export const useMutation_UpdateProfile = () => {
	const toastIdRef = useRef<string>();
	return useMutation({
		mutationFn: (profile: DeepPartial<ModelTypes['Profile']>) => {
			toastIdRef.current = toast.loading('Updating profile...');
			return chain('mutation', { scalars })({
				update_Profile: [{
					where: {
						email: { _eq: '' }
					},
					_set: {
						...profile
					}
				}, {
					affected_rows: true,
					returning: {
						id: true
					}
				}]
			});
		},
		onSettled: (data, error) => {
			error && console.error(error);
			queryClient.invalidateQueries({ queryKey: ['profile'] });
			if (error) toast.error('Error updating profile', { id: toastIdRef.current });
			else toast.success('Profile updated successfully', { id: toastIdRef.current });
		}
	});
};




// ---- Utils ----------------------------------------------------------------------------
// A function that loop over keys of object and if the key's first latter is uppercase then nest the value in {data: value}
export const toInput = (obj: any) => {
	Object.keys(obj).forEach(key => obj[key] === '' && delete obj[key]);
	const newObj: any = {};
	for (const key in obj) {
		if (obj[key] === null) continue;
		const isFirstLatterUppercase = key[0] === key[0].toUpperCase();
		if (isFirstLatterUppercase) {
			newObj[key] = {};
			newObj[key].data = obj[key];
		} else {
			newObj[key] = obj[key];
		}
	}
	return newObj;
};

export const toUpdate = (obj: any) => {
	const newObj: any = {};
	for (const key in obj) {
		const isFirstLatterUppercase = key[0] === key[0].toUpperCase();
		if (!isFirstLatterUppercase) newObj[key] = obj[key];
	}
	return newObj;
};

type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;
