import { Button, Chip, ChipProps, Paper } from "@mui/material";
import { FC, ReactNode, useState } from "react";
import { Tag, TagProps } from "../tag/tag";


export interface CallCardProps {
	date: Date | string;
	upperTags?: Array<TagProps>;
	lowerTags?: Array<TagProps>;
	preTitle?: ReactNode;
	icon?: ReactNode;
	title: ReactNode;
	subtitle?: ReactNode;
	personName?: ReactNode;
	personePhone?: string;
	upperButton?: ReactNode;
	lowerButton?: ReactNode;
	contactName?: ReactNode;
}

export const CallCard: FC<CallCardProps> = props => {
	const date = new Date(props.date);
	return (
		<div className="shadow rounded-lg flex flex-col min-w-[328px]">
			<div className="flex">
				{props.icon}
				<div className="p-3 pb-2 flex-1">
					<div className="flex items-center justify-between gap-2">
						<div className="flex gap-2 items-center">
							<div>
								{date?.toLocaleDateString()}
							</div>
							{props.upperTags?.map((tag, index) => (
								<Tag key={index} {...tag} />
							))}
						</div>
						<div>
							{props.upperButton}
						</div>
					</div>
					<div>
						{props.preTitle}
					</div>
					<div className="font-bold">
						{props.title}
					</div>
					<div>
						{props.subtitle}
					</div>
					<div>
						<div className="flex items-center justify-between">
							<Button variant="text" className="ps-0 py-1">
								{props.personName}
							</Button>
							{props.personePhone && <div className="flex items-center">
								<Button variant="text" className="w-min min-w-0 p-3 -scale-x-100 -rotate-45">
									<i className="fas fa-phone-volume text-2xl"></i>
								</Button>
								<div className="w-[1px] bg-[#D9D9D9] h-[25px]"></div>
								<Button variant="text" className="w-min min-w-0 p-3">
								
									<i className="fab fa-whatsapp fa-2x"></i>
								</Button>
							</div>}
						</div>
					</div>
				</div>
			</div>
			<div className="w-fulll h-[1px] bg-[#D9D9D9]"></div>
			{props.contactName && <div className="p-3 pb-0 font-bold flex gap-2 items-center">
				<div className="bg-[#FFD175] rounded-full w-6 h-6 flex items-center justify-center">
					<i className="fas fa-user text-xs text-black"></i>
				</div>
				{props.contactName}
			</div>}
			{props.lowerTags && <div className="p-3 flex items-center justify-between">
				<div className="flex gap-2">
					{props.lowerTags?.map((tag, index) => (
						<Tag key={index} {...tag} />
					))}
				</div>
				{props.lowerButton}
			</div>}

		</div>
	);
}
