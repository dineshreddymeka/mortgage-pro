import { Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { AppPersisted, RentalIncomeMode } from "../storage/mortgageState";
import {
  defaultMultifamilyUnit,
  defaultStrIncome,
  patchRentalIncome,
} from "../lib/resolveRentalIncome";
import { MultifamilyUnitsPanel } from "./MultifamilyUnitsPanel";
import { StrIncomePanel } from "./StrIncomePanel";

export function RentalIncomeModePanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
}) {
  const mode: RentalIncomeMode = state.rentalIncome?.mode ?? "simple";

  const setMode = (next: RentalIncomeMode) => {
    if (next === mode) return;
    if (next === "simple") {
      patch({ rentalIncome: undefined });
      return;
    }
    if (next === "multifamily") {
      const units = state.rentalIncome?.multifamily?.units ?? [
        defaultMultifamilyUnit([], {
          monthlyRent: state.monthlyRent,
          otherMonthlyIncome: state.otherMonthlyIncome,
          vacancyRatePercent: state.vacancyRatePercent,
        }),
      ];
      patch(
        patchRentalIncome(state, () => ({
          mode: "multifamily",
          multifamily: {
            units,
            defaultVacancyRatePercent: state.vacancyRatePercent,
          },
        }))
      );
      return;
    }
    patch(
      patchRentalIncome(state, () => ({
        mode: "str",
        str: state.rentalIncome?.str ?? defaultStrIncome({ nightlyRate: state.monthlyRent / 20 }),
      }))
    );
  };

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, lineHeight: 1.35 }}>
          Income mode feeds the same canonical rent fields and derive pipeline. Only inputs are saved — aggregates
          sync into rent / vacancy on edit.
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_, value: RentalIncomeMode | null) => {
            if (value) setMode(value);
          }}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="simple">Simple</ToggleButton>
          <ToggleButton value="multifamily">Multifamily</ToggleButton>
          <ToggleButton value="str">STR</ToggleButton>
        </ToggleButtonGroup>
        {mode !== "simple" ? (
          <Chip size="small" color="secondary" variant="outlined" label={`Mode: ${mode}`} sx={{ flexShrink: 0 }} />
        ) : null}
      </Stack>
      {mode === "multifamily" ? <MultifamilyUnitsPanel state={state} patch={patch} /> : null}
      {mode === "str" ? <StrIncomePanel state={state} patch={patch} /> : null}
    </Stack>
  );
}
