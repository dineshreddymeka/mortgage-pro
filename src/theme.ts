import { alpha, createTheme, type Theme } from "@mui/material/styles";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "./layout/formLayout";

/** Property Pro — Zillow-inspired listing desk: brand blue, white surfaces, clean sans. */
const sansStack = '"Source Sans 3", "Figtree", sans-serif';
const displayStack = '"Figtree", "Source Sans 3", sans-serif';

const touchTargetSx = {
  minHeight: touchTargetFinePx,
  "@media (pointer: coarse)": {
    minHeight: touchTargetCoarsePx,
  },
} as const;

const focusVisibleOutline = (theme: Theme) => ({
  outline: `2px solid ${theme.palette.primary.main}`,
  outlineOffset: 2,
});

/** Near-black listing ink (Zillow-adjacent). */
const label = "#2A2A33";
const labelSecondary = "#54545A";
const fill = "#F1F1F4";
const paper = "#FFFFFF";
const separator = "#D1D1D5";
/** Product blue — recognizable Zillow-adjacent CTA. */
const brandBlue = "#006AFF";
const brandBlueHover = "#0D4599";
const brandBlueDeep = "#0041D9";
const brandBlueSoft = "#A6E5FF";
const systemGreen = "#1B7A4E";
const systemOrange = "#C65D00";
const systemRed = "#C62828";

