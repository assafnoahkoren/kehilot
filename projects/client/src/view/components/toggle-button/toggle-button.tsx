import React, { useState } from 'react';
// No need to import Link from "@mui/material" unless it's used elsewhere in your file

// Define props for individual buttons
type ButtonProps = {
  label: string;
  iconClass: string; // Class for FontAwesome icon
};

// Props for the entire toggle section
type ToggleButtonSectionProps = {
  buttonList: ButtonProps;
  buttonMap: ButtonProps;
};

const ToggleButtonSection: React.FC<ToggleButtonSectionProps> = ({ buttonList, buttonMap }) => {
	const [selected, setSelected] = useState<'list' | 'map'>('list'); // Explicitly state the type of 'selected'

	const getButtonStyle = (buttonType: 'list' | 'map') => ({
		padding: '10px 20px',
		cursor: 'pointer',
		backgroundColor: selected === buttonType ? '#3A6D9C' : '#FFFFFF',
		color: selected === buttonType ? 'white' : '#3A6D9C',
		display: 'flex',
		alignItems: 'center',
		gap: '10px',
		width: '194px', // Added width property
		height: '42px', // Added height property
	});

	return (
		<div style={{ display: 'inline-flex', borderRadius: '5px', overflow: 'hidden', border: '1px solid #ccc' }}>
			<div onClick={() => setSelected('list')} style={getButtonStyle('list')}>
				<i className={buttonList.iconClass} style={{ fontSize: '1rem', color: selected === 'list' ? 'white' : '#3A6D9C' }}></i>
				{buttonList.label}
			</div>
			<div onClick={() => setSelected('map')} style={getButtonStyle('map')}>
				<i className={buttonMap.iconClass} style={{ fontSize: '1rem', color: selected === 'map' ? 'white' : '#3A6D9C' }}></i>
				{buttonMap.label}
			</div>
		</div>
	);
};

export default ToggleButtonSection;