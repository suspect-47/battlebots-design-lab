/**
 * Toro — a chibi cartoon bull mascot: red head, cream curved horns, big cheerful
 * grin with a lolling tongue, wide glossy eyes, and a blue tee. Hand-built as SVG.
 *
 * `scene`  — draw the circular pastel background badge (sky/sun/hills).
 * `animate` — idle bob + eye blink.
 * `talking` — flap the mouth while thinking.
 * `expression` — 'happy' | 'wink' | 'surprised'.
 */
export default function BullAvatar({
  size = 72,
  scene = true,
  animate = true,
  talking = false,
  expression = 'happy',
  className = '',
}) {
  const ink = '#3a2a24'
  const red = '#d8452f'
  const redDark = '#b8371f'
  const muzzle = '#e56d54'
  const horn = '#f0e6d0'
  const shirt = '#8fc0cf'
  const shirtDark = '#6fa6b8'
  const tongue = '#e2637a'
  const mouthDark = '#7a2a28'
  // when there's no scene circle to clip against, scale the character in so the
  // horns aren't cut by the viewBox edge.
  const fit = scene ? undefined : 'translate(120 124) scale(0.82) translate(-120 -124)'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label="Toro, a cheerful cartoon bull"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="toro-badge">
          <circle cx="120" cy="120" r="112" />
        </clipPath>
      </defs>

      {/* ---------- circular scene ---------- */}
      {scene && (
        <g clipPath="url(#toro-badge)">
          <rect x="0" y="0" width="240" height="240" fill="#dbe6e2" />
          <circle cx="212" cy="116" r="24" fill="#f6e68c" />
          <path d="M0 172 Q60 154 120 170 T240 166 V240 H0 Z" fill="#bcd49a" />
          <path d="M0 194 Q70 176 140 194 T240 190 V240 H0 Z" fill="#a9c77e" />
          <g fill="#ffffff" stroke={ink} strokeWidth="1.6">
            <g transform="translate(44,72)"><ellipse cx="0" cy="0" rx="14" ry="8" /><ellipse cx="12" cy="2" rx="9" ry="6" /></g>
            <g transform="translate(70,120)"><ellipse cx="0" cy="0" rx="11" ry="6.5" /><ellipse cx="10" cy="1" rx="7" ry="5" /></g>
          </g>
        </g>
      )}

      {/* ---------- character ---------- */}
      <g transform={fit}>
      <g className={animate ? 'bull-bob' : ''} style={{ transformOrigin: '120px 130px' }}>

        {/* ---- BIG muscular double-biceps flex (behind head) ---- */}
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* ink outline layer under the red muscle tubes */}
          <g stroke={ink} strokeWidth="26" fill="none">
            <path d="M84 186 L32 182" /><path d="M32 182 L50 132" />
            <path d="M156 186 L208 182" /><path d="M208 182 L190 132" />
          </g>
          {/* red upper-arm + forearm tubes */}
          <g stroke={red} strokeWidth="20" fill="none">
            <path d="M84 186 L32 182" /><path d="M32 182 L50 132" />
            <path d="M156 186 L208 182" /><path d="M208 182 L190 132" />
          </g>
          {/* huge bicep peaks */}
          <circle cx="46" cy="160" r="20" fill={red} stroke={ink} strokeWidth="3" />
          <circle cx="194" cy="160" r="20" fill={red} stroke={ink} strokeWidth="3" />
          {/* bicep highlight */}
          <path d="M36 156 q8 -12 20 -9" fill="none" stroke={ink} strokeWidth="2.4" opacity="0.4" />
          <path d="M204 156 q-8 -12 -20 -9" fill="none" stroke={ink} strokeWidth="2.4" opacity="0.4" />
          {/* fists raised beside the head */}
          <circle cx="50" cy="128" r="17" fill={red} stroke={ink} strokeWidth="3" />
          <circle cx="190" cy="128" r="17" fill={red} stroke={ink} strokeWidth="3" />
          {/* knuckle lines */}
          <path d="M40 124 q10 -6 20 0" fill="none" stroke={ink} strokeWidth="2.4" opacity="0.5" />
          <path d="M180 124 q10 -6 20 0" fill="none" stroke={ink} strokeWidth="2.4" opacity="0.5" />
        </g>

        {/* ---- shirt / broad chest (behind head) ---- */}
        <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
          {/* wider, buff torso */}
          <path d="M66 186 Q120 168 174 186 L184 224 Q120 236 56 224 Z" fill={shirt} />
          {/* pec split */}
          <path d="M120 182 L120 206" fill="none" strokeWidth="2.4" opacity="0.45" />
          <path d="M92 190 Q104 200 118 194" fill="none" strokeWidth="2.2" opacity="0.4" />
          <path d="M148 190 Q136 200 122 194" fill="none" strokeWidth="2.2" opacity="0.4" />
          {/* collar V */}
          <path d="M102 182 Q120 198 138 182 L134 194 Q120 204 106 194 Z" fill={shirtDark} />
          {/* sleeve caps over the shoulders */}
          <path d="M70 188 Q90 180 96 200 Q84 210 66 202 Z" fill={shirtDark} />
          <path d="M170 188 Q150 180 144 200 Q156 210 174 202 Z" fill={shirtDark} />
        </g>

        {/* ---- horns (behind head) ---- */}
        <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <path d="M96 88 Q76 86 64 66 Q54 50 58 40 Q68 44 76 60 Q88 76 102 84 Z" fill={horn} />
          <path d="M144 88 Q164 86 176 66 Q186 50 182 40 Q172 44 164 60 Q152 76 138 84 Z" fill={horn} />
          <path d="M94 84 Q80 76 70 62" fill="none" strokeWidth="1.8" opacity="0.45" />
          <path d="M146 84 Q160 76 170 62" fill="none" strokeWidth="1.8" opacity="0.45" />
        </g>

        {/* ---- ears (behind head) ---- */}
        <g stroke={ink} strokeWidth="3" strokeLinejoin="round">
          <path d="M86 108 Q58 100 54 122 Q64 136 92 126 Z" fill={redDark} />
          <path d="M154 108 Q182 100 186 122 Q176 136 148 126 Z" fill={redDark} />
        </g>

        {/* ---- head ---- */}
        <path
          d="M84 98 C78 84 94 76 120 76 C146 76 162 84 156 98 C168 112 168 134 155 148 C149 170 137 180 120 181 C103 180 91 170 85 148 C72 134 72 112 84 98 Z"
          fill={red} stroke={ink} strokeWidth="3.5" strokeLinejoin="round"
        />

        {/* ---- tuft between horns ---- */}
        <path d="M104 84 Q108 60 116 78 Q120 56 124 78 Q132 60 136 84 Z" fill={redDark} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />

        {/* ---- muzzle ---- */}
        <ellipse cx="120" cy="152" rx="37" ry="27" fill={muzzle} stroke={ink} strokeWidth="3" />
        {/* nostrils */}
        <g fill={mouthDark}>
          <ellipse cx="105" cy="145" rx="4.6" ry="6.2" transform="rotate(-12 105 145)" />
          <ellipse cx="135" cy="145" rx="4.6" ry="6.2" transform="rotate(12 135 145)" />
        </g>

        {/* ---- eyes (blink + expression) ---- */}
        <g className={animate && expression !== 'wink' ? 'bull-eyes' : ''} style={{ transformOrigin: '120px 116px' }}>
          {/* left eye */}
          <g>
            <ellipse cx="102" cy="116" rx={expression === 'surprised' ? 16 : 14.5} ry={expression === 'surprised' ? 19 : 17} fill="#fff" stroke={ink} strokeWidth="3" />
            <circle cx="105" cy="120" r={expression === 'surprised' ? 6.5 : 7.5} fill="#2a211d" />
            <circle cx="102" cy="116" r="2.6" fill="#fff" />
          </g>
          {/* right eye — happy closed arc when winking */}
          {expression === 'wink' ? (
            <path d="M126 118 q12 -9 24 0" fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
          ) : (
            <g>
              <ellipse cx="138" cy="116" rx={expression === 'surprised' ? 16 : 14.5} ry={expression === 'surprised' ? 19 : 17} fill="#fff" stroke={ink} strokeWidth="3" />
              <circle cx="135" cy="120" r={expression === 'surprised' ? 6.5 : 7.5} fill="#2a211d" />
              <circle cx="132" cy="116" r="2.6" fill="#fff" />
            </g>
          )}
        </g>
        {/* eyebrows — raised, cheerful */}
        <path d="M86 94 q10 -7 22 -3" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <path d="M132 91 q12 -4 22 3" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />

        {/* ---- mouth — flaps when thinking, else grins ---- */}
        {talking ? (
          <ellipse className="bull-talk" cx="120" cy="166" rx="9" ry="7" fill={mouthDark} style={{ transformOrigin: '120px 166px' }} />
        ) : expression === 'surprised' ? (
          <ellipse cx="120" cy="167" rx="7" ry="8.5" fill={mouthDark} stroke={ink} strokeWidth="2.4" />
        ) : (
          <g stroke={ink} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" fill="none">
            {/* closed friendly smile */}
            <path d="M102 161 Q120 174 138 161" />
            {/* soft dimple ends */}
            <path d="M102 161 q-2 3 -1 5" strokeWidth="2.4" />
            <path d="M138 161 q2 3 1 5" strokeWidth="2.4" />
          </g>
        )}
      </g>
      </g>
    </svg>
  )
}
