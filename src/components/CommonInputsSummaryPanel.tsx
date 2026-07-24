import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FormField, FormGrid } from "../layout/FormGrid";
import {
  FORM_CONTAINER_NAME,
  formContainerBreakpoints,
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../layout/formLayout";
import type { CommonInputsSummaryItem } from "./commonInputsSummary";

export type { CommonInputsSummaryItem } from "./commonInputsSummary";
export {
  carryingCommonSummaryItems,
  financingCommonSummaryItems,
  upfrontCommonSummaryItems,
} from "./commonInputsSummary";

export type CommonInputsSummaryPanelProps = {
  items: CommonInputsSummaryItem[];
  onGoToCommonInputs?: () => void;
  /** Optional helper under the stats row. */
  caption?: string;
  /** Section label above the stats (e.g. “Taxes, insurance, HOA”). */
  title?: string;
  /** Dense ribbon for overview strips; grid for widget bodies. */
  variant?: "grid" | "ribbon";
  /** Max columns for the grid variant (default 3). */
  maxColumns?: 2 | 3 | 4;
};

function Stat({ label, value, emphasize }: CommonInputsSummaryItem) {
  return (
    <Stack spacing={0.1} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: `${minOperationalFontPx}px`,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "var(--pp-font-display)",
          fontWeight: emphasize ? 800 : 700,
          fontSize: emphasize ? "0.95rem" : "0.875rem",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function EditCommonButton({ onGoToCommonInputs }: { onGoToCommonInputs?: () => void }) {
  return (
    <Button
      size="small"
      variant="outlined"
      onClick={() => onGoToCommonInputs?.()}
      disabled={!onGoToCommonInputs}
      aria-label="Edit common inputs"
      sx={{
        fontSize: `${minOperationalFontPx}px`,
        minHeight: touchTargetFinePx,
        "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
        textTransform: "none",
        fontWeight: 700,
      }}
    >
      Edit Common
    </Button>
  );
}

/**
 * Compact read-only snapshot of fields owned by the Common Inputs tab,
 * with an Edit Common action for navigation.
 */
export function CommonInputsSummaryPanel({
  items,
  onGoToCommonInputs,
  caption,
  title,
  variant = "grid",
  maxColumns = 3,
}: CommonInputsSummaryPanelProps) {
  const cq = FORM_CONTAINER_NAME;
  const bp = formContainerBreakpoints;

  if (variant === "ribbon") {
    return (
      <Box
        sx={{
          containerType: "inline-size",
          containerName: cq,
          width: "100%",
        }}
      >
        {title ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mb: 0.5,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              fontSize: `${minOperationalFontPx}px`,
            }}
          >
            {title}
          </Typography>
        ) : null}
        <Box
          sx={{
            display: "grid",
            width: "100%",
            gap: 0.75,
            alignItems: "end",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            [`@container ${cq} (min-width: ${bp.twoCol}px)`]: {
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            },
            [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
              gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, minmax(0, 1fr)) auto`,
            },
          }}
        >
          {items.map((item) => (
            <Stat key={item.label} {...item} />
          ))}
          <Box
            sx={{
              gridColumn: "1 / -1",
              [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
                gridColumn: "auto",
                justifySelf: "end",
              },
            }}
          >
            <EditCommonButton onGoToCommonInputs={onGoToCommonInputs} />
          </Box>
        </Box>
        {caption ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5, lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
          >
            {caption}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Stack spacing={0.75}>
      {title ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: `${minOperationalFontPx}px`,
          }}
        >
          {title}
        </Typography>
      ) : null}
      <FormGrid maxColumns={maxColumns} compact>
        {items.map((item) => (
          <FormField key={item.label}>
            <Stat {...item} />
          </FormField>
        ))}
      </FormGrid>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} alignItems="center">
        <EditCommonButton onGoToCommonInputs={onGoToCommonInputs} />
        {caption ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
          >
            {caption}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
