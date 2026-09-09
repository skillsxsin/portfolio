# Bhavya Jangid Portfolio & Projects

Official portfolio, dynamic full-stack blog engine, and interactive web projects including the real-time social deduction game **"Hidden Agenda"**.

Live Site: [https://bhavyajangid.com](https://bhavyajangid.com)  
Hidden Agenda Game: [https://bhavyajangid.com/projects/hidden-agenda/](https://bhavyajangid.com/projects/hidden-agenda/)

---

## 📁 Repository Structure

```
├── about.html                 # About Bhavya Jangid & showcase
├── index.html                 # Interactive landing page with physics-based avatar
├── projects.html              # Portfolio projects gallery
├── blogs.html                 # Dynamic blog listing
├── contact.html               # Contact channels & messaging
├── admin-blogs.html           # Secure blog management dashboard
├── admin-projects.html        # Secure projects management dashboard
├── styles.css                 # Vanilla CSS design system & retro aesthetics
├── app.js                     # Core avatar mechanics & sound synthesizer
├── functions/                 # Cloudflare Pages Functions (APIs, KV storage, Agent Auth)
├── projects/
│   └── hidden-agenda/         # Exported production bundle of the multiplayer game
└── Mafia style game/          # Next.js / TypeScript source code for "Hidden Agenda"
    ├── src/
    │   ├── app/               # Next.js App Router (Layout & Page)
    │   ├── components/        # Game UI (Lobby, PlayerGrid, Modals, RoleCards)
    │   ├── hooks/             # Socket & WebRTC peer connection management
    │   ├── server/            # Game Engine, role matrix, and night/day state logic
    │   └── types/             # TypeScript game definitions
    └── package.json           # Next.js dependencies
```

---

## 🎮 Hidden Agenda Overview

A real-time multiplayer social deduction game for 4 to 20 players inspired by classic Mafia.

### Roles & Characters
- **The Godfather**: Syndicate leader who commands the Mafia kill order and is immune to Police investigation.
- **The Mafia**: Syndicate members who vote each night to secretly eliminate villagers.
- **The Doctor**: Specialist who selects one player each night to protect against elimination.
- **The Police**: Detective who investigates suspects each night to discover Mafia members.
- **The Villagers**: Innocent townsfolk who deliberate, analyze clues, and vote during daytime trials.

### Local Development (Hidden Agenda)

```bash
cd "Mafia style game"
npm install
npm run dev
```

Build for static production:
```bash
npm run build
```

---

## 🚀 Deployment (Cloudflare Pages)

Deploy to Cloudflare Pages:
```bash
npx wrangler pages deploy . --project-name bhavyajangid
```

---

## 👤 Author

**Bhavya Jangid**
- **Website**: [bhavyajangid.com](https://bhavyajangid.com)
- **WhatsApp**: [+91 8955136723](https://wa.me/918955136723)
- **GitHub**: [@skillsxsin](https://github.com/skillsxsin)
- **LinkedIn**: [bhavya-jangid](https://www.linkedin.com/in/bhavya-jangid/)
