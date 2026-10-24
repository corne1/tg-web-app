import type { AppUser } from "../api";

type Props = {
  user: AppUser;
};

export function Profile({ user }: Props) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return (
    <section className="profile">
      <h1>Profile</h1>
      <div className="avatar-row">
        {user.photo_url ? (
          <img className="avatar" src={user.photo_url} alt="" />
        ) : (
          <div className="avatar avatar-fallback" aria-hidden>
            {user.first_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="name">{name}</p>
          {user.username && <p className="muted">@{user.username}</p>}
        </div>
      </div>
      <dl className="meta">
        <div>
          <dt>Telegram ID</dt>
          <dd>{user.id}</dd>
        </div>
        {user.language_code && (
          <div>
            <dt>Language</dt>
            <dd>{user.language_code}</dd>
          </div>
        )}
        <div>
          <dt>Premium</dt>
          <dd>{user.is_premium ? "Yes" : "No"}</dd>
        </div>
        {user.last_seen_at && (
          <div>
            <dt>Last seen</dt>
            <dd>{new Date(user.last_seen_at).toLocaleString()}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
