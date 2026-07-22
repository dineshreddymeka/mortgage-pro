import type { ScenarioReportModel } from "./scenarioReportModel";

type Props = {
  model: ScenarioReportModel;
  onPrint?: () => void;
  onClose?: () => void;
};

function formatExportedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ScenarioReportView({ model, onPrint, onClose }: Props) {
  return (
    <div className="pp-report-root">
      <div className="pp-report-toolbar" aria-label="Report actions">
        <button type="button" className="primary" onClick={() => (onPrint ? onPrint() : window.print())}>
          Print / Save PDF
        </button>
        {onClose ? (
          <button type="button" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <article className="pp-report-page">
        <header className="pp-report-header">
          <h1 className="pp-report-title">{model.meta.houseLabel}</h1>
          <p className="pp-report-subtitle">
            Property Pro scenario report
            {model.meta.houseId ? ` · House ${model.meta.houseId}` : ""}
            {" · "}
            {formatExportedAt(model.meta.exportedAt)}
          </p>
        </header>
        {model.sections.map((section) => (
          <section key={section.id} className="pp-report-section" aria-labelledby={`report-${section.id}`}>
            <h2 id={`report-${section.id}`}>{section.title}</h2>
            <table className="pp-report-table">
              <tbody>
                {section.rows.map((r) => (
                  <tr key={`${section.id}-${r.label}`}>
                    <th scope="row">{r.label}</th>
                    <td className="value">
                      {r.value}
                      {r.hint ? <span className="pp-report-hint">{r.hint}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <footer className="pp-report-footer">{model.disclaimer}</footer>
      </article>
    </div>
  );
}
