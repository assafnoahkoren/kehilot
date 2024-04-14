import { useQuery } from '@tanstack/react-query';
import { appFetch } from '../app-fetch';
import { useAppMutation } from '../hooks.ts';

export const useNotes = (entityId: string) => {
	return useQuery({
		queryKey: [`notes-${entityId}`],
		queryFn: () => {
			return appFetch(`/api/v1/notes/${entityId}`)
		},

	});
};

export const useCreateNote = () => {
	return useAppMutation({
		mutationFn: (body: {content: string, entityType: string, entityId: string}) => {
			return appFetch('/api/v1/notes', {
				method: 'POST',
				body: JSON.stringify(body),
			})
		},
		toast: {
			onSuccess: 'הערה נוצרה בהצלחה',
			onError: 'אירעה שגיאה ביצירת הערה'
		}
	})
}