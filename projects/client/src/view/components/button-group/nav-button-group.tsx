import { Button, ButtonGroup, Chip, ChipProps } from "@mui/material";
import React, { FC, useEffect, useState } from "react";


interface ButtonGroupProps extends ChipProps {
	className?: string;
	activeId?: string;
	onActiveChange?: (id: string) => void;
	buttons: {
		id?: string;
		label: React.ReactNode;
		onClick?: () => void;
	}[]
}

type ButtonProps = ButtonGroupProps['buttons'][0];

export const NavButtonGroup: FC<ButtonGroupProps> = props => {
	const [selected, setSelected] = useState(props.activeId || props.buttons[0].id);
	useEffect(() => {
		if (!props.activeId) return;
		setSelected(props.activeId);
	}, [props.activeId]);

	const handleClick = (button: ButtonProps) => {
		setSelected(getId(button));
		if (button.onClick) {
			button.onClick();
		}
		if (props.onActiveChange) {
			props.onActiveChange(getId(button))
		}
	}

	return (
		<div dir="ltr" className={`flex justify-center w-max p-1 border-[1px] border-slate-200 rounded-2xl bg-white ${props.className}`}>
			<ButtonGroup disableElevation sx={{gap: 1, width: '100%'}}>
				{props.buttons?.map((button, index) => (
					<Button className="rounded-xl px-2" variant={selected === getId(button) ? 'contained' : 'text'} key={index} onClick={() => handleClick(button)}>
						{button.label}
					</Button>	
				))}
			</ButtonGroup>
		</div>
	);
}


function getId(button: ButtonProps): string {
	if (typeof(button.label) !== 'string' && !button.id) return '';
	
	return button.id || button.label as string;
}

