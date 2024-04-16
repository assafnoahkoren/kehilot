import { Button, TextField, TextFieldProps } from "@mui/material";
import { FC } from "react";

type SearchBarProps = TextFieldProps;

export const SearchBar: FC<SearchBarProps> = props => {

	return (
		<div className="relative rounded-full border-[1px] border-blue-500 overflow-hidden ">
			<div className="absolute end-4 h-full flex items-center -scale-x-100">
				<i className="fas fa-magnifying-glass text-blue-500"></i>
			</div>
			<TextField
				variant="standard"
				InputProps={{
					sx: { border: 'none'},
					disableUnderline: true,
					inputProps: {className: 'placeholder-blue-500 text-[18px]'}
				}} {...props}/>
		</div>
	);
}