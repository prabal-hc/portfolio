// Content from Prabal's résumé. Edit freely.

export const profile = {
  name: "Prabal Holla",
  role: "Frontend Developer",
  location: "Bangalore, India",
  tagline: "I build fast, accessible React and Next.js interfaces, then give them a little cinema.",
  email: "prabalholla20@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/prabal-hc" },
    { label: "LinkedIn", href: "https://linkedin.com/in/prabal-holla-hc" },
  ],
};

export const hero = {
  eyebrow: "Welcome to the ride",
  intro: "Hi, I'm", // small and light, so the name carries the weight
  headline: "Prabal Holla", // the orange full stop is added in the layout
  tagline: "Frontend developer by day, rider always. This portfolio moves when you scroll, so hold tight.",
};

export const about = {
  label: "01 — About",
  title: "Building for the web, obsessively.",
  body: [
    "Frontend developer with 2.5+ years shipping scalable, responsive products in React, Next.js and TypeScript, from reusable component systems to auth, role-based access and REST integrations.",
    "Off the clock, I'm on my Hunter 350, which is why this page rides like one.",
  ],
  stats: [
    { k: "Years building", v: "2.5+" },
    { k: "Production apps", v: "5+" },
    { k: "Reusable components", v: "30+" },
  ],
};

export const skills = {
  label: "02 — Skills",
  title: "The spec sheet.",
  groups: [
    { name: "Languages", items: ["JavaScript (ES6+)", "TypeScript", "HTML5", "CSS3", "SQL"] },
    {
      name: "Frontend",
      items: ["React.js", "Next.js", "Redux Toolkit", "Context API", "Tailwind CSS", "Three.js", "Vue.js"],
    },
    { name: "Backend & APIs", items: ["REST APIs", "Supabase", "PostgreSQL", "Auth & RBAC", "RLS"] },
    { name: "Workflow", items: ["Git & GitHub", "Jira", "Agile / Scrum", "Testing", "AI-assisted dev"] },
  ],
};

export const projects = {
  label: "03 — Work",
  title: "Selected projects.",
  items: [
    {
      name: "Hyundai IONIQ 9 Configurator",
      tag: "React · Three.js · 4Syte",
      blurb: "Real-time 3D vehicle configurator with live trim customization and 360° viewing.",
      href: "https://hyundai-3dconfigurator.com/",
    },
    {
      name: "Western Aroma",
      tag: "Next.js · React · TypeScript",
      blurb: "Estate-to-cup coffee and spice brand site: product catalogue, storytelling sections and checkout.",
      href: "https://westernaroma.netlify.app/",
    },
    {
      name: "MediTrack",
      tag: "Next.js · React · TypeScript",
      blurb: "Healthcare management frontend for inventory, billing, customers and pharmacy operations.",
    },
    {
      name: "Entermaya",
      tag: "Web Development · Contract",
      blurb: "Contributed several sections to Entermaya's crowdfunding site for the MAYA narrative universe: multimedia storytelling, backer rewards and press coverage.",
      href: "https://www.entermaya.com/",
    },
  ],
};

export const experience = {
  label: "04 — Journey",
  title: "Mile markers.",
  items: [
    {
      when: "Jul 2026 (1 mo)",
      what: "Tech Generalist — Contract",
      where: "Entermaya · Goa (on-site)",
      whereHref: "https://www.entermaya.com/",
      point: "Built out several sections of the existing Entermaya website and an automated web-scraping tool to source marketing lead data.",
    },
    {
      when: "Jun 2025 — Now",
      what: "Contract Web Developer",
      where: "4Syte · Bangalore",
      point: "5+ production apps, plus a 30+ component UI library that cut build effort by 40%.",
    },
    {
      when: "Jan 2024 — Jun 2025",
      what: "Junior UI Developer",
      where: "DigiCollect · Bangalore",
      point: "Enterprise Vue.js UIs, RBAC scheduling with multi-timezone support, 20+ REST integrations.",
    },
    {
      when: "Jan 2022 — Dec 2022",
      what: "AR Engineer Intern",
      where: "BrioBrill Technologies · Bangalore",
      point: "Browser-based WebAR experiences with 8th Wall and A-Frame for Android and iOS.",
    },
  ],
  education: "B.E. Information Science & Engineering · Jyothy Institute of Technology · 2023",
};

export const contact = {
  label: "05 — Contact",
  title: "Let's build something.",
  body: "Open to new frontend roles and interesting projects. Say hello.",
};
