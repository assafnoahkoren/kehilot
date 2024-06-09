import { Button, ButtonGroup, Chip, ChipProps } from "@mui/material";
import { FC, useState } from "react";


interface ButtonGroupProps extends ChipProps {
	buttons: React.ReactNode[]
}

export const NavButtonGroup: FC<ButtonGroupProps> = props => {
	const [selected, setSelected] = useState(0);
	return (
		<div dir="ltr" className="p-0.5 border-[1px] border-slate-200 rounded-xl">
			<ButtonGroup disableElevation sx={{gap: 1}}>
				{props.buttons?.map((button, index) => (
					<Button className="rounded-xl px-2" variant={selected === index ? 'contained' : 'text'} key={index} onClick={() => setSelected(index)}>
						{button}
					</Button>	
				))}
			</ButtonGroup>
		</div>
	);
}
