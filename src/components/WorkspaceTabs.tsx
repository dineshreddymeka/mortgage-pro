import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { alpha } from "@mui/material/styles";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../layout/formLayout";
import {
  WORKSPACE_TABS,
  clampWorkspaceTabIndex,
  workspaceTabIndexFromKey,
  type WorkspaceTabId,
} from "./workspaceShell";

export type WorkspaceTabsProps = {
  value: number;
  onChange: (index: number) => void;
};

/**
 * Main category tabs with MUI keyboard semantics (Arrow / Home / End).
 * Selection change is also mirrored for custom key handling tests.
 */
export function WorkspaceTabs({ value, onChange }: WorkspaceTabsProps) {
  const selected = clampWorkspaceTabIndex(value);

  return (
    <Box
      className="pp-rise-delay"
      sx={{
        mb: 1,
        borderRadius: 0,
        bgcolor: "transparent",
        borderBottom: "1px solid",
        borderColor: "divider",
        px: 0,
        // Soft fade hints that more tabs are off-screen on phones.
        maskImage: {
          xs: "linear-gradient(90deg, #000 0%, #000 calc(100% - 28px), transparent 100%)",
          sm: "none",
        },
      }}
    >
      <Tabs
        value={selected}
        onChange={(_, next: number) => onChange(clampWorkspaceTabIndex(next))}
        variant="scrollable"
        scrollButtons={false}
        allowScrollButtonsMobile
        aria-label="Main sections"
        onKeyDown={(event) => {
          const next = workspaceTabIndexFromKey(event.key, selected);
          if (next == null || next === selected) return;
          // MUI already moves focus; keep controlled value in sync for Home/End/wrap.
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            onChange(next);
          }
        }}
        sx={{
          minHeight: touchTargetFinePx,
          "@media (pointer: coarse)": {
            minHeight: touchTargetCoarsePx,
          },
          "& .MuiTabs-flexContainer": { gap: 0.15 },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: "3px 3px 0 0",
            bgcolor: "primary.main",
            transition: "left 0.22s var(--pp-ease), width 0.22s var(--pp-ease)",
          },
          "& .MuiTab-root": {
            minHeight: touchTargetFinePx,
            minWidth: "auto",
            py: 0.65,
            px: { xs: 1.15, sm: 1.5 },
            borderRadius: 0,
            textTransform: "none",
            fontWeight: 650,
            fontSize: `${minOperationalFontPx + 1}px`,
            letterSpacing: "-0.01em",
            color: "text.secondary",
            transition: "color 0.16s ease, background 0.16s ease",
            "@media (pointer: coarse)": {
              minHeight: touchTargetCoarsePx,
            },
            "&:hover": {
              color: "primary.main",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
            },
            "&.Mui-selected": {
              fontWeight: 800,
              color: "primary.main",
            },
          },
        }}
      >
        {WORKSPACE_TABS.map(({ label, id }) => (
          <Tab
            key={id}
            id={`tab-${id}`}
            aria-controls={`tabpanel-${id as WorkspaceTabId}`}
            label={label}
            disableRipple
          />
        ))}
      </Tabs>
    </Box>
  );
}
