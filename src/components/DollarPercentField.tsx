import { InputAdornment, ToggleButton, ToggleButtonGroup } from "@mui/material";
import TextField from "@mui/material/TextField";
import { useId, useMemo, useState, type Ref } from "react";
import {
  formatCounterpartHelper,
  formatNumberField,
  formatPercentField,
  parseNumericInput,
} from "../lib/mortgageInputSync";

export type DollarPercentMode = "dollar" | "percent";

export type DollarPercentFieldProps = {
  label: string;
  size?: "small" | "medium";
  fullWidth?: boolean;
  /** Reference value for % calculations (e.g. purchase price). */
  basis: number;
  dollarValue: number;
  percentValue: number;
  onDollarChange: (dollar: number) => void;
  onPercentChange: (percent: number) => void;
  maxPercent?: number;
  /** Cap entered dollars at basis (down payment). */
  capDollarAtBasis?: boolean;
  /** Label for % counterpart helper (default: purchase price). */
  percentBasisLabel?: string;
  /** Suffix on dollar counterpart in percent mode (e.g. "/yr"). */
  dollarSuffix?: string;
  helperText?: string;
  inputRef?: Ref<HTMLInputElement>;
};

export function DollarPercentField({
  label,
  size = "medium",
  fullWidth = true,
  basis,
  dollarValue,
  percentValue,
  onDollarChange,
  onPercentChange,
  maxPercent = 100,
  capDollarAtBasis = false,
  percentBasisLabel = "purchase price",
  dollarSuffix,
  helperText,
  inputRef,
}: DollarPercentFieldProps) {
  const fieldId = useId();
  const toggleId = `${fieldId}-mode`;
  const [mode, setMode] = useState<DollarPercentMode>("dollar");

  const counterpart = useMemo(
    () =>
      formatCounterpartHelper(mode, basis, dollarValue, percentValue, {
        dollarSuffix,
        percentLabel: percentBasisLabel,
      }),
    [basis, dollarSuffix, dollarValue, mode, percentBasisLabel, percentValue]
  );

  const resolvedHelper = helperText ?? counterpart;

  return (
    <TextField
      id={fieldId}
      label={label}
      size={size}
      fullWidth={fullWidth}
      inputRef={inputRef}
      helperText={resolvedHelper}
      value={mode === "dollar" ? formatNumberField(dollarValue) : formatPercentField(percentValue)}
      onChange={(e) => {
        const n = parseNumericInput(e.target.value);
        if (n === null) return;
        if (mode === "dollar") {
          const raw = Math.max(0, n);
          onDollarChange(capDollarAtBasis && basis > 0 ? Math.min(raw, basis) : raw);
          return;
        }
        onPercentChange(Math.min(maxPercent, Math.max(0, n)));
      }}
      slotProps={{
        input: {
          startAdornment:
            mode === "dollar" ? <InputAdornment position="start">$</InputAdornment> : undefined,
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.5 }}>
              <ToggleButtonGroup
                id={toggleId}
                exclusive
                size="small"
                value={mode}
                onChange={(_e, next: DollarPercentMode | null) => {
                  if (next) setMode(next);
                }}
                aria-label={`${label} amount or percent`}
                sx={{
                  "& .MuiToggleButton-root": {
                    px: 0.75,
                    py: 0.25,
                    minWidth: 32,
                    lineHeight: 1.2,
                    fontSize: size === "small" ? "0.75rem" : "0.8125rem",
                  },
                }}
              >
                <ToggleButton value="dollar" aria-label={`${label} in dollars`}>
                  $
                </ToggleButton>
                <ToggleButton value="percent" aria-label={`${label} as percent`}>
                  %
                </ToggleButton>
              </ToggleButtonGroup>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
