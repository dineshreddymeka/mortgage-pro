import { alpha, createTheme, type Theme } from "@mui/material/styles";

/** Property Pro — Apple-like system chrome: neutral grays, system blue accent. */
const sfStack =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const label = "#1d1d1f";
const labelSecondary = "#6e6e73";
const fill = "#f5f5f7";
const paper = "#ffffff";
const separator = "rgba(60, 60, 67, 0.12)";
const systemBlue = "#007AFF";
const systemBlueDark = "#0A84FF";
const systemGreen = "#34C759";
const systemOrange = "#FF9F0A";
const systemRed = "#FF3B30";

const labelDark = "#f5f5f7";
const fillDark = "#000000";
const paperDark = "#1c1c1e";
const surfaceDark = "#2c2c2e";

export const appTheme = createTheme({
  spacing: 8,
  cssVariables: {
    colorSchemeSelector: "class",
  },
  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: {
          main: label,
          light: "#3a3a3c",
          dark: "#000000",
          contrastText: "#ffffff",
        },
        secondary: {
          main: systemBlue,
          light: "#47a3ff",
          dark: "#0066d6",
          contrastText: "#ffffff",
        },
        success: {
          main: systemGreen,
          light: "#30d158",
          dark: "#248a3d",
          contrastText: "#ffffff",
        },
        info: {
          main: systemBlue,
          contrastText: "#ffffff",
        },
        warning: {
          main: systemOrange,
          contrastText: "#1d1d1f",
        },
        error: {
          main: systemRed,
          contrastText: "#ffffff",
        },
        text: {
          primary: alpha(label, 0.92),
          secondary: labelSecondary,
          disabled: alpha(label, 0.3),
        },
        background: {
          default: fill,
          paper: paper,
        },
        divider: separator,
        action: {
          active: alpha(label, 0.55),
          hover: alpha(systemBlue, 0.06),
          selected: alpha(systemBlue, 0.12),
          disabled: alpha(label, 0.26),
          disabledBackground: alpha(label, 0.05),
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: labelDark,
          light: "#ffffff",
          dark: "#aeaeb2",
          contrastText: "#000000",
        },
        secondary: {
          main: systemBlueDark,
          light: "#409cff",
          dark: "#007AFF",
          contrastText: "#ffffff",
        },
        success: {
          main: "#30D158",
          light: "#64e87a",
          dark: systemGreen,
          contrastText: "#000000",
        },
        info: {
          main: systemBlueDark,
          contrastText: "#ffffff",
        },
        warning: {
          main: "#FF9F0A",
          contrastText: "#000000",
        },
        error: {
          main: "#FF453A",
          contrastText: "#ffffff",
        },
        text: {
          primary: alpha(labelDark, 0.95),
          secondary: alpha(labelDark, 0.62),
          disabled: alpha(labelDark, 0.35),
        },
        background: {
          default: fillDark,
          paper: paperDark,
        },
        divider: "rgba(84, 84, 88, 0.48)",
        action: {
          active: alpha("#fff", 0.65),
          hover: alpha(systemBlueDark, 0.1),
          selected: alpha(systemBlueDark, 0.18),
          disabled: alpha("#fff", 0.28),
          disabledBackground: alpha("#fff", 0.06),
        },
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: sfStack,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 510,
    fontWeightBold: 600,
    h1: {
      fontFamily: sfStack,
      fontWeight: 700,
      letterSpacing: "-0.03em",
      lineHeight: 1.1,
    },
    h2: {
      fontFamily: sfStack,
      fontWeight: 700,
      letterSpacing: "-0.025em",
      lineHeight: 1.15,
    },
    h3: {
      fontFamily: sfStack,
      fontWeight: 650,
      fontSize: "1.5rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h4: {
      fontFamily: sfStack,
      fontWeight: 650,
      letterSpacing: "-0.02em",
    },
    h5: {
      fontFamily: sfStack,
      fontWeight: 600,
      letterSpacing: "-0.015em",
    },
    h6: {
      fontFamily: sfStack,
      fontWeight: 600,
      letterSpacing: "-0.015em",
    },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { letterSpacing: "-0.01em", lineHeight: 1.45 },
    body2: { letterSpacing: "-0.01em", lineHeight: 1.4 },
    caption: { letterSpacing: "-0.005em", lineHeight: 1.35 },
    overline: {
      fontFamily: sfStack,
      letterSpacing: "0.06em",
      fontWeight: 600,
      fontSize: "0.65rem",
    },
    button: {
      textTransform: "none",
      fontWeight: 560,
      letterSpacing: "-0.01em",
      fontFamily: sfStack,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: ({ theme }: { theme: Theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundColor: fillDark,
                backgroundImage: `radial-gradient(ellipse 120% 70% at 50% -20%, ${alpha(systemBlueDark, 0.1)}, transparent 55%)`,
                backgroundAttachment: "fixed",
              }
            : {},
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: true,
        size: "small",
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 14,
          minHeight: 32,
          fontSize: "0.8125rem",
          transition: "background 0.18s var(--pp-ease, ease), border-color 0.18s ease, opacity 0.15s ease",
          "&:active": {
            opacity: 0.85,
          },
        },
        contained: ({ theme }) => ({
          boxShadow: "none",
          backgroundColor: theme.palette.mode === "light" ? label : labelDark,
          color: theme.palette.mode === "light" ? paper : "#000",
          "&:hover": {
            boxShadow: "none",
            backgroundColor: theme.palette.mode === "light" ? "#3a3a3c" : "#d1d1d6",
          },
        }),
        containedSecondary: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.main,
          color: "#ffffff",
          "&:hover": {
            backgroundColor: theme.palette.secondary.dark,
          },
        }),
        outlined: ({ theme }) => ({
          borderWidth: 1,
          borderColor: alpha(theme.palette.text.primary, 0.16),
          color: theme.palette.text.primary,
          backgroundColor:
            theme.palette.mode === "light" ? alpha(paper, 0.7) : alpha(surfaceDark, 0.55),
          backdropFilter: "blur(8px)",
          "&:hover": {
            borderWidth: 1,
            borderColor: alpha(theme.palette.secondary.main, 0.45),
            backgroundColor: alpha(theme.palette.secondary.main, 0.08),
          },
        }),
        text: ({ theme }) => ({
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: alpha(theme.palette.secondary.main, 0.08),
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiIconButton: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
          padding: 6,
          backgroundColor:
            theme.palette.mode === "light" ? alpha(paper, 0.65) : alpha(surfaceDark, 0.55),
          transition: "border-color 0.18s ease, background 0.18s ease",
          "&:hover": {
            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
            borderColor: alpha(theme.palette.secondary.main, 0.35),
            color: theme.palette.secondary.main,
          },
        }),
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.08 : 0.12)}`,
          borderRadius: 14,
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light" ? alpha(paper, 0.82) : alpha(paperDark, 0.78),
          backdropFilter: "saturate(180%) blur(16px)",
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)"
              : "0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.28)",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: ({ theme }) => ({
          borderColor: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.08 : 0.12),
          borderRadius: 14,
          backgroundColor:
            theme.palette.mode === "light" ? alpha(paper, 0.85) : alpha(paperDark, 0.8),
          backdropFilter: "saturate(180%) blur(12px)",
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(0,0,0,0.03), 0 2px 10px rgba(0,0,0,0.03)"
              : "0 1px 2px rgba(0,0,0,0.18)",
        }),
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "small",
        margin: "dense",
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 2,
          lineHeight: 1.25,
          fontSize: "0.7rem",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem",
          fontWeight: 500,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 14,
          "&:last-child": { paddingBottom: 14 },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: "14px !important",
          border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
          backgroundColor:
            theme.palette.mode === "light" ? alpha(paper, 0.8) : alpha(paperDark, 0.75),
          backdropFilter: "saturate(180%) blur(12px)",
          boxShadow: "none",
          "&:before": { display: "none" },
          "&.Mui-expanded": {
            margin: 0,
          },
        }),
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 40,
          paddingLeft: 12,
          paddingRight: 12,
        },
        content: { marginTop: 6, marginBottom: 6 },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: { padding: 12, paddingTop: 0 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          backgroundColor:
            theme.palette.mode === "light" ? alpha("#787880", 0.08) : alpha("#787880", 0.24),
          "& fieldset": {
            borderColor: "transparent",
          },
          "&:hover fieldset": {
            borderColor: alpha(theme.palette.secondary.main, 0.35),
          },
          "&.Mui-focused fieldset": {
            borderWidth: 1.5,
            borderColor: theme.palette.secondary.main,
          },
          "& .MuiInputBase-input.MuiInputBase-inputSizeSmall": {
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 11,
            paddingRight: 11,
            fontSize: "0.875rem",
            fontVariantNumeric: "tabular-nums",
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 7,
          paddingBottom: 7,
          paddingLeft: 10,
          paddingRight: 10,
          fontVariantNumeric: "tabular-nums",
        },
        head: ({ theme }) => ({
          fontWeight: 600,
          fontSize: "0.68rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: theme.palette.text.secondary,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor:
            theme.palette.mode === "light" ? alpha("#787880", 0.08) : alpha("#787880", 0.2),
          borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        outlinedInfo: ({ theme }) => ({
          borderColor: alpha(theme.palette.info.main, 0.3),
          backgroundColor: alpha(theme.palette.info.main, 0.06),
        }),
      },
    },
    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: "bottom", horizontal: "center" },
      },
    },
    MuiTablePagination: {
      defaultProps: { size: "small" },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 48,
          "@media (min-width: 600px)": { minHeight: 48 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 560,
          height: 24,
          fontSize: "0.75rem",
        },
        colorPrimary: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
          color: theme.palette.secondary.dark,
        }),
      },
    },
  },
});
