import { useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarDays,
  ContactRound,
  Plus,
  RotateCw,
  UsersRound,
} from 'lucide-react';
import {
  getGetMembersQueryKey,
  useAddMember,
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
  const queryClient = useQueryClient();
  const membersQuery = useGetMembers();
  const addMember = useAddMember();
  const members = membersQuery.data ?? [];
  const today = dateKey(new Date());
  const activeCount = members.filter((member) => memberDateKey(member.endingDate) >= today).length;

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
        <time className="top-date" dateTime={today}>
          {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}
        </time>
      </header>

      <div className="workspace">
        <section className="page-intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Member register / 01</p>
            <h1 className="page-title" id="page-title">Memberships</h1>
            <p className="page-subtitle">A clear record of who’s here, and until when.</p>
          </div>
          <div className="record-total" data-testid="text-member-count">
            <strong>{members.length.toString().padStart(2, '0')}</strong>
            {members.length === 1 ? 'record' : 'records'}
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Membership management">
          <form className="panel form-panel" onSubmit={submitMember}>
            <div className="panel-heading">
              <div>
                <h2 className="panel-title">Add a member</h2>
                <p className="panel-kicker">Start a new membership record.</p>
              </div>
              <span className="list-icon" aria-hidden="true"><Plus size={17} /></span>
            </div>
            <div className="form-rule" />

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

            <div className="form-rule" />
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

            <button
              className="submit-button"
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
              <p className="form-error" role="alert" data-testid="status-add-error">
                {addMember.error instanceof Error
                  ? addMember.error.message
                  : 'We couldn’t add this member. Please try again.'}
              </p>
            )}
          </form>

          <section className="panel list-panel" aria-labelledby="members-heading">
            <div className="list-header">
              <div className="list-heading">
                <div className="list-icon" aria-hidden="true"><UsersRound size={17} strokeWidth={1.8} /></div>
                <div>
                  <h2 className="list-title" id="members-heading">All members</h2>
                  <p className="list-subtitle">{activeCount} active · {members.length - activeCount} expired</p>
                </div>
              </div>
              <div className="status-key" aria-label="Membership status key">
                <span className="key-item"><span className="status-dot" />Active</span>
                <span className="key-item"><span className="status-dot expired" />Expired</span>
              </div>
            </div>

            {membersQuery.isPending ? (
              <div className="loading-wrap" aria-label="Loading member records" data-testid="state-members-loading">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line" />
              </div>
            ) : membersQuery.isError ? (
              <div className="error-state" role="alert" data-testid="state-members-error">
                <div className="empty-mark"><RotateCw size={19} /></div>
                <h3 className="empty-title">Records are unavailable</h3>
                <p className="empty-copy">The member register couldn’t be loaded just now.</p>
                <button className="retry-button" type="button" onClick={() => membersQuery.refetch()} data-testid="button-retry-members">
                  Try again
                </button>
              </div>
            ) : members.length === 0 ? (
              <div className="empty-state" data-testid="state-members-empty">
                <div className="empty-mark"><BadgeCheck size={20} strokeWidth={1.7} /></div>
                <h3 className="empty-title">Your register starts here</h3>
                <p className="empty-copy">Add your first member and their record will appear in this list.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th scope="col">Member</th>
                      <th scope="col">Plan</th>
                      <th scope="col">Joined</th>
                      <th scope="col">Ends</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const active = memberDateKey(member.endingDate) >= today;
                      return (
                        <tr
                          key={member.id}
                          className={active ? 'active-row' : 'expired-row'}
                          data-testid={`row-member-${member.id}`}
                        >
                          <td>
                            <div className="member-cell" data-testid={`text-member-name-${member.id}`}>
                              <span className="member-initial" aria-hidden="true">{initials(member.name)}</span>
                              {member.name}
                            </div>
                          </td>
                          <td className="member-type" data-testid={`text-member-plan-${member.id}`}>
                            {member.membershipType} {member.membershipType === 1 ? 'month' : 'months'}
                          </td>
                          <td className="date-value" data-testid={`text-joining-date-${member.id}`}>
                            <CalendarDays size={12} aria-hidden="true" />{formatDate(member.joiningDate)}
                          </td>
                          <td className="date-value" data-testid={`text-ending-date-${member.id}`}>{formatDate(member.endingDate)}</td>
                          <td data-testid={`status-membership-${member.id}`}>
                            <span className={`status-pill${active ? '' : ' expired'}`}>
                              <span className={`status-dot${active ? '' : ' expired'}`} />
                              {active ? 'Active' : 'Expired'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!membersQuery.isPending && !membersQuery.isError && members.length > 0 && (
              <div className="list-footer">{activeCount} active membership{activeCount === 1 ? '' : 's'} as of today</div>
            )}
          </section>
        </section>

        <p className="page-note">Memberships are counted active through their ending date</p>
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