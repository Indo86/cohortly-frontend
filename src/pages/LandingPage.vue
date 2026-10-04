<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { R } from '@/constants/routes.js'
import SkipLink from '@/components/ui/SkipLink.vue'

// The public landing page, ported from the approved design export (Cohortly Landing Page). The markup, copy
// and the CSS-only animations are the design's; the links go to the real sign-in, register and
// certificate-verification pages. Pricing is deliberately generic: the product has a single monthly
// workspace plan and its price is shown in Plan & Billing.

// Scroll reveal: each section below the hero fades and rises in once as it enters the viewport. The hidden
// state is only applied from here, so without JS (or with reduced motion) everything simply stays visible.
let observer = null
onMounted(() => {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const targets = document.querySelectorAll('.lp-root main > section > *, .lp-root > footer > *')
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('lp-in')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  targets.forEach((el, i) => {
    el.classList.add('lp-reveal')
    el.style.transitionDelay = ((i % 3) * 80) + 'ms'
    observer.observe(el)
  })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="lp-root" style="font-family: 'Instrument Sans', 'Segoe UI', system-ui, sans-serif; color: #14172B; background: #F4F2EC; font-size: 16px; line-height: 26px;">
    <SkipLink />

<!-- ================= HERO (navy shell) ================= -->
<header class="lp-dark" style="position: relative; overflow: hidden; background: #0A0E24; color: #EEF0FA;">
  <!-- Animated background: Cohort Line routes in the side gutters and under the stage. Light pulses travel the routes, stations breathe. All CSS; off under reduced motion. -->
  <svg aria-hidden="true" viewBox="0 0 1440 1120" preserveAspectRatio="xMidYMid slice" style="position: absolute; inset: 0; width: 100%; height: 100%;">
    <!-- base routes -->
    <g fill="none" stroke-width="2" stroke-linejoin="round" stroke="#262E5A">
      <path d="M-20 420 L60 420 L140 500 L140 760 L-20 920" />
      <path d="M1460 140 L1320 140 L1240 220 L1240 480 L1320 560 L1320 1140" />
      <path d="M1460 380 L1380 380 L1300 460 L1300 700 L1460 860" />
      <path d="M-20 1040 L260 1040 L340 960 L1100 960 L1180 1040 L1460 1040" />
    </g>
    <path d="M-20 180 L120 180 L200 260 L200 520 L120 600 L120 1140" fill="none" stroke="#4A3AE0" stroke-width="3" stroke-linejoin="round" />
    <!-- flowing dashes over the navy routes -->
    <g class="bg-anim bg-flow" fill="none" stroke="#A3AACB" stroke-width="2" stroke-linejoin="round" opacity="0.28" stroke-dasharray="3 15">
      <path d="M-20 420 L60 420 L140 500 L140 760 L-20 920" />
      <path d="M1460 380 L1380 380 L1300 460 L1300 700 L1460 860" />
      <path d="M-20 1040 L260 1040 L340 960 L1100 960 L1180 1040 L1460 1040" />
    </g>
    <!-- travelling light pulses -->
    <path class="bg-anim bg-pulse-a" d="M-20 180 L120 180 L200 260 L200 520 L120 600 L120 1140" fill="none" stroke="#E9E6FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="90 1300" stroke-dashoffset="1390" />
    <path class="bg-anim bg-pulse-b" d="M1460 140 L1320 140 L1240 220 L1240 480 L1320 560 L1320 1140" fill="none" stroke="#F0A532" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70 1320" stroke-dashoffset="1390" />
    <!-- stations -->
    <g fill="#262E5A"><circle cx="140" cy="500" r="6" /><circle cx="140" cy="760" r="6" /><circle cx="1240" cy="220" r="6" /><circle cx="1300" cy="700" r="6" /><circle cx="340" cy="960" r="6" /><circle cx="1100" cy="960" r="6" /></g>
    <g fill="#4A3AE0"><circle cx="120" cy="180" r="7" /><circle cx="200" cy="520" r="7" /></g>
    <circle class="bg-anim bg-halo bg-d1" cx="200" cy="260" r="10" fill="#4A3AE0" /><circle cx="200" cy="260" r="7" fill="#4A3AE0" />
    <circle class="bg-anim bg-halo bg-d2" cx="1320" cy="560" r="10" fill="#F0A532" /><circle cx="1320" cy="560" r="8" fill="#F0A532" />
    <circle class="bg-anim bg-halo bg-d3" cx="1240" cy="480" r="9" fill="#A3AACB" /><circle cx="1240" cy="480" r="6" fill="#262E5A" />
    <circle class="bg-anim bg-halo bg-d4" cx="120" cy="600" r="9" fill="#4A3AE0" /><circle cx="120" cy="600" r="7" fill="#4A3AE0" />
  </svg>

  <nav class="lp-nav" aria-label="Main" style="position: relative; max-width: 1200px; margin: 0 auto; padding: 24px 32px; display: flex; align-items: center; gap: 32px; flex-wrap: wrap;">
    <a href="#top" style="display: flex; align-items: center; gap: 10px; color: #EEF0FA; text-decoration: none; font-family: Newsreader, Georgia, serif; font-size: 24px; font-weight: 500;">
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 14 L9 8 L15 8" fill="none" stroke="#EEF0FA" stroke-width="1.6" /><circle cx="3" cy="14" r="2.2" fill="#EEF0FA" /><circle cx="9" cy="8" r="2.2" fill="#EEF0FA" /><circle cx="15" cy="8" r="2.6" fill="#F0A532" /></svg>
      Cohortly
    </a>
    <div class="lp-navlinks" style="display: flex; gap: 28px; font-size: 15px; font-weight: 500;">
      <a class="navlink" href="#rooms">Product</a>
      <a class="navlink" href="#how">How it works</a>
      <a class="navlink" href="#certificates">Certificates</a>
      <a class="navlink" href="#pricing">Pricing</a>
      <a class="navlink" href="#faq">FAQ</a>
    </div>
    <div style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
      <details class="si-menu" style="position: relative;">
        <summary class="si-btn" style="height: 44px; padding: 0 14px 0 16px; display: inline-flex; align-items: center; gap: 6px; border-radius: 6px; font-weight: 600; font-size: 15px; color: #EEF0FA;">Sign in
          <svg class="si-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></summary>
        <div style="position: absolute; right: 0; top: 52px; z-index: 20; width: 300px; background: #FFFFFF; color: #14172B; border-radius: 10px; box-shadow: 0 12px 32px -12px rgba(10,14,36,0.45); padding: 8px; text-align: left;">
          <div style="padding: 8px 12px 6px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">SIGN IN AS</div>
          <RouterLink class="si-opt" :to="{ name: R.INSTRUCTOR_SIGN_IN }">
            <span class="si-ic" style="background: #0A0E24; color: #EEF0FA;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg></span>
            <span><b>Instructor</b><small>Manage courses and learners</small></span>
          </RouterLink>
          <RouterLink class="si-opt" :to="{ name: R.STUDENT_SIGN_IN }">
            <span class="si-ic" style="background: #E9E6FF; color: #3626B8;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5" /></svg></span>
            <span><b>Learner</b><small>Continue your courses</small></span>
          </RouterLink>
        </div>
      </details>
      <RouterLink class="btn-primary" :to="{ name: R.REGISTER }" style="height: 44px; padding: 0 18px; display: inline-flex; align-items: center; border-radius: 6px; background: #4A3AE0; text-decoration: none; font-weight: 600; font-size: 15px;">Create a class</RouterLink>
    </div>
  </nav>

  <div id="top" style="position: relative; max-width: 1200px; margin: 0 auto; padding: 56px 32px 96px; display: flex; flex-direction: column; align-items: center; text-align: center;">
    <h1 style="margin: 0; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(48px, 7.4vw, 96px); line-height: 0.98; letter-spacing: -0.025em; color: #EEF0FA;">Build a class.<br><span style="font-style: italic; color: #A3AACB;">Teach your whole team.</span></h1>
    <p style="margin: 24px 0 0; font-size: 18px; line-height: 28px; color: #A3AACB;">Lessons, learners and certificates — one workspace.</p>
    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 32px;">
      <RouterLink class="btn-primary" :to="{ name: R.REGISTER }" style="height: 52px; padding: 0 24px; display: inline-flex; align-items: center; gap: 8px; border-radius: 6px; background: #4A3AE0; text-decoration: none; font-weight: 600; font-size: 16px;">Create your first class
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></RouterLink>
      <a class="btn-ghost-dark" href="#how" style="height: 52px; padding: 0 22px; display: inline-flex; align-items: center; border-radius: 6px; border: 1px solid #262E5A; text-decoration: none; font-weight: 600; font-size: 16px;">See how it works</a>
    </div>

    <!-- ===== Class builder stage: a 12s loop showing a class being made ===== -->
    <div role="img" aria-label="Animation: a class is created, lessons are added, learners join, and a certificate is issued" style="width: 100%; max-width: 1080px; margin-top: 64px; background: #FBFAF6; border-radius: 10px; box-shadow: 0 40px 80px -32px rgba(0,0,0,0.6); overflow: hidden; color: #14172B; text-align: left;">
      <div style="display: flex; align-items: center; gap: 6px; padding: 12px 16px; background: #EAE7DF;">
        <span style="width: 10px; height: 10px; border-radius: 9999px; background: #85827A;" /><span style="width: 10px; height: 10px; border-radius: 9999px; background: #DDD8CC;" /><span style="width: 10px; height: 10px; border-radius: 9999px; background: #DDD8CC;" />
        <span style="margin-left: 12px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #5E6376;">cohortly · new class</span>
      </div>

      <div style="position: relative; padding: 28px 28px 32px;">
        <div style="position: relative; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 28px 24px;">

          <!-- 01 CREATE -->
          <div>
            <div class="cp" aria-hidden="true"><span class="cp-track" /><span class="cp-fill cb cb-seg1" /><span class="cp-dot" style="background: #4A3AE0; border-color: #4A3AE0;" /></div>
            <div class="cp-label"><span class="cp-num">01</span>Create</div>
            <svg class="cb cb-cover" viewBox="0 0 320 240" style="display: block; width: 100%; margin-top: 20px; border-radius: 12px;"><rect width="320" height="240" fill="#2A2290" /><g fill="#C2BCFF" opacity="0.4"><circle cx="40" cy="40" r="2" /><circle cx="80" cy="40" r="2" /><circle cx="120" cy="40" r="2" /><circle cx="160" cy="40" r="2" /><circle cx="200" cy="40" r="2" /><circle cx="240" cy="40" r="2" /><circle cx="280" cy="40" r="2" /><circle cx="40" cy="80" r="2" /><circle cx="280" cy="80" r="2" /><circle cx="40" cy="120" r="2" /><circle cx="280" cy="120" r="2" /></g><circle cx="160" cy="130" r="80" fill="none" stroke="#C2BCFF" stroke-width="1.5" opacity="0.5" /><polyline class="cb cb-draw" points="40,190 100,190 140,150 200,150 250,110" fill="none" stroke="#C2BCFF" stroke-width="4" stroke-linejoin="round" /><circle cx="250" cy="110" r="11" fill="none" stroke="#C2BCFF" stroke-width="4" /><text x="22" y="32" fill="#C2BCFF" font-family="IBM Plex Mono, monospace" font-size="16">DS·101</text></svg>
            <div class="cb cb-title" style="margin-top: 12px; font-family: Newsreader, Georgia, serif; font-size: 22px; line-height: 26px; font-weight: 500;">Data Science 101</div>
          </div>

          <!-- 02 LESSONS -->
          <div>
            <div class="cp" aria-hidden="true"><span class="cp-track" /><span class="cp-fill cb cb-seg2" /><span class="cp-dot cb cb-st2" style="background: #4A3AE0; border-color: #4A3AE0;" /></div>
            <div class="cp-label"><span class="cp-num">02</span>Add lessons</div>
            <div style="margin-top: 20px; display: grid; gap: 8px;">
              <div class="cb cb-s2" style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">SECTION 01</div>
              <div class="cb cb-l1" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; background: #FFFFFF; border: 1px solid #DDD8CC; border-radius: 6px; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4F63" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>Intro to data</div>
              <div class="cb cb-l2" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; background: #FFFFFF; border: 1px solid #DDD8CC; border-radius: 6px; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4F63" stroke-width="1.8" aria-hidden="true"><rect x="2" y="5" width="15" height="14" rx="2" /><path d="M17 10l5-3v10l-5-3" /></svg>Cleaning data</div>
              <div class="cb cb-l3" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; background: #FFFFFF; border: 1px solid #DDD8CC; border-radius: 6px; font-size: 14px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4F63" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>Your first chart</div>
              <div class="cb cb-quiz" style="display: flex; align-items: center; gap: 10px; height: 40px; padding: 0 12px; background: #E9E6FF; border-radius: 6px; font-size: 14px; font-weight: 600; color: #3626B8;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>Final quiz</div>
            </div>
          </div>

          <!-- 03 INVITE -->
          <div>
            <div class="cp" aria-hidden="true"><span class="cp-track" /><span class="cp-fill cb cb-seg3" /><span class="cp-dot cb cb-st3" style="background: #4A3AE0; border-color: #4A3AE0;" /></div>
            <div class="cp-label"><span class="cp-num">03</span>Invite</div>
            <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; max-width: 200px;">
              <span class="cb cb-a1" style="aspect-ratio: 1; border-radius: 9999px; background: #2A2290; color: #C2BCFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">YP</span>
              <span class="cb cb-a1" style="aspect-ratio: 1; border-radius: 9999px; background: #0F3B33; color: #9ADDC0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">AR</span>
              <span class="cb cb-a2" style="aspect-ratio: 1; border-radius: 9999px; background: #6E2A1C; color: #F5BFA4; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">SW</span>
              <span class="cb cb-a2" style="aspect-ratio: 1; border-radius: 9999px; background: #0E3550; color: #9CD0F0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">BG</span>
              <span class="cb cb-a2" style="aspect-ratio: 1; border-radius: 9999px; background: #1D1B16; color: #EDBE4F; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">IK</span>
              <span class="cb cb-a3" style="aspect-ratio: 1; border-radius: 9999px; background: #45193F; color: #EDB1DC; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">DN</span>
              <span class="cb cb-a3" style="aspect-ratio: 1; border-radius: 9999px; background: #2A2290; color: #C2BCFF; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">RM</span>
              <span class="cb cb-a3" style="aspect-ratio: 1; border-radius: 9999px; background: #EAE7DF; color: #4A4F63; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">+17</span>
            </div>
            <div class="cb cb-count" style="margin-top: 16px; display: flex; align-items: baseline; gap: 8px;"><span style="font-family: Newsreader, Georgia, serif; font-size: 36px; line-height: 36px; font-weight: 500;">24</span><span style="font-size: 13px; color: #5E6376;">learners</span></div>
            <div aria-hidden="true" style="margin-top: 12px; display: grid; gap: 8px; max-width: 200px;">
              <div style="height: 4px; border-radius: 9999px; background: #EAE7DF; overflow: hidden;"><div class="cb cb-bar1" style="width: 100%; height: 100%; background: #4A3AE0; border-radius: 9999px;" /></div>
              <div style="height: 4px; border-radius: 9999px; background: #EAE7DF; overflow: hidden;"><div class="cb cb-bar2" style="width: 72%; height: 100%; background: #4A3AE0; border-radius: 9999px;" /></div>
              <div style="height: 4px; border-radius: 9999px; background: #EAE7DF; overflow: hidden;"><div class="cb cb-bar3" style="width: 40%; height: 100%; background: #4A3AE0; border-radius: 9999px;" /></div>
            </div>
          </div>

          <!-- 04 CERTIFY -->
          <div>
            <div class="cp" aria-hidden="true"><span class="cp-dot cp-end cb cb-st4" style="background: #F0A532; border-color: #F0A532;" /></div>
            <div class="cp-label"><span class="cp-num">04</span>Certify</div>
            <div class="cb cb-cert" style="position: relative; margin-top: 20px; background: #FFFFFF; padding: 18px 18px 16px; box-shadow: 0 16px 32px -16px rgba(10,14,36,0.35); transform: rotate(-1deg);">
              <div style="position: absolute; inset: 6px; border: 1px solid #14172B;" />
              <div style="position: relative; font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: #5E6376;">CERTIFICATE OF COMPLETION</div>
              <div style="position: relative; font-family: Newsreader, Georgia, serif; font-size: 22px; line-height: 26px; font-weight: 500; margin-top: 10px;">Yulia Putri</div>
              <div style="position: relative; font-family: Newsreader, Georgia, serif; font-style: italic; font-size: 14px; color: #4A4F63;">Data Science 101</div>
              <div style="position: relative; display: flex; align-items: center; margin-top: 16px;"><span style="flex: 1; height: 1px; background: #14172B;" />
                <span class="cb cb-seal" style="width: 44px; height: 44px; border-radius: 9999px; background: #F0A532; display: flex; align-items: center; justify-content: center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="2.4" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg></span></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</header>

<main id="main" tabindex="-1" style="outline: none;">


<!-- ================= TWO ROOMS: instructor workspace + learner reading room ================= -->
<section id="rooms" style="max-width: 1200px; margin: 0 auto; padding: 112px 32px 24px;">
  <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #5E6376;">Two rooms</div>
  <h2 style="margin: 12px 0 0; max-width: 760px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">A workspace for the people who teach.<br><span style="font-style: italic; color: #4A4F63;">A reading room for the people who learn.</span></h2>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 32px; margin-top: 56px;">

    <!-- Instructor room -->
    <article>
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div><div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">FOR INSTRUCTORS</div>
        <h3 style="margin: 6px 0 0; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 28px; line-height: 34px;">The workspace</h3></div>
        <span style="font-size: 15px; color: #4A4F63;">Dense, structured, fast.</span>
      </div>
      <div role="img" aria-label="Instructor workspace: a course list with covers, learner counts and status" style="margin-top: 20px; height: 380px; display: flex; border-radius: 10px; overflow: hidden; border: 1px solid #DDD8CC; background: #F4F2EC;">
        <div style="flex: 0 0 64px; background: #0A0E24; display: flex; flex-direction: column; align-items: center; gap: 10px; padding-top: 18px;">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 14 L9 8 L15 8" fill="none" stroke="#EEF0FA" stroke-width="1.6" /><circle cx="3" cy="14" r="2.2" fill="#EEF0FA" /><circle cx="9" cy="8" r="2.2" fill="#EEF0FA" /><circle cx="15" cy="8" r="2.6" fill="#F0A532" /></svg>
          <span style="margin-top: 10px; width: 36px; height: 36px; border-radius: 6px; background: #151B3D;" />
          <span style="position: relative; width: 36px; height: 36px; border-radius: 6px; background: #262E5A;"><span style="position: absolute; left: -10px; top: 14px; width: 7px; height: 7px; border-radius: 9999px; background: #F0A532;" /></span>
          <span style="width: 36px; height: 36px; border-radius: 6px; background: #151B3D;" />
          <span style="width: 36px; height: 36px; border-radius: 6px; background: #151B3D;" />
        </div>
        <div style="flex: 1; min-width: 0; padding: 22px 22px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <span style="font-family: Newsreader, Georgia, serif; font-size: 26px; font-weight: 500;">Courses</span>
            <span style="height: 32px; padding: 0 12px; display: inline-flex; align-items: center; border-radius: 6px; background: #4A3AE0; color: #FFFFFF; font-size: 13px; font-weight: 600;">New course</span>
          </div>
          <div style="display: flex; gap: 0; margin-top: 16px; border-top: 1px solid #DDD8CC; border-bottom: 1px solid #DDD8CC;">
            <div style="flex: 1; padding: 10px 0;"><div style="font-family: Newsreader, Georgia, serif; font-size: 26px; line-height: 28px;">142</div><div style="font-size: 12px; color: #5E6376;">learners</div></div>
            <div style="flex: 1; padding: 10px 0 10px 14px; border-left: 1px solid #DDD8CC;"><div style="font-family: Newsreader, Georgia, serif; font-size: 26px; line-height: 28px;">7</div><div style="font-size: 12px; color: #5E6376;">courses</div></div>
            <div style="flex: 1; padding: 10px 0 10px 14px; border-left: 1px solid #DDD8CC;"><div style="font-family: Newsreader, Georgia, serif; font-size: 26px; line-height: 28px;">64%</div><div style="font-size: 12px; color: #5E6376;">completion</div></div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #DDD8CC;">
            <svg width="56" height="42" viewBox="0 0 320 240" aria-hidden="true" style="border-radius: 6px; flex: none;"><rect width="320" height="240" fill="#2A2290" /><polyline points="40,190 100,190 140,150 200,150 250,110" fill="none" stroke="#C2BCFF" stroke-width="12" /></svg>
            <div style="min-width: 0; flex: 1;"><div style="font-weight: 600; font-size: 14px;">Data Science 101</div><div style="font-size: 12px; color: #5E6376;">24 learners · 12 lessons</div></div>
            <span style="height: 22px; padding: 0 7px; display: inline-flex; align-items: center; border-radius: 3px; background: #E1F1E8; color: #1D7550; font-size: 11px; font-weight: 600;">✓ Published</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #DDD8CC;">
            <svg width="56" height="42" viewBox="0 0 320 240" aria-hidden="true" style="border-radius: 6px; flex: none;"><rect width="320" height="240" fill="#0F3B33" /><path d="M220 230 A 150 150 0 0 0 70 80" fill="none" stroke="#9ADDC0" stroke-width="14" /></svg>
            <div style="min-width: 0; flex: 1;"><div style="font-weight: 600; font-size: 14px;">Leading Remote Teams</div><div style="font-size: 12px; color: #5E6376;">61 learners · 15 lessons</div></div>
            <span style="height: 22px; padding: 0 7px; display: inline-flex; align-items: center; border-radius: 3px; background: #E1F1E8; color: #1D7550; font-size: 11px; font-weight: 600;">✓ Published</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0;">
            <svg width="56" height="42" viewBox="0 0 320 240" aria-hidden="true" style="border-radius: 6px; flex: none;"><rect width="320" height="240" fill="#0E3550" /><rect x="40" y="60" width="240" height="40" fill="#9CD0F0" opacity="0.7" /><rect x="40" y="130" width="110" height="40" fill="#9CD0F0" /></svg>
            <div style="min-width: 0; flex: 1;"><div style="font-weight: 600; font-size: 14px;">Vue 3 Patterns</div><div style="font-size: 12px; color: #5E6376;">Draft · 5 lessons</div></div>
            <span style="height: 22px; padding: 0 7px; display: inline-flex; align-items: center; border-radius: 3px; background: #EAE7DF; color: #4A4F63; font-size: 11px; font-weight: 600;">Draft</span>
          </div>
        </div>
      </div>
    </article>

    <!-- Learner room -->
    <article>
      <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
        <div><div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">FOR LEARNERS</div>
        <h3 style="margin: 6px 0 0; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 28px; line-height: 34px;">The reading room</h3></div>
        <span style="font-size: 15px; color: #4A4F63;">Calm, one next step.</span>
      </div>
      <div role="img" aria-label="Learner lesson reader: a lesson in a calm reading column with progress and study tools" style="position: relative; margin-top: 20px; height: 380px; border-radius: 10px; overflow: hidden; border: 1px solid #DDD8CC; background: #F4F2EC;">
        <div style="height: 40px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 12px;">
          <span style="color: #4A3AE0; font-weight: 600;">← Data Science 101</span>
          <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #5E6376;">LESSON 2 OF 12</span>
        </div>
        <div aria-hidden="true" style="position: relative; height: 2px; background: #DDD8CC;"><div class="rr-prog" style="position: absolute; left: 0; top: 0; bottom: 0; width: 17%; background: #4A3AE0;" /><span class="rr-dot" style="position: absolute; left: 17%; top: -4px; width: 10px; height: 10px; margin-left: -5px; border-radius: 9999px; background: #F0A532;" /></div>
        <div style="margin: 0 auto; max-width: 420px; height: 100%; background: #FBFAF6; padding: 28px 28px 0;">
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #5E6376;">SECTION 01 · GETTING STARTED</div>
          <div style="font-family: Newsreader, Georgia, serif; font-size: 30px; line-height: 34px; font-weight: 500; margin-top: 8px;">Why data quality matters</div>
          <div style="font-family: Newsreader, Georgia, serif; font-style: italic; font-size: 16px; color: #4A4F63; margin-top: 6px;">Bad inputs, confident wrong answers.</div>
          <div style="height: 1px; background: #DDD8CC; margin: 16px 0;" />
          <p style="margin: 0; font-family: Newsreader, Georgia, serif; font-size: 16px; line-height: 27px;">Before fitting any model, spend time with the data itself. Ask simple questions — how many rows, what is missing — and let the answers <span class="rr-hl">shape what you do next.</span></p>
          <div style="margin-top: 18px; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 6px; background: #4A3AE0; color: #FFFFFF; font-size: 13px; font-weight: 600;">Mark complete &amp; continue →</div>
        </div>
        <div style="position: absolute; right: 14px; top: 64px; width: 150px; background: #FFFFFF; border: 1px solid #DDD8CC; border-radius: 10px; box-shadow: 0 12px 32px -12px rgba(10,14,36,0.28); padding: 10px 12px;">
          <div style="font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.08em; color: #5E6376;">STUDY TOOLS</div>
          <div style="font-size: 12px; line-height: 18px; margin-top: 6px;">• Explore before you model <span style="color: #5E6376;">¶1</span></div>
          <div style="font-size: 12px; line-height: 18px;">• Outliers distort means <span style="color: #5E6376;">¶2</span></div>
        </div>
      </div>
    </article>
  </div>
</section>

<!-- ================= FEATURES ================= -->
<section id="features" style="max-width: 1200px; margin: 0 auto; padding: 96px 32px 64px;">
  <div style="display: flex; flex-wrap: wrap; gap: 24px 64px; align-items: flex-end;">
    <div style="flex: 1 1 520px;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #5E6376;">The product</div>
      <h2 style="margin: 12px 0 0; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">Everything a class needs.</h2>
    </div>
  </div>

  <!-- feature 1: structure -->
  <div style="display: flex; flex-wrap: wrap; gap: 48px; align-items: center; margin-top: 72px; padding-top: 48px; border-top: 1px solid #DDD8CC;">
    <div style="flex: 1 1 360px; min-width: 0;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">01 · STRUCTURE</div>
      <h3 style="margin: 10px 0 12px; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 30px; line-height: 36px;">Courses with a shape</h3>
      <p style="margin: 0; color: #4A4F63;">Sections, lessons, a final quiz. Text or video.</p>
    </div>
    <div aria-hidden="true" class="lp-mock" style="flex: 1 1 520px; min-width: 0; display: flex; border-radius: 10px; overflow: hidden; border: 1px solid #DDD8CC; background: #FBFAF6;">
      <div class="lp-mock-outline" style="flex: 0 0 44%; background: #EAE7DF; padding: 20px 18px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">OUTLINE</div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376; margin-top: 16px;">SECTION 01</div>
        <div style="font-weight: 600; font-size: 15px;">Getting started</div>
        <div style="margin: 8px 0 0 5px; padding-left: 16px; border-left: 2px solid #4A3AE0; font-size: 13px; display: grid; gap: 4px;">
          <div style="height: 30px; display: flex; align-items: center;">1.1 Welcome &amp; setup</div>
          <div style="height: 30px; display: flex; align-items: center; background: #E9E6FF; color: #3626B8; font-weight: 600; border-radius: 6px; padding: 0 6px; margin-left: -6px;">1.2 Data quality</div>
          <div style="height: 30px; display: flex; align-items: center;">1.3 EDA in practice</div>
        </div>
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376; margin-top: 16px;">SECTION 02</div>
        <div style="font-weight: 600; font-size: 15px;">Visualising data</div>
        <div style="margin: 8px 0 0 5px; padding-left: 16px; border-left: 2px dashed #85827A; font-size: 13px; color: #4A4F63;"><div style="height: 30px; display: flex; align-items: center;">2.1 Distributions · Draft</div></div>
      </div>
      <div style="flex: 1; padding: 24px 24px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">LESSON 1.2 · TEXT</div>
        <div style="font-family: Newsreader, Georgia, serif; font-size: 26px; line-height: 30px; font-weight: 500; margin-top: 10px;">Why data quality matters</div>
        <div style="height: 1px; background: #DDD8CC; margin: 16px 0;" />
        <div style="font-family: Newsreader, Georgia, serif; font-size: 16px; line-height: 27px; color: #14172B;">Bad inputs produce confident, wrong answers. In this lesson we look at missing values, duplicates and inconsistent units.</div>
      </div>
    </div>
  </div>

  <!-- feature 2 + 3 + 4 : three different treatments -->
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 48px; margin-top: 88px; padding-top: 48px; border-top: 1px solid #DDD8CC;">
    <div>
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">02 · PROGRESS</div>
      <h3 style="margin: 10px 0 12px; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 26px; line-height: 32px;">Progress you can read at a glance</h3>
      <p style="margin: 0; color: #4A4F63; font-size: 15px; line-height: 25px;">Done, current, next — for every learner.</p>
      <div aria-hidden="true" style="margin-top: 24px; padding: 20px 0; border-top: 1px solid #DDD8CC; border-bottom: 1px solid #DDD8CC;">
        <div style="display: flex; align-items: center;">
          <span style="width: 12px; height: 12px; border-radius: 9999px; background: #4A3AE0;" /><span style="flex: 1; height: 2px; background: #4A3AE0;" />
          <span style="width: 12px; height: 12px; border-radius: 9999px; background: #4A3AE0;" /><span style="flex: 1; height: 2px; background: #4A3AE0;" />
          <span style="width: 14px; height: 14px; border-radius: 9999px; background: #F0A532; box-shadow: 0 0 0 5px rgba(240,165,50,0.3);" /><span style="flex: 1; border-top: 2px dashed #85827A;" />
          <span style="width: 10px; height: 10px; border-radius: 9999px; border: 1.5px solid #85827A; background: #FFFFFF;" /><span style="flex: 1; border-top: 2px dashed #85827A;" />
          <span style="width: 16px; height: 16px; border-radius: 9999px; border: 2px dashed #85827A;" />
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #5E6376;"><span>DONE</span><span>CURRENT</span><span>CERTIFICATE</span></div>
      </div>
    </div>

    <div>
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">03 · STUDY TOOLS</div>
      <h3 style="margin: 10px 0 12px; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 26px; line-height: 32px;">An assistant that stays in the margin</h3>
      <p style="margin: 0; color: #4A4F63; font-size: 15px; line-height: 25px;">Summarise, practise, ask — about this lesson only.</p>
      <div aria-hidden="true" style="margin-top: 24px; background: #FFFFFF; border: 1px solid #DDD8CC; border-radius: 10px; box-shadow: 0 12px 32px -12px rgba(10,14,36,0.28); padding: 16px 18px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">STUDY TOOLS · LESSON 1.2</div>
        <div style="display: flex; gap: 16px; margin: 10px 0 12px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #DDD8CC;"><span style="padding-bottom: 8px; border-bottom: 2px solid #4A3AE0;">Summarize</span><span style="color: #4A4F63;">Practice</span><span style="color: #4A4F63;">Ask</span></div>
        <div style="font-size: 14px; line-height: 22px; display: grid; gap: 6px;"><div>• Explore before you model. <span style="color: #5E6376; font-size: 12px;">¶1</span></div><div>• Outliers distort means. <span style="color: #5E6376; font-size: 12px;">¶2</span></div></div>
      </div>
    </div>

    <div>
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">04 · COURSE COVERS</div>
      <h3 style="margin: 10px 0 12px; font-family: Newsreader, Georgia, serif; font-weight: 600; font-size: 26px; line-height: 32px;">Covers that design themselves</h3>
      <p style="margin: 0; color: #4A4F63; font-size: 15px; line-height: 25px;">Pick a category. Get a cover.</p>
      <div aria-hidden="true" style="margin-top: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;">
        <svg viewBox="0 0 320 240" style="width: 100%; border-radius: 12px;"><rect width="320" height="240" fill="#0E3550" /><rect x="36" y="56" width="232" height="28" rx="3" fill="#9CD0F0" opacity="0.6" /><rect x="36" y="100" width="232" height="28" rx="3" fill="none" stroke="#9CD0F0" stroke-width="3" /><rect x="36" y="144" width="110" height="28" rx="3" fill="#9CD0F0" opacity="0.5" /><rect x="158" y="144" width="110" height="28" rx="3" fill="#9CD0F0" opacity="0.85" /></svg>
        <svg viewBox="0 0 320 240" style="width: 100%; border-radius: 12px;"><rect width="320" height="240" fill="#0F3B33" /><g fill="none" stroke="#9ADDC0"><path d="M100 210 A 34 34 0 0 0 66 176" stroke-width="1.5" opacity="0.5" /><path d="M134 210 A 68 68 0 0 0 66 142" stroke-width="1.5" opacity="0.5" /><path d="M168 210 A 102 102 0 0 0 66 108" stroke-width="1.5" opacity="0.5" /><path d="M202 210 A 136 136 0 0 0 66 74" stroke-width="4" /><path d="M236 210 A 170 170 0 0 0 66 40" stroke-width="1.5" opacity="0.5" /></g><circle cx="162" cy="114" r="10" fill="#9ADDC0" /></svg>
        <svg viewBox="0 0 320 240" style="width: 100%; border-radius: 12px;"><rect width="320" height="240" fill="#1D1B16" /><g fill="none" stroke="#EDBE4F"><circle cx="210" cy="110" r="90" stroke-width="1.5" opacity="0.5" /><circle cx="210" cy="110" r="54" stroke-width="12" stroke-dasharray="250 90" /><circle cx="210" cy="110" r="20" stroke-width="1.5" opacity="0.5" /></g><g fill="#EDBE4F"><rect x="32" y="180" width="12" height="30" /><rect x="52" y="160" width="12" height="50" /><rect x="72" y="140" width="12" height="70" /><rect x="92" y="120" width="12" height="90" /></g></svg>
      </div>
    </div>
  </div>

  <!-- Built for: four audiences on one line (moved here from under the hero) -->
  <div style="display: flex; flex-wrap: wrap; gap: 24px 48px; align-items: flex-start; margin-top: 88px; padding-top: 40px; border-top: 1px solid #DDD8CC;">
    <div style="flex: 0 0 180px;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">05 · BUILT FOR</div>
      <div style="margin-top: 8px; font-family: Newsreader, Georgia, serif; font-style: italic; font-size: 22px; line-height: 28px; color: #14172B;">Teams that teach.</div>
    </div>
    <ul style="flex: 1 1 640px; min-width: 0; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 24px;">
      <li class="bf">
        <div class="bf-rail" aria-hidden="true"><span class="bf-dot bf-d1" /><span class="bf-seg" /></div>
        <svg class="bf-ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-3.5-5.8" /></svg>
        <div class="bf-name">HR &amp; L&amp;D teams</div>
        <div class="bf-tag">Upskilling</div>
      </li>
      <li class="bf">
        <div class="bf-rail" aria-hidden="true"><span class="bf-dot bf-d2" /><span class="bf-seg" /></div>
        <svg class="bf-ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" /></svg>
        <div class="bf-name">Training academies</div>
        <div class="bf-tag">Cohort programs</div>
      </li>
      <li class="bf">
        <div class="bf-rail" aria-hidden="true"><span class="bf-dot bf-d3" /><span class="bf-seg" /></div>
        <svg class="bf-ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21V5a2 2 0 0 1 2-2h12v18" /><path d="M14 12h.01" /><path d="M2 21h20" /></svg>
        <div class="bf-name">Employee onboarding</div>
        <div class="bf-tag">First weeks</div>
      </li>
      <li class="bf">
        <div class="bf-rail" aria-hidden="true"><span class="bf-dot bf-d4" /></div>
        <svg class="bf-ic" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
        <div class="bf-name">Compliance programs</div>
        <div class="bf-tag">Certified</div>
      </li>
    </ul>
  </div>
</section>

<!-- ================= HOW IT WORKS ================= -->
<section id="how" style="background: #EAE7DF;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 104px 32px;">
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #4A4F63;">How it works</div>
    <h2 style="margin: 12px 0 0; max-width: 720px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">From an empty workspace to tracked learning in five stops.</h2>
    <ol style="list-style: none; margin: 56px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 32px 24px;">
      <li class="hw" style="border-top: 2px dashed #85827A; padding-top: 22px; position: relative;">
        <span class="hw-fill hw-f1" aria-hidden="true" /><span class="hw-st hw-s1" aria-hidden="true" />
        <div class="hw-body hw-b1"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4F63;">01</div>
        <div style="font-weight: 600; font-size: 18px; margin-top: 6px;">Create a course</div>
        <p style="margin: 6px 0 0; font-size: 15px; line-height: 24px; color: #4A4F63;">Name it. The cover is made for you.</p></div>
      </li>
      <li class="hw" style="border-top: 2px dashed #85827A; padding-top: 22px; position: relative;">
        <span class="hw-fill hw-f2" aria-hidden="true" /><span class="hw-st hw-s2" aria-hidden="true" />
        <div class="hw-body hw-b2"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4F63;">02</div>
        <div style="font-weight: 600; font-size: 18px; margin-top: 6px;">Add lessons</div>
        <p style="margin: 6px 0 0; font-size: 15px; line-height: 24px; color: #4A4F63;">Text or video, in sections.</p></div>
      </li>
      <li class="hw" style="border-top: 2px dashed #85827A; padding-top: 22px; position: relative;">
        <span class="hw-fill hw-f3" aria-hidden="true" /><span class="hw-st hw-s3" aria-hidden="true" />
        <div class="hw-body hw-b3"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4F63;">03</div>
        <div style="font-weight: 600; font-size: 18px; margin-top: 6px;">Invite learners</div>
        <p style="margin: 6px 0 0; font-size: 15px; line-height: 24px; color: #4A4F63;">Enrol your team by email.</p></div>
      </li>
      <li class="hw" style="border-top: 2px dashed #85827A; padding-top: 22px; position: relative;">
        <span class="hw-fill hw-f4" aria-hidden="true" /><span class="hw-st hw-s4" aria-hidden="true" />
        <div class="hw-body hw-b4"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4F63;">04</div>
        <div style="font-weight: 600; font-size: 18px; margin-top: 6px;">Publish</div>
        <p style="margin: 6px 0 0; font-size: 15px; line-height: 24px; color: #4A4F63;">Learners see what's ready.</p></div>
      </li>
      <li class="hw" style="border-top: 2px dashed #85827A; padding-top: 22px; position: relative;">
        <span class="hw-fill hw-f5" aria-hidden="true" /><span class="hw-st hw-s5 hw-last" aria-hidden="true" />
        <div class="hw-body hw-b5"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #4A4F63;">05</div>
        <div style="font-weight: 600; font-size: 18px; margin-top: 6px;">Track learning</div>
        <p style="margin: 6px 0 0; font-size: 15px; line-height: 24px; color: #4A4F63;">Progress and certificates.</p></div>
      </li>
    </ol>
  </div>
</section>

<!-- ================= CERTIFICATE SHOWCASE ================= -->
<section id="certificates" style="max-width: 1200px; margin: 0 auto; padding: 112px 32px; display: flex; flex-wrap: wrap; gap: 56px; align-items: center;">
  <div style="flex: 1 1 340px; min-width: 0;">
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #5E6376;">Certificates</div>
    <h2 style="margin: 12px 0 16px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">A certificate worth printing.</h2>
    <p style="margin: 0; color: #4A4F63; font-size: 17px; line-height: 28px;">Finish the lessons, pass the quiz, get a real document.</p>
    <dl style="margin: 28px 0 0; display: grid; gap: 0;">
      <div style="display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid #DDD8CC;"><dt style="flex: 0 0 120px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376; padding-top: 2px;">UNIQUE ID</dt><dd style="margin: 0; font-size: 15px;">Every certificate carries its own number.</dd></div>
      <div style="display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid #DDD8CC;"><dt style="flex: 0 0 120px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376; padding-top: 2px;">VERIFIABLE</dt><dd style="margin: 0; font-size: 15px;">Anyone can check it on a public verification page.</dd></div>
      <div style="display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid #DDD8CC;"><dt style="flex: 0 0 120px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376; padding-top: 2px;">PRINTABLE</dt><dd style="margin: 0; font-size: 15px;">A4 landscape, ready to save as PDF.</dd></div>
      <div style="display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid #DDD8CC; border-bottom: 1px solid #DDD8CC;"><dt style="flex: 0 0 120px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376; padding-top: 2px;">HONEST</dt><dd style="margin: 0; font-size: 15px;">Names the instructor — no fake signatures.</dd></div>
    </dl>
  </div>

  <div role="img" class="lp-cert" aria-label="Example certificate of completion for Nadia Rahmawati, Exploratory Data Analysis" style="flex: 1 1 560px; min-width: 0; position: relative; background: #FFFFFF; box-shadow: 0 1px 0 rgba(10,14,36,0.04), 0 32px 64px -32px rgba(10,14,36,0.3); padding: 44px 48px 32px; box-sizing: border-box; transform: rotate(-1deg);">
    <div style="position: absolute; inset: 18px; border: 1px solid #14172B; pointer-events: none;" />
    <div style="position: absolute; inset: 22px; border: 0.5px solid #85827A; pointer-events: none;" />
    <div style="position: relative; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
      <span style="font-family: Newsreader, Georgia, serif; font-size: 18px;">Cohortly <span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #5E6376; margin-left: 6px;">FOR ACME LEARNING</span></span>
      <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #4A4F63;">No. COH-2026-K577952Y</span>
    </div>
    <div style="position: relative; margin-top: 32px;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.08em; color: #5E6376;">CERTIFICATE OF COMPLETION</div>
      <div style="font-size: 13px; color: #4A4F63; margin-top: 18px;">This certifies that</div>
      <div style="font-family: Newsreader, Georgia, serif; font-size: clamp(36px, 4.4vw, 54px); line-height: 1.05; font-weight: 500; letter-spacing: -0.02em;">Nadia Rahmawati</div>
      <div style="font-size: 13px; color: #4A4F63; margin-top: 12px;">has completed the course</div>
      <div style="font-family: Newsreader, Georgia, serif; font-style: italic; font-size: 26px; line-height: 32px;">Exploratory Data Analysis</div>
    </div>
    <div aria-hidden="true" style="position: relative; display: flex; align-items: center; margin-top: 28px;">
      <span style="width: 7px; height: 7px; border-radius: 9999px; background: #14172B;" /><span style="flex: 1; height: 1px; background: #14172B;" />
      <span style="width: 7px; height: 7px; border-radius: 9999px; background: #14172B;" /><span style="flex: 1; height: 1px; background: #14172B;" />
      <span style="width: 7px; height: 7px; border-radius: 9999px; background: #14172B;" /><span style="flex: 1; height: 1px; background: #14172B;" />
      <span style="width: 12px; height: 12px; border-radius: 9999px; border: 1px solid #14172B; box-sizing: border-box;" /><span style="flex: 1; height: 1px; background: #14172B;" />
      <span style="width: 56px; height: 56px; border-radius: 9999px; background: #F0A532; display: flex; align-items: center; justify-content: center;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#14172B" stroke-width="2.2"><path d="M5 12l5 5L20 7" /></svg></span>
    </div>
    <div class="lp-cert-meta" style="position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 20px; padding-top: 12px; border-top: 1px solid #DDD8CC;">
      <div><div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #5E6376;">ISSUED</div><div style="font-family: Newsreader, Georgia, serif; font-size: 15px;">3 October 2026</div></div>
      <div><div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #5E6376;">INSTRUCTOR</div><div style="font-family: Newsreader, Georgia, serif; font-size: 15px;">Bima Prasetyo</div></div>
      <div class="lp-cert-verify"><div style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.08em; color: #5E6376;">VERIFY</div><div style="font-family: 'IBM Plex Mono', monospace; font-size: 11px;">cohortly · /certificates/verify</div></div>
    </div>
  </div>
</section>

<!-- ================= BEHIND THE DESIGN (honest stand-in for testimonials until real users exist) ================= -->
<section id="ideas" class="lp-dark" style="background: #0A0E24; color: #EEF0FA;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 104px 32px 88px;">
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #A3AACB;">Behind the design</div>
    <h2 style="margin: 12px 0 0; max-width: 720px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">Built on three ideas.</h2>
    <ol style="list-style: none; margin: 56px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0;">
      <li class="idea">
        <div class="idea-n">01</div>
        <svg width="120" height="28" viewBox="0 0 120 28" aria-hidden="true" style="margin-top: 20px; display: block;"><path d="M6 20 L40 20 L54 8 L114 8" fill="none" stroke="#4A3AE0" stroke-width="2" /><circle cx="6" cy="20" r="5" fill="#4A3AE0" /><circle cx="54" cy="8" r="5" fill="#4A3AE0" /><circle cx="114" cy="8" r="6" fill="#F0A532" /></svg>
        <h3 class="idea-t">Structure you can see.</h3>
        <p class="idea-p">Every course is a line of sections and lessons. Progress is a position on it.</p>
      </li>
      <li class="idea">
        <div class="idea-n">02</div>
        <div aria-hidden="true" style="margin-top: 20px; display: flex; gap: 8px; height: 28px; align-items: center;"><span style="width: 56px; height: 28px; border-radius: 6px; background: #4A3AE0;" /><span style="width: 18px; height: 18px; border-radius: 9999px; background: #F0A532; box-shadow: 0 0 0 5px rgba(240,165,50,0.3);" /></div>
        <h3 class="idea-t">Indigo means act. Amber means you are here.</h3>
        <p class="idea-p">One colour for every action, one for your place. Nothing else competes.</p>
      </li>
      <li class="idea">
        <div class="idea-n">03</div>
        <div aria-hidden="true" style="margin-top: 20px; display: flex; gap: 10px; height: 28px; align-items: flex-end; font-family: Newsreader, Georgia, serif;"><span style="font-size: 30px; line-height: 28px;">Aa</span><span style="font-family: 'Instrument Sans', system-ui, sans-serif; font-size: 16px; line-height: 20px; color: #A3AACB;">Aa</span></div>
        <h3 class="idea-t">Study is not admin.</h3>
        <p class="idea-p">Instructors get a dense workspace. Learners get a reading room in serif type.</p>
      </li>
    </ol>
    <div style="margin-top: 64px; padding-top: 24px; border-top: 1px solid #262E5A; display: flex; flex-wrap: wrap; gap: 12px 28px; align-items: center;">
      <span style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #A3AACB;">BUILT WITH</span>
      <span class="stack">Vue 3</span><span class="stack">Tailwind CSS</span><span class="stack">TanStack Query</span><span class="stack">Pinia</span><span class="stack">Vite</span>
    </div>
  </div>
</section>

<!-- ================= PRICING ================= -->
<section id="pricing" style="border-top: 1px solid #DDD8CC;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 104px 32px;">
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #5E6376;">Pricing</div>
    <h2 style="margin: 12px 0 0; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">One workspace. One monthly plan.</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 48px; margin-top: 48px; border-top: 1px solid #14172B; padding-top: 32px; align-items: start;">
      <div>
        <p style="margin: 0; font-size: 18px; line-height: 28px; color: #4A4F63;">Billed monthly per organization workspace, in Rupiah, through a secure payment page. Your learners keep access while the workspace is active, and you renew from Plan &amp; Billing when you are ready.</p>
        <p style="margin: 16px 0 0; font-size: 15px; line-height: 24px; color: #5E6376;">The current price is shown in Plan &amp; Billing as soon as you register, before you pay anything.</p>
      </div>
      <div style="padding: 28px; background: #FBFAF6; box-shadow: inset 0 3px 0 #4A3AE0; border: 1px solid #DDD8CC; border-radius: 10px;">
        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; color: #5E6376;">WORKSPACE PLAN</div>
        <ul style="margin: 18px 0 24px; padding: 0; list-style: none; font-size: 15px; display: grid; gap: 10px;">
          <li>✓ Courses with sections, text and video lessons</li><li>✓ Final quiz and a verifiable certificate</li><li>✓ Progress tracking for every learner</li><li>✓ Optional AI study tools for learners</li>
        </ul>
        <RouterLink class="btn-primary" :to="{ name: R.REGISTER }" style="height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #4A3AE0; text-decoration: none; font-weight: 600;">Register your organization</RouterLink>
      </div>
    </div>
  </div>
</section>

<!-- ================= FAQ ================= -->
<section id="faq" style="background: #EAE7DF;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 104px 32px; display: flex; flex-wrap: wrap; gap: 48px;">
    <div style="flex: 1 1 300px;">
      <div style="font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #4A4F63;">FAQ</div>
      <h2 style="margin: 12px 0 16px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(34px, 4vw, 48px); line-height: 1.08; letter-spacing: -0.015em;">Questions, answered.</h2>
          </div>
    <div style="flex: 2 1 560px; min-width: 0; border-top: 1px solid #85827A;">
      <details open="" style="border-bottom: 1px solid #85827A; padding: 20px 0;">
        <summary style="display: flex; justify-content: space-between; gap: 16px; font-weight: 600; font-size: 18px; line-height: 26px; min-height: 44px; align-items: center;">Who uses Cohortly — instructors or learners?<span class="faq-plus" aria-hidden="true" style="font-size: 24px; color: #4A3AE0; transition: transform .15s;">+</span></summary>
        <p style="margin: 8px 0 0; color: #4A4F63; max-width: 640px;">Both. Instructors build courses and manage learners in their workspace. Learners have their own sign-in and see only the courses they are enrolled in.</p>
      </details>
      <details style="border-bottom: 1px solid #85827A; padding: 20px 0;">
        <summary style="display: flex; justify-content: space-between; gap: 16px; font-weight: 600; font-size: 18px; line-height: 26px; min-height: 44px; align-items: center;">What kind of lessons can I create?<span class="faq-plus" aria-hidden="true" style="font-size: 24px; color: #4A3AE0;">+</span></summary>
        <p style="margin: 8px 0 0; color: #4A4F63; max-width: 640px;">Text and video lessons, grouped into sections. Each course can end with a final quiz.</p>
      </details>
      <details style="border-bottom: 1px solid #85827A; padding: 20px 0;">
        <summary style="display: flex; justify-content: space-between; gap: 16px; font-weight: 600; font-size: 18px; line-height: 26px; min-height: 44px; align-items: center;">How do certificates work?<span class="faq-plus" aria-hidden="true" style="font-size: 24px; color: #4A3AE0;">+</span></summary>
        <p style="margin: 8px 0 0; color: #4A4F63; max-width: 640px;">A learner who completes the course and passes the final quiz receives a certificate with a unique ID that anyone can verify on a public page.</p>
      </details>
      <details style="border-bottom: 1px solid #85827A; padding: 20px 0;">
        <summary style="display: flex; justify-content: space-between; gap: 16px; font-weight: 600; font-size: 18px; line-height: 26px; min-height: 44px; align-items: center;">What does the AI study assistant do?<span class="faq-plus" aria-hidden="true" style="font-size: 24px; color: #4A3AE0;">+</span></summary>
        <p style="margin: 8px 0 0; color: #4A4F63; max-width: 640px;">It helps learners summarise a lesson, practise with questions and ask about the material. It only works inside lessons and uses that lesson as its source.</p>
      </details>
      <details style="border-bottom: 1px solid #85827A; padding: 20px 0;">
        <summary style="display: flex; justify-content: space-between; gap: 16px; font-weight: 600; font-size: 18px; line-height: 26px; min-height: 44px; align-items: center;">What happens when our subscription ends?<span class="faq-plus" aria-hidden="true" style="font-size: 24px; color: #4A3AE0;">+</span></summary>
        <p style="margin: 8px 0 0; color: #4A4F63; max-width: 640px;">The workspace stays active until the end of the paid period. Renew from Plan &amp; Billing to keep learners' access uninterrupted.</p>
      </details>
    </div>
  </div>
</section>

<!-- ================= FINAL CTA ================= -->
<section id="start" class="lp-dark" style="position: relative; overflow: hidden; background: #0A0E24; color: #EEF0FA;">
  <svg aria-hidden="true" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMid slice" style="position: absolute; inset: 0; width: 100%; height: 100%;">
    <path d="M860 460 L860 320 L940 240 L1180 240 L1260 160 L1460 160" fill="none" stroke="#262E5A" stroke-width="2" />
    <path d="M960 -20 L960 60 L1040 140 L1460 140" fill="none" stroke="#262E5A" stroke-width="2" />
    <path class="bg-anim bg-flow" d="M860 460 L860 320 L940 240 L1180 240 L1260 160 L1460 160" fill="none" stroke="#A3AACB" stroke-width="2" stroke-dasharray="3 15" opacity="0.28" />
    <path class="bg-anim bg-flow" d="M960 -20 L960 60 L1040 140 L1460 140" fill="none" stroke="#A3AACB" stroke-width="2" stroke-dasharray="3 15" opacity="0.28" />
    <path d="M760 460 L760 360 L840 280 L1100 280 L1180 200 L1460 200" fill="none" stroke="#4A3AE0" stroke-width="3" />
    <!-- the learner's journey: a light travels the indigo route and lands on the amber "certificate" station -->
    <path class="bg-anim bg-pulse-a" d="M760 460 L760 360 L840 280 L1100 280 L1180 200 L1460 200" fill="none" stroke="#E9E6FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="90 1300" stroke-dashoffset="1390" />
    <path class="bg-anim bg-pulse-b" d="M860 460 L860 320 L940 240 L1180 240 L1260 160 L1460 160" fill="none" stroke="#F0A532" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="70 1320" stroke-dashoffset="1390" />
    <circle cx="940" cy="240" r="6" fill="#262E5A" /><circle cx="1040" cy="140" r="6" fill="#262E5A" />
    <circle class="bg-anim bg-halo bg-d1" cx="840" cy="280" r="9" fill="#4A3AE0" /><circle cx="840" cy="280" r="7" fill="#4A3AE0" />
    <circle class="bg-anim bg-halo bg-d3" cx="1100" cy="280" r="9" fill="#4A3AE0" /><circle cx="1100" cy="280" r="7" fill="#4A3AE0" />
    <circle class="bg-anim bg-halo bg-d2" cx="1180" cy="200" r="12" fill="#F0A532" /><circle cx="1180" cy="200" r="16" fill="#F0A532" opacity="0.3" /><circle cx="1180" cy="200" r="8" fill="#F0A532" />
  </svg>
  <div style="position: relative; max-width: 1200px; margin: 0 auto; padding: 112px 32px;">
    <h2 style="margin: 0; max-width: 640px; font-family: Newsreader, Georgia, serif; font-weight: 500; font-size: clamp(36px, 5vw, 60px); line-height: 1.04; letter-spacing: -0.02em;">Give your team a clear path to learn.</h2>
    <p style="margin: 20px 0 0; max-width: 480px; color: #A3AACB; font-size: 17px; line-height: 28px;">Register your organization, create the first course and invite your learners today.</p>
    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 36px;">
      <RouterLink class="btn-primary" :to="{ name: R.REGISTER }" style="height: 52px; padding: 0 24px; display: inline-flex; align-items: center; border-radius: 6px; background: #4A3AE0; text-decoration: none; font-weight: 600;">Register your organization</RouterLink>
      <RouterLink class="btn-ghost-dark" :to="{ name: R.STUDENT_SIGN_IN }" style="height: 52px; padding: 0 22px; display: inline-flex; align-items: center; border-radius: 6px; border: 1px solid #262E5A; text-decoration: none; font-weight: 600;">I'm a learner — sign in</RouterLink>
    </div>
  </div>
</section>

</main>

<!-- ================= FOOTER ================= -->
<footer class="lp-dark" style="background: #0A0E24; color: #A3AACB; border-top: 1px solid #262E5A;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 40px 32px; display: flex; flex-wrap: wrap; gap: 24px 48px; align-items: center; font-size: 14px;">
    <span style="display: flex; align-items: center; gap: 10px; font-family: Newsreader, Georgia, serif; font-size: 20px; color: #EEF0FA;">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 14 L9 8 L15 8" fill="none" stroke="#EEF0FA" stroke-width="1.6" /><circle cx="3" cy="14" r="2.2" fill="#EEF0FA" /><circle cx="9" cy="8" r="2.2" fill="#EEF0FA" /><circle cx="15" cy="8" r="2.6" fill="#F0A532" /></svg>Cohortly</span>
    <span>Structured learning for your organization.</span>
    <nav aria-label="Footer" class="lp-nav" style="margin-left: auto; display: flex; flex-wrap: wrap; gap: 24px;">
      <RouterLink class="navlink" :to="{ name: R.INSTRUCTOR_SIGN_IN }">Instructor sign in</RouterLink>
      <RouterLink class="navlink" :to="{ name: R.STUDENT_SIGN_IN }">Student sign in</RouterLink>
      <RouterLink class="navlink" :to="{ name: R.CERTIFICATE_LOOKUP }">Verify a certificate</RouterLink>
    </nav>
  </div>
</footer>

  </div>
</template>

<style>
/* ---- Smooth anchor scrolling (landing only) and scroll reveal ---- */
html:has(.lp-root){scroll-behavior:smooth;scroll-padding-top:72px}
.lp-reveal{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);will-change:opacity,transform}
.lp-reveal.lp-in{opacity:1;transform:none}
@media (prefers-reduced-motion: reduce){.lp-reveal{opacity:1;transform:none;transition:none}}
.lp-root a{color:#4A3AE0}.lp-root a:hover{color:#3626B8}
.lp-root .lp-nav a.navlink{color:#A3AACB;text-decoration:none}.lp-nav a.navlink:hover{color:#EEF0FA}
.lp-root a.btn-primary{color:#FFFFFF}.lp-root a.btn-primary:hover{background:#3626B8;color:#FFFFFF}
.lp-root a.btn-ghost-dark{color:#EEF0FA}.lp-root a.btn-ghost-dark:hover{background:#151B3D;color:#EEF0FA}
.lp-root a.btn-secondary{color:#14172B}.lp-root a.btn-secondary:hover{background:#EAE7DF;color:#14172B}
.lp-root a:focus-visible,.lp-root summary:focus-visible{outline:2px solid #4A3AE0;outline-offset:2px}
.lp-root .lp-dark a:focus-visible{outline-color:#F0A532}
.lp-root details summary{list-style:none;cursor:pointer}.lp-root details summary::-webkit-details-marker{display:none}
details[open] .faq-plus{transform:rotate(45deg)}
@media (max-width: 760px){.lp-navlinks{display:none !important}}

/* ---- Phones: tighter gutters, stacked mock-ups, a certificate that fits ---- */
@media (max-width: 560px){
  .lp-root [style*="px 32px"]{padding-left:20px !important;padding-right:20px !important}
  .lp-root [style*="padding: 112px 32px;"],.lp-root [style*="padding: 104px 32px;"]{padding-top:72px !important;padding-bottom:72px !important}
  .lp-root [style*="padding: 104px 32px 88px"]{padding-top:72px !important;padding-bottom:64px !important}
  .lp-root [style*="padding: 112px 32px 24px"]{padding-top:72px !important}
  .lp-root [style*="padding: 96px 32px 64px"]{padding-top:64px !important;padding-bottom:48px !important}
  .lp-root [style*="padding: 56px 32px 96px"]{padding-top:32px !important;padding-bottom:64px !important}
  .lp-root header .lp-nav{gap:8px !important;flex-wrap:nowrap !important}
  .lp-root header .lp-nav > a{font-size:21px !important;flex:0 0 auto}
  .lp-root header .lp-nav .si-btn{padding:0 8px 0 10px !important;font-size:14px !important}
  .lp-root header .lp-nav .btn-primary{padding:0 12px !important;font-size:14px !important;white-space:nowrap}
  .lp-root [style*="padding: 28px 28px"]{padding:18px !important}
  .lp-root [style*="gap: 48px"]{gap:32px !important}
  .lp-mock{flex-direction:column !important}
  .lp-mock-outline{flex:0 0 auto !important}
  .lp-mock-outline div[style*="height: 30px"]{height:auto !important;min-height:30px;padding-top:4px;padding-bottom:4px}
  /* the certificate keeps all its content and its three-column footer; only the scale changes */
  .lp-root .lp-cert{padding:40px 32px 28px !important;flex-basis:100% !important}
  .lp-root .lp-cert-meta{grid-template-columns:minmax(0, .95fr) minmax(0, .95fr) minmax(0, 1.3fr) !important;gap:8px !important}
  .lp-cert-meta [style*="font-size: 15px"]{font-size:12.5px !important}
  .lp-cert-verify{overflow-wrap:anywhere}
  .lp-cert-verify [style*="font-size: 11px"]{font-size:9px !important}
  .lp-root footer > div{flex-direction:column !important;align-items:flex-start !important;gap:16px !important}
  .lp-root footer .lp-nav{margin-left:0 !important;flex-direction:column !important;gap:4px !important}
  .lp-root footer .lp-nav a{display:inline-flex;align-items:center;min-height:44px;font-size:15px}
  .lp-root dl > div{gap:12px !important}
  .lp-root dl dt{flex-basis:96px !important}
}

/* ---- Hero "class builder" loop: one 12s cycle, every step keyed on the same clock ---- */
.cb{animation-duration:12s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.2,.7,.2,1);animation-fill-mode:both}
@keyframes cb-cover{0%,2%{opacity:0;transform:scale(.92)}7%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-draw{0%,6%{stroke-dashoffset:420}16%,94%{stroke-dashoffset:0}100%{stroke-dashoffset:420}}
@keyframes cb-title{0%,9%{opacity:0;transform:translateY(8px)}13%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-s2{0%,15%{opacity:0;transform:translateY(10px)}19%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-l1{0%,19%{opacity:0;transform:translateX(-14px)}23%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-l2{0%,23%{opacity:0;transform:translateX(-14px)}27%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-l3{0%,27%{opacity:0;transform:translateX(-14px)}31%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-quiz{0%,31%{opacity:0;transform:translateX(-14px)}35%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-a1{0%,39%{opacity:0;transform:scale(.4)}43%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-a2{0%,42%{opacity:0;transform:scale(.4)}46%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-a3{0%,45%{opacity:0;transform:scale(.4)}49%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-count{0%,48%{opacity:0}52%,94%{opacity:1}100%{opacity:0}}
@keyframes cb-bar1{0%,50%{width:0}66%,94%{width:100%}100%{width:0}}
@keyframes cb-bar2{0%,50%{width:0}66%,94%{width:72%}100%{width:0}}
@keyframes cb-bar3{0%,50%{width:0}66%,94%{width:40%}100%{width:0}}
@keyframes cb-cert{0%,60%{opacity:0;transform:translateY(24px) rotate(-1deg)}66%,94%{opacity:1;transform:rotate(-1deg)}100%{opacity:0}}
@keyframes cb-seal{0%,68%{opacity:0;transform:scale(1.8) rotate(-30deg)}72%{opacity:1;transform:scale(.92)}74%,94%{opacity:1;transform:none}100%{opacity:0}}
@keyframes cb-line{0%{transform:scaleX(0)}72%,94%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes cb-st2{0%,15%{background:#FBFAF6;border-color:#85827A}19%,94%{background:#4A3AE0;border-color:#4A3AE0}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes cb-st3{0%,39%{background:#FBFAF6;border-color:#85827A}43%,94%{background:#4A3AE0;border-color:#4A3AE0}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes cb-st4{0%,66%{background:#FBFAF6;border-color:#85827A}70%,94%{background:#F0A532;border-color:#F0A532}100%{background:#FBFAF6;border-color:#85827A}}
.cb-cover{animation-name:cb-cover}.cb-draw{animation-name:cb-draw;stroke-dasharray:420}.cb-title{animation-name:cb-title}
.cb-s2{animation-name:cb-s2}.cb-l1{animation-name:cb-l1}.cb-l2{animation-name:cb-l2}.cb-l3{animation-name:cb-l3}.cb-quiz{animation-name:cb-quiz}
.cb-a1{animation-name:cb-a1}.cb-a2{animation-name:cb-a2}.cb-a3{animation-name:cb-a3}.cb-count{animation-name:cb-count}
.cb-bar1{animation-name:cb-bar1}.cb-bar2{animation-name:cb-bar2}.cb-bar3{animation-name:cb-bar3}
.cb-cert{animation-name:cb-cert}.cb-seal{animation-name:cb-seal}.cb-line{animation-name:cb-line;transform-origin:left center}
.cb-st2{animation-name:cb-st2}.cb-st3{animation-name:cb-st3}.cb-st4{animation-name:cb-st4}
/* ---- Stage checkpoints: one station per step, each joined to the next by its own segment ---- */
.cp{position:relative;height:18px;display:flex;align-items:center}
.cp-track,.cp-fill{position:absolute;left:9px;top:8px;width:calc(100% + 24px);height:2px}
.cp-track{border-top:2px dashed #85827A;height:0}
.cp-fill{background:#4A3AE0;transform-origin:left center}
.cp-dot{position:relative;z-index:1;width:18px;height:18px;border-radius:9999px;border:2px solid #85827A;background:#FBFAF6;box-sizing:border-box;box-shadow:0 0 0 4px #FBFAF6}
.cp-end{box-shadow:0 0 0 4px #FBFAF6,0 0 0 8px rgba(240,165,50,.25)}
.cp-label{display:flex;align-items:baseline;gap:8px;margin-top:12px;font-weight:600;font-size:14px;line-height:20px;color:#14172B}
.cp-num{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:11px;letter-spacing:.08em;color:#5E6376}
@keyframes cb-seg1{0%,12%{transform:scaleX(0)}18%,94%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes cb-seg2{0%,34%{transform:scaleX(0)}42%,94%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes cb-seg3{0%,54%{transform:scaleX(0)}68%,94%{transform:scaleX(1)}100%{transform:scaleX(0)}}
.cb-seg1{animation-name:cb-seg1}.cb-seg2{animation-name:cb-seg2}.cb-seg3{animation-name:cb-seg3}
@media (max-width: 1000px){.cp-track,.cp-fill{display:none}}
@media (prefers-reduced-motion: reduce){.cp-fill{transform:none !important}}
/* ---- "Built for" strip: four audiences as stations on one line; they light up in turn ---- */
.bf{position:relative}
.bf-rail{position:relative;height:14px;margin-bottom:18px}
.bf-seg{position:absolute;left:14px;top:6px;width:calc(100% + 10px);border-top:2px dashed #85827A}
.bf-dot{position:absolute;left:0;top:0;width:14px;height:14px;border-radius:9999px;border:2px solid #85827A;background:#F4F2EC;box-sizing:border-box;animation:bf-light 8s ease-in-out infinite both}
.bf-d1{animation-delay:0s}.bf-d2{animation-delay:2s}.bf-d3{animation-delay:4s}.bf-d4{animation-delay:6s}
@keyframes bf-light{0%,30%,100%{background:#F4F2EC;border-color:#85827A;box-shadow:0 0 0 0 rgba(240,165,50,0)}6%,22%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.25)}}
.bf-ic{display:block}
.bf-name{margin-top:12px;font-family:Newsreader,Georgia,serif;font-size:21px;line-height:26px;font-weight:500;color:#14172B}
.bf-tag{margin-top:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5E6376}
@media (max-width: 760px){.bf-seg{display:none}}
@media (prefers-reduced-motion: reduce){.bf-dot{animation:none}}
/* ---- Trusted-by carousel: endless horizontal scroll, edges fade, pauses on hover ---- */
.tm{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.tm-track{list-style:none;margin:0;padding:0;display:flex;width:max-content;animation:tm-scroll 36s linear infinite}
.tm:hover .tm-track{animation-play-state:paused}
.tm-logo{flex:none;display:flex;align-items:center;gap:12px;height:56px;padding:0 44px;border-right:1px solid #DDD8CC;font-family:'Instrument Sans',system-ui,sans-serif;font-weight:600;font-size:18px;letter-spacing:-0.01em;color:#5E6376;white-space:nowrap}
@keyframes tm-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){.tm-track{animation:none;flex-wrap:wrap;width:auto;justify-content:center}.tm-logo[aria-hidden="true"]{display:none}.tm{-webkit-mask-image:none;mask-image:none}}
/* ---- How it works: a 10s loop — each step becomes "current" (amber), its line fills, then it turns done (indigo) ---- */
.hw-fill{position:absolute;left:0;right:0;top:-2px;height:2px;background:#4A3AE0;transform-origin:left center;transform:scaleX(1)}
.hw-st{position:absolute;top:-9px;left:0;width:16px;height:16px;border-radius:9999px;background:#4A3AE0;border:2px solid #4A3AE0;box-sizing:border-box}
.hw-last{background:#F0A532;border-color:#F0A532}
.hw-fill,.hw-st,.hw-body{animation-duration:10s;animation-iteration-count:infinite;animation-timing-function:ease-in-out;animation-fill-mode:both}
@keyframes hw-f1{0%,2%{transform:scaleX(0)}16%,92%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes hw-f2{0%,18%{transform:scaleX(0)}32%,92%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes hw-f3{0%,34%{transform:scaleX(0)}48%,92%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes hw-f4{0%,50%{transform:scaleX(0)}64%,92%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes hw-f5{0%,66%{transform:scaleX(0)}80%,92%{transform:scaleX(1)}100%{transform:scaleX(0)}}
@keyframes hw-s1{0%{background:#FBFAF6;border-color:#85827A;box-shadow:none}2%,14%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.3)}17%,92%{background:#4A3AE0;border-color:#4A3AE0;box-shadow:none}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes hw-s2{0%,16%{background:#FBFAF6;border-color:#85827A;box-shadow:none}18%,30%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.3)}33%,92%{background:#4A3AE0;border-color:#4A3AE0;box-shadow:none}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes hw-s3{0%,32%{background:#FBFAF6;border-color:#85827A;box-shadow:none}34%,46%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.3)}49%,92%{background:#4A3AE0;border-color:#4A3AE0;box-shadow:none}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes hw-s4{0%,48%{background:#FBFAF6;border-color:#85827A;box-shadow:none}50%,62%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.3)}65%,92%{background:#4A3AE0;border-color:#4A3AE0;box-shadow:none}100%{background:#FBFAF6;border-color:#85827A}}
@keyframes hw-s5{0%,64%{background:#FBFAF6;border-color:#85827A;box-shadow:none}66%,92%{background:#F0A532;border-color:#F0A532;box-shadow:0 0 0 6px rgba(240,165,50,.3)}100%{background:#FBFAF6;border-color:#85827A;box-shadow:none}}
@keyframes hw-b1{0%{opacity:.45;transform:translateY(4px)}4%,92%{opacity:1;transform:none}100%{opacity:.45}}
@keyframes hw-b2{0%,16%{opacity:.45;transform:translateY(4px)}20%,92%{opacity:1;transform:none}100%{opacity:.45}}
@keyframes hw-b3{0%,32%{opacity:.45;transform:translateY(4px)}36%,92%{opacity:1;transform:none}100%{opacity:.45}}
@keyframes hw-b4{0%,48%{opacity:.45;transform:translateY(4px)}52%,92%{opacity:1;transform:none}100%{opacity:.45}}
@keyframes hw-b5{0%,64%{opacity:.45;transform:translateY(4px)}68%,92%{opacity:1;transform:none}100%{opacity:.45}}
.hw-f1{animation-name:hw-f1}.hw-f2{animation-name:hw-f2}.hw-f3{animation-name:hw-f3}.hw-f4{animation-name:hw-f4}.hw-f5{animation-name:hw-f5}
.hw-s1{animation-name:hw-s1}.hw-s2{animation-name:hw-s2}.hw-s3{animation-name:hw-s3}.hw-s4{animation-name:hw-s4}.hw-s5{animation-name:hw-s5}
.hw-b1{animation-name:hw-b1}.hw-b2{animation-name:hw-b2}.hw-b3{animation-name:hw-b3}.hw-b4{animation-name:hw-b4}.hw-b5{animation-name:hw-b5}
@media (prefers-reduced-motion: reduce){.hw-fill,.hw-st,.hw-body{animation:none !important}}
/* ---- Nav: Sign in menu (Instructor / Learner) ---- */
.si-btn{cursor:pointer}.si-btn:hover{background:#151B3D}
.si-menu[open] .si-chev{transform:rotate(180deg)}
.si-opt{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:6px;color:#14172B;text-decoration:none;min-height:44px}
.si-opt:hover{background:#EAE7DF;color:#14172B}
.si-opt b{display:block;font-size:15px;line-height:20px}
.si-opt small{display:block;font-size:13px;line-height:18px;color:#5E6376;font-weight:500}
.si-ic{flex:none;width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center}
/* ---- Two rooms: reader progress creeps forward, a highlight sweeps the last phrase ---- */
@keyframes rr-prog{0%,10%{width:9%}60%,100%{width:17%}}
@keyframes rr-dot{0%,10%{left:9%}60%,100%{left:17%}}
@keyframes rr-hl{0%,30%{background-size:0% 100%}60%,100%{background-size:100% 100%}}
.rr-prog{animation:rr-prog 6s ease-in-out infinite alternate}
.rr-dot{animation:rr-dot 6s ease-in-out infinite alternate}
.rr-hl{background-image:linear-gradient(#E9E6FF,#E9E6FF);background-repeat:no-repeat;background-size:100% 100%;animation:rr-hl 6s ease-in-out infinite alternate}
/* ---- Behind the design ---- */
.idea{padding:0 32px 8px 0;margin-bottom:32px}
.idea+.idea{padding-left:32px;border-left:1px solid #262E5A}
.idea-n{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#A3AACB}
.idea-t{margin:20px 0 8px;font-family:Newsreader,Georgia,serif;font-weight:500;font-size:26px;line-height:32px;color:#EEF0FA}
.idea-p{margin:0;font-size:15px;line-height:24px;color:#A3AACB}
.stack{font-family:'Instrument Sans',system-ui,sans-serif;font-weight:600;font-size:16px;color:#EEF0FA}
@media (max-width: 860px){.idea+.idea{padding-left:0;border-left:0}}
@media (prefers-reduced-motion: reduce){.rr-prog,.rr-dot,.rr-hl{animation:none}}
/* Reduced motion: show the finished class, no movement */
@media (prefers-reduced-motion: reduce){.cb{animation:none !important}.cb-line{transform:none}.cb-draw{stroke-dashoffset:0}
.cb-st2,.cb-st3{background:#4A3AE0 !important;border-color:#4A3AE0 !important}.cb-st4{background:#F0A532 !important;border-color:#F0A532 !important}}
</style>
