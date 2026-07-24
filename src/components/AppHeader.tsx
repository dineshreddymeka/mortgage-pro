import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import {
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useColorScheme, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useId, useState, type MouseEvent, type ReactNode } from "react";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
  workspaceMaxWidth,
} from "../layout/formLayout";
import {
  APP_HEADER_HEIGHT_PX,
  HEADER_ACTIONS_INLINE_BREAKPOINT,
  HEADER_SECONDARY_ACTIONS,
  confirmWorkspaceReset,
  headerSecondaryActionHandler,
  shellActionTargetSx,
  shellIconActionTargetSx,
  type HeaderSecondaryActionHandlers,
  type HeaderSecondaryActionId,
} from "./workspaceShell";

const opFont = `${minOperationalFontPx}px`;

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const MENU_ICONS: Record<Exclude<HeaderSecondaryActionId, "theme">, ReactNode> = {
  report: <PrintOutlinedIcon fontSize="small" />,
  excel: <FileDownloadOutlinedIcon fontSize="small" />,
  verify: <FactCheckOutlinedIcon fontSize="small" />,
  reset: <RestartAltIcon fontSize="small" />,
};

const INLINE_START_ICONS: Record<Exclude<HeaderSecondaryActionId, "theme">, ReactNode> = {
  report: <PrintOutlinedIcon sx={{ fontSize: 16 }} />,
  excel: <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />,
  verify: <FactCheckOutlinedIcon sx={{ fontSize: 16 }} />,
  reset: <RestartAltIcon sx={{ fontSize: 17 }} />,
};

export type AppHeaderProps = {
  paymentMonthly: number;
  onSave: () => void;
  onReport: () => void;
  onExportExcel: () => void;
  onVerify: () => void;
  onReset: () => void;
};

