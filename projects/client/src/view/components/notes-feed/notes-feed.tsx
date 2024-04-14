import { FC, useState } from 'react';
import { Button, TextField } from '@mui/material';
import { useCreateNote, useNotes } from '../../../core/api/hooks/notes.ts';

type NotesFeedProps = {
	entityId: string;
}
export const NotesFeed: FC<NotesFeedProps> = (props) => {

	const query_Notes = useNotes(props.entityId);
	const [noteText, setNoteText] = useState('');
	const mutation_CreateNote = useCreateNote();

	const createNote = async () => {
		await mutation_CreateNote.mutateAsync({
			content: noteText,
			entityType: 'issue',
			entityId: props.entityId
		});
		setNoteText('')
	}

	return (
		<div className="">
			{query_Notes.data?.map(note => (
				<div key={note.id} className="flex gap-4 p-4 bg-white rounded-xl mb-4">
					<div className="flex flex-col gap-2">
						<div className="flex gap-2 justify-between items-center">
							<div className="flex items-center gap-2">
								<i className="fas fa-user-circle text-3xl opacity-30" />
								<span className="font-bold">{note.user.first_name} {note.user.last_name}</span>
							</div>
							<span className="text-sm opacity-30">{prettyDate(note.created_at)}</span>
						</div>
						<span>{note.content}</span>
					</div>
				</div>
			))}
			<div className="fixed flex gap-2 bottom-[64px] py-3 start-0 px-4 w-full" style={{background: 'linear-gradient(to top, #00000010, transparent)'}}>
				<Button className="rounded-full overflow-hidden min-w-0 w-[43px]" variant="contained" color="primary" onClick={createNote}>
					<i className="fas fa-paper-plane" />
				</Button>
				<TextField value={noteText}  className="rounded-full flex-1 overflow-hidden" fullWidth inputProps={{style: {background: 'white'}}} onChange={(e) => setNoteText(e.target.value)}  />
			</div>
		</div>
	)
}

function prettyDate(dateString: string) {
	// DD/MM HH:MM:SS with trailing zeros

	const date = new Date(dateString);
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');

	return `${hours}:${minutes}:${seconds} ${day}/${month}`;
}