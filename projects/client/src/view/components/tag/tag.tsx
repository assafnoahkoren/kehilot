import { Chip, ChipProps } from "@mui/material";
import { FC } from "react";

type TagProps = ChipProps;


const translateMap = {
	open: 'פתוח',
	closed: 'סגור',
	high: 'גבוה',
	normal: 'רגיל',
	low: 'נמוך',
}

export const Tag: FC<TagProps> = props => {

	return (
		<div>
			<Chip {...props} label={translateMap[props.label]}/>
		</div>
	);
}