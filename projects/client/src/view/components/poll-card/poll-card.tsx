import { Button, Chip, ChipProps, Paper } from "@mui/material";
import { FC, ReactNode, useState } from "react";
import { Tag, TagProps } from "../tag/tag";


export interface PollCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  upperButton?: ReactNode;
  icon?: ReactNode;
}

export const PollCard: FC<PollCardProps> = props => {
	const date = new Date(props.date);
	return (
		<div className="w-full rounded-lg shadow flex items-center justify-between bg-white" style={{color: '#0A2342'}}>
			<div>
				{props.icon}
			</div>
			<div className="flex flex-col flex-1">
				<div className={`p-3 ${props.icon ? 'ps-0' : ''}`}>
					<div className="flex items-center justify-between gap-2">
						<div className="flex gap-2 items-cente font-bold text-lg">
							<div>
								{props.title}
							</div>
						</div>
						<div>
							{props.upperButton}
						</div>
					</div>
					<div className="font-bold">
						{props.subtitle}
					</div>

				</div>
			</div>
		</div>
	);
}
