import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DataVerificationReport } from "../lib/dataConsistency";

type Props = {
  open: boolean;
  report: DataVerificationReport | null;
  onClose: () => void;
};

function StatusLine(props: { label: string; ok: boolean; detail: string }) {
  const Icon = props.ok ? CheckCircleOutlineIcon : ErrorOutlineIcon;
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Icon
        color={props.ok ? "success" : "error"}
        sx={{ fontSize: 18, mt: "2px", flexShrink: 0 }}
      />
      <Box>
        <Typography variant="body2" fontWeight={700}>
          {props.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {props.detail}
        </Typography>
      </Box>
    </Stack>
  );
}

function PathList(props: { paths: string[]; empty: string }) {
  if (props.paths.length === 0) {
    return <Typography variant="caption" color="text.secondary">{props.empty}</Typography>;
  }
  return (
    <Box component="ul" sx={{ my: 0.5, pl: 2.5 }}>
      {props.paths.map((path) => (
        <Typography component="li" variant="caption" className="pp-mono" key={path}>
          {path}
        </Typography>
      ))}
    </Box>
  );
}

export function DataVerificationDialog({ open, report, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="verify-data-title">
      <DialogTitle id="verify-data-title">Data verification report</DialogTitle>
      <DialogContent dividers>
        {!report ? null : (
          <Stack spacing={1.5}>
            <Alert severity={report.ok ? "success" : "warning"}>
              {report.ok
                ? "This scenario is internally consistent."
                : "Review the consistency findings below. No scenario data was changed."}
            </Alert>

            <StatusLine
              label="Single source of truth"
              ok={report.singleSourceOfTruth.ok}
              detail={report.singleSourceOfTruth.message}
            />
            <StatusLine
              label="Scenario version"
              ok={report.scenarioVersion.status === "current"}
              detail={`Found ${report.scenarioVersion.found ?? "invalid"}; current version is ${report.scenarioVersion.current} (${report.scenarioVersion.status}).`}
            />
            <StatusLine
              label="Documented-field coverage"
              ok={report.documentedFieldCoverage.missing.length === 0}
              detail={`${report.documentedFieldCoverage.documented}/${report.documentedFieldCoverage.known} known fields are covered by the maintained inventory.`}
            />
            <StatusLine
              label="Invalid values"
              ok={report.invalidValues.length === 0}
              detail={
                report.invalidValues.length === 0
                  ? "No invalid or parser-rejected values."
                  : `${report.invalidValues.length} invalid or non-canonical value(s).`
              }
            />
            {report.invalidValues.length > 0 ? (
              <Box component="ul" sx={{ my: 0, pl: 2.5 }}>
                {report.invalidValues.map((item, index) => (
                  <Typography
                    component="li"
                    variant="caption"
                    key={`${item.path}-${item.message}-${index}`}
                  >
                    <Box component="span" className="pp-mono">{item.path || "$"}</Box>
                    {`: ${item.message}`}
                  </Typography>
                ))}
              </Box>
            ) : null}

            <Divider />
            <StatusLine
              label="Duplicate aliases and category maps"
              ok={
                report.duplicateAliases.length === 0 &&
                report.duplicateCategoryMaps.length === 0
              }
              detail={`${report.duplicateAliases.length} alias duplicate(s); ${report.duplicateCategoryMaps.length} legacy category map(s).`}
            />
            <PathList
              paths={[
                ...report.duplicateAliases.map(
                  (item) => `${item.aliasPath} ↔ ${item.canonicalPath} (${item.status})`
                ),
                ...report.duplicateCategoryMaps,
              ]}
              empty="No competing data paths."
            />

            <StatusLine
              label="Export → import → normalize"
              ok={report.exportRoundTrip.ok}
              detail={
                report.exportRoundTrip.ok
                  ? "Every scenario path survived the round trip."
                  : report.exportRoundTrip.error ??
                    `${report.exportRoundTrip.differences.length} path difference(s).`
              }
            />
            <PathList
              paths={[
                ...report.exportRoundTrip.missingPaths.map((path) => `missing: ${path}`),
                ...report.exportRoundTrip.changedPaths.map((path) => `changed: ${path}`),
                ...report.exportRoundTrip.extraPaths.map((path) => `extra: ${path}`),
              ]}
              empty="No missing, changed, or extra paths."
            />
            {report.exportRoundTrip.toleratedNormalizations.length > 0 ? (
              <Typography variant="caption" color="text.secondary">
                Accepted derived normalization:{" "}
                {report.exportRoundTrip.toleratedNormalizations
                  .map((item) => item.pair)
                  .join(", ")}.
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
