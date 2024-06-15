import { Button, Chip, ChipProps, Collapse, Paper } from '@mui/material';
import { FC, ReactNode, useState } from "react";
import { Tag, TagProps } from "../tag/tag";


interface ExpandableCardProps {
  title: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

export const ExpandableCard: FC<ExpandableCardProps> = props => {
	const [open, setOpen] = useState(false);
	return (
		<div className="w-full rounded-lg shadow bg-white" onClick={() => setOpen(!open)} >

			<div className="flex items-center justify-between" style={{color: '#0A2342'}}>
				<div>
					{props.icon}
				</div>
				<div className="flex flex-col flex-1">
					<div className="p-3 ps-0">
						<div className="flex items-center justify-between gap-2">
							<div className="flex gap-2 items-cente font-bold text-lg">
								<div>
									{props.title}
								</div>
							</div>
							<Button variant="text" className={`p-0 min-w-0 ${open ? '-rotate-180' : 'rotate-0'} transition-all`}>
								<i className="fas fa-chevron-down p-3"></i>
							</Button>
						</div>
					</div>
				</div>

			</div>
			<Collapse in={open}>
				{props.children}
			</Collapse>
		</div>
	);
}
