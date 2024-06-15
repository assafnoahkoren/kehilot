import { Button, TextField, TextFieldProps } from "@mui/material";
import { FC } from "react";

type SearchBarProps = TextFieldProps;

export const SearchBar: FC<SearchBarProps> = props => {

	return (
		<div className="relative rounded-lg border-[1px] border-primary-color overflow-hidden bg-white w-full">
			<div className="absolute end-4 h-full flex items-center -scale-x-100">
				<i className="fas fa-magnifying-glass text-primary-color"></i>
			</div>
			<TextField
				variant="standard"
				InputProps={{
					sx: { border: 'none'},
					disableUnderline: true,
					inputProps: {className: 'placeholder-primary-color text-[18px]'}
				}} {...props}/>
		</div>
	);
}