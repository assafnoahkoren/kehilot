import React, { useState } from 'react';

type ButtonProps = {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
};

const Button: React.FC<ButtonProps> = ({ label, onClick, style }) => (
	<div onClick={onClick} style={{ padding: '10px', ...style }}>
		{label}
	</div>
);

type Res4 = {
  a1: { label: string };
  a2: { label: string };
  a3: { label: string };
  a4: { label: string };
};

const Res4Section: React.FC<Res4> = ({
	a1,
	a2,
	a3,
	a4
}) => {
	const [activeButton, setActiveButton] = useState<'X' | 'Y' | 'Z' | 'W'>('X');

	const containerStyle: React.CSSProperties = {
		display: 'flex',
		flexWrap: 'nowrap', // Prevent wrapping to ensure horizontal alignment
		borderRadius: '5px',
		overflow: 'hidden',
		border: '1px solid #f0f0f0',
		gap: '2px',
		padding: '8px',
		backgroundColor: '#white',
	};

	const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
		backgroundColor: isActive ? '#3A6D9C' : 'white',
		color: isActive ? 'white' : 'black',
		cursor: 'pointer',
		// Remove flexGrow and flexBasis adjustments to allow natural flow in the flex container
	});

	return (
		<div style={containerStyle}>
			<Button
				label={a1.label}
				style={getButtonStyle(activeButton === 'X')}
				onClick={() => setActiveButton('X')}
			/>
			<Button
				label={a2.label}
				style={getButtonStyle(activeButton === 'Y')}
				onClick={() => setActiveButton('Y')}
			/>
			<Button
				label={a3.label}
				style={getButtonStyle(activeButton === 'Z')}
				onClick={() => setActiveButton('Z')}
			/>
			<Button
				label={a4.label}
				style={getButtonStyle(activeButton === 'W')}
				onClick={() => setActiveButton('W')}
			/>
		</div>
	);
};

export default res4Section;
