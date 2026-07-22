import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export type CategoryJumpProps = {
  category: string;
  detail?: string;
  onJump: () => void;
};

/** Compact “owned elsewhere” cue — jump to the category tab that edits these fields. */
export function CategoryJump({ category, detail, onJump }: CategoryJumpProps) {
  return (
    <Stack spacing={0.75} sx={{ py: 0.5 }}>
      {detail ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {detail}
        </Typography>
      ) : null}
      <Button
        size="small"
        variant="outlined"
        endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
        onClick={onJump}
        sx={{
          alignSelf: "flex-start",
          minHeight: 32,
          fontWeight: 700,
          fontSize: "0.75rem",
          borderRadius: "8px",
        }}
      >
        Edit in {category}
      </Button>
    </Stack>
  );
}
