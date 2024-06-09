import { Chip, ChipProps } from "@mui/material";
import { FC } from "react";


interface TagProps extends ChipProps {
	type: 'default' | 'solid' | 'danger' | 'warning' | 'info' | 'light' | 'chip';

}

export const Tag: FC<TagProps> = props => {
	const type = props.type || 'default';

	return (
		<div>
			<Chip {...props} sx={{
				...typeMap[type],
				paddingY: 0.5,
				minHeight: 0,
				height: 'auto',
			}}/>
		</div>
	);
}

const typeMap: Record<TagProps['type'], React.CSSProperties> = {
	default: {
		color: 'var(--secondary-color)',
		backgroundColor: 'var(--accent-color)',
		border: '1px solid #2D4173',
		fontWeight: 'bold',
	},
	solid: {
		backgroundColor: 'var(--secondary-color)',
		color: 'var(--accent-color)',
		fontWeight: 'bold',
	},
	danger: {
		backgroundColor: '#FFEAF4',
		color: '#880000',
		fontWeight: 'bold',
		border: '1px solid #880000',
	},
	warning: {
		backgroundColor: '#FFF8D6',
		color: '#E76500',
		fontWeight: 'bold',
		border: '1px solid #E76500',
	},
	info: {
		backgroundColor: '#EFF1F2',
		color: '#6B6B6B',
		fontWeight: 'bold',
		border: '1px solid #6B6B6B',
	},
	light: {
		backgroundColor: '#EFF1F2',
		color: '#788FA6',
		fontWeight: 'bold',
		border: '1px solid #788FA6',
	},
	chip: {
		backgroundColor: '#FFD175',
		color: '#000000',
		fontWeight: 'bold',
	}
}