export function AppHeader({
  paymentMonthly,
  onSave,
  onReport,
  onExportExcel,
  onVerify,
  onReset,
}: AppHeaderProps) {
  const { setMode } = useColorScheme();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  // noSsr: avoid SSR/client mismatch flashing the overflow vs inline chrome.
  const inlineActions = useMediaQuery(theme.breakpoints.up(HEADER_ACTIONS_INLINE_BREAKPOINT), {
    noSsr: true,
  });
  const menuId = useId();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuOpen = Boolean(menuAnchor);

  function openMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  function closeMenu() {
    setMenuAnchor(null);
  }

  function toggleTheme() {
    setMode(isDark ? "light" : "dark");
  }

  function requestReset() {
    if (confirmWorkspaceReset()) onReset();
  }

  const themeLabel = isDark ? "Light mode" : "Dark mode";
  const themeIcon = isDark ? (
    <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
  ) : (
    <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />
  );

  const handlers: HeaderSecondaryActionHandlers = {
    report: onReport,
    excel: onExportExcel,
    verify: onVerify,
    reset: requestReset,
    theme: toggleTheme,
  };

  function runSecondary(id: HeaderSecondaryActionId) {
    headerSecondaryActionHandler(id, handlers)();
  }

  function runSecondaryAndClose(id: HeaderSecondaryActionId) {
    closeMenu();
    runSecondary(id);
  }

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: APP_HEADER_HEIGHT_PX,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.96) : alpha("#1A2129", 0.94),
        backdropFilter: "saturate(140%) blur(14px)",
        WebkitBackdropFilter: "saturate(140%) blur(14px)",
        boxShadow: (t) =>
          t.palette.mode === "light" ? "0 1px 0 rgba(42, 42, 51, 0.04)" : "none",
      }}
    >
      <Box
        sx={{
          px: { xs: 1.25, sm: 2 },
          maxWidth: workspaceMaxWidth,
          mx: "auto",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%", minWidth: 0 }}
        >
          <Stack
            direction="row"
            spacing={{ xs: 0.85, sm: 1.25 }}
            alignItems="baseline"
            sx={{ minWidth: 0, flex: "1 1 auto" }}
          >
            <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                aria-hidden
                sx={{
                  width: { xs: 24, sm: 28 },
                  height: { xs: 24, sm: 28 },
                  borderRadius: "7px",
                  bgcolor: "primary.main",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  color: "#fff",
                  boxShadow: "0 0 0 3px rgba(166, 229, 255, 0.5)",
                }}
              >
                <HomeRoundedIcon sx={{ fontSize: { xs: 15, sm: 17 } }} />
              </Box>
              <Typography
                component="h1"
                sx={{
                  fontFamily: "var(--pp-font-display)",
                  fontWeight: 800,
                  fontSize: { xs: "1.05rem", sm: "1.28rem" },
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  color: "text.primary",
                }}
              >
                Property{" "}
                <Box component="span" sx={{ color: "primary.main" }}>
                  Pro
                </Box>
              </Typography>
            </Box>
            <Typography
              className="pp-mono"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.92rem", sm: "1.12rem" },
                letterSpacing: "-0.03em",
                color: "primary.main",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {moneyDec.format(paymentMonthly)}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.35, fontWeight: 600, fontSize: opFont }}
              >
                /mo
              </Typography>
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.35} alignItems="center" sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={onSave}
              aria-label="Save all tab data"
              sx={{
                ...shellActionTargetSx,
                px: { xs: 1.1, sm: 1.5 },
                fontWeight: 700,
                minWidth: 0,
                borderRadius: "6px",
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Save all
              </Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                Save
              </Box>
            </Button>

            {inlineActions ? (
              HEADER_SECONDARY_ACTIONS.map((action) => {
                if (action.id === "theme") {
                  return (
                    <Tooltip key={action.id} title={themeLabel}>
                      <IconButton
                        onClick={() => runSecondary(action.id)}
                        aria-label="toggle color mode"
                        size="small"
                        sx={shellIconActionTargetSx}
                      >
                        {themeIcon}
                      </IconButton>
                    </Tooltip>
                  );
                }

                const label = action.id === "excel" ? "Export" : action.label;
                const button = (
                  <Button
                    size="small"
                    variant={action.id === "reset" ? "text" : "outlined"}
                    startIcon={INLINE_START_ICONS[action.id]}
                    onClick={() => runSecondary(action.id)}
                    aria-label={action.ariaLabel ?? action.label}
                    sx={{
                      ...shellActionTargetSx,
                      px: action.id === "reset" ? 1 : 1.25,
                      minWidth: 0,
                    }}
                  >
                    {label}
                  </Button>
                );

                if (action.id === "verify") {
                  return (
                    <Tooltip key={action.id} title="Check this scenario without changing it">
                      {button}
                    </Tooltip>
                  );
                }
                if (action.id === "reset") {
                  return (
                    <Tooltip key={action.id} title="Clear all tab values for this house to zero">
                      {button}
                    </Tooltip>
                  );
                }
                return <Box key={action.id}>{button}</Box>;
              })
            ) : (
              <>
                <Tooltip title="More actions">
                  <IconButton
                    size="small"
                    onClick={openMenu}
                    aria-label="More actions"
                    aria-controls={menuOpen ? menuId : undefined}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : undefined}
                    sx={{
                      ...shellIconActionTargetSx,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px",
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Menu
                  id={menuId}
                  anchorEl={menuAnchor}
                  open={menuOpen}
                  onClose={closeMenu}
                  MenuListProps={{
                    "aria-label": "Secondary workspace actions",
                    dense: true,
                    sx: {
                      "& .MuiMenuItem-root": {
                        minHeight: touchTargetFinePx,
                        fontSize: opFont,
                        "@media (pointer: coarse)": {
                          minHeight: touchTargetCoarsePx,
                        },
                      },
                    },
                  }}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  {HEADER_SECONDARY_ACTIONS.map((action) => {
                    const label = action.id === "theme" ? themeLabel : action.label;
                    const icon =
                      action.id === "theme" ? (
                        isDark ? (
                          <LightModeOutlinedIcon fontSize="small" />
                        ) : (
                          <DarkModeOutlinedIcon fontSize="small" />
                        )
                      ) : (
                        MENU_ICONS[action.id]
                      );
                    return (
                      <MenuItem
                        key={action.id}
                        divider={action.id === "reset"}
                        onClick={() => runSecondaryAndClose(action.id)}
                      >
                        <ListItemIcon>{icon}</ListItemIcon>
                        <ListItemText>{label}</ListItemText>
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
