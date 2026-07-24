import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Box from "@mui/material/Box";
import {
  Button,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { AppPersisted, MultifamilyUnitPersisted } from "../storage/mortgageState";
import {
  canonicalFromMultifamily,
  defaultMultifamilyUnit,
  patchRentalIncome,
} from "../lib/resolveRentalIncome";
import { aggregateMultifamilyIncome } from "../lib/dealStrategies";
import { formatUsd, parsePercentInput, parseUsdInput, StrategyPanelShell } from "./StrategyPanelShell";

function formatField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export function MultifamilyUnitsPanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
}) {
  const block = state.rentalIncome?.multifamily;
  const units = block?.units ?? [];
  const populated = units.length > 0;
  const snapshot = populated
    ? aggregateMultifamilyIncome({
        units: units.map((u) => ({
          monthlyRent: u.monthlyRent,
          otherMonthlyIncome: u.otherMonthlyIncome,
          vacancyRatePercent: u.vacancyRatePercent,
        })),
        defaultVacancyRatePercent: block?.defaultVacancyRatePercent,
      })
    : null;

  const updateUnits = (nextUnits: MultifamilyUnitPersisted[]) => {
    const multifamily = {
      units: nextUnits,
      ...(block?.defaultVacancyRatePercent !== undefined
        ? { defaultVacancyRatePercent: block.defaultVacancyRatePercent }
        : {}),
    };
    patch(
      patchRentalIncome(state, () => ({
        mode: "multifamily",
        multifamily,
      }))
    );
  };

  const updateUnit = (id: string, partial: Partial<MultifamilyUnitPersisted>) => {
    updateUnits(units.map((u) => (u.id === id ? { ...u, ...partial } : u)));
  };

  return (
    <StrategyPanelShell
      title="Multifamily units"
      description={
        populated && snapshot ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
            {snapshot.unitCount} units · GSI {formatUsd(snapshot.grossScheduledIncomeMonthly, true)} → EGI{" "}
            {formatUsd(snapshot.effectiveGrossIncomeMonthly, true)}
          </Typography>
        ) : undefined
      }
      emptyHint="Add units to roll up rent into the canonical monthly rent fields."
      populated={populated}
      headerExtra={
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            const seed =
              units.length === 0
                ? {
                    monthlyRent: state.monthlyRent,
                    otherMonthlyIncome: state.otherMonthlyIncome,
                    vacancyRatePercent: state.vacancyRatePercent,
                  }
                : undefined;
            updateUnits([...units, defaultMultifamilyUnit(units, seed)]);
          }}
        >
          Add unit
        </Button>
      }
    >
      {populated ? (
        <Stack spacing={1}>
          {units.map((unit, index) => (
            <BoxUnitRow
              key={unit.id}
              index={index}
              unit={unit}
              onChange={(partial) => updateUnit(unit.id, partial)}
              onRemove={() => updateUnits(units.filter((u) => u.id !== unit.id))}
              canRemove={units.length > 1}
            />
          ))}
          <TextField
            label="Default vacancy"
            size="small"
            fullWidth
            helperText="Used when a unit omits its own vacancy %"
            value={formatField(block?.defaultVacancyRatePercent ?? state.vacancyRatePercent)}
            onChange={(e) => {
              const n = parsePercentInput(e.target.value);
              if (n == null) return;
              const defaultVacancyRatePercent = Math.min(100, Math.max(0, n));
              patch(
                patchRentalIncome(state, () => ({
                  mode: "multifamily",
                  multifamily: { units, defaultVacancyRatePercent },
                }))
              );
            }}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
          {snapshot ? (
            <Typography variant="caption" color="text.secondary">
              Synced rent {formatUsd(canonicalFromMultifamily(block!).monthlyRent)}/mo · other{" "}
              {formatUsd(canonicalFromMultifamily(block!).otherMonthlyIncome)}/mo
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </StrategyPanelShell>
  );
}

function BoxUnitRow(props: {
  index: number;
  unit: MultifamilyUnitPersisted;
  onChange: (partial: Partial<MultifamilyUnitPersisted>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { unit, index } = props;
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        p: 1,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Unit {index + 1}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Remove unit ${index + 1}`}
          disabled={!props.canRemove}
          onClick={props.onRemove}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Rent"
            size="small"
            fullWidth
            value={formatField(unit.monthlyRent)}
            onChange={(e) => {
              const n = parseUsdInput(e.target.value);
              if (n == null) return;
              props.onChange({ monthlyRent: Math.max(0, Math.round(n)) });
            }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Other"
            size="small"
            fullWidth
            value={formatField(unit.otherMonthlyIncome ?? 0)}
            onChange={(e) => {
              const n = parseUsdInput(e.target.value);
              if (n == null) return;
              props.onChange({ otherMonthlyIncome: Math.max(0, Math.round(n)) });
            }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            label="Vacancy"
            size="small"
            fullWidth
            value={formatField(unit.vacancyRatePercent ?? 0)}
            onChange={(e) => {
              const n = parsePercentInput(e.target.value);
              if (n == null) return;
              props.onChange({ vacancyRatePercent: Math.min(100, Math.max(0, n)) });
            }}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
