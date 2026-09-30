import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  ContactRound,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react';
import {
  getGetMembersQueryKey,
  useAddMember,
  useDeleteMember,
  useGetMembers,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const membershipLengths = [1, 2, 3] as const;
type MembershipLength = (typeof membershipLengths)[number];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function memberDateKey(dateString: string) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString.slice(0, 10) : dateKey(date);
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
}

function Home() {
  const [name, setName] = useState('');
  const [membershipType, setMembershipType] = useState<MembershipLength>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();
  const membersQuery = useGetMembers();
  const addMember = useAddMember();
  const deleteMember = useDeleteMember();
  const members = membersQuery.data ?? [];
  const today = dateKey(new Date());
  const activeCount = members.filter((member) => memberDateKey(member.endingDate) >= today).length;
  const expiredCount = members.length - activeCount;
  const activePercentage = members.length
    ? Math.round((activeCount / members.length) * 100)
    : 0;
  const visibleMembers = members.filter((member) =>
    member.name.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase()),
  );

  const submitMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || addMember.isPending) return;

    addMember.mutate(
      { data: { name: cleanName, membershipType } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
          setName('');
          setMembershipType(1);
          setShowAddForm(false);
        },
      },
    );
  };

  const removeMember = (id: string, memberName: string) => {
    if (!window.confirm(`Remove ${memberName} from the register? This cannot be undone.`)) return;

    deleteMember.mutate(
      { id },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetMembersQueryKey() });
        },
      },
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Common Ledger membership desk">
          <div className="brand-mark" aria-hidden="true">
            <ContactRound size={18} strokeWidth={1.8} />
          </div>
          <div>
            <div className="brand-name">Common Ledger</div>
            <div className="brand-caption">Membership desk</div>
          </div>
        </div>
        <div className="topbar-actions">
          <time className="top-date" dateTime={today}>
            {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}
          </time>
          <button
            className={`header-add-button${showAddForm ? ' is-open' : ''}`}
            type="button"
            aria-label={showAddForm ? 'Close add member form' : 'Add member'}
            aria-expanded={showAddForm}
            aria-controls="add-member-form"
            onClick={() => setShowAddForm((current) => !current)}
            data-testid="button-toggle-add-member"
          >
            {showAddForm ? <span className="header-add-close" aria-hidden="true">×</span> : <Plus size={15} aria-hidden="true" />}
            <span className="header-add-label">{showAddForm ? 'Close' : 'Add member'}</span>
          </button>
        </div>
      </header>

      <div className="workspace">
        <section className="overview-hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="hero-kicker"><span className="hero-kicker-dot" aria-hidden="true" />Membership overview</p>
            <h1 className="hero-heading" id="page-title">
              Know your people.
              <span>Keep the door open.</span>
            </h1>
            <p className="hero-subtitle">Add members quickly and keep a clear eye on who is active today.</p>
          </div>
          <div className="hero-photo">
            <img src="/membership-gym-hero.jpg" alt="" aria-hidden="true" />
          </div>
        </section>

        <section className="metric-grid" aria-label="Membership statistics">
          <article className="metric-card">
            <div className="metric-label-row">
              <h2 className="metric-label">Total members</h2>
              <UsersRound size={17} aria-hidden="true" />
            </div>
            <strong className="metric-value" data-testid="metric-total-members">
              {membersQuery.isPending ? '—' : members.length}
            </strong>
            <p className="metric-caption">in your directory</p>
          </article>
          <article className="metric-card metric-card-active">
            <div className="metric-label-row">
              <h2 className="metric-label">Active now</h2>
              <CircleCheck size={17} aria-hidden="true" />
            </div>
            <strong className="metric-value" data-testid="metric-active-members">
              {membersQuery.isPending ? '—' : activeCount}
            </strong>
            <p className="metric-caption">
              {members.length ? `${activePercentage}% of all members` : 'No records yet'}
            </p>
          </article>
          <article className="metric-card metric-card-expired">
            <div className="metric-label-row">
              <h2 className="metric-label">Needs attention</h2>
              <CircleAlert size={17} aria-hidden="true" />
            </div>
            <strong className="metric-value" data-testid="metric-expired-members">
              {membersQuery.isPending ? '—' : expiredCount}
            </strong>
            <p className="metric-caption">expired memberships</p>
          </article>
        </section>

        {showAddForm && (
          <form
            id="add-member-form"
            className="add-member-panel"
            onSubmit={submitMember}
            aria-labelledby="add-member-heading"
          >
            <div className="add-form-heading">
              <div>
                <p className="add-form-kicker">NEW RECORD</p>
                <h2 id="add-member-heading">Add a member</h2>
                <p>Start a new membership record.</p>
              </div>
              <span className="add-form-icon" aria-hidden="true"><Plus size={18} /></span>
            </div>
            <div className="add-form-grid">
              <div className="add-form-field">
                <label className="field-label" htmlFor="member-name">Member name</label>
                <input
                  id="member-name"
                  className="name-input"
                  type="text"
                  name="name"
                  placeholder="e.g. Rowan Ellis"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  data-testid="input-member-name"
                />
              </div>
              <div className="add-form-field">
                <span className="field-label" id="membership-length-label">Membership length</span>
                <div className="plan-options" role="radiogroup" aria-labelledby="membership-length-label">
                  {membershipLengths.map((months) => (
                    <button
                      key={months}
                      className="plan-option"
                      type="button"
                      role="radio"
                      aria-checked={membershipType === months}
                      onClick={() => setMembershipType(months)}
                      data-testid={`option-membership-${months}-months`}
                    >
                      <span className="plan-length">{months}</span>
                      <span className="plan-label">{months === 1 ? 'month' : 'months'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              className="submit-button add-form-submit"
              type="submit"
              disabled={!name.trim() || addMember.isPending}
              data-testid="button-add-member"
            >
              {addMember.isPending ? (
                <>Adding member<span aria-hidden="true">…</span></>
              ) : (
                <><Plus size={15} strokeWidth={2.2} /> Add member</>
              )}
            </button>
            {addMember.isError && (
              <p className="form-error add-form-error" role="alert" data-testid="status-add-error">
                {addMember.error instanceof Error
                  ? addMember.error.message
                  : 'We couldn’t add this member. Please try again.'}
              </p>
            )}
          </form>
        )}

        <section className="directory-section" aria-labelledby="members-heading">
          <div className="directory-heading">
            <div className="directory-title-block">
              <div className="directory-title-line">
                <h2 id="members-heading">Member directory</h2>
                <span className="directory-count" data-testid="text-member-count">
                  {members.length.toString().padStart(2, '0')}
                </span>
              </div>
              <p>A quick read on everyone who has a key.</p>
            </div>
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search members by name</span>
              <input
                type="search"
                placeholder="Search by name"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                data-testid="input-search-members"
              />
            </label>
          </div>

          {deleteMember.isError && (
            <p className="form-error directory-error" role="alert" data-testid="status-remove-error">
              The member could not be removed. Please try again.
            </p>
          )}

          <div className="directory-list" aria-live="polite">
            {membersQuery.isPending ? (
              <div className="directory-loading" aria-label="Loading member records" data-testid="state-members-loading">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            ) : membersQuery.isError ? (
              <div className="directory-empty" role="alert" data-testid="state-members-error">
                <div className="empty-mark"><RotateCw size={19} /></div>
                <h3 className="empty-title">Records are unavailable</h3>
                <p className="empty-copy">The member register couldn’t be loaded just now.</p>
                <button className="retry-button" type="button" onClick={() => membersQuery.refetch()} data-testid="button-retry-members">
                  Try again
                </button>
              </div>
            ) : visibleMembers.length === 0 ? (
              <div className="directory-empty" data-testid={members.length ? 'state-members-no-results' : 'state-members-empty'}>
                <div className="empty-mark"><BadgeCheck size={20} strokeWidth={1.7} /></div>
                <h3 className="empty-title">
                  {members.length ? 'No matching members' : 'Your directory starts here'}
                </h3>
                <p className="empty-copy">
                  {members.length
                    ? 'Try another name or clear your search.'
                    : 'Add your first member and their record will appear in this list.'}
                </p>
                {members.length === 0 && (
                  <button className="empty-add-button" type="button" onClick={() => setShowAddForm(true)}>
                    <Plus size={15} /> Add first member
                  </button>
                )}
              </div>
            ) : (
              visibleMembers.map((member) => {
                const active = memberDateKey(member.endingDate) >= today;
                return (
                  <article
                    key={member.id}
                    className={`member-row${active ? ' member-row-active' : ' member-row-expired'}`}
                    data-testid={`row-member-${member.id}`}
                  >
                    <div className="member-identity">
                      <span className="member-avatar" aria-hidden="true">{initials(member.name)}</span>
                      <div className="member-copy">
                        <h3 className="member-name" data-testid={`text-member-name-${member.id}`}>{member.name}</h3>
                        <p className="member-meta" data-testid={`text-member-plan-${member.id}`}>
                          <span>{member.membershipType} {member.membershipType === 1 ? 'month' : 'months'}</span>
                          <span className="member-meta-divider" aria-hidden="true">/</span>
                          <span>Joined {formatDate(member.joiningDate)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="member-ending" data-testid={`text-ending-date-${member.id}`}>
                      <CalendarDays size={16} aria-hidden="true" />
                      <span>Ends {formatDate(member.endingDate)}</span>
                    </div>
                    <span
                      className={`member-status${active ? ' is-active' : ' is-expired'}`}
                      data-testid={`status-membership-${member.id}`}
                    >
                      <span className="member-status-dot" aria-hidden="true" />
                      {active ? 'Active' : 'Expired'}
                    </span>
                    <button
                      className="member-remove-button"
                      type="button"
                      aria-label={`Remove ${member.name}`}
                      title={`Remove ${member.name}`}
                      disabled={deleteMember.isPending}
                      onClick={() => removeMember(member.id, member.name)}
                      data-testid={`button-remove-member-${member.id}`}
                    >
                      {deleteMember.isPending && deleteMember.variables?.id === member.id
                        ? <span aria-hidden="true">…</span>
                        : <Trash2 size={15} aria-hidden="true" />}
                    </button>
                  </article>
                );
              })
            )}
          </div>

          {!membersQuery.isPending && !membersQuery.isError && members.length > 0 && (
            <p className="directory-footer" data-testid="text-visible-member-count">
              Showing {visibleMembers.length} of {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          )}
        </section>

        <p className="page-note">Memberships remain active through their ending date</p>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;