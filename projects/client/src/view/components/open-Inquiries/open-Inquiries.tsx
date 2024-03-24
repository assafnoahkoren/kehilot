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

type NestedButtonsSectionProps = {
  openInquiries: { label: string };
  statusUpdate: { label: string };
};

const NestedButtonsSection: React.FC<NestedButtonsSectionProps> = ({ openInquiries, statusUpdate }) => {
	const [activeButton, setActiveButton] = useState<'X' | 'Y'>('X');

	const containerStyle: React.CSSProperties = {
		display: 'inline-flex',
		borderRadius: '5px',
		overflow: 'hidden',
		border: '1px solid #f0f0f0',
		gap: '2px',
		padding: '8px',
		backgroundColor: '#white',
	};

	// Adjusting button styles to change text color based on background
	const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
		backgroundColor: isActive ? '#3A6D9C' : 'white',
		color: isActive ? 'white' : 'black', // Text color changes based on active state
		cursor: 'pointer',
		flexGrow: 1,
	});

	return (
		<div style={containerStyle}>
			<Button
				label={openInquiries.label}
				style={getButtonStyle(activeButton === 'X')}
				onClick={() => setActiveButton('X')}
			/>
			<Button
				label={statusUpdate.label}
				style={getButtonStyle(activeButton === 'Y')}
				onClick={() => setActiveButton('Y')}
			/>
		</div>
	);
};

export default NestedButtonsSection;
