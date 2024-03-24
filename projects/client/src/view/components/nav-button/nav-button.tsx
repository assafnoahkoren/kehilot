import React, { useState } from 'react';
import { Box } from "@mui/material";
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import RestoreIcon from '@mui/icons-material/Restore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlaceIcon from '@mui/icons-material/Place';
import HomeIcon from '@mui/icons-material/Home';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ThreePIcon from '@mui/icons-material/ThreeP';


export const buttonnav = () => {
    const [value, setValue] = useState(0);
  return (
    <Box sx={{ width: 700 }}>
      <BottomNavigation
  showLabels
  value={value}
  onChange={(event, newValue) => {
    setValue(newValue);
  }}
      >
        <BottomNavigationAction label="בית" icon={<HomeIcon />} />
        <BottomNavigationAction label="מיקום התושבים" icon={<PlaceIcon />} />
        <BottomNavigationAction label="פניות התושבים" icon={<RecordVoiceOverIcon />} />
        <BottomNavigationAction label="הפניות שלי" icon={<ThreePIcon />} />
      </BottomNavigation>
    </Box>
  );
};