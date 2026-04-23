interface IconProps {
  d: string;
  size?: number;
  className?: string;
}

export function Icon({ d, size = 20, className }: IconProps) {
  const paths = d.split(/\s(?=M)/);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
