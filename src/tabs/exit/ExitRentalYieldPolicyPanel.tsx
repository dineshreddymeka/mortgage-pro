import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type ReactNode } from "react";
import { minOperationalFontPx, touchTargetCoarsePx } from "../../layout/formLayout";
import {
  RENTAL_YIELD_PI_ID,
  RENTAL_YIELD_PMI_ID,
  type RentalAnalysis,
} from "../../lib/rentalMath";
import type { AppPersisted } from "../../storage/mortgageState";
import { formatMoney } from "./exitFormat";

export type ExitRentalYieldPolicyPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  rental30Path: RentalAnalysis;
  rental15Path: RentalAnalysis;
  yieldCf30Annual: number;
  yieldCf15Annual: number;
  onGoToRental?: () => void;
};

/** Full-width row: click anywhere to toggle include/exclude in gain math. */
function YieldGainToggleRow(props: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  detail: ReactNode;
}) {
  return (
    <ListItemButton
      role="checkbox"
      aria-checked={props.checked}
      onClick={() => props.onToggle()}
      sx={{
        alignItems: "flex-start",
        py: 0.55,
        px: 0.85,
        mb: 0.4,
        minHeight: touchTargetCoarsePx,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        "&:hover": { bgcolor: "action.hover" },
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, mt: 0.05 }}>
        <Checkbox
          size="small"
          edge="start"
          checked={props.checked}
          tabIndex={-1}
          disableRipple
          sx={{ p: 0.25, pointerEvents: "none" }}
        />
      </ListItemIcon>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: { xs: 0.5, sm: 1.25 },
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontSize: `${minOperationalFontPx}px`, fontWeight: 600, lineHeight: 1.35 }}
        >
          {props.title}
        </Typography>
        <Box sx={{ textAlign: { xs: "left", sm: "right" }, width: { xs: "100%", sm: "auto" } }}>
          {props.detail}
        </Box>
      </Box>
    </ListItemButton>
  );
}

/**
 * Exit-owned rental-yield inclusion policy.
 * Rent / OpEx amounts are read-only summaries — edit on Rental tab.
 */
export function ExitRentalYieldPolicyPanel({
  state,
  patch,
  rental30Path,
  rental15Path,
  yieldCf30Annual,
  yieldCf15Annual,
  onGoToRental,
}: ExitRentalYieldPolicyPanelProps) {
  function setYieldIncluded(id: string, on: boolean) {
    const excl: Record<string, boolean> = {};
    if (state.sellRentalYieldInclude) {
      for (const [k, v] of Object.entries(state.sellRentalYieldInclude)) {
        if (v === false) excl[k] = false;
      }
    }
    if (on) delete excl[id];
    else excl[id] = false;
    patch({ sellRentalYieldInclude: Object.keys(excl).length > 0 ? excl : undefined });
  }

  const yieldIncluded = (id: string) => state.sellRentalYieldInclude?.[id] !== false;

  return (
    <Stack spacing={0.75} className="pp-fade-in">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.65}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
        >
          Rent {formatMoney(state.monthlyRent)}/mo · cap {(rental30Path.capRate * 100).toFixed(2)}% ·
          modeled CF {formatMoney(yieldCf30Annual / 12)}/mo (30) · {formatMoney(yieldCf15Annual / 12)}
          /mo (15)
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onGoToRental?.()}
          disabled={!onGoToRental}
          aria-label="Edit rental income and expenses"
          sx={{
            flexShrink: 0,
            alignSelf: { xs: "flex-start", sm: "center" },
            fontSize: `${minOperationalFontPx}px`,
          }}
        >
          Edit Rental
        </Button>
      </Stack>

      <Typography
        variant="caption"
        sx={{ fontWeight: 700, fontSize: `${minOperationalFontPx}px` }}
      >
        What counts in gain
      </Typography>
      <List dense disablePadding sx={{ width: "100%", maxWidth: "100%" }}>
        <YieldGainToggleRow
          checked={yieldIncluded(RENTAL_YIELD_PI_ID)}
          onToggle={() => setYieldIncluded(RENTAL_YIELD_PI_ID, !yieldIncluded(RENTAL_YIELD_PI_ID))}
          title="Principal & interest"
          detail={
            <Typography
              component="div"
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: `${minOperationalFontPx}px`,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.4,
              }}
            >
              {formatMoney(rental30Path.principalAndInterestMonthly)}/mo (30-yr) ·{" "}
              {formatMoney(rental15Path.principalAndInterestMonthly)}/mo (15-yr)
            </Typography>
          }
        />
        {rental30Path.pmiMonthly > 0.001 ? (
          <YieldGainToggleRow
            checked={yieldIncluded(RENTAL_YIELD_PMI_ID)}
            onToggle={() => setYieldIncluded(RENTAL_YIELD_PMI_ID, !yieldIncluded(RENTAL_YIELD_PMI_ID))}
            title="PMI"
            detail={
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: `${minOperationalFontPx}px`,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.4,
                }}
              >
                {formatMoney(rental30Path.pmiMonthly)}/mo
              </Typography>
            }
          />
        ) : null}
        {rental30Path.operatingExpenseLines.map((line) => (
          <YieldGainToggleRow
            key={line.id}
            checked={yieldIncluded(line.id)}
            onToggle={() => setYieldIncluded(line.id, !yieldIncluded(line.id))}
            title={line.label}
            detail={
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: `${minOperationalFontPx}px`,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.4,
                }}
              >
                {formatMoney(line.amount)}/mo
              </Typography>
            }
          />
        ))}
      </List>
    </Stack>
  );
}
