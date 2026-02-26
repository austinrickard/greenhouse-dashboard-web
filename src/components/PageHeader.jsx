import { COLORS } from "../config";

export default function PageHeader({ title, description }) {
  return (
    <div className="page-header">
      <h1 style={{ color: COLORS.dark, marginBottom: 0 }}>{title}</h1>
      {description && <p className="page-description">{description}</p>}
      <hr />
    </div>
  );
}
