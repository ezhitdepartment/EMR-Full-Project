import "./PageStub.css";

// Every menu item points here until a team member builds the real page.
// Swap this out for actual content in each feature file — routing,
// sidebar highlighting, and layout will keep working unchanged.
export default function PageStub({ module, title, description }) {
  return (
    <div className="page-stub">
      <div className="page-stub__header">
        <p className="page-stub__eyebrow">{module}</p>
        <h1>{title}</h1>
        {description && <p className="page-stub__desc">{description}</p>}
      </div>
      <div className="page-stub__body">
        <p>This module hasn't been built yet — this placeholder keeps routing and navigation working end to end.</p>
      </div>
    </div>
  );
}