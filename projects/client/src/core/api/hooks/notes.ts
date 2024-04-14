import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export const useCreateNote = (entityId: string) => {
	const queryClient = useQueryClient();

	return useAppMutation({
		mutationFn: (body: {content: string, entityType: string, entityId: string}) => {
			return appFetch('/api/v1/notes', {
				method: 'POST',
				body: JSON.stringify(body),
			})
		},
		toast: {
			success: 'הערה נוצרה בהצלחה',
			error: 'אירעה שגיאה ביצירת הערה',
			loading: 'יוצר הערה...'
		},
		onSuccess: () => {
			queryClient.invalidateQueries(`notes-${entityId}` as any);
		}
	})
}