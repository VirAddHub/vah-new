/** Original architectural illustration; conceptual, not a depiction of our premises. */
export function LondonIllustration({
  variant = 'address',
}: {
  variant?: 'address' | 'mail' | 'privacy';
}) {
  return (
    <svg
      viewBox="0 0 640 500"
      role="img"
      aria-label={
        variant === 'mail'
          ? 'Illustration of letters becoming digital documents'
          : variant === 'privacy'
            ? 'Illustration of a protected business address'
            : 'Conceptual illustration of a London business building and letters'
      }
    >
      <circle cx="345" cy="230" r="208" fill="#dce9dc" />
      <circle cx="510" cy="100" r="38" fill="#e8be70" />
      <path d="M45 434H600M75 447H565" stroke="#123d30" strokeWidth="2" />
      <g stroke="#123d30" strokeWidth="3" strokeLinejoin="round">
        <path d="M195 430V147L332 80L470 147V430Z" fill="#f8f5ed" />
        <path d="M181 155L332 80L484 155M220 140H445M195 185H470" fill="none" />
        {[222, 296, 370].map((x) =>
          [205, 280].map((y) => (
            <g key={`${x}-${y}`}>
              <path d={`M${x} ${y + 51}v-32a23 23 0 0 1 46 0v32Z`} fill="#b8d1bc" />
              <path d={`M${x + 23} ${y - 3}v54M${x} ${y + 20}h46`} fill="none" />
            </g>
          )),
        )}
        <path d="M294 430v-62a36 36 0 0 1 72 0v62" fill="#123d30" />
        <path d="M330 343v87" stroke="#f8f5ed" />
        <circle cx="343" cy="394" r="3" fill="#e8be70" />
        <path d="M180 430h305M188 415h98M374 415h105" />
        <path d="M105 427v-91m-24 50c-50-50 22-86 24-26 26-61 75-3 0 42" fill="#82ad8e" />
        <g transform="translate(435 282) rotate(12)">
          <rect width="143" height="98" rx="5" fill="#fff" />
          <path d="m0 0 71 53L143 0M0 98l47-44m96 44-47-44" fill="none" />
          <rect x="105" y="12" width="20" height="25" fill="#e8be70" />
        </g>
        <g transform="translate(55 165) rotate(-12)">
          <rect width="125" height="86" rx="5" fill="#fff" />
          <path d="m0 0 62 47L125 0" fill="none" />
        </g>
        {variant === 'mail' && (
          <g transform="translate(400 65)">
            <rect width="125" height="168" rx="12" fill="#fff" />
            <path d="M420 70" />
            <path d="M22 35h80M22 55h80M22 75h55" />
            <circle cx="62" cy="135" r="12" fill="#b8d1bc" />
          </g>
        )}
        {variant === 'privacy' && (
          <path
            d="m425 95 60-25 60 25v65c0 35-60 65-60 65s-60-30-60-65Zm30 45 22 22 36-42"
            fill="#fff"
          />
        )}
      </g>
      <path
        d="M118 130C170 52 235 52 270 55M487 235c51-28 79-10 95 18"
        stroke="#123d30"
        strokeWidth="2"
        strokeDasharray="5 8"
        fill="none"
      />
    </svg>
  );
}
