/** Avatar que prioriza foto real e faz fallback gracioso para emoji */
interface Props {
  emoji: string;
  name?: string;
  photoURL?: string;
  size?: number;
  ring?: boolean;
}

export function MemberAvatar({ emoji, name, photoURL, size = 24, ring = false }: Props) {
  const ringClass = ring ? "ring-2 ring-background" : "";

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name ?? "Membro"}
        title={name}
        width={size}
        height={size}
        className={`rounded-full object-cover ${ringClass}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      title={name}
      className={`rounded-full bg-surface flex items-center justify-center select-none ${ringClass}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55), lineHeight: 1 }}
    >
      {emoji}
    </div>
  );
}
