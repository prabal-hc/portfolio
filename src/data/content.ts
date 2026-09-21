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
      name: "3D Vehicle Configurator",
      tag: "React · Three.js · 4Syte",
      blurb: "Real-time 3D configurator with live customization and 360° viewing.",
    },
    {
      name: "Indians in Korea",
      tag: "Next.js · TypeScript · Supabase",
      blurb: "Full-stack community platform: events, announcements, gallery, resources, RBAC and row-level security.",
    },
    {
      name: "MediTrack",
      tag: "Next.js · React · TypeScript",
      blurb: "Healthcare management frontend for inventory, billing, customers and pharmacy operations.",
    },
  ],
};

export const experience = {
  label: "04 — Journey",
  title: "Mile markers.",
  items: [
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

export const modelCredit = {
  label: "3D model: Royal Enfield Hunter 350 by Bhavik Suthar",
  href: "https://sketchfab.com/3d-models/royal-enfield-hunter-350-dapper-grey-acb58ee62cfa4644af99caf4adbfdb5b",
};

export const contact = {
  label: "05 — Contact",
  title: "Let's build something.",
  body: "Open to new frontend roles and interesting projects. Say hello.",
};
