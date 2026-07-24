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
        borderRadius: "10px",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#0b1f33", 0.05) : alpha("#e8eef4", 0.08),
        border: "1px solid",
        borderColor: "divider",
        px: 0.35,
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
          "& .MuiTabs-flexContainer": { gap: 0.25 },
          "& .MuiTabs-indicator": {
            height: 2,
            borderRadius: 1,
            bgcolor: "secondary.main",
          },
          "& .MuiTab-root": {
            minHeight: touchTargetFinePx,
            minWidth: "auto",
            py: 0.5,
            px: { xs: 1.1, sm: 1.4 },
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
            fontSize: `${minOperationalFontPx}px`,
            letterSpacing: "-0.015em",
            color: "text.secondary",
            "@media (pointer: coarse)": {
              minHeight: touchTargetCoarsePx,
            },
            "&.Mui-selected": {
              fontWeight: 700,
              color: "secondary.main",
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
