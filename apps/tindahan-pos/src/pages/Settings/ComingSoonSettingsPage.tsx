import { TEXT_COMING_SOON, TEXT_COMING_SOON_DESCRIPTION } from "@/lib";
import { SettingsLayout } from "./component";

interface ComingSoonSettingsPageProps {
  heading: string;
  subheading: string;
}

export function ComingSoonSettingsPage({ heading, subheading }: ComingSoonSettingsPageProps) {
  return (
    <SettingsLayout>
      <div className="tpl-hd">
        <div>
          <p className="tpl-h1" style={{ fontSize: 21 }}>
            {heading}
          </p>
          <p className="tpl-sub">{subheading}</p>
        </div>
      </div>
      <div className="tpl-card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <p className="tpl-h3" style={{ marginBottom: 6 }}>
          {TEXT_COMING_SOON}
        </p>
        <p className="tpl-ts">{TEXT_COMING_SOON_DESCRIPTION}</p>
      </div>
    </SettingsLayout>
  );
}
