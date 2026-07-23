import Box, { type BoxProps } from "@mui/material/Box";
import { createContext, useContext, type ReactNode } from "react";
import {
  FORM_CONTAINER_NAME,
  formContainerBreakpoints,
  formFieldGridColumn,
  formGridGapPx,
  resolveFormColumns,
  type FormColumnCount,
} from "./formLayout";

type FormGridContextValue = {
  maxColumns: FormColumnCount;
};

const FormGridContext = createContext<FormGridContextValue>({ maxColumns: 4 });

export type FormGridProps = {
  children: ReactNode;
  /** Upper bound on columns when the container is wide enough. */
  maxColumns?: FormColumnCount;
  /** Use tighter gaps (Mortgage / widget compact forms). */
  compact?: boolean;
  className?: string;
  sx?: BoxProps["sx"];
};

function columnTemplate(cols: FormColumnCount): string {
  return cols <= 1 ? "minmax(0, 1fr)" : `repeat(${cols}, minmax(0, 1fr))`;
}

/**
 * Container-aware form row grid.
 *
 * Outer box is the named size container; inner box is the CSS grid that
 * responds to `@container` queries. Querying the same element that owns
 * `grid-template-columns` does not update column tracks reliably.
 */
export function FormGrid({
  children,
  maxColumns = 4,
  compact = false,
  className,
  sx,
}: FormGridProps) {
  const gap = formGridGapPx(compact);
  const cap = Math.min(4, Math.max(1, maxColumns)) as FormColumnCount;
  const bp = formContainerBreakpoints;
  const cq = FORM_CONTAINER_NAME;

  const cols1 = resolveFormColumns(0, cap);
  const cols2 = resolveFormColumns(bp.twoCol, cap);
  const cols3 = resolveFormColumns(bp.threeCol, cap);
  const cols4 = resolveFormColumns(bp.fourCol, cap);

  return (
    <FormGridContext.Provider value={{ maxColumns: cap }}>
      <Box
        className={["pp-form-container", className].filter(Boolean).join(" ")}
        data-max-cols={cap}
        sx={{
          containerType: "inline-size",
          containerName: cq,
          width: "100%",
          ...((sx ?? {}) as object),
        }}
      >
        <Box
          className="pp-form-grid"
          sx={{
            display: "grid",
            width: "100%",
            gridTemplateColumns: columnTemplate(cols1),
            columnGap: `${gap.column}px`,
            rowGap: `${gap.row}px`,
            [`@container ${cq} (min-width: ${bp.twoCol}px)`]: {
              gridTemplateColumns: columnTemplate(cols2),
            },
            [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
              gridTemplateColumns: columnTemplate(cols3),
            },
            [`@container ${cq} (min-width: ${bp.fourCol}px)`]: {
              gridTemplateColumns: columnTemplate(cols4),
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </FormGridContext.Provider>
  );
}

export type FormFieldProps = {
  children: ReactNode;
  /**
   * Preferred column span when the grid has enough columns.
   * Clamped per container-width range (and FormGrid `maxColumns`) so spans
   * never force implicit grid tracks.
   */
  span?: 1 | 2 | 3 | 4;
  className?: string;
  sx?: BoxProps["sx"];
};

/** Single cell inside a FormGrid. */
export function FormField({ children, span = 1, className, sx }: FormFieldProps) {
  const { maxColumns } = useContext(FormGridContext);
  const colSpan = Math.min(4, Math.max(1, span)) as FormColumnCount;
  const bp = formContainerBreakpoints;
  const cq = FORM_CONTAINER_NAME;

  const at1 = formFieldGridColumn(colSpan, resolveFormColumns(0, maxColumns));
  const at2 = formFieldGridColumn(colSpan, resolveFormColumns(bp.twoCol, maxColumns));
  const at3 = formFieldGridColumn(colSpan, resolveFormColumns(bp.threeCol, maxColumns));
  const at4 = formFieldGridColumn(colSpan, resolveFormColumns(bp.fourCol, maxColumns));

  return (
    <Box
      className={["pp-form-field", className].filter(Boolean).join(" ")}
      data-span={colSpan}
      sx={{
        minWidth: 0,
        gridColumn: at1,
        // Clamp at each column band so span never exceeds tracks in that band.
        [`@container ${cq} (min-width: ${bp.twoCol}px) and (max-width: ${bp.threeCol - 0.02}px)`]: {
          gridColumn: at2,
        },
        [`@container ${cq} (min-width: ${bp.threeCol}px) and (max-width: ${bp.fourCol - 0.02}px)`]: {
          gridColumn: at3,
        },
        [`@container ${cq} (min-width: ${bp.fourCol}px)`]: {
          gridColumn: at4,
        },
        ...((sx ?? {}) as object),
      }}
    >
      {children}
    </Box>
  );
}
