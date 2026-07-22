import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { HouseComparisonPanel } from "../components/HouseComparisonBar";
import type { HouseComparisonRow } from "../lib/houseComparison";

export type CompareTabProps = {
  rows: HouseComparisonRow[];
  activePropertyId: string | null;
  cloudReady: boolean;
  onSelect: (id: string) => void;
};

export function CompareTab({ rows, activePropertyId, cloudReady, onSelect }: CompareTabProps) {
  if (!cloudReady) {
    return (
      <Box className="pp-fade-in" sx={{ py: 3, px: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.03em", mb: 0.5 }}>
          Compare houses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.45 }}>
          Connect Firestore to sync your portfolio, then compare active houses side by side here.
        </Typography>
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box className="pp-fade-in" sx={{ py: 3, px: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.03em", mb: 0.5 }}>
          Compare houses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, lineHeight: 1.45 }}>
          Add an active house from the portfolio to see smart compare metrics. Archived houses stay out
          of this view.
        </Typography>
      </Box>
    );
  }

  return (
    <HouseComparisonPanel
      rows={rows}
      activePropertyId={activePropertyId}
      onSelect={onSelect}
    />
  );
}
