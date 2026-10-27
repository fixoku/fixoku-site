import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { contentExplorerGroups } from "../../data/contentExplorer.js";

function ExplorerTree({ activePath, idPrefix, onNavigate, openGroupPath, setOpenGroupPath }) {
  return (
    <div className="content-explorer-tree">
      {contentExplorerGroups.map((group, index) => {
        const isOpen = group.path === openGroupPath;
        const panelId = `${idPrefix}-group-${index}`;

        return (
          <section className={`content-explorer-group${isOpen ? " is-open" : ""}`} key={group.path}>
            <button
              aria-controls={panelId}
              aria-expanded={isOpen}
              className="content-explorer-toggle"
              onClick={() => setOpenGroupPath(isOpen ? null : group.path)}
              type="button"
            >
              <span className="content-explorer-toggle-label">{group.label}</span>
              <span className="content-explorer-count" aria-label={`${group.items.length} içerik`}>
                {group.items.length}
              </span>
              <span className="content-explorer-chevron" aria-hidden="true">⌄</span>
            </button>

            {isOpen && (
              <nav aria-label={`${group.label} içerikleri`} className="content-explorer-list" id={panelId}>
                {group.items.map((item) => {
                  const isActive = item.path === activePath;

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`content-explorer-link${isActive ? " is-active" : ""}`}
                      key={item.path}
                      onClick={onNavigate}
                      to={item.path}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default function ContentExplorer() {
  const location = useLocation();
  const idPrefix = useId().replace(/:/g, "");
  const triggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const activeGroupPath = contentExplorerGroups.find((group) =>
    group.items.some((item) => item.path === location.pathname))?.path;
  const [openGroupPath, setOpenGroupPath] = useState(
    () => activeGroupPath ?? contentExplorerGroups[0]?.path ?? null,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const closeMobileExplorer = () => {
    setMobileOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <section className="content-explorer-desktop" aria-labelledby={`${idPrefix}-desktop-title`}>
        <div className="content-explorer-heading">
          <span>Keşfet</span>
          <strong id={`${idPrefix}-desktop-title`}>İçerik Gezgini</strong>
        </div>
        <ExplorerTree
          activePath={location.pathname}
          idPrefix={`${idPrefix}-desktop`}
          openGroupPath={openGroupPath}
          setOpenGroupPath={setOpenGroupPath}
        />
      </section>

      <div className="content-explorer-mobile">
        <button
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          className="content-explorer-mobile-trigger"
          onClick={() => setMobileOpen(true)}
          ref={triggerRef}
          type="button"
        >
          <span>
            <small>İçerik Gezgini</small>
            <strong>Tüm İçerikler</strong>
          </span>
          <span aria-hidden="true">⌃</span>
        </button>

        {mobileOpen && (
          <div className="content-explorer-drawer">
            <button
              aria-label="İçerik gezginini kapat"
              className="content-explorer-backdrop"
              onClick={closeMobileExplorer}
              type="button"
            />
            <section
              aria-labelledby={`${idPrefix}-mobile-title`}
              aria-modal="true"
              className="content-explorer-sheet"
              role="dialog"
            >
              <div className="content-explorer-sheet-handle" aria-hidden="true" />
              <header className="content-explorer-sheet-header">
                <div>
                  <span>Fixoku içerikleri</span>
                  <strong id={`${idPrefix}-mobile-title`}>Tüm İçerikler</strong>
                </div>
                <button
                  aria-label="İçerik gezginini kapat"
                  className="content-explorer-close"
                  onClick={closeMobileExplorer}
                  ref={closeButtonRef}
                  type="button"
                >
                  ×
                </button>
              </header>
              <div className="content-explorer-sheet-body">
                <ExplorerTree
                  activePath={location.pathname}
                  idPrefix={`${idPrefix}-mobile`}
                  onNavigate={() => setMobileOpen(false)}
                  openGroupPath={openGroupPath}
                  setOpenGroupPath={setOpenGroupPath}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
