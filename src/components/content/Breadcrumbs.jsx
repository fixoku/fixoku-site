import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  return (
    <nav className="content-breadcrumbs" aria-label="İçerik yolu">
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.path}>
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <Link to={item.path}>{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
