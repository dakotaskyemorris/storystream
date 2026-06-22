"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  BadgePlus,
  Ban,
  BookOpen,
  CheckCircle2,
  Eye,
  Feather,
  Flag,
  Heart,
  Home,
  Library,
  Lock,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
  UserRound,
  UsersRound,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type View =
  | "home"
  | "discover"
  | "digest"
  | "studio"
  | "books"
  | "safety"
  | "moderation"
  | "profile";

type StoryStreamClientProps = {
  view?: View;
  username?: string;
};

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/digest", label: "Digest", icon: Radio },
  { href: "/studio", label: "Studio", icon: PenLine },
  { href: "/books", label: "Books", icon: Library },
  { href: "/safety", label: "Safety", icon: ShieldCheck },
];

const genres = ["Poetry", "Fantasy", "Sci-Fi", "Journals", "Adventure"];

export function StoryStreamClient({
  view = "home",
  username,
}: StoryStreamClientProps) {
  const me = useQuery(api.profiles.me);
  const posts = (useQuery(api.posts.discover, {}) ?? []) as FeedPost[];
  const books = (useQuery(api.books.discover) ?? []) as FeedBook[];
  const digest = (useQuery(api.social.friendsDigest) ?? []) as DigestItem[];
  const mine = (useQuery(api.posts.mine) ?? []) as DraftPost[];
  const myBooks = (useQuery(api.books.mine) ?? []) as DraftBook[];
  const suggested = (useQuery(api.profiles.suggested) ?? []) as Profile[];
  const profileBundle = useQuery(
    api.posts.byProfile,
    username ? { username } : "skip",
  ) as ProfileBundle | null | undefined;
  const moderationQueue = useQuery(
    api.moderation.queue,
    me?.isAdmin ? { status: "open" } : "skip",
  ) as ReportRow[] | undefined;
  const openReportCount = moderationQueue?.length ?? 0;

  const primaryPost = posts[0];
  const stats = useMemo(
    () => [
      { label: "Public pieces", value: posts.length },
      { label: "Open books", value: books.length },
      { label: "Writers here", value: suggested.length },
      { label: "Your tokens", value: me?.tokenBalance ?? 0 },
    ],
    [books.length, me?.tokenBalance, posts.length, suggested.length],
  );

  return (
    <main className="bg-stage relative min-h-screen overflow-hidden text-stone-950">
      <div className="grain pointer-events-none fixed inset-0 opacity-55" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <TopBar me={me ?? null} active={view} openReportCount={openReportCount} />
        <section className="grid gap-5 lg:grid-cols-[260px_1fr_320px]">
          <aside className="hidden lg:block">
            <NavRail active={view} me={me ?? null} openReportCount={openReportCount} />
          </aside>
          <section className="min-w-0">
            {view === "home" && (
              <HomeView posts={posts} stats={stats} primaryPost={primaryPost} me={me ?? null} />
            )}
            {view === "discover" && <DiscoverView posts={posts} me={me ?? null} />}
            {view === "digest" && <DigestView digest={digest} me={me ?? null} />}
            {view === "studio" && (
              <StudioView me={me ?? null} mine={mine} myBooks={myBooks} />
            )}
            {view === "books" && <BooksView books={books} me={me ?? null} />}
            {view === "safety" && <SafetyView />}
            {view === "moderation" && (
              <ModerationView me={me ?? null} reports={moderationQueue ?? []} />
            )}
            {view === "profile" && (
              <ProfileView bundle={profileBundle ?? null} username={username} me={me ?? null} />
            )}
          </section>
          <aside className="flex flex-col gap-5">
            <AuthPanel me={me ?? null} />
            <TokenPanel me={me ?? null} />
            <WritersPanel writers={suggested} me={me ?? null} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function TopBar({
  me,
  active,
  openReportCount,
}: {
  me: Profile | null;
  active: View;
  openReportCount: number;
}) {
  return (
    <header className="glass-strong sticky top-4 z-20 flex items-center justify-between rounded-[28px] px-4 py-3">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-stone-950 text-white">
          <Feather className="size-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight">
            StoryStream
          </span>
          <span className="block text-xs text-stone-600">
            Where you can be you.
          </span>
        </span>
      </Link>
      <nav className="hidden items-center gap-1 md:flex">
        {navItems.slice(1, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              active.toLowerCase() === item.label.toLowerCase()
                ? "bg-stone-950 text-white"
                : "text-stone-700 hover:bg-white/70"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link
        href={me ? `/profile/${me.username}` : "/studio"}
        className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm"
      >
        <UserRound className="size-4" />
        {me ? `@${me.username}` : "Start"}
      </Link>
      {me?.isAdmin && openReportCount > 0 && (
        <Link
          href="/moderation"
          className="hidden rounded-full bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800 md:inline-flex"
        >
          {openReportCount} reports
        </Link>
      )}
    </header>
  );
}

function NavRail({
  active,
  me,
  openReportCount,
}: {
  active: View;
  me: Profile | null;
  openReportCount: number;
}) {
  return (
    <div className="glass sticky top-24 rounded-[28px] p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const selected =
          active === "home"
            ? item.href === "/"
            : active.toLowerCase() === item.label.toLowerCase();
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mb-1 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
              selected
                ? "bg-stone-950 text-white"
                : "text-stone-700 hover:bg-white/72"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/moderation"
        className="mt-3 flex items-center gap-3 rounded-2xl border border-white/70 px-3 py-3 text-sm font-semibold text-stone-700 hover:bg-white/72"
      >
        <Flag className="size-4" />
        Moderation
        {me?.isAdmin && openReportCount > 0 && (
          <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">
            {openReportCount}
          </span>
        )}
      </Link>
    </div>
  );
}

function HomeView({
  posts,
  stats,
  primaryPost,
  me,
}: {
  posts: FeedPost[];
  stats: { label: string; value: number }[];
  primaryPost: FeedPost | undefined;
  me: Profile | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="glass-strong fluted overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="grid gap-7 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-2 text-sm font-semibold text-stone-700">
              <Sparkles className="size-4 text-teal-700" />
              Your words. Your choice.
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              StoryStream
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
              A creative community for writers, readers, dreamers, and
              storytellers. Write privately, share with followers, or publish
              publicly with StoryTokens earned through thoughtful participation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="button-dark" href="/studio">
                <PenLine className="size-4" />
                Write
              </Link>
              <Link className="button-light" href="/discover">
                <Eye className="size-4" />
                Explore
              </Link>
            </div>
          </div>
          <FeaturedPiece item={primaryPost} />
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-[24px] p-5">
            <div className="text-3xl font-semibold">{stat.value}</div>
            <div className="mt-1 text-sm font-medium text-stone-600">
              {stat.label}
            </div>
          </div>
        ))}
      </section>
      <DiscoverView posts={posts.slice(0, 6)} compact me={me} />
    </div>
  );
}

function FeaturedPiece({ item }: { item?: FeedPost }) {
  if (!item) {
    return (
      <div className="glass rounded-[28px] p-6">
        <p className="text-sm font-semibold text-stone-600">Latest writing</p>
        <p className="mt-3 text-2xl font-semibold">Start the stream.</p>
      </div>
    );
  }
  return (
    <article className="glass rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-3">
        <Pill>{item.post.genre}</Pill>
        <span className="text-sm text-stone-600">@{item.author.username}</span>
      </div>
      <h2 className="mt-5 text-3xl font-semibold tracking-tight">
        {item.post.title}
      </h2>
      <p className="mt-4 leading-7 text-stone-700">{item.post.excerpt}</p>
      <div className="mt-6 flex items-center gap-4 text-sm font-semibold text-stone-600">
        <span className="inline-flex items-center gap-1">
          <Heart className="size-4" /> {item.post.likesCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-4" /> {item.post.commentsCount}
        </span>
      </div>
    </article>
  );
}

function DiscoverView({
  posts,
  me,
  compact = false,
}: {
  posts: FeedPost[];
  me: Profile | null;
  compact?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        eyebrow="Newest first"
        title={compact ? "Fresh from the stream" : "Discover writing"}
        icon={<Search className="size-5" />}
      />
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <span key={genre} className="rounded-full bg-white/70 px-3 py-2 text-sm font-semibold text-stone-700">
            {genre}
          </span>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {posts.map((item) => (
          <PostCard key={item.post._id} item={item} me={me} />
        ))}
      </div>
    </section>
  );
}

function DigestView({ digest, me }: { digest: DigestItem[]; me: Profile | null }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        eyebrow="Your circle"
        title="Friends Digest"
        icon={<Radio className="size-5" />}
      />
      {!me && (
        <EmptyState title="Sign in to see your circle" body="Follow writers and their latest posts will collect here." />
      )}
      {me && digest.length === 0 && (
        <EmptyState title="A quiet digest" body="Follow a few writers to build a living feed of their new stories and chapters." />
      )}
      <div className="grid gap-4">
        {digest.map((item) => (
          <DigestCard key={`${item.type}-${item.createdAt}`} item={item} me={me} />
        ))}
      </div>
    </section>
  );
}

function StudioView({
  me,
  mine,
  myBooks,
}: {
  me: Profile | null;
  mine: DraftPost[];
  myBooks: DraftBook[];
}) {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader
        eyebrow="Private drafts, follower releases, public publishing"
        title="Writing Studio"
        icon={<PenLine className="size-5" />}
      />
      {!me ? (
        <EmptyState title="Create a profile first" body="Use the sign-in panel to join, then choose your username and begin writing." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <WriterForm />
          <BookForm />
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <LibraryList title="Your pieces" items={mine} />
        <BookList title="Your books" books={myBooks} />
      </div>
    </section>
  );
}

function WriterForm() {
  const createDraft = useMutation(api.posts.createDraft);
  const publish = useMutation(api.posts.publish);
  const [title, setTitle] = useState("A small door in the rain");
  const [body, setBody] = useState(
    "Write the first lines here. Keep it private, share it with followers, or spend StoryTokens to publish it publicly.",
  );
  const [visibility, setVisibility] = useState<"private" | "followers" | "public">("private");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const postId = await createDraft({
        title,
        body,
        kind: "story",
        genre: "Fantasy",
        tags: ["draft"],
      });
      await publish({
        postId,
        visibility,
        commentsMode: visibility === "public" ? "everyone" : "followers",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-[28px] p-5">
      <h3 className="text-xl font-semibold">New piece</h3>
      <TextInput label="Title" value={title} onChange={setTitle} />
      <TextArea label="Words" value={body} onChange={setBody} />
      <Segmented
        value={visibility}
        onChange={setVisibility}
        options={[
          { value: "private", label: "Private", icon: Lock },
          { value: "followers", label: "Followers", icon: UsersRound },
          { value: "public", label: "Public", icon: Eye },
        ]}
      />
      <button className="button-dark mt-4 w-full" disabled={busy}>
        <BadgePlus className="size-4" />
        {busy ? "Publishing..." : "Save and publish"}
      </button>
    </form>
  );
}

function BookForm() {
  const createBook = useMutation(api.books.createBook);
  const addChapter = useMutation(api.books.addChapter);
  const publishChapter = useMutation(api.books.publishChapter);
  const [title, setTitle] = useState("The Glass Orchard");
  const [chapter, setChapter] = useState("Chapter One");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const bookId = await createBook({
        title,
        description: "A long-form project started in StoryStream.",
        coverUrl: null,
        genres: ["Fantasy"],
      });
      const chapterId = await addChapter({
        bookId,
        title: chapter,
        body: "Begin your chapter here, one scene at a time.",
      });
      await publishChapter({
        chapterId,
        visibility: "followers",
        commentsMode: "followers",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-[28px] p-5">
      <h3 className="text-xl font-semibold">New book</h3>
      <TextInput label="Book title" value={title} onChange={setTitle} />
      <TextInput label="First chapter" value={chapter} onChange={setChapter} />
      <button className="button-light mt-4 w-full" disabled={busy}>
        <BookOpen className="size-4" />
        {busy ? "Creating..." : "Create book"}
      </button>
    </form>
  );
}

function BooksView({ books, me }: { books: FeedBook[]; me: Profile | null }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        eyebrow="Serial worlds"
        title="Books and chapters"
        icon={<BookOpen className="size-5" />}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {books.map(({ book, author, chapters }) => (
          <article key={book._id} className="glass rounded-[28px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <Pill>{book.genres[0] ?? "Book"}</Pill>
              <Link href={`/profile/${author.username}`} className="text-sm font-semibold text-stone-600">
                @{author.username}
              </Link>
            </div>
            <h3 className="text-2xl font-semibold">{book.title}</h3>
            <p className="mt-3 leading-7 text-stone-700">{book.description}</p>
            <div className="mt-5 flex gap-3 text-sm font-semibold text-stone-600">
              <span>{book.chaptersCount} chapters</span>
              <span>{book.subscribersCount} subscribers</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <FollowButton target={author} me={me} compact />
              <SafetyActions targetType="profile" targetId={author._id} targetProfile={author} me={me} />
            </div>
            {chapters.length > 0 && (
              <div className="mt-5 flex flex-col gap-3">
                {chapters.map((chapter) => (
                  <ChapterCard key={chapter._id} chapter={chapter} author={author} book={book} me={me} />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function SafetyView() {
  const items = [
    ["Report posts", "Reports go into an admin queue for review."],
    ["Block users", "Blocked profiles cannot interact with you."],
    ["Mute users", "Muted voices stay out of your experience."],
    ["Privacy choice", "Each piece can be private, followers-only, or public."],
  ];
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        eyebrow="Kindness, creativity, respect"
        title="Safety center"
        icon={<ShieldCheck className="size-5" />}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(([title, body]) => (
          <div key={title} className="glass rounded-[28px] p-5">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-2 leading-7 text-stone-700">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModerationView({
  me,
  reports,
}: {
  me: Profile | null;
  reports: ReportRow[];
}) {
  if (!me?.isAdmin) {
    return <EmptyState title="Moderators only" body="The queue is available to StoryStream administrators." />;
  }
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        eyebrow="Admin review"
        title="Moderation queue"
        icon={<Flag className="size-5" />}
      />
      {reports.length === 0 && <EmptyState title="All clear" body="There are no open reports waiting for review." />}
      {reports.map((row) => (
        <ReportCard key={row.report._id} row={row} />
      ))}
    </section>
  );
}

function ReportCard({ row }: { row: ReportRow }) {
  const review = useMutation(api.moderation.review);
  const [busy, setBusy] = useState(false);

  async function resolve(status: "reviewed" | "dismissed") {
    setBusy(true);
    try {
      await review({
        reportId: row.report._id,
        status,
        resolutionNote:
          status === "reviewed"
            ? "Reviewed from the moderation queue."
            : "Dismissed from the moderation queue.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-[24px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Pill>{row.report.targetType}</Pill>
          <Pill>{row.report.status}</Pill>
        </div>
        <span className="text-sm text-stone-600">
          Reporter: @{row.reporter?.username ?? "unknown"}
        </span>
      </div>
      <h3 className="mt-3 text-xl font-semibold">{row.report.reason}</h3>
      <p className="mt-2 text-stone-700">{row.report.details || "No extra details."}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        Target: {row.report.targetId}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="button-dark" disabled={busy} onClick={() => void resolve("reviewed")}>
          <CheckCircle2 className="size-4" />
          Mark reviewed
        </button>
        <button className="button-light" disabled={busy} onClick={() => void resolve("dismissed")}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ProfileView({
  bundle,
  username,
  me,
}: {
  bundle: ProfileBundle | null;
  username?: string;
  me: Profile | null;
}) {
  const followers = useQuery(
    api.social.followers,
    bundle ? { profileId: bundle.author._id } : "skip",
  ) ?? [];
  const following = useQuery(
    api.social.following,
    bundle ? { profileId: bundle.author._id } : "skip",
  ) ?? [];

  if (!bundle) {
    return <EmptyState title={`@${username ?? "writer"} is not here yet`} body="Try another profile or discover new writers." />;
  }
  return (
    <section className="flex flex-col gap-5">
      <div className="glass-strong rounded-[32px] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar profile={bundle.author} large />
          <div>
            <h1 className="text-4xl font-semibold">{bundle.author.displayName}</h1>
            <p className="mt-1 font-semibold text-stone-600">@{bundle.author.username}</p>
            <p className="mt-3 max-w-2xl leading-7 text-stone-700">{bundle.author.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <FollowButton target={bundle.author} me={me} />
              <SafetyActions targetType="profile" targetId={bundle.author._id} targetProfile={bundle.author} me={me} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Pill>{bundle.author.followersCount} followers</Pill>
          <Pill>{bundle.author.followingCount} following</Pill>
          <Pill>{bundle.author.postsCount} posts</Pill>
          <Pill>{bundle.author.writingStreak} day streak</Pill>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <SocialList title="Followers" profiles={followers} />
          <SocialList title="Following" profiles={following} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {bundle.posts.map((post) => (
          <PostCard key={post._id} item={{ post, author: bundle.author }} me={me} />
        ))}
      </div>
    </section>
  );
}

function AuthPanel({ me }: { me: Profile | null }) {
  const { isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const ensure = useMutation(api.profiles.ensure);
  const authStatus = useQuery(api.profiles.authStatus);
  const [email, setEmail] = useState("writer@storystream.test");
  const [password, setPassword] = useState("storystream");
  const [username, setUsername] = useState("new_writer");
  const [busy, setBusy] = useState(false);
  const [shouldCreateProfile, setShouldCreateProfile] = useState(false);

  useEffect(() => {
    if (!authStatus?.authenticated || me || !shouldCreateProfile) {
      return;
    }
    let cancelled = false;
    ensure({
      username,
      displayName: username.replace(/_/g, " "),
      bio: "Writing my way into the stream.",
      avatarUrl: null,
      favoriteGenres: ["Poetry", "Fantasy"],
    })
      .then(() => {
        if (!cancelled) {
          setShouldCreateProfile(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus?.authenticated, ensure, me, shouldCreateProfile, username]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      try {
        await signIn("password", { email, password, flow: "signUp" });
      } catch {
        await signIn("password", { email, password, flow: "signIn" });
      }
      setShouldCreateProfile(true);
    } finally {
      setBusy(false);
    }
  }

  if (me) {
    return (
      <div className="glass rounded-[28px] p-5">
        <div className="flex items-center gap-3">
          <Avatar profile={me} />
          <div>
            <div className="font-semibold">{me.displayName}</div>
            <div className="text-sm text-stone-600">@{me.username}</div>
          </div>
        </div>
        <button className="button-light mt-4 w-full" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-[28px] p-5">
      <h2 className="text-xl font-semibold">Join StoryStream</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">
        Password auth is local and Convex-backed.
      </p>
      <TextInput label="Email" value={email} onChange={setEmail} />
      <TextInput label="Password" value={password} onChange={setPassword} type="password" />
      <TextInput label="Username" value={username} onChange={setUsername} />
      <button className="button-dark mt-4 w-full" disabled={busy || isAuthenticated === undefined}>
        <UserRound className="size-4" />
        {busy
          ? "Creating..."
          : authStatus?.authenticated
            ? "Finish profile"
            : isAuthenticated
              ? "Refresh sign-in"
              : "Create profile"}
      </button>
      {isAuthenticated && !me && (
        <button
          type="button"
          className="button-light mt-3 w-full"
          onClick={() => void signOut()}
        >
          Reset sign-in
        </button>
      )}
    </form>
  );
}

function TokenPanel({ me }: { me: Profile | null }) {
  return (
    <div className="glass fluted rounded-[28px] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-600">
        <Sparkles className="size-4 text-amber-700" />
        StoryTokens
      </div>
      <div className="mt-3 text-4xl font-semibold">{me?.tokenBalance ?? 0}</div>
      <p className="mt-3 text-sm leading-6 text-stone-700">
        Earn tokens by writing posts, publishing chapters, and leaving thoughtful comments.
      </p>
    </div>
  );
}

function WritersPanel({ writers, me }: { writers: Profile[]; me: Profile | null }) {
  return (
    <div className="glass rounded-[28px] p-5">
      <h2 className="font-semibold">Writers to read</h2>
      <div className="mt-4 flex flex-col gap-3">
        {writers.slice(0, 5).map((writer) => (
          <div key={writer._id} className="rounded-2xl p-2 hover:bg-white/70">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${writer.username}`}>
                <Avatar profile={writer} />
              </Link>
              <Link href={`/profile/${writer.username}`} className="min-w-0 flex-1">
                <div className="truncate font-semibold">{writer.displayName}</div>
                <div className="text-sm text-stone-600">@{writer.username}</div>
              </Link>
            </div>
            <div className="mt-2">
              <FollowButton target={writer} me={me} compact />
            </div>
          </div>
        ))}
        {writers.length === 0 && (
          <p className="text-sm leading-6 text-stone-600">No new writers to suggest right now.</p>
        )}
      </div>
    </div>
  );
}

function PostCard({ item, me }: { item: FeedPost; me: Profile | null }) {
  const like = useMutation(api.social.togglePostLike);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    setBusy(true);
    try {
      await like({ postId: item.post._id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="glass rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/profile/${item.author.username}`} className="flex items-center gap-3">
          <Avatar profile={item.author} />
          <span className="font-semibold">@{item.author.username}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Pill>{item.post.visibility}</Pill>
          <SafetyActions targetType="post" targetId={item.post._id} targetProfile={item.author} me={me} />
        </div>
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">{item.post.title}</h3>
      <p className="mt-3 leading-7 text-stone-700">{item.post.excerpt}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Pill>{item.post.genre}</Pill>
          <Pill>{item.post.kind}</Pill>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FollowButton target={item.author} me={me} compact />
          <button
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold disabled:opacity-60"
            onClick={() => void toggleLike()}
            disabled={!me || busy}
          >
            <Heart className="size-4" />
            {item.post.likesCount}
          </button>
        </div>
      </div>
      <CommentsPanel targetType="post" targetId={item.post._id} count={item.post.commentsCount} me={me} />
    </article>
  );
}

function DigestCard({ item, me }: { item: DigestItem; me: Profile | null }) {
  if (item.type === "chapter" && item.chapter && item.book) {
    return (
      <article className="glass rounded-[28px] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/profile/${item.author.username}`} className="flex items-center gap-3">
            <Avatar profile={item.author} />
            <span className="font-semibold">@{item.author.username}</span>
          </Link>
          <Pill>New chapter</Pill>
        </div>
        <ChapterCard chapter={item.chapter} author={item.author} book={item.book} me={me} />
      </article>
    );
  }
  if (item.post) {
    return <PostCard item={{ post: item.post, author: item.author }} me={me} />;
  }
  return null;
}

function ChapterCard({
  chapter,
  author,
  book,
  me,
}: {
  chapter: Chapter;
  author: Profile;
  book: DraftBook;
  me: Profile | null;
}) {
  const like = useMutation(api.social.toggleChapterLike);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    setBusy(true);
    try {
      await like({ chapterId: chapter._id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pill>{book.title}</Pill>
        <Link href={`/profile/${author.username}`} className="text-sm font-semibold text-stone-600">
          @{author.username}
        </Link>
      </div>
      <h4 className="mt-3 text-xl font-semibold">
        Chapter {chapter.chapterNumber}: {chapter.title}
      </h4>
      <p className="mt-2 leading-7 text-stone-700">{chapter.excerpt}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={!me || busy}
          onClick={() => void toggleLike()}
        >
          <Heart className="size-4" />
          {chapter.likesCount}
        </button>
        <SafetyActions targetType="chapter" targetId={chapter._id} targetProfile={author} me={me} />
      </div>
      <CommentsPanel targetType="chapter" targetId={chapter._id} count={chapter.commentsCount} me={me} />
    </div>
  );
}

function FollowButton({
  target,
  me,
  compact = false,
}: {
  target: Profile;
  me: Profile | null;
  compact?: boolean;
}) {
  const relationship = useQuery(
    api.social.relationshipTo,
    me ? { profileId: target._id } : "skip",
  );
  const follow = useMutation(api.social.follow);
  const unfollow = useMutation(api.social.unfollow);
  const unblock = useMutation(api.social.unblock);
  const [busy, setBusy] = useState(false);

  if (!me) {
    return (
      <button className={compact ? "mini-button" : "button-light"} disabled>
        Sign in
      </button>
    );
  }
  if (me._id === target._id || relationship?.isSelf) {
    return (
      <span className={compact ? "mini-button" : "button-light"}>
        <CheckCircle2 className="size-4" />
        You
      </span>
    );
  }

  async function toggleFollow() {
    setBusy(true);
    try {
      if (relationship?.isBlocked) {
        await unblock({ profileId: target._id });
      } else if (relationship?.isFollowing) {
        await unfollow({ profileId: target._id });
      } else {
        await follow({ profileId: target._id });
      }
    } finally {
      setBusy(false);
    }
  }

  const label = relationship?.isBlocked
    ? "Unblock"
    : relationship?.isFollowing
      ? "Following"
      : relationship?.followsYou
        ? "Follow back"
        : "Follow";
  const Icon = relationship?.isFollowing ? UserMinus : UserPlus;

  return (
    <button
      className={compact ? "mini-button" : "button-dark"}
      onClick={() => void toggleFollow()}
      disabled={busy || relationship?.isBlockedBy}
    >
      <Icon className="size-4" />
      {busy ? "Working..." : relationship?.isBlockedBy ? "Unavailable" : label}
    </button>
  );
}

function SafetyActions({
  targetType,
  targetId,
  targetProfile,
  me,
}: {
  targetType: "post" | "chapter" | "comment" | "profile";
  targetId: string;
  targetProfile: Profile;
  me: Profile | null;
}) {
  const relationship = useQuery(
    api.social.relationshipTo,
    me ? { profileId: targetProfile._id } : "skip",
  );
  const report = useMutation(api.social.report);
  const block = useMutation(api.social.block);
  const unblock = useMutation(api.social.unblock);
  const mute = useMutation(api.social.mute);
  const unmute = useMutation(api.social.unmute);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (!me || me._id === targetProfile._id) {
    return null;
  }

  async function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await report({ targetType, targetId, reason, details });
      setReason("");
      setDetails("");
      setReporting(false);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function toggleMute() {
    setBusy(true);
    try {
      if (relationship?.isMuted) {
        await unmute({ profileId: targetProfile._id });
      } else {
        await mute({ profileId: targetProfile._id });
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock() {
    setBusy(true);
    try {
      if (relationship?.isBlocked) {
        await unblock({ profileId: targetProfile._id });
      } else {
        await block({ profileId: targetProfile._id });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        className="grid size-9 place-items-center rounded-full bg-white/70 text-stone-700"
        onClick={() => setOpen((value) => !value)}
        aria-label="Safety actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-3xl border border-white/70 bg-white/90 p-3 shadow-2xl backdrop-blur">
          {!reporting ? (
            <div className="flex flex-col gap-2">
              <button className="safety-button" onClick={() => setReporting(true)}>
                <Flag className="size-4" />
                Report {targetType}
              </button>
              <button className="safety-button" disabled={busy} onClick={() => void toggleMute()}>
                <VolumeX className="size-4" />
                {relationship?.isMuted ? "Unmute writer" : "Mute writer"}
              </button>
              <button className="safety-button text-rose-800" disabled={busy} onClick={() => void toggleBlock()}>
                <Ban className="size-4" />
                {relationship?.isBlocked ? "Unblock writer" : "Block writer"}
              </button>
            </div>
          ) : (
            <form onSubmit={sendReport}>
              <TextInput label="Reason" value={reason} onChange={setReason} />
              <TextArea label="Details" value={details} onChange={setDetails} />
              <button className="button-dark mt-4 w-full" disabled={busy || reason.trim().length < 2}>
                <Send className="size-4" />
                Send report
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function CommentsPanel({
  targetType,
  targetId,
  count,
  me,
}: {
  targetType: "post" | "chapter";
  targetId: Id<"posts"> | Id<"chapters">;
  count: number;
  me: Profile | null;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const postComments = useQuery(
    api.social.commentsForPost,
    open && targetType === "post" ? { postId: targetId as Id<"posts"> } : "skip",
  );
  const chapterComments = useQuery(
    api.social.commentsForChapter,
    open && targetType === "chapter" ? { chapterId: targetId as Id<"chapters"> } : "skip",
  );
  const addPostComment = useMutation(api.social.addCommentToPost);
  const addChapterComment = useMutation(api.social.addCommentToChapter);
  const comments = targetType === "post" ? postComments : chapterComments;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (targetType === "post") {
        await addPostComment({ postId: targetId as Id<"posts">, body });
      } else {
        await addChapterComment({ chapterId: targetId as Id<"chapters">, body });
      }
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-white/60 pt-4">
      <button
        className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle className="size-4" />
        {count} comments
      </button>
      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {!me && (
            <p className="rounded-2xl bg-white/60 p-3 text-sm text-stone-600">
              Sign in to join the conversation.
            </p>
          )}
          {me && (
            <form onSubmit={submit} className="flex flex-col gap-2">
              <textarea
                className="min-h-24 resize-y rounded-2xl border border-white/70 bg-white/72 px-4 py-3 text-sm leading-6 outline-none focus:border-teal-700"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Add something thoughtful..."
              />
              <button className="button-dark self-start" disabled={busy || body.trim().length === 0}>
                <Send className="size-4" />
                {busy ? "Sending..." : "Comment"}
              </button>
            </form>
          )}
          {comments === undefined && <p className="text-sm text-stone-600">Loading comments...</p>}
          {comments?.length === 0 && <p className="text-sm text-stone-600">No comments yet.</p>}
          {comments?.map(({ comment, author }) => (
            <div key={comment._id} className="rounded-2xl bg-white/60 p-3">
              <div className="flex items-center gap-2">
                <Avatar profile={author} />
                <Link href={`/profile/${author.username}`} className="font-semibold">
                  @{author.username}
                </Link>
              </div>
              <p className="mt-2 leading-6 text-stone-700">{comment.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialList({ title, profiles }: { title: string; profiles: Profile[] }) {
  return (
    <div className="rounded-2xl bg-white/55 p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {profiles.slice(0, 8).map((profile) => (
          <Link
            key={profile._id}
            href={`/profile/${profile.username}`}
            className="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-700"
          >
            @{profile.username}
          </Link>
        ))}
        {profiles.length === 0 && <span className="text-sm text-stone-600">Quiet for now.</span>}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <div className="glass-strong rounded-[28px] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-stone-600">
        {icon}
        {eyebrow}
      </div>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

function LibraryList({ title, items }: { title: string; items: DraftPost[] }) {
  return (
    <div className="glass rounded-[28px] p-5">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-4 flex flex-col gap-3">
        {items.length === 0 && <p className="text-stone-600">No pieces yet.</p>}
        {items.map((post) => (
          <div key={post._id} className="rounded-2xl bg-white/60 p-3">
            <div className="font-semibold">{post.title}</div>
            <div className="text-sm text-stone-600">{post.status} / {post.visibility}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookList({ title, books }: { title: string; books: DraftBook[] }) {
  return (
    <div className="glass rounded-[28px] p-5">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="mt-4 flex flex-col gap-3">
        {books.length === 0 && <p className="text-stone-600">No books yet.</p>}
        {books.map((book) => (
          <div key={book._id} className="rounded-2xl bg-white/60 p-3">
            <div className="font-semibold">{book.title}</div>
            <div className="text-sm text-stone-600">{book.chaptersCount} chapters</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass rounded-[28px] p-6">
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-2 leading-7 text-stone-700">{body}</p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <input
        className="mt-2 w-full rounded-2xl border border-white/70 bg-white/72 px-4 py-3 outline-none focus:border-teal-700"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      <textarea
        className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-white/70 bg-white/72 px-4 py-3 leading-7 outline-none focus:border-teal-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: typeof Lock }[];
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-[22px] bg-white/50 p-1">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-2 rounded-[18px] px-2 py-3 text-sm font-semibold ${
              value === option.value ? "bg-stone-950 text-white" : "text-stone-700"
            }`}
          >
            <Icon className="size-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/72 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-700">
      {children}
    </span>
  );
}

function Avatar({ profile, large = false }: { profile: Profile; large?: boolean }) {
  const initials = profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl bg-stone-950 font-semibold text-white ${
        large ? "size-20 text-2xl" : "size-10 text-sm"
      }`}
    >
      {initials}
    </span>
  );
}

type Profile = {
  _id: Id<"profiles">;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  favoriteGenres: string[];
  tokenBalance: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  booksCount: number;
  writingStreak: number;
  isAdmin: boolean;
};

type DraftPost = {
  _id: Id<"posts">;
  title: string;
  kind: string;
  excerpt: string;
  genre: string;
  visibility: "private" | "followers" | "public";
  status: "draft" | "published" | "archived";
  likesCount: number;
  commentsCount: number;
};

type DraftBook = {
  _id: Id<"books">;
  title: string;
  description: string;
  genres: string[];
  visibility: "private" | "followers" | "public";
  chaptersCount: number;
  subscribersCount: number;
};

type Chapter = {
  _id: Id<"chapters">;
  bookId: Id<"books">;
  chapterNumber: number;
  title: string;
  excerpt: string;
  visibility: "private" | "followers" | "public";
  status: "draft" | "published" | "archived";
  likesCount: number;
  commentsCount: number;
};

type FeedPost = {
  post: DraftPost;
  author: Profile;
};

type FeedBook = {
  book: DraftBook;
  author: Profile;
  chapters: Chapter[];
};

type DigestItem =
  | {
      type: "post";
      createdAt: number;
      post: DraftPost;
      author: Profile;
      chapter?: never;
      book?: never;
    }
  | {
      type: "chapter";
      createdAt: number;
      chapter: Chapter;
      book: DraftBook;
      author: Profile;
      post?: never;
    };

type ProfileBundle = {
  author: Profile;
  posts: DraftPost[];
};

type ReportRow = {
  report: {
    _id: Id<"reports">;
    targetType: "post" | "chapter" | "comment" | "profile";
    targetId: string;
    reason: string;
    details: string;
    status: "open" | "reviewed" | "dismissed";
  };
  reporter: Profile | null;
};
