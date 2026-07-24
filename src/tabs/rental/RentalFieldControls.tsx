import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useState } from "react";
import { FormField, FormGrid } from "../../layout/FormGrid";
import { minOperationalFontPx } from "../../layout/formLayout";

const opFont = `${minOperationalFontPx}px`;

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export function RentalSummaryStat(props: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: 0.85,
        py: 0.55,
        borderRadius: 1.5,
        bgcolor: "transparent",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: opFont, lineHeight: 1.2, display: "block", textTransform: "none" }}
      >
        {props.label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: props.emphasize ? 800 : 700,
          fontVariantNumeric: "tabular-nums",
          fontSize: props.emphasize ? "0.9375rem" : opFont,
          lineHeight: 1.25,
          letterSpacing: props.emphasize ? "-0.02em" : undefined,
          mt: 0.15,
        }}
      >
        {props.value}
      </Typography>
    </Box>
  );
}

/**
 * Label + value with an edit field. Uses FormGrid container queries (not viewport `md`)
 * so half-width widgets stack cleanly when the panel is narrow.
 */
export function RentalFieldRow(props: {
  anchorId?: string;
  label: string;
  detail?: string;
  valueLabel: string;
  textLabel: string;
  textValue: string;
  onText?: (raw: string) => void;
  /** Digits-only while typing; clamp to [min, max] on blur (empty blur = keep saved value). */
  numericCommitOnBlur?: { min: number; max: number; committed: number; onCommit: (n: number) => void };
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}) {
  const [numericDraft, setNumericDraft] = useState<string | null>(null);
  const commit = props.numericCommitOnBlur;

  const inputValue =
    commit != null
      ? numericDraft !== null
        ? numericDraft
        : formatNumberField(commit.committed)
      : props.textValue;

  return (
    <Box id={props.anchorId} sx={{ width: "100%" }}>
      <FormGrid maxColumns={2} compact>
        <FormField>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: opFont, lineHeight: 1.25, display: "block" }}
              >
                {props.label}
              </Typography>
              {props.detail ? (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ fontSize: opFont, lineHeight: 1.25, display: "block" }}
                >
                  {props.detail}
                </Typography>
              ) : null}
            </Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0, fontSize: opFont }}
            >
              {props.valueLabel}
            </Typography>
          </Stack>
        </FormField>
        <FormField>
          <TextField
            label={props.textLabel}
            size="small"
            fullWidth
            value={inputValue}
            onChange={(e) => {
              if (commit != null) {
                setNumericDraft(e.target.value.replace(/[^0-9]/g, ""));
              } else {
                props.onText?.(e.target.value);
              }
            }}
            onFocus={() => {
              if (commit != null) setNumericDraft(formatNumberField(commit.committed));
            }}
            onBlur={(e) => {
              if (commit == null) return;
              const digits = e.target.value.replace(/[^0-9]/g, "");
              setNumericDraft(null);
              if (digits === "") return;
              const n = Math.round(Number(digits));
              if (!Number.isFinite(n)) return;
              commit.onCommit(Math.min(commit.max, Math.max(commit.min, n)));
            }}
            slotProps={{
              input: {
                ...(props.startAdornment ? { startAdornment: props.startAdornment } : {}),
                ...(props.endAdornment ? { endAdornment: props.endAdornment } : {}),
              },
            }}
          />
        </FormField>
      </FormGrid>
    </Box>
  );
}
