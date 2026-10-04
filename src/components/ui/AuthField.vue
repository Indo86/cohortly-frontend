<template>
  <!-- The Cohort Line routes behind the sign-in panel. The animation (flowing dashes, travelling light pulses,
       breathing stations) is CSS only and stops under reduced motion. -->
  <svg viewBox="0 0 540 760" preserveAspectRatio="xMidYMid slice" class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
    <g transform="translate(0,80)" fill="none" stroke-width="2" stroke-linejoin="round">
      <g stroke="var(--shell-800)">
        <path d="M-20 520H120L200 440H400L460 380H560" /><path d="M-20 600H60L140 680H360L440 600H560" /><path d="M80 800V640L220 500V300L300 220H560" /><path d="M-80 430H50L170 550V780" />
      </g>
      <g class="bg-anim bg-flow" stroke="var(--shell-muted)" stroke-dasharray="3 15" opacity="0.28">
        <path d="M-20 520H120L200 440H400L460 380H560" /><path d="M-20 600H60L140 680H360L440 600H560" /><path d="M80 800V640L220 500V300L300 220H560" />
      </g>
      <path d="M-20 360H100L180 280H340L420 360V560L480 620H560" stroke="var(--primary)" stroke-width="3" />
      <path class="bg-anim bg-pulse-a" d="M-20 360H100L180 280H340L420 360V560L480 620H560" stroke="#E9E6FF" stroke-width="3" stroke-linecap="round" stroke-dasharray="90 1300" stroke-dashoffset="1390" />
      <path class="bg-anim bg-pulse-b" d="M80 800V640L220 500V300L300 220H560" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="70 1320" stroke-dashoffset="1390" />
      <g fill="var(--shell-800)" stroke="none"><circle cx="120" cy="520" r="6" /><circle cx="400" cy="440" r="6" /><circle cx="140" cy="680" r="6" /><circle cx="360" cy="680" r="6" /><circle cx="220" cy="300" r="6" /></g>
      <g fill="var(--primary)" stroke="none"><circle cx="100" cy="360" r="7" /><circle cx="340" cy="280" r="7" /></g>
      <g stroke="none">
        <circle class="bg-anim bg-halo bg-d1" cx="180" cy="280" r="10" fill="var(--primary)" /><circle cx="180" cy="280" r="7" fill="var(--primary)" />
        <circle class="bg-anim bg-halo bg-d3" cx="220" cy="500" r="9" fill="var(--shell-muted)" /><circle cx="220" cy="500" r="6" fill="var(--shell-800)" />
        <circle class="bg-anim bg-halo bg-d2" cx="420" cy="460" r="12" fill="var(--accent)" /><circle cx="420" cy="460" r="16" fill="var(--accent)" opacity="0.3" /><circle cx="420" cy="460" r="8" fill="var(--accent)" />
      </g>
      <circle cx="480" cy="620" r="7" stroke="var(--primary)" />
    </g>
  </svg>
</template>
