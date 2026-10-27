import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { AdminDataTable, type AdminTableFeatures } from "./AdminDataTable";
import "./admin-panel.css";

type Student = {
  studentProfileId: string;
  studentUserId: string;
  name: string;
  email: string;
  educationStage: string | null;
  grade: string | null;
  classBranch: string | null;
  school: string | null;
  schoolType: string | null;
  city: string | null;
  district: string | null;
  profileStatus: string;
  enrollmentCount: number;
  activeEnrollmentCount: number;
  progressPercent: number;
  currentTrainerNames: string[];
  currentProgramNames: string[];
};

type DetailEnrollment = {
  id: string;
  status: string;
  programId: string;
  programTitle: string;
  progressPercent: number;
  completedAt: string | null;
  trainerNames: string[];
};

type Detail = Omit<
  Student,
  "enrollmentCount" |
  "activeEnrollmentCount" |
  "progressPercent" |
  "currentTrainerNames" |
  "currentProgramNames"
> & {
  phone: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  enrollments: DetailEnrollment[];
};

type ListResponse = {
  students: Student[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

type QuickFilter =
  | "ALL"
  | "WAITING_TRAINER"
  | "HAS_TRAINING"
  | "NO_TRAINING";

const stageLabels: Record<string, string> = {
  PRIMARY: "İlkokul",
  MIDDLE: "Ortaokul",
  HIGH: "Lise",
  ADULT: "Yetişkin",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Aktif",
  ARCHIVED: "Arşivde",
};

const enrollmentStatusLabels: Record<string, string> = {
  ACTIVE: "Aktif",
  PAUSED: "Beklemede",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal edildi",
};

async function loadStudents(params: URLSearchParams) {
  const response = await fetch(`/api/admin/students?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) throw new Error();

  return response.json() as Promise<ListResponse>;
}

async function loadDetail(id: string) {
  const response = await fetch(
    `/api/admin/students?studentProfileId=${encodeURIComponent(id)}`,
    {
      credentials: "same-origin",
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error();

  return response.json() as Promise<{ student: Detail }>;
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 1 0 0-6m-7 9c-3.6 0-6.5 1.8-6.5 4v2h13v-2c0-2.2-2.9-4-6.5-4Zm7-.5c3 0 5.5 1.5 5.5 3.5v2h-4.5" />
    </svg>
  );
}

function TrainingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 8 9-4 9 4-9 4-9-4Zm4 2.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5M21 8v6" />
    </svg>
  );
}

function WaitingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7v5l3 2M5 3h14M5 21h14M7 3c0 4 2 5 5 7-3 2-5 3-5 7m10-14c0 4-2 5-5 7 3 2 5 3 5 7" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12.5 9 17l11-11" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function AdminStudentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [educationStage, setEducationStage] = useState("");
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [selectedId, setSelectedId] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      pageSize: "20",
      sort: sorting[0]?.id || "createdAt",
      direction: sorting[0]?.desc === false ? "asc" : "desc",
    });

    if (search.trim()) value.set("search", search.trim());
    if (status) value.set("status", status);
    if (educationStage) value.set("educationStage", educationStage);

    return value;
  }, [educationStage, page, search, sorting, status]);

  const query = useQuery({
    queryKey: ["admin-students", params.toString()],
    queryFn: () => loadStudents(params),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: ["admin-student-detail", selectedId],
    queryFn: () => loadDetail(selectedId),
    enabled: Boolean(selectedId),
  });

  const rows = query.data?.students || [];

  const activeOnPage = rows.filter(
    (item) => item.profileStatus === "ACTIVE",
  ).length;

  const withoutTrainer = rows.filter(
    (item) =>
      item.activeEnrollmentCount > 0 &&
      item.currentTrainerNames.length === 0,
  ).length;

  const withTraining = rows.filter(
    (item) => item.enrollmentCount > 0,
  ).length;

  const withoutTraining = rows.filter(
    (item) => item.enrollmentCount === 0,
  ).length;


  const filteredRows = useMemo(() => {
    switch (quickFilter) {
      case "WAITING_TRAINER":
        return rows.filter(
          (item) =>
            item.activeEnrollmentCount > 0 &&
            item.currentTrainerNames.length === 0,
        );

      case "HAS_TRAINING":
        return rows.filter((item) => item.enrollmentCount > 0);

      case "NO_TRAINING":
        return rows.filter((item) => item.enrollmentCount === 0);


      default:
        return rows;
    }
  }, [quickFilter, rows]);

  const columns = useMemo<
    ColumnDef<AdminTableFeatures, Student, any>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Öğrenci",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="students-name-cell">
            <strong>{row.original.name}</strong>
            <small>{row.original.email}</small>
          </div>
        ),
      },
      {
        accessorKey: "educationStage",
        header: "Eğitim Düzeyi",
        cell: ({ getValue }) => (
          <span className="students-stage-pill">
            {stageLabels[getValue() || ""] || "Belirlenmedi"}
          </span>
        ),
      },
      {
        accessorKey: "grade",
        header: "Sınıf",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.grade ||
          row.original.classBranch ||
          "Belirlenmedi",
      },
      {
        accessorKey: "currentProgramNames",
        header: "Aktif Eğitim",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.currentProgramNames.length ? (
            <div className="students-program-cell">
              <strong>{row.original.currentProgramNames[0]}</strong>
              {row.original.currentProgramNames.length > 1 && (
                <small>
                  +{row.original.currentProgramNames.length - 1} eğitim daha
                </small>
              )}
            </div>
          ) : (
            <span className="students-empty-pill">Henüz eğitim yok</span>
          ),
      },
      {
        accessorKey: "currentTrainerNames",
        header: "Eğitmen",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.currentTrainerNames.length ? (
            <div className="students-trainer-cell">
              <strong>{row.original.currentTrainerNames[0]}</strong>
              {row.original.currentTrainerNames.length > 1 && (
                <small>
                  +{row.original.currentTrainerNames.length - 1} eğitmen
                </small>
              )}
            </div>
          ) : row.original.activeEnrollmentCount > 0 ? (
            <span className="students-waiting-pill">
              Eğitmen bekliyor
            </span>
          ) : (
            <span className="students-empty-pill">Atanmadı</span>
          ),
      },
      {
        accessorKey: "progressPercent",
        header: "Tamamlanma",
        enableSorting: false,
        cell: ({ row }) => {
          if (Number(row.original.progressPercent) >= 100) {
            return (
              <span className="students-completion-status is-completed">
                Tamamlandı
              </span>
            );
          }

          if (row.original.activeEnrollmentCount > 0) {
            return (
              <span className="students-completion-status is-active">
                Devam ediyor
              </span>
            );
          }

          if (row.original.enrollmentCount > 0) {
            return (
              <span className="students-completion-status is-recorded">
                Eğitim kaydı var
              </span>
            );
          }

          return (
            <span className="students-completion-status is-empty">
              Eğitim yok
            </span>
          );
        },
      },
      {
        accessorKey: "profileStatus",
        header: "Durum",
        cell: ({ getValue }) => (
          <span
            className={`students-status ${
              getValue() === "ACTIVE" ? "is-active" : "is-archived"
            }`}
          >
            <i />
            {statusLabels[getValue()] || getValue()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "İşlem",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="students-detail-button"
            onClick={() =>
              setSelectedId(row.original.studentProfileId)
            }
          >
            Detay
          </button>
        ),
      },
    ],
    [],
  );

  const selected = detail.data?.student;

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setEducationStage("");
    setQuickFilter("ALL");
    setPage(1);
  };

  const exportCurrentPage = () => {
    if (!filteredRows.length) return;

    const quote = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      [
        "Öğrenci",
        "E-posta",
        "Eğitim Düzeyi",
        "Sınıf",
        "Aktif Eğitim",
        "Eğitmen",
        "Tamamlanma",
        "Durum",
      ]
        .map(quote)
        .join(";"),
      ...filteredRows.map((student) =>
        [
          student.name,
          student.email,
          stageLabels[student.educationStage || ""] || "Belirlenmedi",
          student.grade || student.classBranch || "",
          student.currentProgramNames.join(", "),
          student.currentTrainerNames.join(", "),
          student.progressPercent >= 100 ? "Tamamlandı" : student.activeEnrollmentCount > 0 ? "Devam ediyor" : student.enrollmentCount > 0 ? "Eğitim kaydı var" : "Eğitim yok",
          statusLabels[student.profileStatus] || student.profileStatus,
        ]
          .map(quote)
          .join(";"),
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fixoku-ogrenciler-sayfa-${page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="platform-foundation-panel admin-panel admin-orders-page students-pro">
      <header className="admin-pro-header students-pro-header">
        <div>
          <span className="admin-eyebrow">EĞİTİM OPERASYONU</span>
          <h1>Öğrenciler</h1>
          <p>
            Öğrencilerin profilini, aktif eğitimini, eğitmen atamasını
            ve tamamlanma durumunu tek ekrandan takip edin.
          </p>
        </div>

        <div className="students-header-actions">
          <button
            type="button"
            className="students-export-button"
            onClick={exportCurrentPage}
            disabled={!filteredRows.length}
          >
            CSV dışa aktar
          </button>
        </div>
      </header>

      <section className="admin-kpi-grid students-kpi-grid">
        <article>
          <span className="admin-kpi-icon is-blue">
            <UsersIcon />
          </span>
          <div>
            <span>Toplam öğrenci</span>
            <strong>{query.data?.pagination.total ?? "—"}</strong>
            <small>Filtre kapsamındaki toplam kayıt</small>
          </div>
        </article>

        <article>
          <span className="admin-kpi-icon is-green">
            <ActiveIcon />
          </span>
          <div>
            <span>Bu sayfada aktif</span>
            <strong>{activeOnPage}</strong>
            <small>Görüntülenen aktif öğrenciler</small>
          </div>
        </article>

        <article>
          <span className="admin-kpi-icon is-purple">
            <TrainingIcon />
          </span>
          <div>
            <span>Eğitim kaydı olan</span>
            <strong>{withTraining}</strong>
            <small>Bu sayfadaki öğrenciler</small>
          </div>
        </article>

        <article className={withoutTrainer ? "is-warning" : ""}>
          <span className="admin-kpi-icon is-orange">
            <WaitingIcon />
          </span>
          <div>
            <span>Eğitmen bekleyen</span>
            <strong>{withoutTrainer}</strong>
            <small>Aktif eğitim var, eğitmen yok</small>
          </div>
        </article>
      </section>

      <section className="panel-card students-main-card">
        <div className="students-filter-grid">
          <label className="students-search-field">
            <span>Ara</span>
            <div className="students-search-control">
              <SearchIcon />
              <input
                type="search"
                value={search}
                maxLength={100}
                placeholder="Öğrenci adı, e-posta veya okul ara..."
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
          </label>

          <label>
            <span>Durum</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tümü</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Eğitim düzeyi</span>
            <select
              value={educationStage}
              onChange={(event) => {
                setEducationStage(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tümü</option>
              {Object.entries(stageLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="students-filter-actions">
            <button
              type="button"
              className="students-refresh-button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              {query.isFetching ? "Yenileniyor..." : "Yenile"}
            </button>

            <button
              type="button"
              className="students-clear-button"
              onClick={clearFilters}
            >
              Temizle
            </button>
          </div>
        </div>

        <div className="students-quick-filters" aria-label="Hızlı filtreler">
          <button
            type="button"
            className={quickFilter === "ALL" ? "is-active" : ""}
            onClick={() => setQuickFilter("ALL")}
          >
            Tüm öğrenciler
            <span>{rows.length}</span>
          </button>

          <button
            type="button"
            className={
              quickFilter === "WAITING_TRAINER" ? "is-active" : ""
            }
            onClick={() => setQuickFilter("WAITING_TRAINER")}
          >
            Eğitmen bekleyen
            <span>{withoutTrainer}</span>
          </button>

          <button
            type="button"
            className={
              quickFilter === "HAS_TRAINING" ? "is-active" : ""
            }
            onClick={() => setQuickFilter("HAS_TRAINING")}
          >
            Eğitim kaydı olan
            <span>{withTraining}</span>
          </button>

          <button
            type="button"
            className={
              quickFilter === "NO_TRAINING" ? "is-active" : ""
            }
            onClick={() => setQuickFilter("NO_TRAINING")}
          >
            Eğitimsiz
            <span>{withoutTraining}</span>
          </button>


        </div>

        {query.isError ? (
          <div className="admin-callout is-danger" role="alert">
            <p>Öğrenciler yüklenemedi.</p>
            <button
              type="button"
              onClick={() => void query.refetch()}
            >
              Tekrar dene
            </button>
          </div>
        ) : (
          <div className="students-table-zone">
            <AdminDataTable
              columns={columns}
              data={filteredRows}
              sorting={sorting}
              onSortingChange={(value) => {
                setSorting(value);
                setPage(1);
              }}
              loading={query.isLoading}
              emptyMessage="Seçili filtrelere uygun öğrenci bulunamadı."
            />
          </div>
        )}

        {query.data && (
          <div className="admin-table-pagination students-pagination">
            <span>
              Toplam <strong>{query.data.pagination.total}</strong> öğrenci
            </span>

            <button
              type="button"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((value) => value - 1)}
            >
              Önceki
            </button>

            <span className="students-page-number">
              {page} / {Math.max(1, query.data.pagination.pageCount)}
            </span>

            <button
              type="button"
              disabled={
                page >= query.data.pagination.pageCount ||
                query.isFetching
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Sonraki
            </button>
          </div>
        )}
      </section>

      {selectedId && (
        <>
          <button
            type="button"
            className="students-drawer-overlay"
            aria-label="Öğrenci detayını kapat"
            onClick={() => setSelectedId("")}
          />

          <aside
            className="students-detail-drawer"
            aria-label="Öğrenci detayı"
          >
            <div className="students-drawer-header">
              <div>
                <span className="admin-eyebrow">ÖĞRENCİ DOSYASI</span>
                <h2>{selected?.name || "Öğrenci detayı"}</h2>
                {selected && <p>{selected.email}</p>}
              </div>

              <button
                type="button"
                className="students-drawer-close"
                aria-label="Kapat"
                onClick={() => setSelectedId("")}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="students-drawer-body">
              {detail.isLoading && (
                <div className="admin-loading-card">
                  Öğrenci detayı yükleniyor...
                </div>
              )}

              {detail.isError && (
                <div className="admin-callout is-danger">
                  Öğrenci detayı okunamadı.
                </div>
              )}

              {selected && (
                <>
                  <div className="students-drawer-summary">
                    <article>
                      <span>Eğitim düzeyi</span>
                      <strong>
                        {stageLabels[selected.educationStage || ""] ||
                          "Belirtilmedi"}
                      </strong>
                    </article>

                    <article>
                      <span>Sınıf</span>
                      <strong>
                        {selected.grade ||
                          selected.classBranch ||
                          "Belirtilmedi"}
                      </strong>
                    </article>

                    <article>
                      <span>Profil durumu</span>
                      <strong>
                        {statusLabels[selected.profileStatus] ||
                          selected.profileStatus}
                      </strong>
                    </article>
                  </div>

                  <section className="students-drawer-section">
                    <h3>İletişim ve okul</h3>

                    <div className="students-detail-grid">
                      <article>
                        <span>Telefon</span>
                        <strong>{selected.phone || "Belirtilmedi"}</strong>
                      </article>

                      <article>
                        <span>Okul</span>
                        <strong>{selected.school || "Belirtilmedi"}</strong>
                      </article>

                      <article>
                        <span>Şehir / İlçe</span>
                        <strong>
                          {[selected.city, selected.district]
                            .filter(Boolean)
                            .join(" / ") || "Belirtilmedi"}
                        </strong>
                      </article>

                      <article>
                        <span>Veli</span>
                        <strong>
                          {selected.guardianName || "Belirtilmedi"}
                        </strong>
                        <small>{selected.guardianRelation || ""}</small>
                      </article>

                      <article>
                        <span>Veli iletişim</span>
                        <strong>
                          {selected.guardianPhone ||
                            selected.guardianEmail ||
                            "Belirtilmedi"}
                        </strong>
                      </article>
                    </div>
                  </section>

                  <section className="students-drawer-section">
                    <h3>Eğitim geçmişi</h3>

                    {selected.enrollments.length ? (
                      <div className="student-enrollment-list">
                        {selected.enrollments.map((enrollment) => (
                          <article key={enrollment.id}>
                            <div>
                              <strong>{enrollment.programTitle}</strong>
                              <small>
                                {enrollment.trainerNames.length
                                  ? enrollment.trainerNames.join(", ")
                                  : "Eğitmen atanmadı"}
                              </small>


                            </div>

                            <div className="student-enrollment-status">
                              <strong>
                                {enrollmentStatusLabels[
                                  enrollment.status
                                ] || enrollment.status}
                              </strong>

                              {enrollment.completedAt && (
                                <small>
                                  {new Date(
                                    enrollment.completedAt,
                                  ).toLocaleDateString("tr-TR")}
                                </small>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-empty-state">
                        <span>Henüz eğitim kaydı yok.</span>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </main>
  );
}