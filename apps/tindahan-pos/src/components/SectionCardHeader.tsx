import { CardActionIcons, type CardActions } from "./CardActionIcons";

/** Header for a dashboard list card, with optional download/print/share icons that export just that card. */
export function SectionCardHeader({ title, ...actions }: { title: string } & CardActions) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <CardActionIcons title={title} {...actions} />
    </div>
  );
}