const labelDark = "#F5F5F7";
const fillDark = "#0F1419";
const paperDark = "#1A2129";
const brandBlueDark = "#4D9AFF";

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
          main: brandBlue,
          light: "#3D8CFF",
          dark: brandBlueHover,
          contrastText: "#ffffff",
        },
        secondary: {
          main: brandBlueDeep,
          light: brandBlue,
          dark: "#001751",
          contrastText: "#ffffff",
        },
        success: {
          main: systemGreen,
          light: "#2F9E68",
          dark: "#145C3A",
          contrastText: "#ffffff",
        },
        info: {
          main: brandBlue,
          contrastText: "#ffffff",
        },
        warning: {
          main: systemOrange,
          contrastText: "#ffffff",
        },
        error: {
          main: systemRed,
          contrastText: "#ffffff",
        },
        text: {
          primary: alpha(label, 0.96),
          secondary: labelSecondary,
          disabled: alpha(label, 0.35),
        },
        background: {
          default: fill,
          paper: paper,
        },
        divider: separator,
        action: {
          active: alpha(label, 0.55),
          hover: alpha(brandBlue, 0.06),
          selected: alpha(brandBlue, 0.12),
          disabled: alpha(label, 0.26),
          disabledBackground: alpha(label, 0.05),
        },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: {
          main: brandBlueDark,
          light: "#7AB3FF",
          dark: brandBlue,
          contrastText: "#061018",
        },
        secondary: {
          main: brandBlueSoft,
          light: "#D2F2FF",
          dark: brandBlueDark,
          contrastText: "#061018",
        },
        success: {
          main: "#3DCF86",
          light: "#6FDEB0",
          dark: systemGreen,
          contrastText: "#061018",
        },
        info: {
          main: brandBlueDark,
          contrastText: "#061018",
        },
        warning: {
          main: "#FFB020",
          contrastText: "#061018",
        },
        error: {
          main: "#FF6B6B",
          contrastText: "#061018",
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
        divider: "rgba(209, 209, 213, 0.18)",
        action: {
          active: alpha("#fff", 0.65),
          hover: alpha(brandBlueDark, 0.12),
          selected: alpha(brandBlueDark, 0.2),
          disabled: alpha("#fff", 0.28),
          disabledBackground: alpha("#fff", 0.06),
        },
      },
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: sansStack,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: {
      fontFamily: displayStack,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.15,
    },
    h2: {
      fontFamily: displayStack,
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: displayStack,
      fontWeight: 700,
      fontSize: "1.5rem",
      letterSpacing: "-0.015em",
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: displayStack,
      fontWeight: 700,
      letterSpacing: "-0.015em",
    },
    h5: {
      fontFamily: displayStack,
      fontWeight: 650,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontFamily: displayStack,
      fontWeight: 650,
      letterSpacing: "-0.01em",
    },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600, letterSpacing: "-0.01em" },
    body1: { letterSpacing: "-0.005em", lineHeight: 1.45 },
    body2: { letterSpacing: "-0.005em", lineHeight: 1.4 },
    caption: {
      letterSpacing: "0",
      lineHeight: 1.35,
      fontSize: `${minOperationalFontPx}px`,
    },
    overline: {
      fontFamily: sansStack,
      letterSpacing: "0.06em",
      fontWeight: 700,
      fontSize: `${minOperationalFontPx}px`,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      fontFamily: sansStack,
      fontSize: "0.875rem",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          "--pp-touch-fine": `${touchTargetFinePx}px`,
          "--pp-touch-coarse": `${touchTargetCoarsePx}px`,
          "--pp-min-text": `${minOperationalFontPx}px`,
        },
        body: ({ theme }: { theme: Theme }) =>
          theme.palette.mode === "dark"
            ? {
                backgroundColor: fillDark,
                backgroundImage: `radial-gradient(ellipse 110% 60% at 50% -18%, ${alpha(brandBlueDark, 0.16)}, transparent 55%)`,
                backgroundAttachment: "fixed",
              }
            : {},
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme }) => ({
          "&.Mui-focusVisible": focusVisibleOutline(theme),
        }),
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
          borderRadius: 6,
          paddingInline: 14,
          ...touchTargetSx,
          fontSize: "0.875rem",
          transition: "background 0.16s var(--pp-ease, ease), border-color 0.16s ease, color 0.16s ease",
          "&:active": {
            opacity: 0.9,
          },
        },
        contained: ({ theme }) => ({
          boxShadow: "none",
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          "&:hover": {
            boxShadow: "none",
            backgroundColor: theme.palette.primary.dark,
          },
        }),
        containedSecondary: ({ theme }) => ({
          backgroundColor: theme.palette.secondary.main,
          color: theme.palette.secondary.contrastText,
          "&:hover": {
            backgroundColor: theme.palette.secondary.dark,
          },
        }),
        outlined: ({ theme }) => ({
          borderWidth: 1,
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.background.paper,
          "&:hover": {
            borderWidth: 1,
            borderColor: alpha(theme.palette.primary.main, 0.55),
            backgroundColor: alpha(theme.palette.primary.main, 0.06),
            color: theme.palette.primary.dark,
          },
        }),
        text: ({ theme }) => ({
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.main,
          },
        }),
      },
    },
    MuiIconButton: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          border: `1px solid ${theme.palette.divider}`,
          padding: 6,
          ...touchTargetSx,
          minWidth: touchTargetFinePx,
          "@media (pointer: coarse)": {
            minHeight: touchTargetCoarsePx,
            minWidth: touchTargetCoarsePx,
          },
          backgroundColor: theme.palette.background.paper,
          transition: "border-color 0.16s ease, background 0.16s ease, color 0.16s ease",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            borderColor: alpha(theme.palette.primary.main, 0.4),
            color: theme.palette.primary.main,
          },
          "&.Mui-focusVisible": focusVisibleOutline(theme),
        }),
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 8,
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(42, 42, 51, 0.06)"
              : "0 1px 2px rgba(0,0,0,0.28)",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          borderRadius: 8,
          backgroundColor: theme.palette.background.paper,
          boxShadow:
            theme.palette.mode === "light"
              ? "0 1px 2px rgba(42, 42, 51, 0.04)"
              : "0 1px 2px rgba(0,0,0,0.22)",
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
          fontSize: `${minOperationalFontPx}px`,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem",
          fontWeight: 600,
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
          borderRadius: "8px !important",
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
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
        root: ({ theme }) => ({
          minHeight: touchTargetFinePx,
          paddingLeft: 10,
          paddingRight: 10,
          "@media (pointer: coarse)": {
            minHeight: touchTargetCoarsePx,
          },
          "&.Mui-focusVisible": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            ...focusVisibleOutline(theme),
          },
        }),
        content: { marginTop: 4, marginBottom: 4 },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: { padding: 10, paddingTop: 0 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          backgroundColor:
            theme.palette.mode === "light" ? alpha("#2A2A33", 0.04) : alpha("#F5F5F7", 0.06),
          ...touchTargetSx,
          "& fieldset": {
            borderColor: "transparent",
          },
          "&:hover fieldset": {
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(brandBlueSoft, theme.palette.mode === "light" ? 0.85 : 0.35)}`,
            backgroundColor: theme.palette.background.paper,
          },
          "&.Mui-focused fieldset": {
            borderWidth: 1.5,
            borderColor: theme.palette.primary.main,
          },
          "& .MuiInputBase-input": {
            fontSize: "0.875rem",
            fontVariantNumeric: "tabular-nums",
          },
          "& .MuiInputBase-input.MuiInputBase-inputSizeSmall": {
            paddingTop: 7,
            paddingBottom: 7,
            paddingLeft: 11,
            paddingRight: 11,
            fontSize: "0.875rem",
            fontVariantNumeric: "tabular-nums",
            minHeight: touchTargetFinePx - 2,
            boxSizing: "border-box",
            "@media (pointer: coarse)": {
              minHeight: touchTargetCoarsePx - 2,
            },
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
          fontSize: `${minOperationalFontPx}px`,
        },
        head: ({ theme }) => ({
          fontWeight: 700,
          fontSize: `${minOperationalFontPx}px`,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: theme.palette.text.secondary,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor:
            theme.palette.mode === "light" ? alpha("#2A2A33", 0.04) : alpha("#F5F5F7", 0.06),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
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
          borderRadius: 6,
          fontWeight: 650,
          height: 24,
          fontSize: `${minOperationalFontPx}px`,
        },
        colorPrimary: ({ theme }) => ({
          backgroundColor: alpha(theme.palette.primary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          color: theme.palette.primary.dark,
        }),
      },
    },
  },
});
