import { Button, TextField, TextFieldProps } from "@mui/material";
import { FC } from "react";

type SearchBarProps = TextFieldProps;

export const SearchBar: FC<SearchBarProps> = props => {

	return (
		<TextField {...props}/>
	);
}