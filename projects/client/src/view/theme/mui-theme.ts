import { Direction, createTheme } from "@mui/material";
import { red,  } from "@mui/material/colors";

export const muiTheme = (dir?: Direction ) => createTheme({
	palette: {
		primary: {
			main: getComputedStyle(document.documentElement)
				.getPropertyValue('--primary-color')
				.trim() || '#1EA7FD',
		},
		secondary: {
			main: getComputedStyle(document.documentElement)
				.getPropertyValue('--secondary-color')
				.trim() || '#2D4173',
		}
	},

	direction: dir,
	components: {
		MuiButton: {
			defaultProps: {
				disableElevation: true,
				disableFocusRipple: true,
				disableRipple: true,
				disableTouchRipple: true,
				focusRipple: false,
				variant: 'contained'
			},
			styleOverrides: {
				root: {
					textTransform: 'none'
				}
			}
		},
		MuiInputBase: {
			styleOverrides: {
				root: {
					borderRadius: '4px'
				}
			}
		},
		MuiTextField: {
			defaultProps: {
				InputProps: {
					disableUnderline: true
				},
				variant: 'filled'
			},
			styleOverrides: {
				root: {
					'& input': {
						padding: '10px 14px'
					}
				}
			}
		},

		MuiSelect: {
			styleOverrides: {
				root: {
					'& .MuiSelect-select': {
						padding: '14px 14px',
						height: '35px'
					},
					'& fieldset': {
						borderColor: 'inherit'

					}
				}
			}
		},
		MuiPopover: {
			defaultProps: {
				slotProps: {
					paper: {
						elevation: 0,
						className: 'shadow'
					}
				}
			}
		},

		MuiListItem: {
			defaultProps: {
				disablePadding: true
			}
		},
		MuiListItemButton: {
			defaultProps: {
				disableRipple: true
			}
		},
		MuiTooltip: {
			defaultProps: {
				arrow: true
			}
		},

		MuiAutocomplete: {
			styleOverrides: {
				root: {
					'& .MuiFilledInput-root': {
						paddingTop: '3px',
						paddingBottom: '3px'
					}
				}
			}
		}
	}
});