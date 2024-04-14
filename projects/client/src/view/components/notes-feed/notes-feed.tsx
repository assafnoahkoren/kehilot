import { FC, useState } from 'react';
import { Button, Collapse, Grow, TextField } from '@mui/material';
import { useCreateNote, useNotes } from '../../../core/api/hooks/notes.ts';

type NotesFeedProps = {
	entityId: string;
}
export const NotesFeed: FC<NotesFeedProps> = (props) => {

	const query_Notes = useNotes(props.entityId);
	const [noteText, setNoteText] = useState('');
	const mutation_CreateNote = useCreateNote(props.entityId);

	const createNote = async (e: any) => {
		e.preventDefault()
		mutation_CreateNote.mutate({
			content: noteText,
			entityType: 'issue',
			entityId: props.entityId
		}, {
			onSuccess: () => setNoteText('')
		});
	}

	return (
		<div className="notes-container">
			{query_Notes.data?.map(note => (
				<Grow in key={note.id}>
					<div key={note.id} className="flex gap-4 p-4 pt-2 bg-white rounded-xl mb-4">
						<div className="flex flex-col gap-2  w-full">
							<div className="flex gap-2 justify-between items-center w-full">
								<div className="flex items-center gap-2">
									<i className="fas fa-user-circle text-3xl opacity-30" />
									<span className="font-bold">{note.user.first_name} {note.user.last_name}</span>
									<div className='-scale-x-100'>
										<i className="fas fa-phone text-xs text-cyan-500 " />
									</div>
									<div className='-scale-x-100'>
										<i className="fas fa-message-lines text-xs text-lime-500 relative top-[1px]" />
									</div>
								</div>
								<span className="text-sm opacity-30">{prettyDate(note.created_at)}</span>
							</div>
							<span>{note.content}</span>
						</div>
					</div>
				</Grow>
			))}
			<form onSubmit={createNote} className="fixed flex gap-2 bottom-[64px] py-3 start-0 px-4 w-full" style={{background: 'linear-gradient(to top, #00000010, transparent)'}}>
				<Button type='submit' className="rounded-full overflow-hidden min-w-0 w-[43px]" variant="contained" color="primary" onClick={createNote}>
					<i className="fas fa-paper-plane" />
				</Button>
				<TextField value={noteText} placeholder='הוסף הערה' className="rounded-full flex-1 overflow-hidden" fullWidth inputProps={{style: {background: 'white'}}} onChange={(e) => setNoteText(e.target.value)}  />
			</form>
		</div>
	)
}

function prettyDate(dateString: string) {
	// DD/MM HH:MM:SS with trailing zeros

	const date = new Date(dateString);
	const day = date.getDate().toString()
		.padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0');
	const hours = date.getHours().toString()
		.padStart(2, '0');
	const minutes = date.getMinutes().toString()
		.padStart(2, '0');
	const seconds = date.getSeconds().toString()
		.padStart(2, '0');

	return `${hours}:${minutes} ${day}/${month}`;
}