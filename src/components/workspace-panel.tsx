import type { ReactNode, Ref } from "react";

export function PanelHeading({
  id,
  icon,
  children,
  aside,
  headingRef,
}: {
  id: string;
  icon: string;
  children: string;
  aside?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <header className="workspace-panel-header">
      <span className="workspace-icon" aria-hidden="true">{icon}</span>
      <h2 id={id} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{children}</h2>
      {aside && <div className="workspace-panel-aside">{aside}</div>}
    </header>
  );
}

export function PanelEmpty({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="workspace-empty">
      <span className="workspace-icon" aria-hidden="true">{icon}</span>
      <p className="workspace-empty-title">{title}</p>
      <p>{children}</p>
    </div>
  );
}
